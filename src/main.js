// App bootstrap: shell, navigation, theme, command palette, PWA.
import { el } from './core/utils.js';
import { mountCalculator } from './ui/calculator.js';
import { mountGraph } from './ui/graphView.js';
import { mountSolver } from './ui/solverView.js';
import { createCommandPalette } from './ui/commandPalette.js';
import { initTheme, setTheme, cycleTheme, THEMES } from './themes/themes.js';
import { getState, setState } from './core/state.js';
import { registerSW } from './pwa/register.js';

const MODES = [
  { id: 'calc', label: 'Calculator', shortcut: 'Ctrl+/' },
  { id: 'graph', label: 'Graph', shortcut: 'Ctrl+G' },
  { id: 'solver', label: 'Solver', shortcut: 'Ctrl+S' },
];

export function bootNovaCalc(host) {
  initTheme();
  host.classList.add('novacalc-root');
  host.innerHTML = '';

  const brand = el('div', { class: 'nc-brand' }, [
    el('span', { class: 'nc-logo', 'aria-hidden': 'true' }, '∑'),
    el('div', {}, [
      el('div', { class: 'nc-brand-name' }, 'NovaCalc'),
      el('div', { class: 'nc-brand-tag' }, 'computational mathematics'),
    ]),
  ]);

  const nav = el('nav', { class: 'nc-nav', 'aria-label': 'Mode' });
  const navButtons = {};
  for (const m of MODES) {
    const b = el('button', {
      class: 'nc-tab',
      type: 'button',
      'aria-pressed': 'false',
      onClick: () => switchMode(m.id),
    }, m.label);
    navButtons[m.id] = b;
    nav.appendChild(b);
  }

  const themeBtn = el('button', {
    class: 'nc-icon-btn nc-theme-btn',
    title: 'Cycle theme (Ctrl+T)',
    'aria-label': 'Cycle theme',
    onClick: () => { cycleTheme(); reflectTheme(); },
  }, '◐');

  const historyBtn = el('button', {
    class: 'nc-icon-btn nc-history-btn',
    title: 'History',
    'aria-label': 'Toggle history',
    onClick: () => document.documentElement.classList.toggle('is-history-open'),
  }, '⌚');

  const cmdBtn = el('button', {
    class: 'nc-icon-btn',
    title: 'Command palette (Ctrl+K)',
    'aria-label': 'Open command palette',
    onClick: () => palette.open(),
  }, '⌘K');

  const header = el('header', { class: 'nc-header' }, [
    brand,
    nav,
    el('div', { class: 'nc-header-actions' }, [historyBtn, cmdBtn, themeBtn]),
  ]);

  const stage = el('main', { class: 'nc-stage', id: 'nc-stage', role: 'main' });

  host.append(header, stage);

  const palette = createCommandPalette([
    { label: 'Switch to Calculator', hint: 'Ctrl+/', run: () => switchMode('calc') },
    { label: 'Switch to Graph',      hint: 'Ctrl+G', run: () => switchMode('graph') },
    { label: 'Switch to Solver',     hint: 'Ctrl+S', run: () => switchMode('solver') },
    { label: 'Cycle theme',          hint: 'Ctrl+T', run: () => { cycleTheme(); reflectTheme(); } },
    ...THEMES.map(t => ({ label: `Theme: ${t.label}`, run: () => { setTheme(t.id); reflectTheme(); } })),
    { label: 'Toggle DEG / RAD',     run: () => {
        const cur = getState().settings.angleMode;
        setState({ settings: { ...getState().settings, angleMode: cur === 'DEG' ? 'RAD' : 'DEG' } });
        switchMode(getState().mode);
      },
    },
  ]);

  function switchMode(id) {
    setState({ mode: id });
    for (const m of MODES) {
      navButtons[m.id].setAttribute('aria-pressed', String(m.id === id));
      navButtons[m.id].classList.toggle('is-active', m.id === id);
    }
    stage.innerHTML = '';
    document.documentElement.classList.remove('is-history-open');
    historyBtn.style.visibility = id === 'calc' ? '' : 'hidden';
    if (id === 'calc') mountCalculator(stage);
    else if (id === 'graph') mountGraph(stage);
    else mountSolver(stage);
  }

  function reflectTheme() {
    themeBtn.textContent = ({
      oled: '◐', casio: '⌗', hacker: '⌁', neon: '✦',
    })[getState().settings.theme] || '◐';
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'k') { e.preventDefault(); palette.open(); }
    else if (k === 'g') { e.preventDefault(); switchMode('graph'); }
    else if (k === 's') { e.preventDefault(); switchMode('solver'); }
    else if (k === '/') { e.preventDefault(); switchMode('calc'); }
    else if (k === 't') { e.preventDefault(); cycleTheme(); reflectTheme(); }
  });

  reflectTheme();
  switchMode('calc');
  registerSW();
}
