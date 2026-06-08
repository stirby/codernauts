package game

import "time"

const (
	ActionStatusPending   = "pending"
	ActionStatusCompleted = "completed"

	ActionTypeScan = "scan"

	ScanDuration = 30 * time.Second
)

type Player struct {
	ID          string    `json:"id"`
	DisplayName string    `json:"display_name"`
	CreatedAt   time.Time `json:"created_at"`
}

type Outpost struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Resources struct {
	Ore              int     `json:"ore"`
	MaxOre           int     `json:"max_ore"`
	Energy           int     `json:"energy"`
	MaxEnergy        int     `json:"max_energy"`
	EnergyCapacity   int     `json:"energy_capacity"`
	EnergyUsed       int     `json:"energy_used"`
	EnergyAvailable  int     `json:"energy_available"`
	OreRatePerSecond float64 `json:"ore_rate_per_second"`
	LastGeneratedAt  string  `json:"last_generated_at"`
}

type Miner struct {
	ID                 string    `json:"id"`
	Name               string    `json:"name"`
	Level              int       `json:"level"`
	OreRatePerSecond   float64   `json:"ore_rate_per_second"`
	EnergyRequirement  int       `json:"energy_requirement"`
	AssignedSiteID     string    `json:"assigned_site_id,omitempty"`
	AssignedSiteName   string    `json:"assigned_site_name,omitempty"`
	Status             string    `json:"status"`
	BuildCost          Cost      `json:"build_cost"`
	NextUpgradeCost    *Cost     `json:"next_upgrade_cost,omitempty"`
	NextUpgradePreview *Miner    `json:"next_upgrade_preview,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

type Cost struct {
	Ore int `json:"ore"`
}

type Site struct {
	ID                   string    `json:"id"`
	Name                 string    `json:"name"`
	Kind                 string    `json:"kind"`
	X                    int       `json:"x"`
	Y                    int       `json:"y"`
	Richness             int       `json:"richness"`
	AssignedMinerID      string    `json:"assigned_miner_id,omitempty"`
	DiscoveredAt         time.Time `json:"discovered_at"`
	Depleted             bool      `json:"depleted"`
	BaseOreRatePerSecond float64   `json:"base_ore_rate_per_second"`
}

type Sector struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Sites []Site `json:"sites"`
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

type Status struct {
	Player               Player            `json:"player"`
	Outpost              Outpost           `json:"outpost"`
	Resources            Resources         `json:"resources"`
	Sector               Sector            `json:"sector"`
	Miners               []Miner           `json:"miners"`
	ActiveActions        []Action          `json:"active_actions"`
	SuggestedNextActions []SuggestedAction `json:"suggested_next_actions"`
}

type SuggestedAction struct {
	Key     string `json:"key"`
	Message string `json:"message"`
}
