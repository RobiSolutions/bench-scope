/**
 * Finding the point the trace should start from.
 *
 * This is the whole reason an oscilloscope shows a still picture instead of a
 * smear: every sweep begins at the same place in the signal. The rule sounds
 * trivial - "where the signal crosses the level going up" - and the two things
 * that make it real are the ones below.
 *
 * 1. A crossing happens BETWEEN two samples, never on one. Comparing single
 *    samples to the level is the mistake that makes a trace jitter by one
 *    sample every sweep.
 * 2. A signal with noise crosses the level several times on its way through.
 *    Hysteresis: the signal has to leave a band around the level before the
 *    next crossing counts, or a noisy edge triggers three times.
 *
 * And the case that decides what the instrument does at all: when the signal
 * never crosses the level, there is no answer. A real scope falls back to free
 * running rather than showing nothing, so this returns null and the caller
 * decides - it is not this function's business.
 */

export type Edge = 'rising' | 'falling';

export type TriggerOptions = {
  /** Volts. */
  level: number;
  edge: Edge;
  /**
   * Volts the signal must fall back through before another crossing counts.
   * Zero disables it, which is what an ideal signal wants.
   */
  hysteresis?: number;
  /** Ignore crossings before this sample (used to find later crossings). */
  from?: number;
};

/**
 * Index of the first sample AFTER the crossing, or null when the signal never
 * crosses the level in the chosen direction.
 */
export function findTrigger(
  samples: ArrayLike<number>,
  { level, edge, hysteresis = 0, from = 0 }: TriggerOptions
): number | null {
  if (samples.length < 2) return null;

  const rising = edge === 'rising';
  const start = Math.max(1, from);

  /**
   * Before a crossing counts, the signal has to have been clearly on the far
   * side of the level. The sample just before the window is what arms the
   * search - reading it is the difference between finding the first edge and
   * missing it, because the loop itself only ever looks forward.
   */
  const seed = samples[start - 1] as number;
  let armed = rising ? seed < level - hysteresis : seed > level + hysteresis;

  for (let i = start; i < samples.length; i++) {
    const previous = samples[i - 1] as number;
    const current = samples[i] as number;

    if (armed) {
      const crossed = rising
        ? previous < level && current >= level
        : previous > level && current <= level;
      if (crossed) return i;
      continue;
    }

    const beyond = rising
      ? current < level - hysteresis
      : current > level + hysteresis;
    if (beyond) armed = true;
  }

  return null;
}

/**
 * Where the crossing actually sits, as a fractional sample index.
 *
 * Linear interpolation between the two samples either side. A scope that draws
 * from the integer index shifts the trace by up to one sample each sweep,
 * which is visible as a shimmer on a fast time base.
 */
export function refineTrigger(
  samples: ArrayLike<number>,
  index: number,
  level: number
): number {
  const previous = samples[index - 1] as number;
  const current = samples[index] as number;
  const span = current - previous;
  if (span === 0) return index;
  return index - 1 + (level - previous) / span;
}
