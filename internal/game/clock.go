package game

import "time"

// NewScaledClock returns a Clock whose time advances scale times faster than
// real time, anchored at the moment of creation. A scale of 1 matches real
// time. Faster scales compress every duration in the game, including resource
// accrual, scan resolution, and the gravel-per-hour window, which makes long
// progressions testable in minutes.
func NewScaledClock(scale float64) Clock {
	return newScaledClockAt(time.Now, time.Now().UTC(), scale)
}

// newScaledClockAt builds a scaled clock from an injectable real-time source
// so tests can drive it deterministically.
func newScaledClockAt(realNow func() time.Time, anchor time.Time, scale float64) Clock {
	if scale <= 0 {
		scale = 1
	}
	return scaledClock{realNow: realNow, anchor: anchor, scale: scale}
}

type scaledClock struct {
	realNow func() time.Time
	anchor  time.Time
	scale   float64
}

func (c scaledClock) Now() time.Time {
	elapsed := c.realNow().Sub(c.anchor)
	return c.anchor.Add(time.Duration(float64(elapsed) * c.scale))
}
