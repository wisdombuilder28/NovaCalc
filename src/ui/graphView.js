// Graph mode: list of plotted functions + canvas.
import { el } from '../core/utils.js';
import { createGraph } from '../graph/canvas.js';
import { getState } from '../core/state.js';

const COLORS = ['#5eead4', '#a78bfa', '#fb7185', '#fbbf24', '#60a5fa', '#34d399'];

export function mountGraph(root) {
  const list = el('div', { class: 'nc-graph-list' });
  const canvas = el('canvas', { class: 'nc-graph-canvas', 'aria-label': 'Function graph' });
  const toolbar = el('div', { class: 'nc-graph-toolbar' });

  const wrap = el('section', { class: 'nc-graph' }, [
    el('div', { class: 'nc-graph-side' }, [
      el('h2', { class: 'nc-section-title' }, 'Functions'),
      list,
      el('button', {
        class: 'nc-btn nc-btn-ghost',
        onClick: () => addFn(),
      }, '+ Add function'),
    ]),
    el('div', { class: 'nc-graph-stage' }, [toolbar, canvas]),
  ]);
  root.appendChild(wrap);

  const graph = createGraph(canvas, { getAngleMode: () => getState().settings.angleMode });

  toolbar.append(
    el('button', { class: 'nc-btn', onClick: () => graph.zoom(1.4) }, '＋'),
    el('button', { class: 'nc-btn', onClick: () => graph.zoom(1 / 1.4) }, '−'),
    el('button', { class: 'nc-btn nc-btn-ghost', onClick: () => graph.reset() }, 'Reset'),
  );

  let plots = [];
  // Track DOM rows so we can update them without destroying focused inputs
  const rowEls = new Map();

  function syncGraph() {
    graph.setPlots(plots.filter(p => p.expr.trim()));
  }

  function renderList() {
    // Remove extra rows from bottom
    while (list.children.length > plots.length) {
      rowEls.delete(list.children.length - 1);
      list.removeChild(list.lastChild);
    }

    plots.forEach((p, i) => {
      if (rowEls.has(i)) {
        // Update existing row in-place — never destroy a focused input
        const { inputEl, toggle } = rowEls.get(i);
        if (document.activeElement !== inputEl) {
          inputEl.value = p.expr;
        }
        toggle.textContent = p.visible ? '👁' : '∅';
        toggle.title = p.visible ? 'Hide' : 'Show';
      } else {
        // Build a new row
        const swatch = el('span', { class: 'nc-swatch', style: `background:${p.color}` });
        const inputEl = el('input', {
          class: 'nc-input nc-input-inline',
          type: 'text',
          placeholder: 'e.g. x^2',
          value: p.expr,
          spellcheck: 'false',
          autocomplete: 'off',
          autocapitalize: 'off',
          'aria-label': `Function ${i + 1}`,
        });
        inputEl.addEventListener('input', () => { p.expr = inputEl.value; syncGraph(); });

        const toggle = el('button', {
          class: 'nc-icon-btn',
          title: p.visible ? 'Hide' : 'Show',
          'aria-label': 'Toggle visibility',
          onClick: () => { p.visible = !p.visible; syncGraph(); renderList(); },
        }, p.visible ? '👁' : '∅');

        const del = el('button', {
          class: 'nc-icon-btn',
          title: 'Remove',
          'aria-label': 'Remove',
          onClick: () => { plots.splice(i, 1); rowEls.clear(); renderList(); syncGraph(); },
        }, '×');

        const prefix = el('span', { class: 'nc-graph-prefix' }, 'y =');
        const row = el('div', { class: 'nc-graph-row' }, [swatch, prefix, inputEl, toggle, del]);
        list.appendChild(row);
        rowEls.set(i, { row, inputEl, toggle, del });
      }
    });
  }

  function addFn(expr = '') {
    const color = COLORS[plots.length % COLORS.length];
    plots.push({ expr, color, visible: true });
    renderList();
    syncGraph();
    // Focus the new input after render
    const entry = rowEls.get(plots.length - 1);
    if (entry) setTimeout(() => entry.inputEl.focus(), 0);
  }

  addFn('sin(x)');
  addFn('x^2 / 10');

  return { destroy: () => graph.destroy() };
}
