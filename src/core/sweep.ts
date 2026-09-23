/**
 * One sweep: what the screen shows for a single pass of the beam.
 *
 * The screen is a window of fixed width in time. The trigger decides where
 * that window sits in the signal, and `position` decides where on the screen
 * the crossing lands: at the centre by default - half a screen of what
 * happened before the event, half of what came after - or further left to
 * see more of the aftermath, further right to see more of the lead-up.
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
  /** Where the crossing lands across the screen, 0..1. Centre by default. */
  position?: number;
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
  // Samples of lead-up shown left of the crossing.
  const before = Math.round(screen * Math.min(Math.max(settings.position ?? 0.5, 0), 1));

  // Two screens: the crossing is looked for only where there is enough
  // buffer on both sides of it - `before` samples ahead, the rest after.
  const firstIndex = Math.floor(time * rate);
  const buffer = capture(wave, rate, screen * 2 + 2, firstIndex / rate, firstIndex);

  const hit = findTrigger(buffer, { ...settings.trigger, from: before + 1 });
  if (hit === null || hit > screen + before) {
    return { samples: buffer.subarray(0, screen + 1), shift: 0, triggered: false };
  }

  const begin = refineTrigger(buffer, hit, settings.trigger.level) - before;
  const first = Math.floor(begin);
  return {
    samples: buffer.subarray(first, first + screen + 2),
    shift: begin - first,
    triggered: true,
  };
}
