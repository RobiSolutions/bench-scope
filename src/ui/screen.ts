/**
 * The tube: graticule underneath, phosphor on top.
 *
 * Two stacked canvases, because they age differently. The graticule is
 * redrawn only when something it shows changes. The trace canvas is never
 * cleared while running - each frame first erases a fraction of what is
 * there, so old sweeps fade out over a few frames the way phosphor does.
 */

import { DIVISIONS_X, DIVISIONS_Y, SAMPLES_PER_SCREEN, type Sweep } from '../core/sweep';
import type { Edge } from '../core/trigger';

export type View = {
  voltsPerDiv: number;
  triggerLevel: number;
  edge: Edge;
  /** Where the trigger crossing sits across the screen, 0..1. */
  position: number;
};

const GRID = 'rgba(140, 200, 165, 0.16)';
const AXIS = 'rgba(140, 200, 165, 0.34)';
const MARKER = '#ffb347';
const GLOW = 'rgba(90, 255, 150, 0.35)';
const CORE = '#c8ffd9';
/** Fraction of the previous frame erased each frame: higher is shorter persistence. */
const DECAY = 0.32;

function context(canvas: HTMLCanvasElement | null): CanvasRenderingContext2D {
  const ctx = canvas?.getContext('2d');
  if (!ctx) throw new Error('screen: missing canvas');
  return ctx;
}

/** Pixel-centred, so one-pixel lines stay one pixel wide. */
const crisp = (v: number) => Math.round(v) + 0.5;

export class Screen {
  private readonly grid: CanvasRenderingContext2D;
  private readonly trace: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private last: Sweep | null = null;

  constructor(
    private readonly host: HTMLElement,
    private view: View
  ) {
    this.grid = context(host.querySelector<HTMLCanvasElement>('canvas.graticule'));
    this.trace = context(host.querySelector<HTMLCanvasElement>('canvas.trace'));
    new ResizeObserver(() => this.resize()).observe(host);
  }

  setView(view: View): void {
    this.view = view;
    this.drawGraticule();
  }

  /** One running frame: fade what is there, lay the new sweep over it. */
  drawTrace(sweep: Sweep): void {
    const t = this.trace;
    t.globalCompositeOperation = 'destination-out';
    t.fillStyle = `rgba(0, 0, 0, ${DECAY})`;
    t.fillRect(0, 0, this.width, this.height);
    t.globalCompositeOperation = 'source-over';
    this.stroke(sweep);
    this.last = sweep;
  }

  /** Stopped: show the last sweep alone, sharp, against the current view. */
  redraw(): void {
    this.trace.clearRect(0, 0, this.width, this.height);
    if (this.last) this.stroke(this.last);
  }

  private y(volts: number): number {
    return this.height / 2 - (volts / this.view.voltsPerDiv) * (this.height / DIVISIONS_Y);
  }

  private stroke(sweep: Sweep): void {
    const t = this.trace;
    const dx = this.width / SAMPLES_PER_SCREEN;

    t.beginPath();
    for (let k = 0; k < sweep.samples.length; k++) {
      const x = (k - sweep.shift) * dx;
      const y = this.y(sweep.samples[k] as number);
      if (k === 0) t.moveTo(x, y);
      else t.lineTo(x, y);
    }

    t.lineJoin = 'round';
    t.strokeStyle = GLOW;
    t.lineWidth = 4;
    t.shadowColor = GLOW;
    t.shadowBlur = 10;
    t.stroke();

    t.shadowBlur = 0;
    t.strokeStyle = CORE;
    t.lineWidth = 1.25;
    t.stroke();
  }

  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    for (const ctx of [this.grid, this.trace]) {
      ctx.canvas.width = Math.round(this.width * ratio);
      ctx.canvas.height = Math.round(this.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    this.drawGraticule();
    this.redraw();
  }

  private drawGraticule(): void {
    const g = this.grid;
    const w = this.width;
    const h = this.height;
    const dx = w / DIVISIONS_X;
    const dy = h / DIVISIONS_Y;
    g.clearRect(0, 0, w, h);
    g.lineWidth = 1;

    g.strokeStyle = GRID;
    g.beginPath();
    for (let i = 1; i < DIVISIONS_X; i++) {
      g.moveTo(crisp(i * dx), 0);
      g.lineTo(crisp(i * dx), h);
    }
    for (let i = 1; i < DIVISIONS_Y; i++) {
      g.moveTo(0, crisp(i * dy));
      g.lineTo(w, crisp(i * dy));
    }
    g.stroke();

    // The centre axes carry ticks at every fifth of a division.
    const cx = crisp(w / 2);
    const cy = crisp(h / 2);
    g.strokeStyle = AXIS;
    g.beginPath();
    for (let i = 1; i < DIVISIONS_X * 5; i++) {
      const x = crisp((i * dx) / 5);
      const tick = i % 5 === 0 ? 0 : 4;
      g.moveTo(x, cy - tick);
      g.lineTo(x, cy + tick);
    }
    for (let i = 1; i < DIVISIONS_Y * 5; i++) {
      const y = crisp((i * dy) / 5);
      const tick = i % 5 === 0 ? 0 : 4;
      g.moveTo(cx - tick, y);
      g.lineTo(cx + tick, y);
    }
    g.moveTo(cx, 0);
    g.lineTo(cx, h);
    g.moveTo(0, cy);
    g.lineTo(w, cy);
    g.stroke();

    g.fillStyle = MARKER;

    // Trigger position: where the crossing is drawn across the screen.
    const tx = w * this.view.position;
    g.beginPath();
    g.moveTo(tx - 6, 0);
    g.lineTo(tx + 6, 0);
    g.lineTo(tx, 8);
    g.fill();

    // Trigger level, pinned to the edge when it is off screen.
    const level = Math.min(Math.max(this.y(this.view.triggerLevel), 0), h);
    g.beginPath();
    g.moveTo(w, level - 6);
    g.lineTo(w, level + 6);
    g.lineTo(w - 9, level);
    g.fill();
  }
}
