import { describe, expect, it } from 'vitest';
import { acquire } from '../acquisition';

describe('acquire', () => {
  it('draws a triggered sweep in every mode', () => {
    expect(acquire('auto', false, true)).toEqual({ draw: true, stop: false, status: 'trig' });
    expect(acquire('normal', false, true)).toEqual({ draw: true, stop: false, status: 'trig' });
  });

  it('free-runs in auto when nothing triggers', () => {
    expect(acquire('auto', false, false)).toEqual({ draw: true, stop: false, status: 'auto' });
  });

  it('keeps the last picture in normal when nothing triggers', () => {
    expect(acquire('normal', false, false)).toEqual({ draw: false, stop: false, status: 'ready' });
  });

  it('waits in single until a trigger, whatever the mode', () => {
    expect(acquire('auto', true, false)).toEqual({ draw: false, stop: false, status: 'ready' });
    expect(acquire('normal', true, false)).toEqual({ draw: false, stop: false, status: 'ready' });
  });

  it('draws the first triggered sweep in single and stops', () => {
    expect(acquire('auto', true, true)).toEqual({ draw: true, stop: true, status: 'trig' });
  });
});
