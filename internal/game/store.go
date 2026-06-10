package game

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DevToken = "dev-token"

	playerID   = "ply_dev"
	sectorID   = "sec_orion"
	homeNodeID = "node_home"

	startingOre            = 350
	startingEnergyCapacity = 100

	minerEnergyRequirement   = 30
	energyCapacityPerUpgrade = 30

	// Scans reach one node farther per completed scan in a direction, and
	// take longer the farther they reach from the home node.
	scanBaseDuration        = 15 * time.Second
	scanDurationPerDistance = 20 * time.Second

	// Claim costs scale with the square of node distance. Ice joins the bill
	// at distance 2 and gas at distance 3, so expansion pulls players through
	// the resource tiers.
	claimOrePerDistanceSquared = 150
	claimIceDistanceFactor     = 100
	claimGasDistanceFactor     = 75

	// gravelRateWindow bounds the sliding window behind gravel_per_hour.
	gravelRateWindow = time.Hour

	// convertSuggestionThreshold is the unlocked balance that triggers the
	// convert suggestion.
	convertSuggestionThreshold = 200
)

// crusherTier describes one crusher level. Index i holds level i+1. Names
// follow the gravel canon: increasingly sublime technology, identical output.
type crusherTier struct {
	name            string
	yieldMultiplier float64
	unlocksResource string
	upgradeCost     Cost
}

var crusherTiers = []crusherTier{
	{name: "Crusher Mk I", yieldMultiplier: 1.0},
	{name: "Crusher Mk II", yieldMultiplier: 1.25, unlocksResource: ResourceGas, upgradeCost: Cost{Ore: 300, Ice: 100}},
	{name: "Sub-Orbital Aggregate Processing", yieldMultiplier: 1.5, unlocksResource: ResourceCrystal, upgradeCost: Cost{Ore: 900, Ice: 400, Gas: 150}},
	{name: "Universal Gravelization Protocol", yieldMultiplier: 2.0, upgradeCost: Cost{Ore: 2500, Ice: 1200, Gas: 600, Crystal: 200}},
}

// conversionGravelPerUnit is the server-owned base rate table. A resource's
// value is its gravel yield; nothing else about it matters.
var conversionGravelPerUnit = map[string]int{
	ResourceOre:     1,
	ResourceIce:     3,
	ResourceGas:     9,
	ResourceCrystal: 25,
}

// requiredCrusherLevels gates premium feedstock behind crusher tiers.
var requiredCrusherLevels = map[string]int{
	ResourceOre:     1,
	ResourceIce:     1,
	ResourceGas:     2,
	ResourceCrystal: 3,
}

type traitProfile struct {
	primary   string
	secondary string
	names     []string
}

var traitProfiles = map[string]traitProfile{
	"metallic":    {primary: ResourceOre, secondary: ResourceIce, names: []string{"Rustbelt", "Slagfield", "Ironmaw", "Hematite Shelf"}},
	"frozen":      {primary: ResourceIce, secondary: ResourceOre, names: []string{"Bleak Slush", "Permafrost Bank", "Glacier's Spite", "Rime Hollow"}},
	"volatile":    {primary: ResourceGas, secondary: ResourceOre, names: []string{"Belcher's Pocket", "Fumarole Drift", "Wheeze Vent", "Sulfur Gully"}},
	"crystalline": {primary: ResourceCrystal, secondary: ResourceGas, names: []string{"Glitterbed", "Prism Hollow", "Gaudy Reach", "Chandelier Field"}},
}

var seasonNames = []string{"The Coarse Age", "The Pebble Epoch", "The Grit Dynasty", "The Aggregate Era"}

var directionIndexes = map[string]int{"north": 0, "east": 1, "south": 2, "west": 3}

type Clock interface {
	Now() time.Time
}

type RealClock struct{}

func (RealClock) Now() time.Time {
	return time.Now().UTC()
}

type Store struct {
	mu        sync.Mutex
	clock     Clock
	authToken string
	state     state
}

type state struct {
	player           Player
	outpost          Outpost
	sector           sectorState
	resources        resourceState
	miners           map[string]minerState
	crusherLevel     int
	gravelTotal      int64
	gravelEvents     []gravelEvent
	season           Season
	actions          map[string]Action
	actionOrder      []string
	log              []LogEntry
	scanIdempotency  map[string]string
	claimIdempotency map[string]string
	convertResults   map[string]ConversionResult
	convertHashes    map[string]string
	nextMinerNumber  int
	nextActionNumber int
	nextLogNumber    int
	nextScanDistance map[string]int
	traitNameCounts  map[string]int
}

type sectorState struct {
	id    string
	name  string
	nodes []Node
}

type resourceState struct {
	balances        map[string]float64
	maxEnergy       int
	lastGeneratedAt time.Time
}

type minerState struct {
	ID             string
	Name           string
	Level          int
	AssignedSiteID string
	CreatedAt      time.Time
}

// gravelEvent records gravel earned at a moment so gravel_per_hour can be
// derived lazily from a bounded sliding window.
type gravelEvent struct {
	at     time.Time
	gravel int64
}

func NewStore(clock Clock) *Store {
	if clock == nil {
		clock = RealClock{}
	}
	now := clock.Now().UTC()
	store := &Store{
		clock:     clock,
		authToken: DevToken,
	}
	homeNode := Node{
		ID:           homeNodeID,
		Name:         "Vesta-41",
		Kind:         "planet",
		Trait:        "metallic",
		X:            0,
		Y:            0,
		Distance:     0,
		DiscoveredAt: now,
		ClaimedBy:    playerID,
		Sites: []Site{
			{
				ID:                "site_home_anchor",
				NodeID:            homeNodeID,
				Name:              "Anchor Rock",
				Kind:              "deposit",
				Resource:          ResourceOre,
				Richness:          2,
				BaseRatePerSecond: 1.0,
				AssignedMinerID:   "min_starter",
				DiscoveredAt:      now,
			},
			{
				ID:                "site_home_basalt",
				NodeID:            homeNodeID,
				Name:              "Basalt Shelf",
				Kind:              "deposit",
				Resource:          ResourceOre,
				Richness:          1,
				BaseRatePerSecond: 0.75,
				DiscoveredAt:      now,
			},
			{
				ID:                "site_home_perma",
				NodeID:            homeNodeID,
				Name:              "Permafrost Pocket",
				Kind:              "deposit",
				Resource:          ResourceIce,
				Richness:          1,
				BaseRatePerSecond: 0.5,
				DiscoveredAt:      now,
			},
		},
	}
	season := Season{
		ID:        fmt.Sprintf("season_%d", now.Unix()),
		Name:      seasonNames[int(((now.Unix()%4)+4)%4)],
		StartedAt: now,
	}
	store.state = state{
		player: Player{
			ID:          playerID,
			DisplayName: "Astronaut Vega-7",
			CreatedAt:   now,
			Location: Location{
				NodeID:   homeNodeID,
				NodeName: homeNode.Name,
				X:        0,
				Y:        0,
			},
		},
		outpost: Outpost{
			ID:     "out_vesta_41",
			Name:   "Vesta-41",
			NodeID: homeNodeID,
		},
		sector: sectorState{
			id:    sectorID,
			name:  "Orion Spur",
			nodes: []Node{homeNode},
		},
		resources: resourceState{
			balances: map[string]float64{
				ResourceOre:     startingOre,
				ResourceIce:     0,
				ResourceGas:     0,
				ResourceCrystal: 0,
			},
			maxEnergy:       startingEnergyCapacity,
			lastGeneratedAt: now,
		},
		miners: map[string]minerState{
			"min_starter": {
				ID:             "min_starter",
				Name:           "Prospector One",
				Level:          1,
				AssignedSiteID: "site_home_anchor",
				CreatedAt:      now,
			},
		},
		crusherLevel:     1,
		season:           season,
		actions:          map[string]Action{},
		scanIdempotency:  map[string]string{},
		claimIdempotency: map[string]string{},
		convertResults:   map[string]ConversionResult{},
		convertHashes:    map[string]string{},
		nextMinerNumber:  2,
		nextActionNumber: 1,
		nextLogNumber:    1,
		nextScanDistance: map[string]int{},
		traitNameCounts:  map[string]int{},
	}
	store.appendLogLocked(now, fmt.Sprintf("Season started: %s.", season.Name), map[string]any{
		"season_id": season.ID,
	})
	store.appendLogLocked(now, "Outpost initialized on Vesta-41.", nil)
	store.appendLogLocked(now, "Prospector One assigned to Anchor Rock.", map[string]any{
		"miner_id": "min_starter",
		"site_id":  "site_home_anchor",
	})
	return store
}

func (s *Store) SetAuthToken(token string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if token == "" {
		token = DevToken
	}
	s.authToken = token
}

func (s *Store) Authenticate(token string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return token == s.authToken
}

func (s *Store) Player() Player {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return s.state.player
}

func (s *Store) Status() Status {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)
	return s.statusLocked(now)
}

func (s *Store) Sector() Sector {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return s.sectorLocked()
}

func (s *Store) Miners() []Miner {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return s.minersLocked()
}

func (s *Store) Leaderboard() Leaderboard {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)
	return s.leaderboardLocked(now)
}

func (s *Store) ConversionsInfo() Conversions {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return Conversions{
		Crusher: s.crusherLocked(),
		Rates:   s.conversionRatesLocked(),
	}
}

func (s *Store) BuildMiner() (Miner, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	cost := buildMinerCost(len(s.state.miners))
	if !s.canAffordLocked(cost) {
		return Miner{}, insufficientResources(cost, s.availableCostLocked())
	}
	s.spendLocked(cost)
	id := fmt.Sprintf("min_%03d", s.state.nextMinerNumber)
	s.state.nextMinerNumber++
	miner := minerState{
		ID:        id,
		Name:      fmt.Sprintf("Autonomous Miner %03d", s.state.nextMinerNumber-1),
		Level:     1,
		CreatedAt: now,
	}
	s.state.miners[id] = miner
	s.appendLogLocked(now, "Autonomous miner built.", map[string]any{
		"miner_id": id,
		"cost":     cost.Map(),
	})
	return s.minerLocked(miner), nil
}

func (s *Store) UpgradeMiner(id string) (Miner, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	miner, ok := s.state.miners[id]
	if !ok {
		return Miner{}, notFound("miner", id)
	}
	cost, ok := minerUpgradeCost(miner.Level)
	if !ok {
		return Miner{}, NewError("max_level", "Miner is already at maximum level.", map[string]any{
			"miner_id": id,
			"level":    miner.Level,
		})
	}
	if !s.canAffordLocked(cost) {
		return Miner{}, insufficientResources(cost, s.availableCostLocked())
	}
	s.spendLocked(cost)
	miner.Level++
	s.state.miners[id] = miner
	s.state.resources.maxEnergy += energyCapacityPerUpgrade
	s.appendLogLocked(now, "Autonomous miner upgraded.", map[string]any{
		"miner_id":                id,
		"level":                   miner.Level,
		"cost":                    cost.Map(),
		"energy_capacity_added":   energyCapacityPerUpgrade,
		"energy_capacity_current": s.state.resources.maxEnergy,
	})
	return s.minerLocked(miner), nil
}

func (s *Store) AssignMiner(minerID, siteID string) (Miner, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	miner, ok := s.state.miners[minerID]
	if !ok {
		return Miner{}, notFound("miner", minerID)
	}
	node, site, ok := s.findSiteLocked(siteID)
	if !ok {
		return Miner{}, notFound("site", siteID)
	}
	if node.ClaimedBy != playerID {
		claimCost := ClaimCostForDistance(node.Distance)
		if node.ClaimCost != nil {
			claimCost = *node.ClaimCost
		}
		return Miner{}, nodeNotClaimed(node.ID, claimCost)
	}
	if site.Kind != "deposit" || site.Depleted {
		return Miner{}, NewError("site_unavailable", "Site cannot be mined.", map[string]any{
			"site_id": siteID,
		})
	}
	if site.AssignedMinerID != "" && site.AssignedMinerID != minerID {
		return Miner{}, NewError("site_occupied", "Site already has an assigned miner.", map[string]any{
			"site_id":  siteID,
			"miner_id": site.AssignedMinerID,
		})
	}
	if miner.AssignedSiteID == "" && s.energyAvailableLocked() < minerEnergyRequirement {
		return Miner{}, energyCapacityExceeded(minerEnergyRequirement, s.energyUsedLocked(), s.state.resources.maxEnergy)
	}
	if miner.AssignedSiteID != "" && miner.AssignedSiteID != siteID {
		if _, oldSite, found := s.findSiteLocked(miner.AssignedSiteID); found {
			oldSite.AssignedMinerID = ""
		}
	}
	miner.AssignedSiteID = siteID
	s.state.miners[minerID] = miner
	site.AssignedMinerID = minerID
	s.appendLogLocked(now, "Autonomous miner assigned to site.", map[string]any{
		"miner_id": minerID,
		"site_id":  siteID,
		"node_id":  node.ID,
		"resource": site.Resource,
	})
	return s.minerLocked(miner), nil
}

func (s *Store) ClaimNode(nodeID, idempotencyKey string) (Node, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	if idempotencyKey != "" {
		key := idempotencyMapKey("claim", idempotencyKey)
		if claimedNodeID, ok := s.state.claimIdempotency[key]; ok {
			if claimedNodeID != nodeID {
				return Node{}, NewError("idempotency_conflict", "Idempotency key was already used for a different claim request.", map[string]any{
					"idempotency_key": idempotencyKey,
				})
			}
			if node, found := s.findNodeLocked(nodeID); found {
				return cloneNode(*node), nil
			}
		}
	}
	node, ok := s.findNodeLocked(nodeID)
	if !ok {
		return Node{}, notFound("node", nodeID)
	}
	if node.ClaimedBy != "" {
		return Node{}, nodeAlreadyClaimed(node.ID, node.ClaimedBy)
	}
	cost := ClaimCostForDistance(node.Distance)
	if node.ClaimCost != nil {
		cost = *node.ClaimCost
	}
	if !s.canAffordLocked(cost) {
		return Node{}, insufficientResources(cost, s.availableCostLocked())
	}
	s.spendLocked(cost)
	node.ClaimedBy = playerID
	node.ClaimCost = nil
	if idempotencyKey != "" {
		s.state.claimIdempotency[idempotencyMapKey("claim", idempotencyKey)] = nodeID
	}
	s.appendLogLocked(now, fmt.Sprintf("Claimed %s.", node.Name), map[string]any{
		"node_id": node.ID,
		"cost":    cost.Map(),
	})
	return cloneNode(*node), nil
}

func (s *Store) UpgradeCrusher() (Crusher, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	if s.state.crusherLevel >= len(crusherTiers) {
		return Crusher{}, NewError("max_level", "Crusher is already at maximum level.", map[string]any{
			"level": s.state.crusherLevel,
		})
	}
	next := crusherTiers[s.state.crusherLevel]
	if !s.canAffordLocked(next.upgradeCost) {
		return Crusher{}, insufficientResources(next.upgradeCost, s.availableCostLocked())
	}
	s.spendLocked(next.upgradeCost)
	s.state.crusherLevel++
	s.appendLogLocked(now, fmt.Sprintf("Crusher upgraded to %s.", next.name), map[string]any{
		"level": s.state.crusherLevel,
		"cost":  next.upgradeCost.Map(),
	})
	return s.crusherLocked(), nil
}

// Convert crushes a resource into gravel. A nil amount converts the full
// integer balance. Gravel earned is floor(amount * rate * yield multiplier).
func (s *Store) Convert(resource string, amount *int, idempotencyKey string) (ConversionResult, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	rate, ok := conversionGravelPerUnit[resource]
	if !ok {
		return ConversionResult{}, invalidResource(resource)
	}
	requestHash := convertRequestHash(resource, amount)
	if idempotencyKey != "" {
		key := idempotencyMapKey("convert", idempotencyKey)
		if storedHash, ok := s.state.convertHashes[key]; ok {
			if storedHash != requestHash {
				return ConversionResult{}, NewError("idempotency_conflict", "Idempotency key was already used for a different conversion request.", map[string]any{
					"idempotency_key": idempotencyKey,
				})
			}
			return s.state.convertResults[key], nil
		}
	}
	requiredLevel := requiredCrusherLevels[resource]
	if s.state.crusherLevel < requiredLevel {
		return ConversionResult{}, crusherLevelTooLow(resource, requiredLevel, s.state.crusherLevel)
	}
	balance := int(s.state.resources.balances[resource])
	converted := balance
	if amount != nil {
		if *amount < 1 {
			return ConversionResult{}, invalidAmount(*amount)
		}
		converted = *amount
	}
	if converted < 1 || converted > balance {
		required := converted
		if required < 1 {
			required = 1
		}
		return ConversionResult{}, insufficientResources(costForResource(resource, required), s.availableCostLocked())
	}
	yield := crusherTiers[s.state.crusherLevel-1].yieldMultiplier
	earned := int64(math.Floor(float64(converted) * float64(rate) * yield))
	s.state.resources.balances[resource] -= float64(converted)
	s.state.gravelTotal += earned
	s.addGravelEventLocked(now, earned)
	s.appendLogLocked(now, fmt.Sprintf("Crushed %d %s into %d gravel.", converted, resource, earned), map[string]any{
		"resource":      resource,
		"amount":        converted,
		"gravel_earned": earned,
		"gravel_total":  s.state.gravelTotal,
	})
	result := ConversionResult{
		Resource:        resource,
		AmountConverted: converted,
		GravelPerUnit:   rate,
		YieldMultiplier: yield,
		GravelEarned:    earned,
		GravelTotal:     s.state.gravelTotal,
		Resources:       s.resourcesLocked(),
	}
	if idempotencyKey != "" {
		key := idempotencyMapKey("convert", idempotencyKey)
		s.state.convertHashes[key] = requestHash
		s.state.convertResults[key] = result
	}
	return result, nil
}

func (s *Store) Actions() []Action {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	actions := make([]Action, 0, len(s.state.actionOrder))
	for _, id := range s.state.actionOrder {
		actions = append(actions, cloneAction(s.state.actions[id]))
	}
	return actions
}

func (s *Store) Action(id string) (Action, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	action, ok := s.state.actions[id]
	if !ok {
		return Action{}, notFound("action", id)
	}
	return cloneAction(action), nil
}

func (s *Store) StartScan(direction, idempotencyKey string) (Action, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	if direction == "" {
		direction = "north"
	}
	if !validDirection(direction) {
		return Action{}, NewError("invalid_direction", "Scan direction is invalid.", map[string]any{
			"direction": direction,
		})
	}
	requestHash := scanRequestHash(direction)
	if idempotencyKey != "" {
		key := idempotencyMapKey(ActionTypeScan, idempotencyKey)
		if actionID, ok := s.state.scanIdempotency[key]; ok {
			action := s.state.actions[actionID]
			if action.RequestHash != requestHash {
				return Action{}, NewError("idempotency_conflict", "Idempotency key was already used for a different scan request.", map[string]any{
					"idempotency_key": idempotencyKey,
				})
			}
			return cloneAction(action), nil
		}
	}
	if active := s.activeScanLocked(); active != nil {
		return Action{}, NewError("active_scan_exists", "A scan is already active.", map[string]any{
			"action_id": active.ID,
		})
	}

	distance := s.nextScanDistanceLocked(direction)
	duration := ScanDurationForDistance(distance)
	id := fmt.Sprintf("act_scan_%03d", s.state.nextActionNumber)
	s.state.nextActionNumber++
	action := Action{
		ID:         id,
		Type:       ActionTypeScan,
		Status:     ActionStatusPending,
		CreatedAt:  now,
		ResolvesAt: now.Add(duration),
		Request: map[string]string{
			"direction": direction,
			"distance":  strconv.Itoa(distance),
		},
		IdempotencyKey: idempotencyKey,
		RequestHash:    requestHash,
	}
	s.state.actions[id] = action
	s.state.actionOrder = append(s.state.actionOrder, id)
	if idempotencyKey != "" {
		s.state.scanIdempotency[idempotencyMapKey(ActionTypeScan, idempotencyKey)] = id
	}
	s.appendLogLocked(now, "Long-range scan started.", map[string]any{
		"action_id":        id,
		"direction":        direction,
		"distance":         distance,
		"duration_seconds": int(duration.Seconds()),
	})
	return cloneAction(action), nil
}

func (s *Store) Log() []LogEntry {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	entries := make([]LogEntry, len(s.state.log))
	copy(entries, s.state.log)
	for i := range entries {
		entries[i].Fields = cloneAnyMap(entries[i].Fields)
	}
	return entries
}

// ScanDurationForDistance returns how long a scan reaching the given
// distance takes. Exported so tests and docs can assert the scaling.
func ScanDurationForDistance(distance int) time.Duration {
	if distance < 1 {
		distance = 1
	}
	return scanBaseDuration + scanDurationPerDistance*time.Duration(distance-1)
}

// ClaimCostForDistance returns the cost to claim a node at the given
// distance from home. Exported so tests and docs can assert the curve.
func ClaimCostForDistance(distance int) Cost {
	if distance < 1 {
		distance = 1
	}
	cost := Cost{Ore: claimOrePerDistanceSquared * distance * distance}
	if distance >= 2 {
		cost.Ice = claimIceDistanceFactor * (distance - 1) * (distance - 1)
	}
	if distance >= 3 {
		cost.Gas = claimGasDistanceFactor * (distance - 2) * (distance - 2)
	}
	return cost
}

func (s *Store) statusLocked(now time.Time) Status {
	return Status{
		Player:               s.state.player,
		Outpost:              s.state.outpost,
		Resources:            s.resourcesLocked(),
		Gravel:               s.gravelLocked(now),
		Crusher:              s.crusherLocked(),
		Sector:               s.sectorLocked(),
		Miners:               s.minersLocked(),
		ActiveActions:        s.activeActionsLocked(),
		SuggestedNextActions: s.suggestedNextActionsLocked(),
	}
}

func (s *Store) refreshLocked(now time.Time) {
	s.generateResourcesLocked(now)
	s.resolveActionsLocked(now)
}

func (s *Store) generateResourcesLocked(now time.Time) {
	last := s.state.resources.lastGeneratedAt
	if !now.After(last) {
		return
	}
	delta := now.Sub(last).Seconds()
	for resource, rate := range s.ratesLocked() {
		if rate > 0 {
			s.state.resources.balances[resource] += delta * rate
		}
	}
	s.state.resources.lastGeneratedAt = now
}

func (s *Store) resolveActionsLocked(now time.Time) {
	for _, id := range s.state.actionOrder {
		action := s.state.actions[id]
		if action.Status != ActionStatusPending || now.Before(action.ResolvesAt) {
			continue
		}
		action.Status = ActionStatusCompleted
		completedAt := action.ResolvesAt
		if now.After(action.ResolvesAt) {
			completedAt = now
		}
		action.CompletedAt = &completedAt
		if action.Type == ActionTypeScan {
			direction := action.Request["direction"]
			distance, err := strconv.Atoi(action.Request["distance"])
			if err != nil || distance < 1 {
				distance = s.nextScanDistanceLocked(direction)
			}
			node := s.discoverNodeLocked(direction, distance, completedAt)
			s.state.nextScanDistance[direction] = distance + 1
			action.Result = map[string]any{
				"discovered_node": node,
			}
			s.appendLogLocked(completedAt, fmt.Sprintf("Scan completed and charted %s.", node.Name), map[string]any{
				"action_id": id,
				"node_id":   node.ID,
			})
		}
		s.state.actions[id] = action
	}
}

func (s *Store) discoverNodeLocked(direction string, distance int, discoveredAt time.Time) Node {
	x, y := coordinatesForDirection(direction, distance)
	trait := traitFor(direction, distance)
	profile := traitProfiles[trait]
	nameIndex := s.state.traitNameCounts[trait]
	s.state.traitNameCounts[trait]++
	name := profile.names[nameIndex%len(profile.names)] + romanSuffix(nameIndex/len(profile.names))
	kind := "planet"
	if distance == 1 {
		kind = "asteroid_field"
	}
	claimCost := ClaimCostForDistance(distance)
	nodeID := fmt.Sprintf("node_%s_%d", direction, distance)
	richBase := 0.5 + 0.5*float64(distance)
	normalBase := 0.25 + 0.25*float64(distance)
	normalRichness := distance
	if normalRichness < 1 {
		normalRichness = 1
	}
	sites := []Site{
		{
			ID:                fmt.Sprintf("site_%s_%d_a", direction, distance),
			NodeID:            nodeID,
			Name:              name + " Pit A",
			Kind:              "deposit",
			Resource:          profile.primary,
			X:                 x,
			Y:                 y,
			Richness:          distance + 1,
			BaseRatePerSecond: richBase,
			DiscoveredAt:      discoveredAt,
		},
		{
			ID:                fmt.Sprintf("site_%s_%d_b", direction, distance),
			NodeID:            nodeID,
			Name:              name + " Pit B",
			Kind:              "deposit",
			Resource:          profile.primary,
			X:                 x,
			Y:                 y,
			Richness:          normalRichness,
			BaseRatePerSecond: normalBase,
			DiscoveredAt:      discoveredAt,
		},
		{
			ID:                fmt.Sprintf("site_%s_%d_c", direction, distance),
			NodeID:            nodeID,
			Name:              name + " Pit C",
			Kind:              "deposit",
			Resource:          profile.secondary,
			X:                 x,
			Y:                 y,
			Richness:          normalRichness,
			BaseRatePerSecond: normalBase,
			DiscoveredAt:      discoveredAt,
		},
	}
	node := Node{
		ID:           nodeID,
		Name:         name,
		Kind:         kind,
		Trait:        trait,
		X:            x,
		Y:            y,
		Distance:     distance,
		DiscoveredAt: discoveredAt,
		ClaimCost:    &claimCost,
		Sites:        sites,
	}
	s.state.sector.nodes = append(s.state.sector.nodes, node)
	return cloneNode(node)
}

func (s *Store) nextScanDistanceLocked(direction string) int {
	distance := s.state.nextScanDistance[direction]
	if distance < 1 {
		return 1
	}
	return distance
}

func (s *Store) activeScanLocked() *Action {
	for _, id := range s.state.actionOrder {
		action := s.state.actions[id]
		if action.Type == ActionTypeScan && action.Status == ActionStatusPending {
			clone := cloneAction(action)
			return &clone
		}
	}
	return nil
}

func (s *Store) activeActionsLocked() []Action {
	actions := []Action{}
	for _, id := range s.state.actionOrder {
		action := s.state.actions[id]
		if action.Status == ActionStatusPending {
			actions = append(actions, cloneAction(action))
		}
	}
	return actions
}

func (s *Store) minersLocked() []Miner {
	ids := make([]string, 0, len(s.state.miners))
	for id := range s.state.miners {
		ids = append(ids, id)
	}
	slices.Sort(ids)
	miners := make([]Miner, 0, len(ids))
	for _, id := range ids {
		miners = append(miners, s.minerLocked(s.state.miners[id]))
	}
	return miners
}

func (s *Store) minerLocked(miner minerState) Miner {
	status := "idle"
	var siteName, resource string
	if miner.AssignedSiteID != "" {
		status = "mining"
		if _, site, ok := s.findSiteLocked(miner.AssignedSiteID); ok {
			siteName = site.Name
			resource = site.Resource
		}
	}
	var nextCost *Cost
	var nextPreview *Miner
	if cost, ok := minerUpgradeCost(miner.Level); ok {
		costCopy := cost
		nextCost = &costCopy
		preview := Miner{
			ID:                miner.ID,
			Name:              miner.Name,
			Level:             miner.Level + 1,
			RatePerSecond:     minerRate(miner.Level + 1),
			OreRatePerSecond:  minerRate(miner.Level + 1),
			Resource:          resource,
			EnergyRequirement: minerEnergyRequirement,
			AssignedSiteID:    miner.AssignedSiteID,
			AssignedSiteName:  siteName,
			Status:            status,
			BuildCost:         buildMinerCost(len(s.state.miners)),
			CreatedAt:         miner.CreatedAt,
		}
		nextPreview = &preview
	}
	return Miner{
		ID:                 miner.ID,
		Name:               miner.Name,
		Level:              miner.Level,
		RatePerSecond:      minerRate(miner.Level),
		OreRatePerSecond:   minerRate(miner.Level),
		Resource:           resource,
		EnergyRequirement:  minerEnergyRequirement,
		AssignedSiteID:     miner.AssignedSiteID,
		AssignedSiteName:   siteName,
		Status:             status,
		BuildCost:          buildMinerCost(len(s.state.miners)),
		NextUpgradeCost:    nextCost,
		NextUpgradePreview: nextPreview,
		CreatedAt:          miner.CreatedAt,
	}
}

func (s *Store) resourcesLocked() Resources {
	rates := s.ratesLocked()
	energyUsed := s.energyUsedLocked()
	energyCapacity := s.state.resources.maxEnergy
	return Resources{
		Ore:              int(s.state.resources.balances[ResourceOre]),
		Ice:              int(s.state.resources.balances[ResourceIce]),
		Gas:              int(s.state.resources.balances[ResourceGas]),
		Crystal:          int(s.state.resources.balances[ResourceCrystal]),
		RatesPerSecond:   rates,
		OreRatePerSecond: rates[ResourceOre],
		Energy:           energyUsed,
		MaxEnergy:        energyCapacity,
		EnergyCapacity:   energyCapacity,
		EnergyUsed:       energyUsed,
		EnergyAvailable:  energyCapacity - energyUsed,
		LastGeneratedAt:  s.state.resources.lastGeneratedAt.Format(time.RFC3339),
	}
}

func (s *Store) gravelLocked(now time.Time) Gravel {
	return Gravel{
		Total:   s.state.gravelTotal,
		PerHour: s.gravelPerHourLocked(now),
		Season:  s.state.season,
	}
}

func (s *Store) leaderboardLocked(now time.Time) Leaderboard {
	entries := []LeaderboardEntry{
		{
			PlayerID:      s.state.player.ID,
			Codernaut:     s.state.player.DisplayName,
			Gravel:        s.state.gravelTotal,
			GravelPerHour: s.gravelPerHourLocked(now),
			IsYou:         true,
		},
	}
	slices.SortStableFunc(entries, func(a, b LeaderboardEntry) int {
		switch {
		case a.Gravel > b.Gravel:
			return -1
		case a.Gravel < b.Gravel:
			return 1
		default:
			return 0
		}
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}
	return Leaderboard{
		Season:  s.state.season,
		Entries: entries,
	}
}

func (s *Store) crusherLocked() Crusher {
	level := s.state.crusherLevel
	tier := crusherTiers[level-1]
	unlocked := []string{}
	for _, resource := range ResourceOrder {
		if requiredCrusherLevels[resource] <= level {
			unlocked = append(unlocked, resource)
		}
	}
	crusher := Crusher{
		Level:             level,
		Name:              tier.name,
		YieldMultiplier:   tier.yieldMultiplier,
		UnlockedResources: unlocked,
	}
	if level < len(crusherTiers) {
		next := crusherTiers[level]
		crusher.NextUpgrade = &CrusherUpgrade{
			Level:           level + 1,
			Name:            next.name,
			YieldMultiplier: next.yieldMultiplier,
			UnlocksResource: next.unlocksResource,
			Cost:            next.upgradeCost,
		}
	}
	return crusher
}

func (s *Store) conversionRatesLocked() []ConversionRate {
	rates := make([]ConversionRate, 0, len(ResourceOrder))
	for _, resource := range ResourceOrder {
		requiredLevel := requiredCrusherLevels[resource]
		rates = append(rates, ConversionRate{
			Resource:             resource,
			GravelPerUnit:        conversionGravelPerUnit[resource],
			RequiredCrusherLevel: requiredLevel,
			Unlocked:             s.state.crusherLevel >= requiredLevel,
		})
	}
	return rates
}

func (s *Store) suggestedNextActionsLocked() []SuggestedAction {
	suggestions := []SuggestedAction{}
	for _, node := range s.state.sector.nodes {
		if node.ClaimedBy == "" && node.ClaimCost != nil && s.canAffordLocked(*node.ClaimCost) {
			suggestions = append(suggestions, SuggestedAction{
				Key:     "claim_node",
				Message: fmt.Sprintf("Claim %s for %s.", node.Name, formatCost(*node.ClaimCost)),
			})
			break
		}
	}
	idleMinerID := ""
	minerIDs := make([]string, 0, len(s.state.miners))
	for id := range s.state.miners {
		minerIDs = append(minerIDs, id)
	}
	slices.Sort(minerIDs)
	for _, id := range minerIDs {
		if s.state.miners[id].AssignedSiteID == "" {
			idleMinerID = id
			break
		}
	}
	openSiteID := ""
	for _, node := range s.state.sector.nodes {
		if node.ClaimedBy != playerID {
			continue
		}
		for _, site := range node.Sites {
			if site.Kind == "deposit" && !site.Depleted && site.AssignedMinerID == "" {
				openSiteID = site.ID
				break
			}
		}
		if openSiteID != "" {
			break
		}
	}
	if idleMinerID != "" && openSiteID != "" && s.energyAvailableLocked() >= minerEnergyRequirement {
		suggestions = append(suggestions, SuggestedAction{
			Key:     "assign_miner",
			Message: fmt.Sprintf("Assign %s to %s.", idleMinerID, openSiteID),
		})
	}
	if s.canAffordLocked(buildMinerCost(len(s.state.miners))) {
		suggestions = append(suggestions, SuggestedAction{
			Key:     "build_miner",
			Message: "Build another autonomous miner.",
		})
	}
	if s.state.crusherLevel < len(crusherTiers) && s.canAffordLocked(crusherTiers[s.state.crusherLevel].upgradeCost) {
		suggestions = append(suggestions, SuggestedAction{
			Key:     "upgrade_crusher",
			Message: fmt.Sprintf("Upgrade the crusher to %s.", crusherTiers[s.state.crusherLevel].name),
		})
	}
	for _, resource := range ResourceOrder {
		if s.state.crusherLevel >= requiredCrusherLevels[resource] && int(s.state.resources.balances[resource]) >= convertSuggestionThreshold {
			suggestions = append(suggestions, SuggestedAction{
				Key:     "convert",
				Message: fmt.Sprintf("Crush %s into gravel.", resource),
			})
			break
		}
	}
	if s.activeScanLocked() == nil {
		suggestions = append(suggestions, SuggestedAction{
			Key:     "scan",
			Message: "Start a scan to chart more nodes.",
		})
	}
	return suggestions
}

// ratesLocked derives per-resource production from assigned miners. The cost
// is O(assigned miners) with a site lookup per miner.
func (s *Store) ratesLocked() map[string]float64 {
	rates := map[string]float64{
		ResourceOre:     0,
		ResourceIce:     0,
		ResourceGas:     0,
		ResourceCrystal: 0,
	}
	for _, miner := range s.state.miners {
		if miner.AssignedSiteID == "" {
			continue
		}
		_, site, ok := s.findSiteLocked(miner.AssignedSiteID)
		if !ok || site.Kind != "deposit" || site.Depleted {
			continue
		}
		rates[site.Resource] += minerRate(miner.Level) * site.BaseRatePerSecond
	}
	return rates
}

func (s *Store) findNodeLocked(id string) (*Node, bool) {
	for i := range s.state.sector.nodes {
		if s.state.sector.nodes[i].ID == id {
			return &s.state.sector.nodes[i], true
		}
	}
	return nil, false
}

func (s *Store) findSiteLocked(siteID string) (*Node, *Site, bool) {
	for ni := range s.state.sector.nodes {
		node := &s.state.sector.nodes[ni]
		for si := range node.Sites {
			if node.Sites[si].ID == siteID {
				return node, &node.Sites[si], true
			}
		}
	}
	return nil, nil, false
}

func (s *Store) energyUsedLocked() int {
	used := 0
	for _, miner := range s.state.miners {
		if miner.AssignedSiteID != "" {
			used += minerEnergyRequirement
		}
	}
	return used
}

func (s *Store) energyAvailableLocked() int {
	return s.state.resources.maxEnergy - s.energyUsedLocked()
}

func (s *Store) canAffordLocked(cost Cost) bool {
	balances := s.state.resources.balances
	return int(balances[ResourceOre]) >= cost.Ore &&
		int(balances[ResourceIce]) >= cost.Ice &&
		int(balances[ResourceGas]) >= cost.Gas &&
		int(balances[ResourceCrystal]) >= cost.Crystal
}

func (s *Store) spendLocked(cost Cost) {
	s.state.resources.balances[ResourceOre] -= float64(cost.Ore)
	s.state.resources.balances[ResourceIce] -= float64(cost.Ice)
	s.state.resources.balances[ResourceGas] -= float64(cost.Gas)
	s.state.resources.balances[ResourceCrystal] -= float64(cost.Crystal)
}

func (s *Store) availableCostLocked() Cost {
	return Cost{
		Ore:     int(s.state.resources.balances[ResourceOre]),
		Ice:     int(s.state.resources.balances[ResourceIce]),
		Gas:     int(s.state.resources.balances[ResourceGas]),
		Crystal: int(s.state.resources.balances[ResourceCrystal]),
	}
}

func (s *Store) addGravelEventLocked(now time.Time, earned int64) {
	s.state.gravelEvents = append(s.state.gravelEvents, gravelEvent{at: now, gravel: earned})
	s.pruneGravelEventsLocked(now)
}

func (s *Store) pruneGravelEventsLocked(now time.Time) {
	cutoff := now.Add(-gravelRateWindow)
	start := 0
	for start < len(s.state.gravelEvents) && s.state.gravelEvents[start].at.Before(cutoff) {
		start++
	}
	if start > 0 {
		s.state.gravelEvents = slices.Clone(s.state.gravelEvents[start:])
	}
}

// gravelPerHourLocked reports gravel earned per hour over a sliding window
// capped at one hour and clipped to the season start, so a fresh season shows
// honest slope instead of a divide-by-large-window flatline.
func (s *Store) gravelPerHourLocked(now time.Time) float64 {
	s.pruneGravelEventsLocked(now)
	windowStart := now.Add(-gravelRateWindow)
	if s.state.season.StartedAt.After(windowStart) {
		windowStart = s.state.season.StartedAt
	}
	windowSeconds := now.Sub(windowStart).Seconds()
	if windowSeconds < 1 {
		windowSeconds = 1
	}
	var sum int64
	for _, event := range s.state.gravelEvents {
		if !event.at.Before(windowStart) {
			sum += event.gravel
		}
	}
	perHour := float64(sum) / windowSeconds * 3600
	return math.Round(perHour*10) / 10
}

func (s *Store) appendLogLocked(now time.Time, message string, fields map[string]any) {
	id := fmt.Sprintf("log_%03d", s.state.nextLogNumber)
	s.state.nextLogNumber++
	s.state.log = append(s.state.log, LogEntry{
		ID:        id,
		CreatedAt: now,
		Message:   message,
		Fields:    cloneAnyMap(fields),
	})
}

func (s *Store) sectorLocked() Sector {
	nodes := make([]Node, len(s.state.sector.nodes))
	for i, node := range s.state.sector.nodes {
		nodes[i] = cloneNode(node)
	}
	return Sector{
		ID:    s.state.sector.id,
		Name:  s.state.sector.name,
		Nodes: nodes,
	}
}

func cloneNode(node Node) Node {
	node.Sites = slices.Clone(node.Sites)
	if node.ClaimCost != nil {
		cost := *node.ClaimCost
		node.ClaimCost = &cost
	}
	return node
}

func cloneAction(action Action) Action {
	action.Request = cloneStringMap(action.Request)
	action.Result = cloneAnyMap(action.Result)
	return action
}

func cloneStringMap(source map[string]string) map[string]string {
	if source == nil {
		return nil
	}
	clone := make(map[string]string, len(source))
	for key, value := range source {
		clone[key] = value
	}
	return clone
}

func cloneAnyMap(source map[string]any) map[string]any {
	if source == nil {
		return nil
	}
	clone := make(map[string]any, len(source))
	for key, value := range source {
		clone[key] = value
	}
	return clone
}

func buildMinerCost(existingMiners int) Cost {
	return Cost{Ore: 100 + existingMiners*75}
}

func minerUpgradeCost(level int) (Cost, bool) {
	switch level {
	case 1:
		return Cost{Ore: 150}, true
	case 2:
		return Cost{Ore: 300}, true
	case 3:
		return Cost{Ore: 600}, true
	default:
		return Cost{}, false
	}
}

// minerRate is the miner's own multiplier. Production is this multiplied by
// the assigned site's base rate.
func minerRate(level int) float64 {
	return 1.0 + float64(level-1)*0.75
}

func costForResource(resource string, amount int) Cost {
	switch resource {
	case ResourceOre:
		return Cost{Ore: amount}
	case ResourceIce:
		return Cost{Ice: amount}
	case ResourceGas:
		return Cost{Gas: amount}
	case ResourceCrystal:
		return Cost{Crystal: amount}
	default:
		return Cost{}
	}
}

func formatCost(cost Cost) string {
	parts := []string{}
	for _, resource := range ResourceOrder {
		if amount, ok := cost.Map()[resource]; ok {
			parts = append(parts, fmt.Sprintf("%d %s", amount, resource))
		}
	}
	if len(parts) == 0 {
		return "free"
	}
	return strings.Join(parts, ", ")
}

func validDirection(direction string) bool {
	switch direction {
	case "north", "east", "south", "west":
		return true
	default:
		return false
	}
}

// traitFor is the deterministic trait table. Distance pulls players through
// the resource tiers: nearby nodes feed ore and ice, deep nodes carry gas and
// crystal.
func traitFor(direction string, distance int) string {
	switch distance {
	case 1:
		if direction == "north" || direction == "south" {
			return "metallic"
		}
		return "frozen"
	case 2:
		switch direction {
		case "north":
			return "frozen"
		case "east", "south":
			return "volatile"
		default:
			return "metallic"
		}
	case 3:
		switch direction {
		case "north", "west":
			return "volatile"
		default:
			return "crystalline"
		}
	default:
		if (distance+directionIndexes[direction])%2 == 0 {
			return "crystalline"
		}
		return "volatile"
	}
}

func scanRequestHash(direction string) string {
	sum := sha256.Sum256([]byte(direction))
	return hex.EncodeToString(sum[:])
}

func convertRequestHash(resource string, amount *int) string {
	request := resource + ":all"
	if amount != nil {
		request = resource + ":" + strconv.Itoa(*amount)
	}
	sum := sha256.Sum256([]byte(request))
	return hex.EncodeToString(sum[:])
}

func idempotencyMapKey(actionType, key string) string {
	return actionType + ":" + key
}

func coordinatesForDirection(direction string, distance int) (int, int) {
	switch direction {
	case "north":
		return 0, -distance
	case "east":
		return distance, 0
	case "south":
		return 0, distance
	case "west":
		return -distance, 0
	default:
		return distance, distance
	}
}

// romanSuffix names repeat visits to a trait's name list: round 0 has no
// suffix, later rounds append II, III, and so on.
func romanSuffix(round int) string {
	suffixes := []string{"", " II", " III", " IV", " V", " VI", " VII", " VIII", " IX", " X"}
	if round < len(suffixes) {
		return suffixes[round]
	}
	return fmt.Sprintf(" %d", round+1)
}
