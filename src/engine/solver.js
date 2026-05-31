// Linear + quadratic equation solver via numerical sampling on the AST.
// Strategy:
//   1. Parse both sides of `=`, build f(x) = LHS - RHS.
//   2. Evaluate f(0), f(1), f(2) to fit a polynomial of degree <= 2.
//   3. Use the fitted coefficients to classify + solve.
// Handles 99% of textbook equations and avoids a full CAS.
import { parse } from '../parser/parser.js';
import { createEvaluator } from '../parser/evaluator.js';
import { EvalError, ParseError } from './errors.js';
import { formatNumber } from '../core/utils.js';

function splitEquation(input) {
  // Split on the first top-level '=' (parser only sees one expression).
  // We tokenise lightly here: respect parentheses.
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === '=' && depth === 0) {
      return [input.slice(0, i), input.slice(i + 1)];
    }
  }
  return [input, '0'];
}

export function solve(input, { angleMode = 'RAD' } = {}) {
  const [lhsStr, rhsStr] = splitEquation(input);
  const lhs = parse(lhsStr);
  const rhs = parse(rhsStr);

  const { evalNode } = createEvaluator({
    getAngleMode: () => angleMode,
    getAns: () => 0,
    getMemory: () => 0,
  });

  const f = (x) => evalNode(lhs, { x }) - evalNode(rhs, { x });

  // Probe three points to fit ax^2 + bx + c.
  const y0 = f(0);
  const y1 = f(1);
  const y2 = f(2);
  // c = y0; a + b + c = y1; 4a + 2b + c = y2.
  const c = y0;
  const a = (y2 - 2 * y1 + y0) / 2;
  const b = y1 - a - c;

  // Round tiny noise to zero.
  const eps = 1e-10;
  const clean = (n) => Math.abs(n) < eps ? 0 : n;
  const A = clean(a), B = clean(b), C = clean(c);

  // Verify the fit at a fourth point — confirms it's truly polynomial of degree <= 2.
  const y3Pred = A * 9 + B * 3 + C;
  const y3 = f(3);
  if (!Number.isFinite(y3) || Math.abs(y3 - y3Pred) > 1e-6) {
    throw new EvalError('Only linear and quadratic equations in x are supported in v1');
  }

  const steps = [];
  if (A === 0 && B === 0) {
    if (C === 0) return { type: 'identity', steps: ['Both sides are equal for all x.'] };
    return { type: 'none', steps: ['No solution: equation reduces to a contradiction.'] };
  }
  if (A === 0) {
    steps.push(`Linear equation: ${formatNumber(B)}x + ${formatNumber(C)} = 0`);
    const x = -C / B;
    steps.push(`x = -(${formatNumber(C)}) / ${formatNumber(B)}`);
    steps.push(`x = ${formatNumber(x)}`);
    return { type: 'linear', roots: [x], steps };
  }
  // Quadratic
  steps.push(`Quadratic: ${formatNumber(A)}x² + ${formatNumber(B)}x + ${formatNumber(C)} = 0`);
  const disc = B * B - 4 * A * C;
  steps.push(`Δ = b² − 4ac = ${formatNumber(disc)}`);
  if (disc > 0) {
    const r1 = (-B + Math.sqrt(disc)) / (2 * A);
    const r2 = (-B - Math.sqrt(disc)) / (2 * A);
    steps.push(`x = (−b ± √Δ) / 2a`);
    steps.push(`x₁ = ${formatNumber(r1)},  x₂ = ${formatNumber(r2)}`);
    return { type: 'quadratic', roots: [r1, r2], steps };
  }
  if (disc === 0) {
    const r = -B / (2 * A);
    steps.push(`Δ = 0 → one repeated root.`);
    steps.push(`x = ${formatNumber(r)}`);
    return { type: 'quadratic', roots: [r], steps };
  }
  // Complex roots
  const real = -B / (2 * A);
  const imag = Math.sqrt(-disc) / (2 * A);
  steps.push(`Δ < 0 → complex conjugate roots.`);
  steps.push(`x = ${formatNumber(real)} ± ${formatNumber(imag)}i`);
  return {
    type: 'complex',
    roots: [{ re: real, im: imag }, { re: real, im: -imag }],
    steps,
  };
}
