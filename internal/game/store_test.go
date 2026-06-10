package game_test

import (
	"errors"
	"testing"
	"time"

	"github.com/stirby/codernauts/internal/game"
)

type fakeClock struct {
	now time.Time
}

func (c *fakeClock) Now() time.Time {
	return c.now
}

func (c *fakeClock) Advance(duration time.Duration) {
	c.now = c.now.Add(duration)
}

func newTestStore(t *testing.T) (*game.Store, *fakeClock) {
	t.Helper()
	clock := &fakeClock{now: time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)}
	return game.NewStore(clock), clock
}

func TestStatusReportsServerTime(t *testing.T) {
	store, clock := newTestStore(t)
	clock.Advance(42 * time.Second)

	status := store.Status()
	if got, want := status.ServerTime, clock.Now().UTC(); !got.Equal(want) {
		t.Fatalf("server time = %v, want %v", got, want)
	}
}

func TestHomeNodeStartsClaimedWithThreeSites(t *testing.T) {
	store, _ := newTestStore(t)
	status := store.Status()

	if got, want := len(status.Sector.Nodes), 1; got != want {
		t.Fatalf("node count = %d, want %d", got, want)
	}
	home := status.Sector.Nodes[0]
	if home.ID != "node_home" || home.ClaimedBy != status.Player.ID {
		t.Fatalf("home node = %+v, want claimed node_home", home)
	}
	if home.ClaimCost != nil {
		t.Fatalf("home claim cost = %+v, want nil", home.ClaimCost)
	}
	if got, want := len(home.Sites), 3; got != want {
		t.Fatalf("home site count = %d, want %d", got, want)
	}
	resources := map[string]int{}
	for _, site := range home.Sites {
		resources[site.Resource]++
		if site.Kind != "deposit" {
			t.Fatalf("site kind = %q, want deposit", site.Kind)
		}
	}
	if resources["ore"] != 2 || resources["ice"] != 1 {
		t.Fatalf("home site resources = %v, want 2 ore and 1 ice", resources)
	}
}

func TestStatusIncludesCodernautLocationAndSeason(t *testing.T) {
	store, _ := newTestStore(t)
	status := store.Status()

	location := status.Player.Location
	if location.NodeID != "node_home" || location.NodeName != "Vesta-41" || location.X != 0 || location.Y != 0 {
		t.Fatalf("player location = %+v, want home node at origin", location)
	}
	if got, want := status.Outpost.NodeID, "node_home"; got != want {
		t.Fatalf("outpost node = %q, want %q", got, want)
	}
	if status.Gravel.Season.ID == "" || status.Gravel.Season.Name == "" {
		t.Fatalf("season = %+v, want id and name", status.Gravel.Season)
	}

	again := store.Status()
	if again.Gravel.Season != status.Gravel.Season {
		t.Fatalf("season changed between reads: %+v then %+v", status.Gravel.Season, again.Gravel.Season)
	}
}

func TestResourceAccrualComesFromAssignedMiners(t *testing.T) {
	store, clock := newTestStore(t)
	initial := store.Status()

	clock.Advance(10 * time.Second)
	status := store.Status()

	if got, want := status.Resources.Ore, initial.Resources.Ore+10; got != want {
		t.Fatalf("ore = %d, want %d", got, want)
	}
	if got, want := status.Resources.RatesPerSecond["ore"], 1.0; got != want {
		t.Fatalf("ore rate = %v, want %v", got, want)
	}
	if got, want := status.Resources.OreRatePerSecond, 1.0; got != want {
		t.Fatalf("legacy ore rate = %v, want %v", got, want)
	}
	if got, want := status.Resources.EnergyUsed, initial.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used = %d, want %d", got, want)
	}
}

func TestResourcesAreUncapped(t *testing.T) {
	store, clock := newTestStore(t)

	clock.Advance(3 * time.Hour)
	status := store.Status()

	if status.Resources.Ore <= 10000 {
		t.Fatalf("ore after 3 hours = %d, want well above the old 1000 cap", status.Resources.Ore)
	}
}

func TestMultiResourceAccrualFollowsSiteResource(t *testing.T) {
	store, clock := newTestStore(t)

	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	if _, err := store.AssignMiner(miner.ID, "site_home_perma"); err != nil {
		t.Fatalf("assign miner to ice site: %v", err)
	}

	clock.Advance(100 * time.Second)
	status := store.Status()

	if got, want := status.Resources.Ice, 50; got != want {
		t.Fatalf("ice = %d, want %d", got, want)
	}
	if got, want := status.Resources.RatesPerSecond["ice"], 0.5; got != want {
		t.Fatalf("ice rate = %v, want %v", got, want)
	}

	assigned := findMiner(t, store, miner.ID)
	if assigned.Resource != "ice" || assigned.Status != "mining" {
		t.Fatalf("miner = %+v, want mining ice", assigned)
	}
}

func TestMinerBuildUpgradeAssign(t *testing.T) {
	store, _ := newTestStore(t)

	initial := store.Status()
	built, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	if built.Status != "idle" {
		t.Fatalf("built miner status = %q, want idle", built.Status)
	}
	status := store.Status()
	if got, want := status.Resources.Ore, initial.Resources.Ore-175; got != want {
		t.Fatalf("ore after build = %d, want %d", got, want)
	}

	assigned, err := store.AssignMiner(built.ID, "site_home_basalt")
	if err != nil {
		t.Fatalf("assign miner: %v", err)
	}
	if assigned.AssignedSiteID != "site_home_basalt" || assigned.Status != "mining" || assigned.Resource != "ore" {
		t.Fatalf("assigned miner = %+v, want mining ore on basalt", assigned)
	}
	status = store.Status()
	if got, want := status.Resources.EnergyUsed, initial.Resources.EnergyUsed+assigned.EnergyRequirement; got != want {
		t.Fatalf("energy used after assignment = %d, want %d", got, want)
	}

	beforeUpgrade := store.Status()
	upgraded, err := store.UpgradeMiner("min_starter")
	if err != nil {
		t.Fatalf("upgrade miner: %v", err)
	}
	if upgraded.Level != 2 {
		t.Fatalf("upgraded level = %d, want 2", upgraded.Level)
	}
	if upgraded.RatePerSecond <= 1.0 {
		t.Fatalf("upgraded rate = %v, want greater than 1", upgraded.RatePerSecond)
	}
	status = store.Status()
	if got, want := status.Resources.EnergyCapacity, beforeUpgrade.Resources.EnergyCapacity+30; got != want {
		t.Fatalf("energy capacity after upgrade = %d, want %d", got, want)
	}
}

func TestAssignMinerRejectsEnergyCapacityExceeded(t *testing.T) {
	store, clock := newTestStore(t)
	// Fund three miner builds (175+250+325 ore) plus a distance-1 claim
	// (150 ore) from the starter miner's 1.0 ore/s.
	clock.Advance(700 * time.Second)

	first, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build first miner: %v", err)
	}
	if _, err := store.AssignMiner(first.ID, "site_home_basalt"); err != nil {
		t.Fatalf("assign first miner: %v", err)
	}
	second, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build second miner: %v", err)
	}
	if _, err := store.AssignMiner(second.ID, "site_home_perma"); err != nil {
		t.Fatalf("assign second miner: %v", err)
	}
	status := store.Status()
	if got, want := status.Resources.EnergyAvailable, 10; got != want {
		t.Fatalf("energy available before rejected assign = %d, want %d", got, want)
	}

	third, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build third miner: %v", err)
	}
	node := completeScan(t, store, clock, "east", "capacity-overflow")
	if _, err := store.ClaimNode(node.ID, ""); err != nil {
		t.Fatalf("claim scanned node: %v", err)
	}
	_, err = store.AssignMiner(third.ID, node.Sites[0].ID)
	assertGameErrorCode(t, err, "energy_capacity_exceeded")

	status = store.Status()
	if got, want := status.Resources.EnergyAvailable, 10; got != want {
		t.Fatalf("energy available after rejected assign = %d, want %d", got, want)
	}
}

func TestMovingAssignedMinerDoesNotConsumeExtraEnergyCapacity(t *testing.T) {
	store, _ := newTestStore(t)

	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	if _, err := store.AssignMiner(miner.ID, "site_home_basalt"); err != nil {
		t.Fatalf("assign miner: %v", err)
	}
	before := store.Status()

	moved, err := store.AssignMiner(miner.ID, "site_home_perma")
	if err != nil {
		t.Fatalf("move miner: %v", err)
	}
	if moved.AssignedSiteID != "site_home_perma" {
		t.Fatalf("moved site = %q, want site_home_perma", moved.AssignedSiteID)
	}
	after := store.Status()
	if got, want := after.Resources.EnergyUsed, before.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after move = %d, want %d", got, want)
	}

	sector := store.Sector()
	for _, site := range sector.Nodes[0].Sites {
		if site.ID == "site_home_basalt" && site.AssignedMinerID != "" {
			t.Fatalf("old site still assigned to %q", site.AssignedMinerID)
		}
	}
}

func TestScanDurationScalesWithDistance(t *testing.T) {
	store, clock := newTestStore(t)

	first, err := store.StartScan("east", "scan-east-1")
	if err != nil {
		t.Fatalf("start first scan: %v", err)
	}
	if got, want := first.ResolvesAt.Sub(first.CreatedAt), 15*time.Second; got != want {
		t.Fatalf("first scan duration = %v, want %v", got, want)
	}
	clock.Advance(15 * time.Second)
	if _, err := store.Action(first.ID); err != nil {
		t.Fatalf("resolve first scan: %v", err)
	}

	second, err := store.StartScan("east", "scan-east-2")
	if err != nil {
		t.Fatalf("start second scan: %v", err)
	}
	if got, want := second.ResolvesAt.Sub(second.CreatedAt), 35*time.Second; got != want {
		t.Fatalf("second scan duration = %v, want %v", got, want)
	}

	if got, want := game.ScanDurationForDistance(3), 55*time.Second; got != want {
		t.Fatalf("distance 3 duration = %v, want %v", got, want)
	}
}

func TestScanDiscoveryIsDeterministic(t *testing.T) {
	store, clock := newTestStore(t)

	first := completeScan(t, store, clock, "east", "determinism-1")
	if first.ID != "node_east_1" || first.Trait != "frozen" || first.Name != "Bleak Slush" {
		t.Fatalf("first east node = %+v, want frozen Bleak Slush node_east_1", first)
	}
	if first.Kind != "asteroid_field" || first.X != 1 || first.Y != 0 || first.Distance != 1 {
		t.Fatalf("first east node geometry = %+v, want asteroid_field at (1,0) distance 1", first)
	}
	if first.ClaimCost == nil || first.ClaimCost.Ore != 150 || first.ClaimCost.Ice != 0 {
		t.Fatalf("first east claim cost = %+v, want 150 ore", first.ClaimCost)
	}
	if len(first.Sites) != 3 {
		t.Fatalf("first east site count = %d, want 3", len(first.Sites))
	}
	rich := first.Sites[0]
	if rich.Resource != "ice" || rich.BaseRatePerSecond != 1.0 || rich.Richness != 2 {
		t.Fatalf("rich site = %+v, want ice base 1.0 richness 2", rich)
	}
	if first.Sites[2].Resource != "ore" || first.Sites[2].BaseRatePerSecond != 0.5 {
		t.Fatalf("secondary site = %+v, want ore base 0.5", first.Sites[2])
	}

	second := completeScan(t, store, clock, "east", "determinism-2")
	if second.ID != "node_east_2" || second.Trait != "volatile" || second.Name != "Belcher's Pocket" {
		t.Fatalf("second east node = %+v, want volatile Belcher's Pocket node_east_2", second)
	}
	if second.Kind != "planet" || second.Distance != 2 {
		t.Fatalf("second east node = %+v, want planet at distance 2", second)
	}
	if second.ClaimCost == nil || second.ClaimCost.Ore != 600 || second.ClaimCost.Ice != 100 {
		t.Fatalf("second east claim cost = %+v, want 600 ore and 100 ice", second.ClaimCost)
	}
	if second.Sites[0].Resource != "gas" || second.Sites[0].BaseRatePerSecond != 1.5 {
		t.Fatalf("second east rich site = %+v, want gas base 1.5", second.Sites[0])
	}
}

func TestClaimNode(t *testing.T) {
	store, clock := newTestStore(t)
	node := completeScan(t, store, clock, "east", "claim-happy")

	before := store.Status()
	claimed, err := store.ClaimNode(node.ID, "")
	if err != nil {
		t.Fatalf("claim node: %v", err)
	}
	if claimed.ClaimedBy != before.Player.ID {
		t.Fatalf("claimed_by = %q, want %q", claimed.ClaimedBy, before.Player.ID)
	}
	if claimed.ClaimCost != nil {
		t.Fatalf("claim cost after claim = %+v, want nil", claimed.ClaimCost)
	}
	after := store.Status()
	if got, want := after.Resources.Ore, before.Resources.Ore-150; got != want {
		t.Fatalf("ore after claim = %d, want %d", got, want)
	}

	_, err = store.ClaimNode(node.ID, "")
	assertGameErrorCode(t, err, "node_already_claimed")
}

func TestClaimNodeErrors(t *testing.T) {
	store, clock := newTestStore(t)

	_, err := store.ClaimNode("node_phantom", "")
	assertGameErrorCode(t, err, "not_found")

	_, err = store.ClaimNode("node_home", "")
	assertGameErrorCode(t, err, "node_already_claimed")

	node := completeScan(t, store, clock, "north", "claim-error")
	if _, err := store.Convert("ore", nil, ""); err != nil {
		t.Fatalf("convert ore away: %v", err)
	}
	status := store.Status()
	if status.Resources.Ore >= 150 {
		t.Fatalf("ore = %d, want below the 150 claim cost", status.Resources.Ore)
	}
	_, err = store.ClaimNode(node.ID, "")
	assertGameErrorCode(t, err, "insufficient_resources")
}

func TestClaimNodeIdempotency(t *testing.T) {
	store, clock := newTestStore(t)
	node := completeScan(t, store, clock, "east", "claim-idem-scan")

	before := store.Status()
	first, err := store.ClaimNode(node.ID, "claim-key")
	if err != nil {
		t.Fatalf("claim node: %v", err)
	}
	replay, err := store.ClaimNode(node.ID, "claim-key")
	if err != nil {
		t.Fatalf("replay claim: %v", err)
	}
	if replay.ID != first.ID || replay.ClaimedBy != first.ClaimedBy {
		t.Fatalf("replayed claim = %+v, want %+v", replay, first)
	}
	after := store.Status()
	if got, want := after.Resources.Ore, before.Resources.Ore-150; got != want {
		t.Fatalf("ore after replay = %d, want single spend %d", got, want)
	}

	_, err = store.ClaimNode("node_home", "claim-key")
	assertGameErrorCode(t, err, "idempotency_conflict")
}

func TestAssignMinerOnUnclaimedNodeFails(t *testing.T) {
	store, clock := newTestStore(t)
	node := completeScan(t, store, clock, "south", "unclaimed-assign")

	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	_, err = store.AssignMiner(miner.ID, node.Sites[0].ID)
	assertGameErrorCode(t, err, "node_not_claimed")
}

func TestConvertEarnsGravel(t *testing.T) {
	store, _ := newTestStore(t)
	before := store.Status()
	if before.Gravel.Total != 0 {
		t.Fatalf("starting gravel = %d, want 0", before.Gravel.Total)
	}

	amount := 100
	result, err := store.Convert("ore", &amount, "")
	if err != nil {
		t.Fatalf("convert ore: %v", err)
	}
	if result.AmountConverted != 100 || result.GravelEarned != 100 || result.GravelTotal != 100 {
		t.Fatalf("conversion result = %+v, want 100 gravel from 100 ore", result)
	}
	if result.YieldMultiplier != 1.0 || result.GravelPerUnit != 1 {
		t.Fatalf("conversion rate = %+v, want base ore rate", result)
	}
	if got, want := result.Resources.Ore, before.Resources.Ore-100; got != want {
		t.Fatalf("ore after conversion = %d, want %d", got, want)
	}

	status := store.Status()
	if status.Gravel.Total != 100 {
		t.Fatalf("gravel total = %d, want 100", status.Gravel.Total)
	}
}

func TestConvertDefaultsToFullBalance(t *testing.T) {
	store, _ := newTestStore(t)
	before := store.Status()

	result, err := store.Convert("ore", nil, "")
	if err != nil {
		t.Fatalf("convert all ore: %v", err)
	}
	if result.AmountConverted != before.Resources.Ore {
		t.Fatalf("amount converted = %d, want full balance %d", result.AmountConverted, before.Resources.Ore)
	}
	if result.Resources.Ore != 0 {
		t.Fatalf("ore after convert all = %d, want 0", result.Resources.Ore)
	}
}

func TestConvertFloorsGravelWithYieldMultiplier(t *testing.T) {
	store, clock := newTestStore(t)
	upgradeCrusherToTwo(t, store, clock)

	amount := 3
	result, err := store.Convert("ice", &amount, "")
	if err != nil {
		t.Fatalf("convert ice: %v", err)
	}
	if result.GravelEarned != 11 {
		t.Fatalf("gravel earned = %d, want floor(3*3*1.25) = 11", result.GravelEarned)
	}
}

func TestConvertErrors(t *testing.T) {
	store, _ := newTestStore(t)

	_, err := store.Convert("unobtanium", nil, "")
	assertGameErrorCode(t, err, "invalid_resource")

	zero := 0
	_, err = store.Convert("ore", &zero, "")
	assertGameErrorCode(t, err, "invalid_amount")

	negative := -5
	_, err = store.Convert("ore", &negative, "")
	assertGameErrorCode(t, err, "invalid_amount")

	_, err = store.Convert("gas", nil, "")
	assertGameErrorCode(t, err, "crusher_level_too_low")

	_, err = store.Convert("crystal", nil, "")
	assertGameErrorCode(t, err, "crusher_level_too_low")

	tooMuch := 10000
	_, err = store.Convert("ore", &tooMuch, "")
	assertGameErrorCode(t, err, "insufficient_resources")

	_, err = store.Convert("ice", nil, "")
	assertGameErrorCode(t, err, "insufficient_resources")
}

func TestConvertIdempotency(t *testing.T) {
	store, _ := newTestStore(t)

	amount := 50
	first, err := store.Convert("ore", &amount, "convert-key")
	if err != nil {
		t.Fatalf("convert: %v", err)
	}
	replay, err := store.Convert("ore", &amount, "convert-key")
	if err != nil {
		t.Fatalf("replay convert: %v", err)
	}
	if replay.GravelTotal != first.GravelTotal || replay.AmountConverted != first.AmountConverted {
		t.Fatalf("replayed conversion = %+v, want %+v", replay, first)
	}
	status := store.Status()
	if status.Gravel.Total != first.GravelTotal {
		t.Fatalf("gravel total = %d, want single conversion %d", status.Gravel.Total, first.GravelTotal)
	}

	other := 75
	_, err = store.Convert("ore", &other, "convert-key")
	assertGameErrorCode(t, err, "idempotency_conflict")
}

func TestCrusherProgressionThroughAllTiers(t *testing.T) {
	store, clock := newTestStore(t)

	crusher := store.Status().Crusher
	if crusher.Level != 1 || crusher.Name != "Crusher Mk I" {
		t.Fatalf("starting crusher = %+v, want level 1 Crusher Mk I", crusher)
	}
	if crusher.NextUpgrade == nil || crusher.NextUpgrade.Name != "Crusher Mk II" || crusher.NextUpgrade.UnlocksResource != "gas" {
		t.Fatalf("starting next upgrade = %+v, want Crusher Mk II unlocking gas", crusher.NextUpgrade)
	}

	upgraded := upgradeCrusherToTwo(t, store, clock)
	if upgraded.Level != 2 || upgraded.Name != "Crusher Mk II" || upgraded.YieldMultiplier != 1.25 {
		t.Fatalf("crusher two = %+v, want level 2 at 1.25x", upgraded)
	}
	if !contains(upgraded.UnlockedResources, "gas") || contains(upgraded.UnlockedResources, "crystal") {
		t.Fatalf("crusher two unlocks = %v, want gas without crystal", upgraded.UnlockedResources)
	}

	// Claim the frozen node at east 1 and the volatile node at east 2, then
	// put miners on gas so tier three becomes affordable.
	east1 := completeScan(t, store, clock, "east", "tiers-east-1")
	if _, err := store.ClaimNode(east1.ID, ""); err != nil {
		t.Fatalf("claim east 1: %v", err)
	}
	east2 := completeScan(t, store, clock, "east", "tiers-east-2")
	clock.Advance(600 * time.Second)
	if _, err := store.ClaimNode(east2.ID, ""); err != nil {
		t.Fatalf("claim east 2: %v", err)
	}
	if _, err := store.UpgradeMiner("min_starter"); err != nil {
		t.Fatalf("upgrade starter for capacity: %v", err)
	}
	clock.Advance(600 * time.Second)
	gasMiner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build gas miner: %v", err)
	}
	if _, err := store.AssignMiner(gasMiner.ID, east2.Sites[0].ID); err != nil {
		t.Fatalf("assign gas miner: %v", err)
	}
	clock.Advance(900 * time.Second)

	three, err := store.UpgradeCrusher()
	if err != nil {
		t.Fatalf("upgrade crusher to three: %v", err)
	}
	if three.Level != 3 || three.Name != "Sub-Orbital Aggregate Processing" {
		t.Fatalf("crusher three = %+v, want Sub-Orbital Aggregate Processing", three)
	}
	if !contains(three.UnlockedResources, "crystal") {
		t.Fatalf("crusher three unlocks = %v, want crystal", three.UnlockedResources)
	}

	// Claim the crystalline node at east 3 and mine crystal for tier four.
	east3 := completeScan(t, store, clock, "east", "tiers-east-3")
	clock.Advance(1800 * time.Second)
	if _, err := store.ClaimNode(east3.ID, ""); err != nil {
		t.Fatalf("claim east 3: %v", err)
	}
	if _, err := store.UpgradeMiner(gasMiner.ID); err != nil {
		t.Fatalf("upgrade gas miner for capacity: %v", err)
	}
	crystalMiner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build crystal miner: %v", err)
	}
	if _, err := store.AssignMiner(crystalMiner.ID, east3.Sites[0].ID); err != nil {
		t.Fatalf("assign crystal miner: %v", err)
	}
	clock.Advance(2 * time.Hour)

	four, err := store.UpgradeCrusher()
	if err != nil {
		t.Fatalf("upgrade crusher to four: %v", err)
	}
	if four.Level != 4 || four.Name != "Universal Gravelization Protocol" || four.YieldMultiplier != 2.0 {
		t.Fatalf("crusher four = %+v, want Universal Gravelization Protocol at 2.0x", four)
	}
	if four.NextUpgrade != nil {
		t.Fatalf("crusher four next upgrade = %+v, want nil", four.NextUpgrade)
	}

	_, err = store.UpgradeCrusher()
	assertGameErrorCode(t, err, "max_level")

	amount := 10
	result, err := store.Convert("crystal", &amount, "")
	if err != nil {
		t.Fatalf("convert crystal: %v", err)
	}
	if result.GravelEarned != 500 {
		t.Fatalf("crystal gravel = %d, want floor(10*25*2.0) = 500", result.GravelEarned)
	}
}

func TestCrusherUpgradeInsufficientResources(t *testing.T) {
	store, _ := newTestStore(t)
	_, err := store.UpgradeCrusher()
	assertGameErrorCode(t, err, "insufficient_resources")
}

func TestGravelPerHourUsesSlidingWindow(t *testing.T) {
	store, clock := newTestStore(t)

	clock.Advance(60 * time.Second)
	amount := 100
	if _, err := store.Convert("ore", &amount, ""); err != nil {
		t.Fatalf("convert: %v", err)
	}
	status := store.Status()
	if got, want := status.Gravel.PerHour, 6000.0; got != want {
		t.Fatalf("per hour right after conversion = %v, want %v", got, want)
	}

	clock.Advance(540 * time.Second)
	status = store.Status()
	if got, want := status.Gravel.PerHour, 600.0; got != want {
		t.Fatalf("per hour at ten minutes = %v, want %v", got, want)
	}

	clock.Advance(2 * time.Hour)
	status = store.Status()
	if got, want := status.Gravel.PerHour, 0.0; got != want {
		t.Fatalf("per hour after window passed = %v, want %v", got, want)
	}
	if got, want := status.Gravel.Total, int64(100); got != want {
		t.Fatalf("gravel total = %d, want %d kept forever", got, want)
	}
}

func TestLeaderboardRanksByGravel(t *testing.T) {
	store, _ := newTestStore(t)

	board := store.Leaderboard()
	if len(board.Entries) != 1 {
		t.Fatalf("entry count = %d, want 1", len(board.Entries))
	}
	entry := board.Entries[0]
	if entry.Rank != 1 || !entry.IsYou || entry.Gravel != 0 {
		t.Fatalf("entry = %+v, want rank 1 you with 0 gravel", entry)
	}
	if entry.Codernaut == "" || entry.PlayerID == "" {
		t.Fatalf("entry = %+v, want codernaut and player id", entry)
	}
	if board.Season.ID == "" {
		t.Fatalf("season = %+v, want id", board.Season)
	}

	amount := 25
	if _, err := store.Convert("ore", &amount, ""); err != nil {
		t.Fatalf("convert: %v", err)
	}
	board = store.Leaderboard()
	if got, want := board.Entries[0].Gravel, int64(25); got != want {
		t.Fatalf("gravel after conversion = %d, want %d", got, want)
	}
}

func TestSuggestedNextActionsPriorities(t *testing.T) {
	store, clock := newTestStore(t)

	keys := suggestionKeys(store.Status())
	if got, want := keys, []string{"build_miner", "convert", "scan"}; !slicesEqual(got, want) {
		t.Fatalf("fresh suggestions = %v, want %v", got, want)
	}

	completeScan(t, store, clock, "east", "suggest-claim")
	keys = suggestionKeys(store.Status())
	if len(keys) == 0 || keys[0] != "claim_node" {
		t.Fatalf("suggestions with affordable claim = %v, want claim_node first", keys)
	}

	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	keys = suggestionKeys(store.Status())
	if !containsAfter(keys, "claim_node", "assign_miner") {
		t.Fatalf("suggestions with idle miner = %v, want assign_miner after claim_node", keys)
	}
	if _, err := store.AssignMiner(miner.ID, "site_home_basalt"); err != nil {
		t.Fatalf("assign miner: %v", err)
	}
}

func TestScanIdempotencyAndLazyCompletion(t *testing.T) {
	store, clock := newTestStore(t)

	action, err := store.StartScan("north", "same-key")
	if err != nil {
		t.Fatalf("start scan: %v", err)
	}
	retry, err := store.StartScan("north", "same-key")
	if err != nil {
		t.Fatalf("retry scan: %v", err)
	}
	if retry.ID != action.ID {
		t.Fatalf("retry action ID = %q, want %q", retry.ID, action.ID)
	}
	if _, err := store.StartScan("south", "same-key"); err == nil {
		t.Fatal("start scan with reused key and different request succeeded")
	}

	sector := store.Sector()
	if len(sector.Nodes) != 1 {
		t.Fatalf("node count before completion = %d, want 1", len(sector.Nodes))
	}
	clock.Advance(game.ScanDurationForDistance(1) - time.Second)
	pending, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("get pending action: %v", err)
	}
	if pending.Status != game.ActionStatusPending {
		t.Fatalf("status before duration = %q, want pending", pending.Status)
	}

	clock.Advance(time.Second)
	completed, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("get completed action: %v", err)
	}
	if completed.Status != game.ActionStatusCompleted {
		t.Fatalf("status after duration = %q, want completed", completed.Status)
	}
	node, ok := completed.Result["discovered_node"].(game.Node)
	if !ok {
		t.Fatalf("scan result = %+v, want discovered_node", completed.Result)
	}
	if node.ID != "node_north_1" || node.Trait != "metallic" {
		t.Fatalf("north node = %+v, want metallic node_north_1", node)
	}
	sector = store.Sector()
	if len(sector.Nodes) != 2 {
		t.Fatalf("node count after completion = %d, want 2", len(sector.Nodes))
	}
}

func TestScanAllowsOneActiveScan(t *testing.T) {
	store, _ := newTestStore(t)
	if _, err := store.StartScan("north", "first"); err != nil {
		t.Fatalf("start first scan: %v", err)
	}
	if _, err := store.StartScan("east", "second"); err == nil {
		t.Fatal("start second active scan succeeded")
	}
}

func TestScanRejectsNonCardinalDirections(t *testing.T) {
	store, _ := newTestStore(t)
	for _, direction := range []string{"coreward", "rimward", "spinward", "trailing"} {
		if _, err := store.StartScan(direction, ""); err == nil {
			t.Fatalf("start scan with direction %q succeeded", direction)
		}
	}
}

func TestClaimCostScalesWithDistance(t *testing.T) {
	costs := map[int]game.Cost{
		1: {Ore: 150},
		2: {Ore: 600, Ice: 100},
		3: {Ore: 1350, Ice: 400, Gas: 75},
		4: {Ore: 2400, Ice: 900, Gas: 300},
	}
	for distance, want := range costs {
		if got := game.ClaimCostForDistance(distance); got != want {
			t.Fatalf("claim cost at distance %d = %+v, want %+v", distance, got, want)
		}
	}
}

// upgradeCrusherToTwo banks enough ore and ice with home miners, then buys
// crusher tier two.
func upgradeCrusherToTwo(t *testing.T, store *game.Store, clock *fakeClock) game.Crusher {
	t.Helper()
	miner, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build ice miner: %v", err)
	}
	if _, err := store.AssignMiner(miner.ID, "site_home_perma"); err != nil {
		t.Fatalf("assign ice miner: %v", err)
	}
	clock.Advance(1200 * time.Second)
	crusher, err := store.UpgradeCrusher()
	if err != nil {
		t.Fatalf("upgrade crusher to two: %v", err)
	}
	return crusher
}

func completeScan(t *testing.T, store *game.Store, clock *fakeClock, direction, idempotencyKey string) game.Node {
	t.Helper()
	action, err := store.StartScan(direction, idempotencyKey)
	if err != nil {
		t.Fatalf("start scan %q: %v", direction, err)
	}
	clock.Advance(action.ResolvesAt.Sub(action.CreatedAt))
	completed, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("get completed scan: %v", err)
	}
	if completed.Status != game.ActionStatusCompleted {
		t.Fatalf("scan status = %q, want completed", completed.Status)
	}
	node, ok := completed.Result["discovered_node"].(game.Node)
	if !ok {
		t.Fatalf("scan result = %+v, want discovered_node", completed.Result)
	}
	return node
}

func findMiner(t *testing.T, store *game.Store, id string) game.Miner {
	t.Helper()
	for _, miner := range store.Miners() {
		if miner.ID == id {
			return miner
		}
	}
	t.Fatalf("miner %q not found", id)
	return game.Miner{}
}

func suggestionKeys(status game.Status) []string {
	keys := make([]string, 0, len(status.SuggestedNextActions))
	for _, suggestion := range status.SuggestedNextActions {
		keys = append(keys, suggestion.Key)
	}
	return keys
}

func contains(values []string, value string) bool {
	for _, candidate := range values {
		if candidate == value {
			return true
		}
	}
	return false
}

func containsAfter(values []string, first, second string) bool {
	firstIndex, secondIndex := -1, -1
	for i, value := range values {
		if value == first && firstIndex < 0 {
			firstIndex = i
		}
		if value == second && secondIndex < 0 {
			secondIndex = i
		}
	}
	return firstIndex >= 0 && secondIndex > firstIndex
}

func slicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func assertGameErrorCode(t *testing.T, err error, code string) {
	t.Helper()
	if err == nil {
		t.Fatalf("error is nil, want code %q", code)
	}
	var gameErr *game.Error
	if !errors.As(err, &gameErr) {
		t.Fatalf("error type = %T, want *game.Error", err)
	}
	if gameErr.Code != code {
		t.Fatalf("error code = %q, want %q", gameErr.Code, code)
	}
}
