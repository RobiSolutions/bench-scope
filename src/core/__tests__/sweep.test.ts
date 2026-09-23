import { describe, expect, it } from 'vitest';
import { DEFAULT_WAVE, type Wave } from '../waveform';
import { SAMPLES_PER_SCREEN, sweep, type Sweep, type SweepSettings } from '../sweep';

const sine: Wave = { ...DEFAULT_WAVE, kind: 'sine', frequency: 1_000, amplitude: 1 };

// 1 kHz at 200 µs/div: two periods across the screen, 500 samples each.
const settings = (trigger: SweepSettings['trigger']): SweepSettings => ({
  secondsPerDiv: 2e-4,
  trigger,
});

/** The trace's value at a horizontal position, 0 = left edge, 1 = right edge. */
function valueAt(s: Sweep, x: number): number {
  const position = s.shift + x * SAMPLES_PER_SCREEN;
  const i = Math.floor(position);
  const a = s.samples[i] as number;
  const b = s.samples[i + 1] as number;
  return a + (b - a) * (position - i);
}

describe('sweep', () => {
  it('puts a rising crossing at the centre of the screen', () => {
    const s = sweep(sine, settings({ level: 0.5, edge: 'rising' }), 0.0123);
    expect(s.triggered).toBe(true);
    expect(valueAt(s, 0.5)).toBeCloseTo(0.5, 3);
    expect(valueAt(s, 0.51)).toBeGreaterThan(valueAt(s, 0.49));
  });

  it('puts a falling crossing at the centre of the screen', () => {
    const s = sweep(sine, settings({ level: -0.3, edge: 'falling' }), 0.0123);
    expect(s.triggered).toBe(true);
    expect(valueAt(s, 0.5)).toBeCloseTo(-0.3, 3);
    expect(valueAt(s, 0.51)).toBeLessThan(valueAt(s, 0.49));
  });

  it('draws the same picture no matter when the signal is observed', () => {
    // The point of a trigger: two sweeps a fraction of a period apart must
    // overlap, including the sub-sample offset.
    const trigger = { level: 0.2, edge: 'rising' as const };
    const a = sweep(sine, settings(trigger), 0);
    const b = sweep(sine, settings(trigger), 0.123456789);
    for (const x of [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1]) {
      expect(valueAt(b, x)).toBeCloseTo(valueAt(a, x), 3);
    }
  });

  it('keeps the whole screen covered after the shift', () => {
    const s = sweep(sine, settings({ level: 0, edge: 'rising' }), 0.5);
    expect(s.shift).toBeGreaterThanOrEqual(0);
    expect(s.shift).toBeLessThan(1);
    expect(s.samples.length).toBeGreaterThan(SAMPLES_PER_SCREEN + s.shift);
  });

  it('free-runs from the start of the capture when the level is out of reach', () => {
    const s = sweep(sine, settings({ level: 5, edge: 'rising' }), 0.0123);
    expect(s.triggered).toBe(false);
    expect(s.shift).toBe(0);
    expect(s.samples.length).toBe(SAMPLES_PER_SCREEN + 1);
  });

  it('free-runs when the only crossing is too late to centre', () => {
    // 100 Hz at 200 µs/div: a screen is a fifth of a period. Observed from
    // phase 0.65, the next rising zero is 1.75 screens into the capture -
    // found, but with less than half a screen after it to draw.
    const slow = { ...sine, frequency: 100 };
    const s = sweep(slow, settings({ level: 0, edge: 'rising' }), 0.0065);
    expect(s.triggered).toBe(false);
  });
});
