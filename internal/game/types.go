package game

import "time"

const (
	ActionStatusPending   = "pending"
	ActionStatusCompleted = "completed"

	ActionTypeScan = "scan"
)

// Resource identifiers. Per the gravel canon, a resource's identity is its
// gravel yield and how annoying it is to convert, so these stay plain strings.
const (
	ResourceOre     = "ore"
	ResourceIce     = "ice"
	ResourceGas     = "gas"
	ResourceCrystal = "crystal"
)

// ResourceOrder is the canonical display and iteration order for resources.
var ResourceOrder = []string{ResourceOre, ResourceIce, ResourceGas, ResourceCrystal}

// Location is where a codernaut is stationed on the grid.
type Location struct {
	NodeID   string `json:"node_id"`
	NodeName string `json:"node_name"`
	X        int    `json:"x"`
	Y        int    `json:"y"`
}

type Player struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"display_name"`
	CreatedAt   time.Time `json:"created_at"`
	Location    Location  `json:"location"`
}

type Outpost struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	NodeID string `json:"node_id"`
}

// Resources reports uncapped balances. Energy is assignment capacity, not a
// regenerating spendable resource. The energy and max_energy fields are
// legacy aliases of energy_used and energy_capacity.
type Resources struct {
	Ore              int                `json:"ore"`
	Ice              int                `json:"ice"`
	Gas              int                `json:"gas"`
	Crystal          int                `json:"crystal"`
	RatesPerSecond   map[string]float64 `json:"rates_per_second"`
	OreRatePerSecond float64            `json:"ore_rate_per_second"`
	Energy           int                `json:"energy"`
	MaxEnergy        int                `json:"max_energy"`
	EnergyCapacity   int                `json:"energy_capacity"`
	EnergyUsed       int                `json:"energy_used"`
	EnergyAvailable  int                `json:"energy_available"`
	LastGeneratedAt  string             `json:"last_generated_at"`
}

// Cost is a multi-resource price. Zero-valued resources are omitted.
type Cost struct {
	Ore     int `json:"ore,omitempty"`
	Ice     int `json:"ice,omitempty"`
	Gas     int `json:"gas,omitempty"`
	Crystal int `json:"crystal,omitempty"`
}

// Map returns the nonzero cost components keyed by resource.
func (c Cost) Map() map[string]int {
	costs := map[string]int{}
	if c.Ore > 0 {
		costs[ResourceOre] = c.Ore
	}
	if c.Ice > 0 {
		costs[ResourceIce] = c.Ice
	}
	if c.Gas > 0 {
		costs[ResourceGas] = c.Gas
	}
	if c.Crystal > 0 {
		costs[ResourceCrystal] = c.Crystal
	}
	return costs
}

// IsZero reports whether the cost has no components.
func (c Cost) IsZero() bool {
	return c.Ore == 0 && c.Ice == 0 && c.Gas == 0 && c.Crystal == 0
}

type Miner struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Level              int       `json:"level"`
	RatePerSecond      float64   `json:"rate_per_second"`
	OreRatePerSecond   float64   `json:"ore_rate_per_second"`
	Resource           string    `json:"resource,omitempty"`
	EnergyRequirement  int       `json:"energy_requirement"`
	AssignedSiteID     string    `json:"assigned_site_id,omitempty"`
	AssignedSiteName   string    `json:"assigned_site_name,omitempty"`
	Status             string    `json:"status"`
	BuildCost          Cost      `json:"build_cost"`
	NextUpgradeCost    *Cost     `json:"next_upgrade_cost,omitempty"`
	NextUpgradePreview *Miner    `json:"next_upgrade_preview,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

// Site is a workable deposit on a node. A miner assigned to a site produces
// the site's resource.
type Site struct {
	ID                string    `json:"id"`
	NodeID            string    `json:"node_id"`
	Name              string    `json:"name"`
	Kind              string    `json:"kind"`
	Resource          string    `json:"resource"`
	X                 int       `json:"x"`
	Y                 int       `json:"y"`
	Richness          int       `json:"richness"`
	BaseRatePerSecond float64   `json:"base_rate_per_second"`
	AssignedMinerID   string    `json:"assigned_miner_id,omitempty"`
	DiscoveredAt      time.Time `json:"discovered_at"`
	Depleted          bool      `json:"depleted"`
}

// Node is a coordinate on the grid holding multiple sites. Nodes must be
// claimed before their sites can be worked. claim_cost is present only while
// the node is unclaimed.
type Node struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Kind         string    `json:"kind"`
	Trait        string    `json:"trait"`
	X            int       `json:"x"`
	Y            int       `json:"y"`
	Distance     int       `json:"distance"`
	DiscoveredAt time.Time `json:"discovered_at"`
	ClaimedBy    string    `json:"claimed_by,omitempty"`
	ClaimCost    *Cost     `json:"claim_cost,omitempty"`
	Sites        []Site    `json:"sites"`
}

type Sector struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Nodes []Node `json:"nodes"`
}

type Action struct {
	ID             string            `json:"id"`
	Type           string            `json:"type"`
	Status         string            `json:"status"`
	CreatedAt      time.Time         `json:"created_at"`
	ResolvesAt     time.Time         `json:"resolves_at"`
	CompletedAt    *time.Time        `json:"completed_at,omitempty"`
	Request        map[string]string `json:"request,omitempty"`
	Result         map[string]any    `json:"result,omitempty"`
	IdempotencyKey string            `json:"-"`
	RequestHash    string            `json:"-"`
}

type LogEntry struct {
	ID        string         `json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	Message   string         `json:"message"`
	Fields    map[string]any `json:"fields,omitempty"`
}

// Season identifies one competitive run. A server restart starts a new
// season, which is the prototype's reset mechanism.
type Season struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	StartedAt time.Time `json:"started_at"`
}

// Gravel is the only leaderboard score. Total decides the winner, per_hour
// decides the trash talk.
type Gravel struct {
	Total   int64   `json:"total"`
	PerHour float64 `json:"per_hour"`
	Season  Season  `json:"season"`
}

// CrusherUpgrade previews the next crusher tier.
type CrusherUpgrade struct {
	Level           int     `json:"level"`
	Name            string  `json:"name"`
	YieldMultiplier float64 `json:"yield_multiplier"`
	UnlocksResource string  `json:"unlocks_resource,omitempty"`
	Cost            Cost    `json:"cost"`
}

// Crusher converts resources into gravel. Higher tiers unlock harder
// resources and raise the gravel yield.
type Crusher struct {
	Level             int             `json:"level"`
	Name              string          `json:"name"`
	YieldMultiplier   float64         `json:"yield_multiplier"`
	UnlockedResources []string        `json:"unlocked_resources"`
	NextUpgrade       *CrusherUpgrade `json:"next_upgrade,omitempty"`
}

type ConversionRate struct {
	Resource             string `json:"resource"`
	GravelPerUnit        int    `json:"gravel_per_unit"`
	RequiredCrusherLevel int    `json:"required_crusher_level"`
	Unlocked             bool   `json:"unlocked"`
}

type Conversions struct {
	Crusher Crusher          `json:"crusher"`
	Rates   []ConversionRate `json:"rates"`
}

type ConversionResult struct {
	Resource        string    `json:"resource"`
	AmountConverted int       `json:"amount_converted"`
	GravelPerUnit   int       `json:"gravel_per_unit"`
	YieldMultiplier float64   `json:"yield_multiplier"`
	GravelEarned    int64     `json:"gravel_earned"`
	GravelTotal     int64     `json:"gravel_total"`
	Resources       Resources `json:"resources"`
}

type LeaderboardEntry struct {
	Rank          int     `json:"rank"`
	PlayerID      string  `json:"player_id"`
	Codernaut     string  `json:"codernaut"`
	Gravel        int64   `json:"gravel"`
	GravelPerHour float64 `json:"gravel_per_hour"`
	IsYou         bool    `json:"is_you"`
}

type Leaderboard struct {
	Season  Season             `json:"season"`
	Entries []LeaderboardEntry `json:"entries"`
}

type Status struct {
	ServerTime           time.Time         `json:"server_time"`
	Player               Player            `json:"player"`
	Outpost              Outpost           `json:"outpost"`
	Resources            Resources         `json:"resources"`
	Gravel               Gravel            `json:"gravel"`
	Crusher              Crusher           `json:"crusher"`
	Sector               Sector            `json:"sector"`
	Miners               []Miner           `json:"miners"`
	ActiveActions        []Action          `json:"active_actions"`
	SuggestedNextActions []SuggestedAction `json:"suggested_next_actions"`
}

type SuggestedAction struct {
	Key     string `json:"key"`
	Message string `json:"message"`
}
