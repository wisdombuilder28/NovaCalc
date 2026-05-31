// Ctrl/Cmd+K command palette.
import { el } from '../core/utils.js';

export function createCommandPalette(commands) {
  const input = el('input', {
    class: 'nc-cp-input',
    type: 'text',
    placeholder: 'Type a command…',
    'aria-label': 'Command',
  });
  const list = el('ul', { class: 'nc-cp-list', role: 'listbox' });
  const panel = el('div', { class: 'nc-cp-panel', role: 'dialog', 'aria-label': 'Command palette' }, [input, list]);
  const backdrop = el('div', { class: 'nc-cp-backdrop', tabindex: '-1' }, [panel]);
  backdrop.hidden = true;
  document.body.appendChild(backdrop);

  let active = 0;
  let filtered = commands;

  function render() {
    list.innerHTML = '';
    filtered.forEach((cmd, i) => {
      const item = el('li', {
        class: 'nc-cp-item' + (i === active ? ' is-active' : ''),
        role: 'option',
        onClick: () => { close(); cmd.run(); },
      }, [
        el('span', { class: 'nc-cp-label' }, cmd.label),
        cmd.hint ? el('span', { class: 'nc-cp-hint' }, cmd.hint) : null,
      ]);
      list.appendChild(item);
    });
  }

  function filter(q) {
    const s = q.toLowerCase().trim();
    filtered = !s ? commands : commands.filter(c => c.label.toLowerCase().includes(s));
    active = 0;
    render();
  }

  function open() {
    backdrop.hidden = false;
    input.value = '';
    filter('');
    setTimeout(() => input.focus(), 0);
  }
  function close() { backdrop.hidden = true; }

  input.addEventListener('input', () => filter(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = filtered[active]; if (c) { close(); c.run(); } }
    else if (e.key === 'Escape') { close(); }
  });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });

  return { open, close };
}
