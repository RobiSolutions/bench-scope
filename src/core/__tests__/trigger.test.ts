import { describe, expect, it } from 'vitest';
import { capture, DEFAULT_WAVE } from '../waveform';
import { findTrigger, refineTrigger } from '../trigger';

describe('findTrigger', () => {
  it('finds the sample after a rising crossing', () => {
    //                    0   1   2   3
    const samples = [-1, -0.2, 0.4, 1];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBe(2);
  });

  it('finds a falling crossing', () => {
    const samples = [1, 0.4, -0.2, -1];
    expect(findTrigger(samples, { level: 0, edge: 'falling' })).toBe(2);
  });

  it('returns null when the signal never reaches the level', () => {
    const samples = [-1, -0.9, -0.8, -0.7];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBeNull();
  });

  it('returns null for a signal that sits exactly on the level', () => {
    const samples = [0, 0, 0, 0];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBeNull();
  });

  it('does not trigger on the very first sample', () => {
    // A capture that opens above the level has not crossed anything: the
    // crossing happened before the window.
    const samples = [1, 1, 1];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBeNull();
  });

  it('treats a sample landing exactly on the level as a crossing', () => {
    const samples = [-1, 0, 1];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBe(1);
  });

  it('ignores a crossing in the wrong direction', () => {
    const samples = [1, 0.2, -0.5, -1];
    expect(findTrigger(samples, { level: 0, edge: 'rising' })).toBeNull();
  });

  it('triggers away from zero', () => {
    const samples = [0, 1, 2, 3];
    expect(findTrigger(samples, { level: 2.5, edge: 'rising' })).toBe(3);
  });

  describe('hysteresis', () => {
    // A noisy edge crosses the level several times on its way up. Without
    // hysteresis every wobble is a trigger and the trace shimmers.
    const noisyEdge = [-1, -0.05, 0.05, -0.05, 0.05, 1];

    it('fires on every wobble when disabled', () => {
      const first = findTrigger(noisyEdge, { level: 0, edge: 'rising' });
      expect(first).toBe(2);
      const second = findTrigger(noisyEdge, {
        level: 0,
        edge: 'rising',
        from: (first as number) + 1,
      });
      expect(second).toBe(4);
    });

    it('takes the first real crossing and ignores the wobble', () => {
      expect(
        findTrigger(noisyEdge, { level: 0, edge: 'rising', hysteresis: 0.5 })
      ).toBe(2);
      // Re-arming needs the signal back below level - hysteresis, and it never
      // goes there again, so there is no second trigger.
      expect(
        findTrigger(noisyEdge, {
          level: 0,
          edge: 'rising',
          hysteresis: 0.5,
          from: 3,
        })
      ).toBeNull();
    });
  });

  it('finds a trigger in a real capture of a square wave', () => {
    const samples = capture(DEFAULT_WAVE, 1_000_000, 2_000);
    const index = findTrigger(samples, { level: 0, edge: 'rising' });
    expect(index).not.toBeNull();
    // The sample before the trigger is below the level, the one at it is not.
    expect(samples[(index as number) - 1]).toBeLessThan(0);
    expect(samples[index as number]).toBeGreaterThanOrEqual(0);
  });
});

describe('refineTrigger', () => {
  it('places the crossing between the two samples', () => {
    // -0.2 -> 0.4 crosses zero a third of the way across.
    const samples = [-1, -0.2, 0.4, 1];
    expect(refineTrigger(samples, 2, 0)).toBeCloseTo(1 + 1 / 3, 6);
  });

  it('returns the index itself when both samples are equal', () => {
    const samples = [0, 1, 1];
    expect(refineTrigger(samples, 2, 1)).toBe(2);
  });
});
