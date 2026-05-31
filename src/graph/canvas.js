// Interactive plotter: pan, zoom, multi-function, DPR-aware.
import { parse } from '../parser/parser.js';
import { createEvaluator } from '../parser/evaluator.js';

export function createGraph(canvas, { getAngleMode }) {
  const ctx = canvas.getContext('2d');
  const view = { cx: 0, cy: 0, scale: 40 }; // pixels per unit
  let dpr = 1;
  let plots = []; // { id, expr, color, visible, compiled?, error? }

  const evaluator = createEvaluator({ getAngleMode, getAns: () => 0, getMemory: () => 0 });

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(r.width * dpr));
    canvas.height = Math.max(1, Math.floor(r.height * dpr));
    draw();
  }

  function screenToWorld(px, py) {
    const r = canvas.getBoundingClientRect();
    const x = (px - r.width / 2) / view.scale + view.cx;
    const y = -(py - r.height / 2) / view.scale + view.cy;
    return { x, y };
  }

  function worldToScreenX(x) {
    return (x - view.cx) * view.scale + canvas.width / (2 * dpr);
  }
  function worldToScreenY(y) {
    return -(y - view.cy) * view.scale + canvas.height / (2 * dpr);
  }

  function drawGrid() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Background
    const bg = getCssVar('--surface-2') || '#0a0a0a';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Choose grid step (1, 2, 5 × 10^n) so cells stay between ~40 and ~120 px.
    const targetPx = 60;
    const rawStep = targetPx / view.scale;
    const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const mantissa = rawStep / pow;
    const step = (mantissa < 2 ? 1 : mantissa < 5 ? 2 : 5) * pow;

    // Minor grid
    const gridColor = getCssVar('--grid') || 'rgba(255,255,255,0.06)';
    const axisColor = getCssVar('--axis') || 'rgba(255,255,255,0.45)';
    const labelColor = getCssVar('--muted') || 'rgba(255,255,255,0.5)';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const left = view.cx - (w / 2) / view.scale;
    const right = view.cx + (w / 2) / view.scale;
    const top = view.cy + (h / 2) / view.scale;
    const bot = view.cy - (h / 2) / view.scale;
    const startX = Math.ceil(left / step) * step;
    for (let x = startX; x <= right; x += step) {
      const sx = worldToScreenX(x);
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
    }
    const startY = Math.ceil(bot / step) * step;
    for (let y = startY; y <= top; y += step) {
      const sy = worldToScreenY(y);
      ctx.moveTo(0, sy); ctx.lineTo(w, sy);
    }
    ctx.stroke();

    // Axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const sy0 = worldToScreenY(0);
    ctx.moveTo(0, sy0); ctx.lineTo(w, sy0);
    const sx0 = worldToScreenX(0);
    ctx.moveTo(sx0, 0); ctx.lineTo(sx0, h);
    ctx.stroke();

    // Labels (sparse)
    ctx.fillStyle = labelColor;
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.textBaseline = 'top';
    for (let x = startX; x <= right; x += step) {
      if (Math.abs(x) < step / 2) continue;
      const sx = worldToScreenX(x);
      ctx.fillText(fmtTick(x), sx + 3, sy0 + 3);
    }
    ctx.textAlign = 'right';
    for (let y = startY; y <= top; y += step) {
      if (Math.abs(y) < step / 2) continue;
      const sy = worldToScreenY(y);
      ctx.fillText(fmtTick(y), sx0 - 4, sy + 2);
    }
    ctx.textAlign = 'left';
  }

  function fmtTick(v) {
    const s = Number(v.toPrecision(6)).toString();
    return s;
  }

  function plotOne(plot) {
    if (!plot.visible || !plot.compiled) return;
    const w = canvas.width / dpr;
    ctx.strokeStyle = plot.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let prevY = null;
    let drew = false;
    const samples = Math.max(200, Math.floor(w));
    for (let px = 0; px <= samples; px++) {
      const sx = (px / samples) * w;
      const { x } = screenToWorld(sx, 0);
      let y;
      try { y = evaluator.evalNode(plot.compiled, { x }); }
      catch { y = NaN; }
      if (!Number.isFinite(y)) { drew = false; prevY = null; continue; }
      const sy = worldToScreenY(y);
      // Discontinuity: if the pixel jump is more than half the canvas height,
      // the function has a pole/asymptote — lift the pen instead of drawing a spike.
      if (prevY != null && Math.abs(sy - prevY) > canvas.height * 0.5) {
        drew = false;
      }
      if (!drew) { ctx.moveTo(sx, sy); drew = true; }
      else ctx.lineTo(sx, sy);
      prevY = sy;
    }
    ctx.stroke();
  }

  function draw() {
    drawGrid();
    for (const p of plots) plotOne(p);
  }

  function setPlots(next) {
    plots = next.map(p => {
      try {
        return { ...p, compiled: parse(p.expr), error: null };
      } catch (e) {
        return { ...p, compiled: null, error: e.message };
      }
    });
    draw();
  }

  // Interaction
  let dragging = null;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    dragging = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - dragging.x;
    const dy = e.clientY - dragging.y;
    view.cx -= dx / view.scale;
    view.cy += dy / view.scale;
    dragging = { x: e.clientX, y: e.clientY };
    draw();
  });
  canvas.addEventListener('pointerup', () => dragging = null);
  canvas.addEventListener('pointercancel', () => dragging = null);

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const before = screenToWorld(e.clientX - r.left, e.clientY - r.top);
    const factor = Math.exp(-e.deltaY * 0.0015);
    view.scale = Math.max(2, Math.min(2000, view.scale * factor));
    const after = screenToWorld(e.clientX - r.left, e.clientY - r.top);
    view.cx += before.x - after.x;
    view.cy += before.y - after.y;
    draw();
  }, { passive: false });

  // Pinch zoom (basic)
  let pinch = null;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pinch = touchPinchState(e);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && pinch) {
      e.preventDefault();
      const cur = touchPinchState(e);
      const factor = cur.dist / pinch.dist;
      const r = canvas.getBoundingClientRect();
      const before = screenToWorld(cur.cx - r.left, cur.cy - r.top);
      view.scale = Math.max(2, Math.min(2000, view.scale * factor));
      const after = screenToWorld(cur.cx - r.left, cur.cy - r.top);
      view.cx += before.x - after.x;
      view.cy += before.y - after.y;
      pinch = cur;
      draw();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', () => { pinch = null; });

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  return {
    setPlots,
    redraw: draw,
    reset() { view.cx = 0; view.cy = 0; view.scale = 40; draw(); },
    zoom(factor) { view.scale = Math.max(2, Math.min(2000, view.scale * factor)); draw(); },
    destroy() { ro.disconnect(); },
  };
}

function touchPinchState(e) {
  const [a, b] = [e.touches[0], e.touches[1]];
  const cx = (a.clientX + b.clientX) / 2;
  const cy = (a.clientY + b.clientY) / 2;
  const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  return { cx, cy, dist };
}

function getCssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
