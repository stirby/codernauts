package game

import (
	"testing"
	"time"
)

func TestScaledClockAdvancesAtScale(t *testing.T) {
	t.Parallel()

	anchor := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	real := anchor
	clock := newScaledClockAt(func() time.Time { return real }, anchor, 10)

	if got := clock.Now(); !got.Equal(anchor) {
		t.Fatalf("now at anchor = %v, want %v", got, anchor)
	}

	real = anchor.Add(6 * time.Second)
	if got, want := clock.Now(), anchor.Add(60*time.Second); !got.Equal(want) {
		t.Fatalf("now after 6s real = %v, want %v", got, want)
	}

	real = anchor.Add(90 * time.Second)
	if got, want := clock.Now(), anchor.Add(900*time.Second); !got.Equal(want) {
		t.Fatalf("now after 90s real = %v, want %v", got, want)
	}
}

func TestScaledClockFractionalScale(t *testing.T) {
	t.Parallel()

	anchor := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	real := anchor.Add(10 * time.Second)
	clock := newScaledClockAt(func() time.Time { return real }, anchor, 2.5)

	if got, want := clock.Now(), anchor.Add(25*time.Second); !got.Equal(want) {
		t.Fatalf("now = %v, want %v", got, want)
	}
}

func TestScaledClockRejectsNonPositiveScale(t *testing.T) {
	t.Parallel()

	anchor := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	real := anchor.Add(30 * time.Second)
	for _, scale := range []float64{0, -4} {
		clock := newScaledClockAt(func() time.Time { return real }, anchor, scale)
		if got, want := clock.Now(), real; !got.Equal(want) {
			t.Fatalf("scale %v now = %v, want real time %v", scale, got, want)
		}
	}
}

func TestStoreRunsFasterOnScaledClock(t *testing.T) {
	t.Parallel()

	anchor := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	real := anchor
	store := NewStore(newScaledClockAt(func() time.Time { return real }, anchor, 10))

	// 20 real seconds at 10x is 200 game seconds: the starter miner adds
	// 200 ore and a distance-1 scan (15 game seconds) resolves.
	action, err := store.StartScan("north", "")
	if err != nil {
		t.Fatalf("start scan: %v", err)
	}
	real = anchor.Add(20 * time.Second)

	status := store.Status()
	if got, want := status.Resources.Ore, startingOre+200; got != want {
		t.Fatalf("ore after 20s real at 10x = %d, want %d", got, want)
	}
	completed, err := store.Action(action.ID)
	if err != nil {
		t.Fatalf("get action: %v", err)
	}
	if completed.Status != ActionStatusCompleted {
		t.Fatalf("scan status = %q, want completed", completed.Status)
	}
}
