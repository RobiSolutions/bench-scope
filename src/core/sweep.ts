/**
 * One sweep: what the screen shows for a single pass of the beam.
 *
 * The screen is a window of fixed width in time. The trigger decides where
 * that window sits in the signal, and it sits so the crossing lands at the
 * horizontal centre - half a screen of what happened before the event, half
 * of what came after, the way a digital scope shows it by default.
 *
 * When there is no crossing to hold on to, the window simply starts wherever
 * the capture did. That is auto mode, and on a live signal it is the smear
 * the trigger exists to prevent.
 */

import { capture, type Wave } from './waveform';
import { findTrigger, refineTrigger, type TriggerOptions } from './trigger';

/** The graticule: ten divisions across, eight up. */
export const DIVISIONS_X = 10;
export const DIVISIONS_Y = 8;

/** Samples across one screen width, whatever the time base. */
export const SAMPLES_PER_SCREEN = 1_000;

export type SweepSettings = {
  secondsPerDiv: number;
  trigger: Omit<TriggerOptions, 'from'>;
};

export type Sweep = {
  /** Volts. The first sample sits at or just left of the screen's left edge. */
  samples: Float32Array;
  /**
   * How far left of the edge the first sample sits, in samples, 0..1. Sample
   * `k` belongs at `k - shift` samples from the left edge. Drawing from the
   * whole index instead is what makes a triggered trace shimmer.
   */
  shift: number;
  triggered: boolean;
};

export function sampleRateFor(secondsPerDiv: number): number {
  return SAMPLES_PER_SCREEN / (secondsPerDiv * DIVISIONS_X);
}

/** The sweep the instrument would draw for a signal observed at `time` seconds. */
export function sweep(wave: Wave, settings: SweepSettings, time: number): Sweep {
  const rate = sampleRateFor(settings.secondsPerDiv);
  const screen = SAMPLES_PER_SCREEN;
  const half = screen / 2;

  // Two screens: the crossing is looked for in the middle of the buffer, so
  // there is always half a screen available on either side of it.
  const firstIndex = Math.floor(time * rate);
  const buffer = capture(wave, rate, screen * 2 + 2, firstIndex / rate, firstIndex);

  const hit = findTrigger(buffer, { ...settings.trigger, from: half + 1 });
  if (hit === null || hit > screen * 1.5) {
    return { samples: buffer.subarray(0, screen + 1), shift: 0, triggered: false };
  }

  const begin = refineTrigger(buffer, hit, settings.trigger.level) - half;
  const first = Math.floor(begin);
  return {
    samples: buffer.subarray(first, first + screen + 2),
    shift: begin - first,
    triggered: true,
  };
}
