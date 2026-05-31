// Tiny pub/sub store. Framework-free.
import { DEFAULT_SETTINGS, SETTINGS_KEY } from './constants.js';

function load() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const listeners = new Set();
const state = {
  settings: load(),
  mode: 'calc', // 'calc' | 'graph' | 'solver'
  memory: 0,
  ans: 0,
};

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setState(patch) {
  Object.assign(state, patch);
  if (patch.settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    } catch {}
  }
  for (const fn of listeners) fn(state);
}

export function updateSettings(patch) {
  setState({ settings: { ...state.settings, ...patch } });
}
