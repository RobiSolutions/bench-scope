/**
 * How the front panel counts and speaks.
 *
 * Every scope knob steps through 1-2-5 per decade, and every readout picks the
 * SI prefix that keeps the number short. Both are easy to get subtly wrong in
 * floating point - 2 * 1e-6 is not 2e-6 - so they live here, next to tests.
 */

/** The 1-2-5 sequence from `min` to `max`, both inclusive when they are on it. */
export function steps125(min: number, max: number): number[] {
  const out: number[] = [];
  for (let decade = Math.floor(Math.log10(min)); ; decade++) {
    for (const mantissa of [1, 2, 5]) {
      const value = Number((mantissa * 10 ** decade).toPrecision(3));
      if (value > max * (1 + 1e-9)) return out;
      if (value >= min * (1 - 1e-9)) out.push(value);
    }
  }
}

const PREFIXES = [
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
] as const;

/** `0.0005, 's'` -> `'500 µs'`. At most `digits` significant digits. */
export function formatSI(value: number, unit: string, digits = 3): string {
  const magnitude = Math.abs(value);
  // Below the smallest prefix there is only rounding residue - the mean of a
  // whole number of sine periods comes out around 1e-15 - and printing it in
  // nano-units gives '-0.00000713 nV'. Nothing on this bench is that small.
  if (magnitude < 1e-9 * (1 - 1e-9)) return `0 ${unit}`;
  const [scale, prefix] =
    PREFIXES.find(([s]) => magnitude >= s * (1 - 1e-9)) ?? PREFIXES[5];
  return `${Number((value / scale).toPrecision(digits))} ${prefix}${unit}`;
}
