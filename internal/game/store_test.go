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

func TestResourceAccrualComesFromAssignedMiners(t *testing.T) {
	store, clock := newTestStore(t)
	initial := store.Status()

	clock.Advance(10 * time.Second)
	status := store.Status()

	if got, want := status.Resources.Ore, initial.Resources.Ore+10; got != want {
		t.Fatalf("ore = %d, want %d", got, want)
	}
	if got, want := status.Resources.OreRatePerSecond, 1.0; got != want {
		t.Fatalf("ore rate = %v, want %v", got, want)
	}
	if got, want := status.Resources.EnergyUsed, initial.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used = %d, want %d", got, want)
	}
	if got, want := status.Resources.EnergyAvailable, initial.Resources.EnergyAvailable; got != want {
		t.Fatalf("energy available = %d, want %d", got, want)
	}
}

func TestMinerBuildUpgradeAssign(t *testing.T) {
	store, clock := newTestStore(t)

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
	if got, want := status.Resources.EnergyUsed, initial.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after idle build = %d, want %d", got, want)
	}

	scan, err := store.StartScan("east", "scan-for-assignment")
	if err != nil {
		t.Fatalf("start scan: %v", err)
	}
	clock.Advance(game.ScanDuration)
	action, err := store.Action(scan.ID)
	if err != nil {
		t.Fatalf("get scan action: %v", err)
	}
	if action.Status != game.ActionStatusCompleted {
		t.Fatalf("scan status = %q, want completed", action.Status)
	}

	sector := store.Sector()
	if len(sector.Sites) != 2 {
		t.Fatalf("site count = %d, want 2", len(sector.Sites))
	}
	siteID := sector.Sites[1].ID
	assigned, err := store.AssignMiner(built.ID, siteID)
	if err != nil {
		t.Fatalf("assign miner: %v", err)
	}
	if assigned.AssignedSiteID != siteID || assigned.Status != "mining" {
		t.Fatalf("assigned miner = %+v, want site %q and mining", assigned, siteID)
	}
	status = store.Status()
	if got, want := status.Resources.EnergyUsed, initial.Resources.EnergyUsed+assigned.EnergyRequirement; got != want {
		t.Fatalf("energy used after assignment = %d, want %d", got, want)
	}

	clock.Advance(200 * time.Second)
	beforeUpgrade := store.Status()
	upgraded, err := store.UpgradeMiner("min_starter")
	if err != nil {
		t.Fatalf("upgrade miner: %v", err)
	}
	if upgraded.Level != 2 {
		t.Fatalf("upgraded level = %d, want 2", upgraded.Level)
	}
	if upgraded.OreRatePerSecond <= 1.0 {
		t.Fatalf("upgraded ore rate = %v, want greater than 1", upgraded.OreRatePerSecond)
	}
	status = store.Status()
	if got, want := status.Resources.EnergyCapacity, beforeUpgrade.Resources.EnergyCapacity+30; got != want {
		t.Fatalf("energy capacity after upgrade = %d, want %d", got, want)
	}
	if got, want := status.Resources.EnergyUsed, beforeUpgrade.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after upgrade = %d, want %d", got, want)
	}
}

func TestEnergyQuotaComesFromAssignedMiners(t *testing.T) {
	store, clock := newTestStore(t)
	initial := store.Status()

	if got, want := initial.Resources.Energy, initial.Miners[0].EnergyRequirement; got != want {
		t.Fatalf("legacy energy field = %d, want %d", got, want)
	}
	if got, want := initial.Resources.EnergyUsed, initial.Miners[0].EnergyRequirement; got != want {
		t.Fatalf("energy used = %d, want %d", got, want)
	}
	if got, want := initial.Resources.EnergyCapacity, 100; got != want {
		t.Fatalf("energy capacity = %d, want %d", got, want)
	}
	if got, want := initial.Resources.EnergyAvailable, 100-initial.Miners[0].EnergyRequirement; got != want {
		t.Fatalf("energy available = %d, want %d", got, want)
	}

	built, err := store.BuildMiner()
	if err != nil {
		t.Fatalf("build miner: %v", err)
	}
	afterBuild := store.Status()
	if got, want := afterBuild.Resources.EnergyUsed, initial.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after idle build = %d, want %d", got, want)
	}

	siteID := discoverSite(t, store, clock, "east", "quota-site-1")
	assigned, err := store.AssignMiner(built.ID, siteID)
	if err != nil {
		t.Fatalf("assign miner: %v", err)
	}
	afterAssign := store.Status()
	if got, want := afterAssign.Resources.EnergyUsed, initial.Resources.EnergyUsed+assigned.EnergyRequirement; got != want {
		t.Fatalf("energy used after assign = %d, want %d", got, want)
	}

	clock.Advance(time.Hour)
	afterTime := store.Status()
	if got, want := afterTime.Resources.EnergyUsed, afterAssign.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after time = %d, want %d", got, want)
	}
	if got, want := afterTime.Resources.EnergyAvailable, afterAssign.Resources.EnergyAvailable; got != want {
		t.Fatalf("energy available after time = %d, want %d", got, want)
	}
}

func TestAssignMinerRejectsEnergyCapacityExceeded(t *testing.T) {
	store, clock := newTestStore(t)
	clock.Advance(500 * time.Second)
	store.Status()
	built := buildMiners(t, store, 3)
	for i, miner := range built[:2] {
		siteID := discoverSite(t, store, clock, []string{"east", "south"}[i], "capacity-fill-"+[]string{"east", "south"}[i])
		if _, err := store.AssignMiner(miner.ID, siteID); err != nil {
			t.Fatalf("assign filler miner %d: %v", i, err)
		}
	}
	status := store.Status()
	if got, want := status.Resources.EnergyAvailable, 10; got != want {
		t.Fatalf("energy available before rejected assign = %d, want %d", got, want)
	}

	siteID := discoverSite(t, store, clock, "west", "capacity-overflow")
	_, err := store.AssignMiner(built[2].ID, siteID)
	assertGameErrorCode(t, err, "energy_capacity_exceeded")

	status = store.Status()
	if got, want := status.Resources.EnergyAvailable, 10; got != want {
		t.Fatalf("energy available after rejected assign = %d, want %d", got, want)
	}
}

func TestMovingAssignedMinerDoesNotConsumeExtraEnergyCapacity(t *testing.T) {
	store, clock := newTestStore(t)
	clock.Advance(500 * time.Second)
	store.Status()
	built := buildMiners(t, store, 2)
	firstSiteID := discoverSite(t, store, clock, "east", "move-first")
	secondSiteID := discoverSite(t, store, clock, "south", "move-second")
	if _, err := store.AssignMiner(built[0].ID, firstSiteID); err != nil {
		t.Fatalf("assign first built miner: %v", err)
	}
	if _, err := store.AssignMiner(built[1].ID, secondSiteID); err != nil {
		t.Fatalf("assign second built miner: %v", err)
	}
	beforeMove := store.Status()
	if got, want := beforeMove.Resources.EnergyAvailable, 10; got != want {
		t.Fatalf("energy available before move = %d, want %d", got, want)
	}

	thirdSiteID := discoverSite(t, store, clock, "west", "move-third")
	moved, err := store.AssignMiner(built[1].ID, thirdSiteID)
	if err != nil {
		t.Fatalf("move assigned miner: %v", err)
	}
	if moved.AssignedSiteID != thirdSiteID {
		t.Fatalf("moved assigned site = %q, want %q", moved.AssignedSiteID, thirdSiteID)
	}
	afterMove := store.Status()
	if got, want := afterMove.Resources.EnergyAvailable, beforeMove.Resources.EnergyAvailable; got != want {
		t.Fatalf("energy available after move = %d, want %d", got, want)
	}
}

func TestUpgradeIncreasesEnergyCapacity(t *testing.T) {
	store, _ := newTestStore(t)
	before := store.Status()
	upgraded, err := store.UpgradeMiner("min_starter")
	if err != nil {
		t.Fatalf("upgrade starter: %v", err)
	}
	if upgraded.Level != 2 {
		t.Fatalf("upgraded level = %d, want 2", upgraded.Level)
	}
	after := store.Status()
	if got, want := after.Resources.EnergyCapacity, before.Resources.EnergyCapacity+30; got != want {
		t.Fatalf("energy capacity after upgrade = %d, want %d", got, want)
	}
	if got, want := after.Resources.EnergyUsed, before.Resources.EnergyUsed; got != want {
		t.Fatalf("energy used after upgrade = %d, want %d", got, want)
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
	if len(sector.Sites) != 1 {
		t.Fatalf("site count before completion = %d, want 1", len(sector.Sites))
	}
	clock.Advance(game.ScanDuration - time.Second)
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
	sector = store.Sector()
	if len(sector.Sites) != 2 {
		t.Fatalf("site count after completion = %d, want 2", len(sector.Sites))
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

func buildMiners(t *testing.T, store *game.Store, count int) []game.Miner {
	t.Helper()
	miners := make([]game.Miner, 0, count)
	for i := 0; i < count; i++ {
		miner, err := store.BuildMiner()
		if err != nil {
			t.Fatalf("build miner %d: %v", i, err)
		}
		miners = append(miners, miner)
	}
	return miners
}

func discoverSite(t *testing.T, store *game.Store, clock *fakeClock, direction, idempotencyPrefix string) string {
	t.Helper()
	status := store.Status()
	action, err := store.StartScan(direction, idempotencyPrefix)
	if err != nil {
		t.Fatalf("start scan %q: %v", direction, err)
	}
	clock.Advance(game.ScanDuration)
	completed, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("get completed scan: %v", err)
	}
	if completed.Status != game.ActionStatusCompleted {
		t.Fatalf("scan status = %q, want completed", completed.Status)
	}
	sector := store.Sector()
	if got, want := len(sector.Sites), len(status.Sector.Sites)+1; got != want {
		t.Fatalf("site count = %d, want %d", got, want)
	}
	return sector.Sites[len(sector.Sites)-1].ID
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
