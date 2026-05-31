// Scientific calculator screen: keypad + display + KaTeX preview + history.
import { el, formatNumber } from '../core/utils.js';
import { parse } from '../parser/parser.js';
import { createEvaluator } from '../parser/evaluator.js';
import { renderPreview, warmupPreview } from './preview.js';
import { getState, setState, updateSettings } from '../core/state.js';
import { addHistory, getHistory, clearHistory } from '../storage/db.js';

const PRIMARY_KEYS = [
  ['2nd', 'DEG', 'mc', 'mr', 'm+', 'm-'],
  ['sin', 'cos', 'tan', 'ln', 'log', 'π'],
  ['x²', 'xʸ', '√', 'ʸ√x', '(', ')'],
  ['7', '8', '9', '÷', 'C', '⌫'],
  ['4', '5', '6', '×', 'Ans', 'e'],
  ['1', '2', '3', '-', 'n!', 'x'],
  ['0', '.', 'EXP', '+', ',', '='],
];

const SECOND_LABELS = {
  'sin': 'asin', 'cos': 'acos', 'tan': 'atan',
  'ln': 'exp', 'log': '10ˣ',
  'x²': 'x³', 'xʸ': 'ʸ√x',
  '√': 'cbrt', 'n!': 'nCr',
};

const KEY_INSERT = {
  '÷': '/', '×': '*', '-': '-', '+': '+',
  'π': 'pi', 'e': 'e', '(': '(', ')': ')',
  ',': ',', '.': '.', 'x': 'x',
  'sin': 'sin(', 'cos': 'cos(', 'tan': 'tan(',
  'asin': 'asin(', 'acos': 'acos(', 'atan': 'atan(',
  'ln': 'ln(', 'log': 'log(', 'exp': 'exp(', '10ˣ': '10^',
  '√': 'sqrt(', 'cbrt': 'cbrt(', 'ʸ√x': 'nroot(',
  'x²': '^2', 'x³': '^3', 'xʸ': '^', 'n!': '!',
  'nCr': 'nCr(', 'EXP': 'e', 'Ans': 'Ans',
};

let second = false;
let memory = 0;

export function mountCalculator(root) {
  warmupPreview();

  const preview = el('div', { class: 'nc-preview', 'aria-live': 'polite' });
  const input = el('input', {
    class: 'nc-input',
    type: 'text',
    spellcheck: 'false',
    autocomplete: 'off',
    autocapitalize: 'off',
    inputmode: 'none',   // suppresses OS keyboard when keypad buttons focus it
    placeholder: 'Type or tap to compute…',
    'aria-label': 'Expression input',
  });
  // When user taps the input directly, enable OS keyboard for typing
  input.addEventListener('pointerdown', () => { input.setAttribute('inputmode', 'text'); });
  // After keypad inserts text switch back to none so OS keyboard stays hidden
  function suppressKeyboard() { input.setAttribute('inputmode', 'none'); }
  const result = el('div', { class: 'nc-result', 'aria-live': 'polite' });
  const error = el('div', { class: 'nc-error' });

  const angleChip = el('span', { class: 'nc-chip', title: 'Angle mode' }, getState().settings.angleMode);
  const memChip = el('span', { class: 'nc-chip', title: 'Memory', style: 'display:none' }, 'M');
  const chips = el('div', { class: 'nc-chips' }, [angleChip, memChip]);

  const display = el('div', { class: 'nc-display' }, [
    chips,
    el('div', { class: 'nc-display-top' }, [preview]),
    input,
    result,
    error,
  ]);

  const keypad = el('div', { class: 'nc-keypad' });
  buildKeypad(keypad, (label) => onKey(label));

  const sheetBackdrop = el('div', {
    class: 'nc-sheet-backdrop',
    onClick: () => document.documentElement.classList.remove('is-history-open'),
  });
  const historyPanel = el('aside', { class: 'nc-history', 'aria-label': 'History' });
  const historyHeader = el('div', { class: 'nc-history-header' }, [
    el('span', {}, 'History'),
    el('button', {
      class: 'nc-icon-btn',
      title: 'Clear history',
      'aria-label': 'Clear history',
      onClick: async () => { await clearHistory(); refreshHistory(); },
    }, '⌫'),
  ]);
  const historyList = el('ul', { class: 'nc-history-list' });
  historyPanel.append(historyHeader, historyList);

  const wrap = el('section', { class: 'nc-calc' }, [
    el('div', { class: 'nc-main' }, [display, keypad]),
    historyPanel,
    sheetBackdrop,
  ]);
  root.appendChild(wrap);

  // ----- evaluator wiring -----
  const evaluator = createEvaluator({
    getAngleMode: () => getState().settings.angleMode,
    getAns: () => getState().ans,
    getMemory: () => memory,
  });

  // ----- previews -----
  let previewTimer;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => renderPreview(preview, input.value), 60);
  }

  input.addEventListener('input', schedulePreview);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); compute(); }
    else if (e.key === 'Escape') { e.preventDefault(); input.value = ''; result.textContent = ''; error.textContent = ''; schedulePreview(); }
  });

  function onKey(label) {
    // 2nd-function swap
    if (label === '2nd') { second = !second; renderKeypadSecond(keypad); return; }
    if (label === 'C') { suppressKeyboard(); input.value = ''; result.textContent = ''; error.textContent = ''; schedulePreview(); input.focus(); return; }
    if (label === '⌫') {
      suppressKeyboard();
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      if (start === end && start > 0) {
        input.value = input.value.slice(0, start - 1) + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start - 1;
      } else {
        input.value = input.value.slice(0, start) + input.value.slice(end);
        input.selectionStart = input.selectionEnd = start;
      }
      schedulePreview();
      input.focus();
      return;
    }
    if (label === '=') { compute(); return; }
    if (label === 'DEG' || label === 'RAD') {
      const next = label === 'DEG' ? 'RAD' : 'DEG';
      updateSettings({ angleMode: next });
      updateAngleKey(keypad);
      angleChip.textContent = next;
      return;
    }
    if (label === 'mc') { memory = 0; updateMemChip(); return; }
    if (label === 'mr') { insert('M'); return; }
    if (label === 'm+') { memory += getState().ans || 0; updateMemChip(); return; }
    if (label === 'm-') { memory -= getState().ans || 0; updateMemChip(); return; }

    const effective = second && SECOND_LABELS[label] ? SECOND_LABELS[label] : label;
    const insertText = KEY_INSERT[effective] ?? effective;
    insert(insertText);
  }

  function insert(text) {
    suppressKeyboard();
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    input.value = input.value.slice(0, start) + text + input.value.slice(end);
    const pos = start + text.length;
    input.selectionStart = input.selectionEnd = pos;
    input.focus();
    schedulePreview();
  }

  async function compute() {
    error.textContent = '';
    const expr = input.value.trim();
    if (!expr) return;
    try {
      const ast = parse(expr);
      const val = evaluator.evalNode(ast);
      const formatted = formatNumber(val);
      result.textContent = '= ' + formatted;
      setState({ ans: val });
      await addHistory({ expr, result: formatted });
      refreshHistory();
    } catch (e) {
      error.textContent = e.message;
      result.textContent = '';
    }
  }

  async function refreshHistory() {
    const items = await getHistory(40);
    historyList.innerHTML = '';
    for (const it of items) {
      const li = el('li', { class: 'nc-history-item' }, [
        el('button', {
          class: 'nc-history-row',
          onClick: () => { input.value = it.expr; schedulePreview(); input.focus(); },
        }, [
          el('span', { class: 'nc-history-expr' }, it.expr),
          el('span', { class: 'nc-history-result' }, '= ' + it.result),
        ]),
      ]);
      historyList.appendChild(li);
    }
  }

  function updateMemChip() {
    memChip.style.display = memory === 0 ? 'none' : '';
    memChip.textContent = 'M = ' + formatNumber(memory);
  }

  refreshHistory();
  updateAngleKey(keypad);
  updateMemChip();
  setTimeout(() => input.focus(), 60);

  return { focus: () => input.focus(), openHistory: () => document.documentElement.classList.add('is-history-open') };
}

function buildKeypad(root, onKey) {
  root.innerHTML = '';
  for (const row of PRIMARY_KEYS) {
    const rowEl = el('div', { class: 'nc-keyrow' });
    for (const label of row) {
      const variant = classifyKey(label);
      const btn = el('button', {
        class: `nc-key nc-key-${variant}`,
        type: 'button',
        'data-label': label,
        onClick: () => onKey(btn.dataset.label),
      }, label);
      rowEl.appendChild(btn);
    }
    root.appendChild(rowEl);
  }
}

function renderKeypadSecond(root) {
  root.querySelectorAll('.nc-key').forEach((btn) => {
    const base = btn.getAttribute('data-base') || btn.textContent;
    btn.setAttribute('data-base', base);
    if (second && SECOND_LABELS[base]) {
      btn.textContent = SECOND_LABELS[base];
      btn.dataset.label = SECOND_LABELS[base];
      btn.classList.add('nc-key-alt');
    } else {
      btn.textContent = base;
      btn.dataset.label = base;
      btn.classList.remove('nc-key-alt');
    }
  });
  const flag = root.querySelector('[data-base="2nd"]');
  if (flag) flag.classList.toggle('nc-key-active', second);
}

function updateAngleKey(root) {
  const mode = getState().settings.angleMode;
  root.querySelectorAll('.nc-key').forEach((btn) => {
    if (btn.getAttribute('data-base') === 'DEG' || btn.textContent === 'DEG' || btn.textContent === 'RAD') {
      btn.setAttribute('data-base', mode);
      btn.textContent = mode;
      btn.dataset.label = mode;
      btn.classList.add('nc-key-active');
    }
  });
}

function classifyKey(label) {
  if (['=', 'Ans'].includes(label)) return 'accent';
  if (['+', '-', '×', '÷', '^'].includes(label)) return 'op';
  if (['C', '⌫'].includes(label)) return 'danger';
  if (['2nd', 'DEG', 'RAD', 'mc', 'mr', 'm+', 'm-'].includes(label)) return 'meta';
  if (/^[0-9.]$/.test(label)) return 'digit';
  return 'fn';
}
