import { describe, expect, it } from 'vitest';
import { capture, sampleAt, type Wave } from '../waveform';

const clean = (over: Partial<Wave> = {}): Wave => ({
  kind: 'sine',
  frequency: 1,
  amplitude: 1,
  offset: 0,
  duty: 0.5,
  noise: 0,
  ...over,
});

describe('sampleAt', () => {
  it('walks a sine through its quarter points', () => {
    const w = clean();
    expect(sampleAt(w, 0)).toBeCloseTo(0, 6);
    expect(sampleAt(w, 0.25)).toBeCloseTo(1, 6);
    expect(sampleAt(w, 0.5)).toBeCloseTo(0, 6);
    expect(sampleAt(w, 0.75)).toBeCloseTo(-1, 6);
  });

  it('repeats after one period', () => {
    const w = clean({ frequency: 250 });
    expect(sampleAt(w, 0.001)).toBeCloseTo(sampleAt(w, 0.001 + 1 / 250), 6);
  });

  it('handles negative time', () => {
    const w = clean();
    expect(sampleAt(w, -0.25)).toBeCloseTo(-1, 6);
  });

  it('switches a square at the half period', () => {
    const w = clean({ kind: 'square', amplitude: 2.5 });
    expect(sampleAt(w, 0.0)).toBe(2.5);
    expect(sampleAt(w, 0.49)).toBe(2.5);
    expect(sampleAt(w, 0.5)).toBe(-2.5);
  });

  it('follows the duty cycle on pwm', () => {
    const w = clean({ kind: 'pwm', duty: 0.2, amplitude: 1 });
    expect(sampleAt(w, 0.19)).toBe(1);
    expect(sampleAt(w, 0.21)).toBe(-1);
  });

  it('adds the offset to every kind', () => {
    const w = clean({ kind: 'square', amplitude: 1, offset: 3 });
    expect(sampleAt(w, 0)).toBe(4);
    expect(sampleAt(w, 0.6)).toBe(2);
  });

  it('is deterministic even with noise, so a capture can be asserted on', () => {
    const w = clean({ noise: 0.5 });
    expect(sampleAt(w, 0.1, 42)).toBe(sampleAt(w, 0.1, 42));
  });
});

describe('capture', () => {
  it('returns the requested number of samples', () => {
    expect(capture(clean(), 1000, 256).length).toBe(256);
  });

  it('samples at the given rate', () => {
    const w = clean({ frequency: 1 });
    const buffer = capture(w, 4, 4); // one period in four samples
    expect(buffer[0]).toBeCloseTo(0, 6);
    expect(buffer[1]).toBeCloseTo(1, 6);
    expect(buffer[2]).toBeCloseTo(0, 6);
    expect(buffer[3]).toBeCloseTo(-1, 6);
  });

  it('honours the start time', () => {
    const w = clean({ frequency: 1 });
    expect(capture(w, 4, 1, 0.25)[0]).toBeCloseTo(1, 6);
  });
});
