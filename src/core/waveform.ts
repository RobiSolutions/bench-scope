/**
 * The signals the instrument can be fed.
 *
 * Everything here is a pure function of time, in seconds, returning volts. No
 * canvas, no DOM, no state: the renderer asks for samples, the trigger reads
 * them, and both can be tested without a browser.
 */

export type WaveKind = 'sine' | 'square' | 'pwm' | 'noise';

export type Wave = {
  kind: WaveKind;
  /** Hz. */
  frequency: number;
  /** Peak amplitude in volts, so a sine spans -amplitude..+amplitude. */
  amplitude: number;
  /** Volts added to the whole signal. */
  offset: number;
  /** High fraction of one period, 0..1. Only `pwm` reads it. */
  duty: number;
  /** Peak noise in volts, added to every sample of every kind. */
  noise: number;
};

export const DEFAULT_WAVE: Wave = {
  kind: 'square',
  frequency: 1_000,
  amplitude: 2.5,
  offset: 0,
  duty: 0.5,
  noise: 0,
};

/**
 * Deterministic pseudo-noise.
 *
 * Math.random() would make every capture different, and a test that cannot
 * predict its input cannot assert anything about the output. This is a cheap
 * hash of the sample index: stable for a given index, and unrelated enough
 * between neighbours to look like noise.
 */
function jitter(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/** One sample, in volts, at time `t` seconds. */
export function sampleAt(wave: Wave, t: number, index = 0): number {
  const phase = ((t * wave.frequency) % 1 + 1) % 1; // 0..1 within the period
  let v: number;

  switch (wave.kind) {
    case 'sine':
      v = Math.sin(phase * Math.PI * 2) * wave.amplitude;
      break;
    case 'square':
      v = (phase < 0.5 ? 1 : -1) * wave.amplitude;
      break;
    case 'pwm':
      v = (phase < wave.duty ? 1 : -1) * wave.amplitude;
      break;
    case 'noise':
      v = jitter(index) * wave.amplitude;
      break;
  }

  return v + wave.offset + jitter(index * 7 + 1) * wave.noise;
}

/**
 * A block of samples, the way a real scope digitises: a fixed rate, a fixed
 * count, starting at `startTime`.
 *
 * `firstIndex` numbers the samples, and the noise is keyed on that number. A
 * running instrument passes consecutive indices from one capture to the next,
 * so the noise moves instead of freezing into the same pattern every sweep.
 */
export function capture(
  wave: Wave,
  sampleRate: number,
  count: number,
  startTime = 0,
  firstIndex = 0
): Float32Array {
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = sampleAt(wave, startTime + i / sampleRate, firstIndex + i);
  }
  return out;
}
