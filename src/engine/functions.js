// Math function registry — only names listed here can be called.
// Each entry: arity (or -1 for any), implementation.
import { EvalError } from './errors.js';

function fact(n) {
  if (n < 0 || !Number.isInteger(n)) throw new EvalError('factorial requires a non-negative integer');
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  if (r === 0 || r === n) return 1;
  r = Math.min(r, n - r);
  let result = 1;
  for (let i = 1; i <= r; i++) result = result * (n - r + i) / i;
  return Math.round(result);
}

export function buildFunctions(getAngleMode) {
  // angle mode applies to trig only.
  const toRad = (x) => getAngleMode() === 'DEG' ? x * Math.PI / 180 : x;
  const fromRad = (x) => getAngleMode() === 'DEG' ? x * 180 / Math.PI : x;

  return {
    // trig
    sin: { arity: 1, fn: (x) => Math.sin(toRad(x)) },
    cos: { arity: 1, fn: (x) => Math.cos(toRad(x)) },
    tan: { arity: 1, fn: (x) => Math.tan(toRad(x)) },
    asin: { arity: 1, fn: (x) => fromRad(Math.asin(x)) },
    acos: { arity: 1, fn: (x) => fromRad(Math.acos(x)) },
    atan: { arity: 1, fn: (x) => fromRad(Math.atan(x)) },
    sinh: { arity: 1, fn: Math.sinh },
    cosh: { arity: 1, fn: Math.cosh },
    tanh: { arity: 1, fn: Math.tanh },

    // logs / exp / roots
    ln: { arity: 1, fn: Math.log },
    log: { arity: 1, fn: Math.log10 },
    log2: { arity: 1, fn: Math.log2 },
    exp: { arity: 1, fn: Math.exp },
    sqrt: { arity: 1, fn: Math.sqrt },
    cbrt: { arity: 1, fn: Math.cbrt },
    nroot: { arity: 2, fn: (n, x) => Math.sign(x) * Math.pow(Math.abs(x), 1 / n) },
    pow: { arity: 2, fn: Math.pow },

    // rounding / numeric
    abs: { arity: 1, fn: Math.abs },
    sign: { arity: 1, fn: Math.sign },
    round: { arity: 1, fn: Math.round },
    floor: { arity: 1, fn: Math.floor },
    ceil: { arity: 1, fn: Math.ceil },
    min: { arity: -1, fn: Math.min },
    max: { arity: -1, fn: Math.max },
    mod: { arity: 2, fn: (a, b) => ((a % b) + b) % b },

    // combinatorics
    fact: { arity: 1, fn: fact },
    factorial: { arity: 1, fn: fact },
    nCr: { arity: 2, fn: nCr },
    nPr: { arity: 2, fn: (n, r) => fact(n) / fact(n - r) },
  };
}
