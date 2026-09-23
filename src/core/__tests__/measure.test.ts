import { describe, expect, it } from 'vitest';
import { capture, DEFAULT_WAVE, type Wave } from '../waveform';
import { measure } from '../measure';

// 100 kS/s for 1000 samples: 10 ms of signal, ten periods of 1 kHz.
const RATE = 100_000;
const COUNT = 1_000;

const wave = (overrides: Partial<Wave>): Wave => ({ ...DEFAULT_WAVE, ...overrides });
const measured = (w: Wave) => measure(capture(w, RATE, COUNT, 0.000123), RATE);

describe('measure', () => {
  it('reads the amplitude of a sine with an offset', () => {
    const m = measured(wave({ kind: 'sine', frequency: 1_000, amplitude: 2, offset: 0.5 }));
    expect(m.max).toBeCloseTo(2.5, 2);
    expect(m.min).toBeCloseTo(-1.5, 2);
    expect(m.peakToPeak).toBeCloseTo(4, 2);
  });

  it('takes mean and RMS over whole periods', () => {
    // RMS of offset + sine = sqrt(offset² + amplitude² / 2) = sqrt(0.25 + 2) = 1.5.
    const m = measured(wave({ kind: 'sine', frequency: 1_000, amplitude: 2, offset: 0.5 }));
    expect(m.mean).toBeCloseTo(0.5, 2);
    expect(m.rms).toBeCloseTo(1.5, 2);
  });

  it('measures the frequency and period of a sine', () => {
    const m = measured(wave({ kind: 'sine', frequency: 1_000, amplitude: 1 }));
    expect(m.frequency).toBeCloseTo(1_000, 0);
    expect(m.period).toBeCloseTo(0.001, 6);
  });

  it('measures a frequency that is not a whole number of samples per period', () => {
    // 3.7 kHz at 100 kS/s: 27.03 samples per period, never aligned.
    const m = measured(wave({ kind: 'sine', frequency: 3_700, amplitude: 1 }));
    expect(m.frequency).toBeCloseTo(3_700, 0);
  });

  it('reads the duty cycle of a PWM signal', () => {
    const m = measured(wave({ kind: 'pwm', frequency: 1_000, duty: 0.25 }));
    expect(m.duty).toBeCloseTo(0.25, 2);
    expect(m.frequency).toBeCloseTo(1_000, 0);
  });

  it('counts each edge of a noisy square once', () => {
    // Without hysteresis the noise would add crossings and inflate the frequency.
    const m = measured(wave({ kind: 'square', frequency: 1_000, amplitude: 2.5, noise: 0.3 }));
    expect(m.frequency).toBeCloseTo(1_000, -1);
  });

  it('has no frequency for a flat signal', () => {
    const m = measured(wave({ kind: 'sine', amplitude: 0, offset: 1.2 }));
    expect(m.peakToPeak).toBe(0);
    expect(m.mean).toBeCloseTo(1.2, 6);
    expect(m.frequency).toBeNull();
    expect(m.period).toBeNull();
    expect(m.duty).toBeNull();
  });

  it('has no frequency when less than a period is on screen', () => {
    // 60 Hz over 10 ms: at most one rising crossing.
    const m = measured(wave({ kind: 'sine', frequency: 60, amplitude: 1 }));
    expect(m.frequency).toBeNull();
    expect(m.peakToPeak).toBeGreaterThan(0);
  });
});
