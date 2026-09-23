/**
 * The front panel: state, controls, and the loop that sweeps the beam.
 *
 * Everything that can be computed lives in src/core. This file only decides
 * what the instrument is set to and hands that to the core every frame.
 */

import './ui/style.css';
import { acquire, type AcquisitionStatus, type TriggerMode } from './core/acquisition';
import { DEFAULT_WAVE, type Wave, type WaveKind } from './core/waveform';
import type { Edge } from './core/trigger';
import { measure, type Measurements } from './core/measure';
import { sampleRateFor, sweep } from './core/sweep';
import { formatSI, steps125 } from './core/units';
import { Screen, type View } from './ui/screen';

const TIME_STEPS = steps125(1e-6, 0.1);
const VOLT_STEPS = steps125(0.01, 5);

const state = {
  wave: { ...DEFAULT_WAVE } as Wave,
  timeStep: TIME_STEPS.indexOf(2e-4),
  voltStep: VOLT_STEPS.indexOf(1),
  level: 0,
  edge: 'rising' as Edge,
  noiseReject: false,
  mode: 'auto' as TriggerMode,
  /** Single armed: stop after the next triggered sweep. */
  single: false,
  running: true,
};

const secondsPerDiv = () => TIME_STEPS[state.timeStep] as number;
const voltsPerDiv = () => VOLT_STEPS[state.voltStep] as number;
/** Half a division of hysteresis rides out noise that a clean edge doesn't need. */
const hysteresis = () => (state.noiseReject ? voltsPerDiv() / 2 : 0);

const view = (): View => ({
  voltsPerDiv: voltsPerDiv(),
  triggerLevel: state.level,
  edge: state.edge,
});

function $<T extends HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`missing element: ${selector}`);
  return el;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const round = (v: number) => Number(v.toPrecision(3));

const screen = new Screen($('#screen'), view());

// --- controls -------------------------------------------------------------

document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((button) => {
  button.addEventListener('click', () => {
    const dir = Number(button.dataset.dir);
    if (button.dataset.step === 'time') {
      state.timeStep = clamp(state.timeStep + dir, 0, TIME_STEPS.length - 1);
    } else {
      state.voltStep = clamp(state.voltStep + dir, 0, VOLT_STEPS.length - 1);
    }
    changed();
  });
});

type Slider = {
  id: string;
  /** Slider position for the current state. */
  read: () => number;
  /** New slider position into the state. */
  write: (position: number) => void;
  show: () => string;
};

const sliders: Slider[] = [
  {
    // Positioned in divisions, stored in volts: the level stays put on the
    // signal when V/div changes, and the slider always spans the screen.
    id: 'level',
    read: () => state.level / voltsPerDiv(),
    write: (p) => (state.level = round(p * voltsPerDiv())),
    show: () => formatSI(state.level, 'V'),
  },
  {
    // Logarithmic: 1 Hz to 1 MHz.
    id: 'frequency',
    read: () => Math.log10(state.wave.frequency),
    write: (p) => (state.wave.frequency = round(10 ** p)),
    show: () => formatSI(state.wave.frequency, 'Hz'),
  },
  {
    id: 'amplitude',
    read: () => state.wave.amplitude,
    write: (p) => (state.wave.amplitude = p),
    show: () => formatSI(state.wave.amplitude, 'V'),
  },
  {
    id: 'offset',
    read: () => state.wave.offset,
    write: (p) => (state.wave.offset = p),
    show: () => formatSI(state.wave.offset, 'V'),
  },
  {
    id: 'duty',
    read: () => state.wave.duty,
    write: (p) => (state.wave.duty = p),
    show: () => `${Math.round(state.wave.duty * 100)} %`,
  },
  {
    id: 'noise',
    read: () => state.wave.noise,
    write: (p) => (state.wave.noise = p),
    show: () => formatSI(state.wave.noise, 'V'),
  },
];

for (const slider of sliders) {
  $<HTMLInputElement>(`#${slider.id}`).addEventListener('input', (event) => {
    slider.write(Number((event.target as HTMLInputElement).value));
    changed();
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((button) => {
  button.addEventListener('click', () => {
    state.wave.kind = button.dataset.kind as WaveKind;
    changed();
  });
});

$('#edge').addEventListener('click', () => {
  state.edge = state.edge === 'rising' ? 'falling' : 'rising';
  changed();
});

$('#noise-reject').addEventListener('click', () => {
  state.noiseReject = !state.noiseReject;
  changed();
});

document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.mode = button.dataset.mode as TriggerMode;
    changed();
  });
});

$('#single').addEventListener('click', () => {
  state.single = true;
  state.running = true;
  changed();
});

$('#run').addEventListener('click', () => {
  state.running = !state.running;
  state.single = false;
  changed();
});

// --- display --------------------------------------------------------------

let status: AcquisitionStatus = 'auto';

/** Readings change every frame; a person can read about five a second. */
const MEASURE_INTERVAL_MS = 200;
let lastMeasured = -Infinity;

function showMeasurements(m: Measurements): void {
  const or = (v: number | null, show: (v: number) => string) => (v === null ? '—' : show(v));
  $('#m-vpp').textContent = formatSI(m.peakToPeak, 'V');
  $('#m-frequency').textContent = or(m.frequency, (v) => formatSI(v, 'Hz'));
  $('#m-period').textContent = or(m.period, (v) => formatSI(v, 's'));
  $('#m-duty').textContent = or(m.duty, (v) => `${(v * 100).toFixed(1)} %`);
  $('#m-mean').textContent = formatSI(m.mean, 'V');
  $('#m-rms').textContent = formatSI(m.rms, 'V');
}

function showStatus(): void {
  const badge = $('#ro-status');
  const labels: Record<AcquisitionStatus, string> = {
    trig: "Trig'd",
    auto: 'Auto',
    ready: 'Ready',
  };
  const [label, modifier] = state.running ? [labels[status], status] : ['Stop', 'stop'];
  badge.textContent = label;
  badge.className = `status status--${modifier}`;
}

/** Brings every control and readout in line with the state. */
function changed(): void {
  for (const slider of sliders) {
    const input = $<HTMLInputElement>(`#${slider.id}`);
    // A slider being dragged already shows where it is; rewriting its value
    // would snap it to the rounded position under the pointer.
    if (document.activeElement !== input) input.value = String(slider.read());
    $<HTMLOutputElement>(`output[for="${slider.id}"]`).textContent = slider.show();
  }
  $<HTMLInputElement>('#duty').disabled = state.wave.kind !== 'pwm';
  $<HTMLInputElement>('#frequency').disabled = state.wave.kind === 'noise';

  document.querySelectorAll<HTMLButtonElement>('[data-kind]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.kind === state.wave.kind));
  });

  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode));
  });
  $('#single').setAttribute('aria-pressed', String(state.single));

  const edge = $('#edge');
  edge.textContent = state.edge === 'rising' ? '↑ Rising' : '↓ Falling';
  $('#noise-reject').setAttribute('aria-pressed', String(state.noiseReject));

  const run = $('#run');
  run.textContent = state.running ? 'Running' : 'Stopped';
  run.classList.toggle('run--stopped', !state.running);

  $('#time-per-div').textContent = formatSI(secondsPerDiv(), 's');
  $('#volts-per-div').textContent = formatSI(voltsPerDiv(), 'V');
  $('#ro-vertical').textContent = `CH1  ${formatSI(voltsPerDiv(), 'V')}/div`;
  $('#ro-horizontal').textContent = `${formatSI(secondsPerDiv(), 's')}/div`;
  $('#ro-rate').textContent = formatSI(sampleRateFor(secondsPerDiv()), 'S/s');
  $('#ro-trigger').textContent = `${state.edge === 'rising' ? '↑' : '↓'} ${formatSI(state.level, 'V')}`;
  showStatus();

  screen.setView(view());
  if (!state.running) screen.redraw();
}

function frame(now: number): void {
  if (state.running) {
    const result = sweep(
      state.wave,
      {
        secondsPerDiv: secondsPerDiv(),
        trigger: { level: state.level, edge: state.edge, hysteresis: hysteresis() },
      },
      now / 1000
    );
    const acquisition = acquire(state.mode, state.single, result.triggered);

    if (acquisition.draw) {
      if (acquisition.stop) screen.show(result);
      else screen.drawTrace(result);
      if (acquisition.stop || now - lastMeasured >= MEASURE_INTERVAL_MS) {
        showMeasurements(measure(result.samples, sampleRateFor(secondsPerDiv())));
        lastMeasured = now;
      }
    }

    if (acquisition.status !== status) {
      status = acquisition.status;
      showStatus();
    }
    if (acquisition.stop) {
      state.running = false;
      state.single = false;
      changed();
    }
  }
  requestAnimationFrame(frame);
}

changed();
requestAnimationFrame(frame);
