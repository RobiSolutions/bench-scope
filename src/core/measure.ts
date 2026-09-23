/**
 * What the Measure button reads off a captured trace.
 *
 * Amplitude figures come straight from the samples. Time figures need the
 * signal's period, and the period comes from the same machinery the trigger
 * uses: rising crossings of the level halfway between min and max, found with
 * hysteresis so a noisy edge counts once, and refined to a fraction of a
 * sample so a handful of periods on screen still gives a precise frequency.
 *
 * Mean and RMS are taken over whole periods when there are any. Averaging a
 * sine over two and a half periods gives a mean that is not zero, and a real
 * instrument that did that would be reporting its own window, not the signal.
 */

import { findTrigger, refineTrigger } from './trigger';

export type Measurements = {
  /** Volts. */
  max: number;
  min: number;
  peakToPeak: number;
  mean: number;
  rms: number;
  /** Hz, or null when fewer than two rising crossings are on screen. */
  frequency: number | null;
  /** Seconds, null with frequency. */
  period: number | null;
  /** High fraction of a period, 0..1, null with frequency. */
  duty: number | null;
};

/** Hysteresis as a fraction of peak-to-peak: noise below this is ignored. */
const HYSTERESIS = 0.1;

/** Rising crossings of `level`, as fractional sample indices. */
function risingCrossings(samples: ArrayLike<number>, level: number, hysteresis: number): number[] {
  const out: number[] = [];
  let from = 1;
  for (;;) {
    const hit = findTrigger(samples, { level, edge: 'rising', hysteresis, from });
    if (hit === null) return out;
    out.push(refineTrigger(samples, hit, level));
    from = hit + 1;
  }
}

export function measure(samples: ArrayLike<number>, sampleRate: number): Measurements {
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] as number;
    if (v > max) max = v;
    if (v < min) min = v;
  }
  const peakToPeak = max - min;
  const level = (max + min) / 2;

  const crossings =
    peakToPeak > 0 ? risingCrossings(samples, level, peakToPeak * HYSTERESIS) : [];
  const first = crossings[0];
  const last = crossings[crossings.length - 1];
  const whole = first !== undefined && last !== undefined && crossings.length >= 2;

  // Whole periods when there are any, otherwise everything on screen.
  const start = whole ? Math.ceil(first) : 0;
  const end = whole ? Math.floor(last) : samples.length - 1;
  let sum = 0;
  let squares = 0;
  let high = 0;
  for (let i = start; i <= end; i++) {
    const v = samples[i] as number;
    sum += v;
    squares += v * v;
    if (v > level) high++;
  }
  const count = end - start + 1;

  const base = { max, min, peakToPeak, mean: sum / count, rms: Math.sqrt(squares / count) };
  if (!whole) return { ...base, frequency: null, period: null, duty: null };

  // n crossings bound n - 1 periods, not n.
  const periodSamples = (last - first) / (crossings.length - 1);
  return {
    ...base,
    frequency: sampleRate / periodSamples,
    period: periodSamples / sampleRate,
    duty: high / count,
  };
}
