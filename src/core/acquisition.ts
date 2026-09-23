/**
 * What the instrument does with a sweep, depending on the trigger mode.
 *
 * - Auto draws every sweep. With a trigger the picture holds still; without
 *   one it free-runs, so there is always something on screen - the right
 *   default when you do not yet know what the signal looks like.
 * - Normal draws only triggered sweeps. Without a trigger the screen keeps
 *   the last good picture instead of a smear - the mode for a signal that is
 *   there only now and then.
 * - Single is Normal for exactly one sweep: the first triggered sweep is
 *   drawn and the instrument stops. It is how you catch a one-off event, such
 *   as a rail coming up at power-on.
 */

export type TriggerMode = 'auto' | 'normal';

/** Trig'd, free-running, or waiting for a trigger. */
export type AcquisitionStatus = 'trig' | 'auto' | 'ready';

export type Acquisition = {
  /** Draw this sweep. */
  draw: boolean;
  /** Stop running after drawing it (Single). */
  stop: boolean;
  status: AcquisitionStatus;
};

export function acquire(mode: TriggerMode, single: boolean, triggered: boolean): Acquisition {
  if (triggered) return { draw: true, stop: single, status: 'trig' };
  if (single || mode === 'normal') return { draw: false, stop: false, status: 'ready' };
  return { draw: true, stop: false, status: 'auto' };
}
