import { describe, expect, it } from 'vitest';
import { formatSI, steps125 } from '../units';

describe('steps125', () => {
  it('walks 1-2-5 through the decades', () => {
    expect(steps125(0.01, 1)).toEqual([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]);
  });

  it('produces exact values rather than floating point residue', () => {
    // 2 * 1e-6 is 0.0000020000000000000003 without the rounding.
    expect(steps125(1e-6, 1e-5)).toEqual([1e-6, 2e-6, 5e-6, 1e-5]);
  });

  it('starts mid-decade when min is not a power of ten', () => {
    expect(steps125(0.2, 2)).toEqual([0.2, 0.5, 1, 2]);
  });
});

describe('formatSI', () => {
  it('picks the prefix that keeps the number short', () => {
    expect(formatSI(0.0005, 's')).toBe('500 µs');
    expect(formatSI(1000, 'Hz')).toBe('1 kHz');
    expect(formatSI(2.5, 'V')).toBe('2.5 V');
    expect(formatSI(5e8, 'S/s')).toBe('500 MS/s');
  });

  it('keeps the sign', () => {
    expect(formatSI(-0.25, 'V')).toBe('-250 mV');
  });

  it('says zero plainly', () => {
    expect(formatSI(0, 'V')).toBe('0 V');
  });

  it('rounds to significant digits', () => {
    expect(formatSI(1234.5, 'Hz')).toBe('1.23 kHz');
  });
});
