import { getState, updateSettings } from '../core/state.js';

export const THEMES = [
  { id: 'oled', label: 'OLED' },
  { id: 'casio', label: 'Retro Casio' },
  { id: 'hacker', label: 'Hacker' },
  { id: 'neon', label: 'Neon' },
];

export function applyTheme(id) {
  document.documentElement.dataset.theme = id;
  document.documentElement.style.colorScheme = 'dark';
}

export function initTheme() {
  applyTheme(getState().settings.theme || 'oled');
}

export function setTheme(id) {
  updateSettings({ theme: id });
  applyTheme(id);
}

export function cycleTheme() {
  const cur = getState().settings.theme;
  const idx = THEMES.findIndex(t => t.id === cur);
  setTheme(THEMES[(idx + 1) % THEMES.length].id);
}
