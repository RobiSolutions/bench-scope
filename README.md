# bench-scope

A browser oscilloscope that grows into a diagnostics trainer.

Built as a deliberate practice ground for git and GitHub Actions, and designed
so it can join the portfolio once it stands on its own. It is not part of
`3d-portfolio` and does not share code with it.

## Why an oscilloscope

The visible part is a glowing trace on a phosphor grid. The part that matters
is underneath: generating a waveform, sampling it, and finding the point a
sweep should start from are all pure functions of their inputs, so the tests
are real tests rather than decoration - and the trigger has edge cases that
punish a careless implementation.

The first one already earned its keep. The arming rule was written to look at
every sample from index 1 onward, which meant a capture that opened far below
the trigger level never armed at all, and the function returned "no trigger"
for a signal that plainly crosses. The test found it before any pixel was
drawn.

## Stages

Each stage is finished in itself. Stopping after one leaves something worth
looking at.

1. **The instrument.** Grid, phosphor trace, time base, volts per division,
   trigger level and edge. Sine, square, PWM, noise.
2. **The probe.** A simplified board and a probe you place on a test point;
   each point has its own signal. The instrument becomes a bench.
3. **The trainer.** A board with a fault. Measure a few points, name the
   failure, find out whether you were right.

## Running it

```bash
npm install
npm test        # the core, no browser needed
npm run dev     # http://localhost:5173
npm run build   # type-check, then a static bundle in dist/
```

## Layout

```
src/core/      pure logic, no DOM: waveforms, trigger
src/core/__tests__/
```

`src/core` must stay free of the DOM. Anything that touches a canvas or an
element belongs outside it, or the tests stop being runnable without a
browser.

## The git plan this project exists for

One lesson per branch, each merged through a pull request with CI green:

| branch | lesson |
|---|---|
| `feat/waveform-square` | branch, push, PR, read your own diff |
| `feat/trigger` | a conflict, made on purpose and resolved by hand |
| `feat/cursors` | `rebase -i`: several commits squashed before merging |
| `fix/aliasing` | break sampling on purpose, ship it, then `git revert` |
| — | `reflog` after `reset --hard` "loses" an evening |
| — | force push to your own branch, and why never to `main` |
| `ci/deploy` | Actions: tests on every PR, static build deployed on merge |

Then branch protection on `main`: merge only when CI is green.

The repository is public, so Actions minutes are free and unlimited.
