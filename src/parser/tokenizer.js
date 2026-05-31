// Tokenizer: converts an expression string into a flat token stream.
// No regex magic for numbers — keeps positions exact for error reporting.
import { ParseError } from '../engine/errors.js';

export const TT = {
  NUMBER: 'NUMBER',
  IDENT: 'IDENT',
  OP: 'OP',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  COMMA: 'COMMA',
  BANG: 'BANG',
  EOF: 'EOF',
};

const SINGLE = {
  '(': TT.LPAREN,
  ')': TT.RPAREN,
  ',': TT.COMMA,
  '!': TT.BANG,
};

const OPS = new Set(['+', '-', '*', '/', '^', '%']);

// Normalise unicode operators so users can paste pretty math.
const NORMALISE = {
  '−': '-',
  '–': '-',
  '×': '*',
  '·': '*',
  '⋅': '*',
  '÷': '/',
  '√': 'sqrt',
  'π': 'pi',
};

function isDigit(c) { return c >= '0' && c <= '9'; }
function isIdentStart(c) { return /[A-Za-z_]/.test(c); }
function isIdentPart(c) { return /[A-Za-z0-9_]/.test(c); }

export function tokenize(input) {
  // Replace unicode aliases first (preserves length where possible).
  let src = '';
  for (const ch of input) src += NORMALISE[ch] ?? ch;

  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      const start = i;
      while (i < src.length && isDigit(src[i])) i++;
      if (src[i] === '.') {
        i++;
        while (i < src.length && isDigit(src[i])) i++;
      }
      // scientific notation
      if (src[i] === 'e' || src[i] === 'E') {
        i++;
        if (src[i] === '+' || src[i] === '-') i++;
        if (!isDigit(src[i])) throw new ParseError('Invalid exponent', i);
        while (i < src.length && isDigit(src[i])) i++;
      }
      const lex = src.slice(start, i);
      const value = Number(lex);
      if (Number.isNaN(value)) throw new ParseError(`Invalid number "${lex}"`, start);
      tokens.push({ type: TT.NUMBER, value, lex, pos: start });
      continue;
    }

    if (isIdentStart(c)) {
      const start = i;
      while (i < src.length && isIdentPart(src[i])) i++;
      tokens.push({ type: TT.IDENT, value: src.slice(start, i), pos: start });
      continue;
    }

    if (SINGLE[c]) {
      tokens.push({ type: SINGLE[c], value: c, pos: i });
      i++;
      continue;
    }

    if (OPS.has(c)) {
      tokens.push({ type: TT.OP, value: c, pos: i });
      i++;
      continue;
    }

    if (c === '=') {
      // Equation context handles this; in pure expressions it's an error.
      tokens.push({ type: TT.OP, value: '=', pos: i });
      i++;
      continue;
    }

    throw new ParseError(`Unexpected character "${c}"`, i);
  }
  tokens.push({ type: TT.EOF, value: null, pos: src.length });
  return tokens;
}
