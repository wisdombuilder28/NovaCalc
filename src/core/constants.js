// Mathematical constants and shared config
export const CONSTANTS = Object.freeze({
  pi: Math.PI,
  PI: Math.PI,
  π: Math.PI,
  e: Math.E,
  E: Math.E,
  tau: Math.PI * 2,
  Infinity: Infinity,
});

// Settings persisted to localStorage
export const SETTINGS_KEY = 'novacalc:settings';
export const DEFAULT_SETTINGS = {
  angleMode: 'DEG', // or 'RAD'
  theme: 'oled',
};
