// Equation solver UI.
import { el } from '../core/utils.js';
import { solve } from '../engine/solver.js';
import { renderLatex } from './preview.js';
import { getState } from '../core/state.js';

export function mountSolver(root) {
  const input = el('input', {
    class: 'nc-input nc-input-lg',
    type: 'text',
    placeholder: 'e.g.  x^2 - 5x + 6 = 0',
    spellcheck: 'false',
    'aria-label': 'Equation',
    value: 'x^2 - 5x + 6 = 0',
  });
  const runBtn = el('button', { class: 'nc-btn nc-btn-primary', onClick: run }, 'Solve');
  const stepsEl = el('div', { class: 'nc-solver-steps' });
  const errorEl = el('div', { class: 'nc-error' });

  const wrap = el('section', { class: 'nc-solver' }, [
    el('div', { class: 'nc-solver-head' }, [
      el('h2', { class: 'nc-section-title' }, 'Equation solver'),
      el('p', { class: 'nc-muted' }, 'Solves linear and quadratic equations in x. Use “=” to separate sides.'),
    ]),
    el('div', { class: 'nc-solver-form' }, [input, runBtn]),
    errorEl,
    stepsEl,
  ]);
  root.appendChild(wrap);

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') run(); });
  run();

  async function run() {
    errorEl.textContent = '';
    stepsEl.innerHTML = '';
    try {
      const out = solve(input.value, { angleMode: getState().settings.angleMode });
      out.steps.forEach((s) => {
        const step = el('div', { class: 'nc-step' });
        stepsEl.appendChild(step);
        step.textContent = s;
      });
      if (out.roots) {
        const rootBox = el('div', { class: 'nc-solver-roots' });
        const latex = out.type === 'complex'
          ? out.roots.map(r => `${num(r.re)} ${r.im >= 0 ? '+' : '-'} ${num(Math.abs(r.im))}i`).join(',\\quad ')
          : out.roots.map(num).join(',\\quad ');
        renderLatex(rootBox, `x = ${latex}`, true);
        stepsEl.appendChild(rootBox);
      }
    } catch (e) {
      errorEl.textContent = e.message;
    }
  }
}

function num(n) { return Number(n.toPrecision(10)).toString(); }
