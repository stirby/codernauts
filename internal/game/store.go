package game

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"slices"
	"sync"
	"time"
)

const (
	DevToken = "dev-token"

	playerID = "ply_dev"
	sectorID = "sec_orion"

	startingOre            = 350
	startingMaxOre         = 1000
	startingEnergyCapacity = 100

	minerEnergyRequirement   = 30
	energyCapacityPerUpgrade = 30
)

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
	sector           Sector
	resources        resourceState
	miners           map[string]minerState
	actions          map[string]Action
	actionOrder      []string
	log              []LogEntry
	idempotency      map[string]string
	nextMinerNumber  int
	nextActionNumber int
	nextLogNumber    int
	nextSiteNumber   int
}

type resourceState struct {
	ore             float64
	maxOre          int
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

func NewStore(clock Clock) *Store {
	if clock == nil {
		clock = RealClock{}
	}
	now := clock.Now().UTC()
	store := &Store{
		clock:     clock,
		authToken: DevToken,
	}
	store.state = state{
		player: Player{
			ID:          playerID,
			DisplayName: "Astronaut Vega-7",
			CreatedAt:   now,
		},
		outpost: Outpost{
			ID:   "out_vesta_41",
			Name: "Vesta-41",
		},
		sector: Sector{
			ID:   sectorID,
			Name: "Orion Spur",
			Sites: []Site{
				{
					ID:                   "site_home_asteroid",
					Name:                 "Anchor Rock",
					Kind:                 "asteroid",
					X:                    0,
					Y:                    0,
					Richness:             1,
					DiscoveredAt:         now,
					BaseOreRatePerSecond: 1.0,
				},
			},
		},
		resources: resourceState{
			ore:             startingOre,
			maxOre:          startingMaxOre,
			maxEnergy:       startingEnergyCapacity,
			lastGeneratedAt: now,
		},
		miners: map[string]minerState{
			"min_starter": {
				ID:             "min_starter",
				Name:           "Prospector One",
				Level:          1,
				AssignedSiteID: "site_home_asteroid",
				CreatedAt:      now,
			},
		},
		actions:          map[string]Action{},
		idempotency:      map[string]string{},
		nextMinerNumber:  2,
		nextActionNumber: 1,
		nextLogNumber:    1,
		nextSiteNumber:   1,
	}
	store.state.sector.Sites[0].AssignedMinerID = "min_starter"
	store.appendLogLocked(now, "Outpost initialized near Anchor Rock.", nil)
	store.appendLogLocked(now, "Prospector One assigned to Anchor Rock.", map[string]any{
		"miner_id": "min_starter",
		"site_id":  "site_home_asteroid",
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
	s.refreshLocked(s.clock.Now().UTC())
	return s.statusLocked()
}

func (s *Store) Sector() Sector {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return cloneSector(s.state.sector)
}

func (s *Store) Miners() []Miner {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.refreshLocked(s.clock.Now().UTC())
	return s.minersLocked()
}

func (s *Store) BuildMiner() (Miner, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock.Now().UTC()
	s.refreshLocked(now)

	cost := buildMinerCost(len(s.state.miners))
	if !s.canAffordLocked(cost) {
		return Miner{}, insufficientResources(cost, int(s.state.resources.ore))
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
		"cost":     cost,
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
		return Miner{}, insufficientResources(cost, int(s.state.resources.ore))
	}
	s.spendLocked(cost)
	miner.Level++
	s.state.miners[id] = miner
	s.state.resources.maxEnergy += energyCapacityPerUpgrade
	s.appendLogLocked(now, "Autonomous miner upgraded.", map[string]any{
		"miner_id":                id,
		"level":                   miner.Level,
		"cost":                    cost,
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
	siteIndex := slices.IndexFunc(s.state.sector.Sites, func(site Site) bool {
		return site.ID == siteID
	})
	if siteIndex < 0 {
		return Miner{}, notFound("site", siteID)
	}
	if s.state.sector.Sites[siteIndex].Kind != "asteroid" || s.state.sector.Sites[siteIndex].Depleted {
		return Miner{}, NewError("site_unavailable", "Site cannot be mined.", map[string]any{
			"site_id": siteID,
		})
	}
	if assigned := s.state.sector.Sites[siteIndex].AssignedMinerID; assigned != "" && assigned != minerID {
		return Miner{}, NewError("site_occupied", "Site already has an assigned miner.", map[string]any{
			"site_id":  siteID,
			"miner_id": assigned,
		})
	}
	if miner.AssignedSiteID == "" && s.energyAvailableLocked() < minerEnergyRequirement {
		return Miner{}, energyCapacityExceeded(minerEnergyRequirement, s.energyUsedLocked(), s.state.resources.maxEnergy)
	}
	if miner.AssignedSiteID != "" && miner.AssignedSiteID != siteID {
		oldSiteIndex := slices.IndexFunc(s.state.sector.Sites, func(site Site) bool {
			return site.ID == miner.AssignedSiteID
		})
		if oldSiteIndex >= 0 {
			s.state.sector.Sites[oldSiteIndex].AssignedMinerID = ""
		}
	}
	miner.AssignedSiteID = siteID
	s.state.miners[minerID] = miner
	s.state.sector.Sites[siteIndex].AssignedMinerID = minerID
	s.appendLogLocked(now, "Autonomous miner assigned to asteroid site.", map[string]any{
		"miner_id": minerID,
		"site_id":  siteID,
	})
	return s.minerLocked(miner), nil
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
		if actionID, ok := s.state.idempotency[key]; ok {
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

	id := fmt.Sprintf("act_scan_%03d", s.state.nextActionNumber)
	s.state.nextActionNumber++
	action := Action{
		ID:         id,
		Type:       ActionTypeScan,
		Status:     ActionStatusPending,
		CreatedAt:  now,
		ResolvesAt: now.Add(ScanDuration),
		Request: map[string]string{
			"direction": direction,
		},
		IdempotencyKey: idempotencyKey,
		RequestHash:    requestHash,
	}
	s.state.actions[id] = action
	s.state.actionOrder = append(s.state.actionOrder, id)
	if idempotencyKey != "" {
		s.state.idempotency[idempotencyMapKey(ActionTypeScan, idempotencyKey)] = id
	}
	s.appendLogLocked(now, "Long-range scan started.", map[string]any{
		"action_id": id,
		"direction": direction,
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

func (s *Store) statusLocked() Status {
	return Status{
		Player:               s.state.player,
		Outpost:              s.state.outpost,
		Resources:            s.resourcesLocked(),
		Sector:               cloneSector(s.state.sector),
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
	oreRate := s.oreRateLocked()
	s.state.resources.ore = minFloat(float64(s.state.resources.maxOre), s.state.resources.ore+delta*oreRate)
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
			site := s.discoverSiteLocked(action.Request["direction"], completedAt)
			action.Result = map[string]any{
				"discovered_site": site,
			}
			s.appendLogLocked(completedAt, "Scan completed and discovered an asteroid site.", map[string]any{
				"action_id": id,
				"site_id":   site.ID,
			})
		}
		s.state.actions[id] = action
	}
}

func (s *Store) discoverSiteLocked(direction string, discoveredAt time.Time) Site {
	s.state.nextSiteNumber++
	number := s.state.nextSiteNumber - 1
	x, y := coordinatesForDirection(direction, number)
	richness := 1 + number%3
	baseRate := 0.75 + float64(richness)*0.25
	site := Site{
		ID:                   fmt.Sprintf("site_ast_%03d", number),
		Name:                 fmt.Sprintf("%s Drift %03d", titleDirection(direction), number),
		Kind:                 "asteroid",
		X:                    x,
		Y:                    y,
		Richness:             richness,
		DiscoveredAt:         discoveredAt,
		BaseOreRatePerSecond: baseRate,
	}
	s.state.sector.Sites = append(s.state.sector.Sites, site)
	return site
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
	var siteName string
	if miner.AssignedSiteID != "" {
		status = "mining"
		if site, ok := s.siteLocked(miner.AssignedSiteID); ok {
			siteName = site.Name
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
			OreRatePerSecond:  minerOreRate(miner.Level + 1),
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
		OreRatePerSecond:   minerOreRate(miner.Level),
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
	energyUsed := s.energyUsedLocked()
	energyCapacity := s.state.resources.maxEnergy
	return Resources{
		Ore:              int(s.state.resources.ore),
		MaxOre:           s.state.resources.maxOre,
		Energy:           energyUsed,
		MaxEnergy:        energyCapacity,
		EnergyCapacity:   energyCapacity,
		EnergyUsed:       energyUsed,
		EnergyAvailable:  energyCapacity - energyUsed,
		OreRatePerSecond: s.oreRateLocked(),
		LastGeneratedAt:  s.state.resources.lastGeneratedAt.Format(time.RFC3339),
	}
}

func (s *Store) suggestedNextActionsLocked() []SuggestedAction {
	suggestions := []SuggestedAction{}
	if s.activeScanLocked() == nil {
		suggestions = append(suggestions, SuggestedAction{
			Key:     "scan",
			Message: "Start a scan to discover more asteroid sites.",
		})
	}
	idleMinerID := ""
	for _, miner := range s.state.miners {
		if miner.AssignedSiteID == "" {
			idleMinerID = miner.ID
			break
		}
	}
	openSiteID := ""
	for _, site := range s.state.sector.Sites {
		if site.Kind == "asteroid" && !site.Depleted && site.AssignedMinerID == "" {
			openSiteID = site.ID
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
	return suggestions
}

func (s *Store) oreRateLocked() float64 {
	rate := 0.0
	for _, miner := range s.state.miners {
		if miner.AssignedSiteID == "" {
			continue
		}
		site, ok := s.siteLocked(miner.AssignedSiteID)
		if !ok || site.Kind != "asteroid" || site.Depleted {
			continue
		}
		rate += minerOreRate(miner.Level) * site.BaseOreRatePerSecond
	}
	return rate
}

func (s *Store) siteLocked(id string) (Site, bool) {
	index := slices.IndexFunc(s.state.sector.Sites, func(site Site) bool {
		return site.ID == id
	})
	if index < 0 {
		return Site{}, false
	}
	return s.state.sector.Sites[index], true
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
	return int(s.state.resources.ore) >= cost.Ore
}

func (s *Store) spendLocked(cost Cost) {
	s.state.resources.ore -= float64(cost.Ore)
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

func cloneSector(sector Sector) Sector {
	sector.Sites = slices.Clone(sector.Sites)
	return sector
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

func minerOreRate(level int) float64 {
	return 1.0 + float64(level-1)*0.75
}

func validDirection(direction string) bool {
	switch direction {
	case "north", "east", "south", "west":
		return true
	default:
		return false
	}
}

func scanRequestHash(direction string) string {
	sum := sha256.Sum256([]byte(direction))
	return hex.EncodeToString(sum[:])
}

func idempotencyMapKey(actionType, key string) string {
	return actionType + ":" + key
}

func coordinatesForDirection(direction string, index int) (int, int) {
	distance := index
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

func titleDirection(direction string) string {
	switch direction {
	case "north":
		return "North"
	case "south":
		return "South"
	case "east":
		return "East"
	case "west":
		return "West"
	default:
		return "Deep Space"
	}
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}
