// Pratt parser: handles precedence, right-assoc ^, implicit multiplication,
// unary +/-, postfix !, and function calls.
import { TT, tokenize } from './tokenizer.js';
import { Node } from './ast.js';
import { ParseError } from '../engine/errors.js';

// Binary operator precedence table (left-binding power).
const PREC = {
  '+': 10, '-': 10,
  '*': 20, '/': 20, '%': 20,
  '^': 30,
};
const RIGHT_ASSOC = new Set(['^']);

class Parser {
  constructor(tokens) {
    this.t = tokens;
    this.i = 0;
  }
  peek(o = 0) { return this.t[this.i + o]; }
  eat() { return this.t[this.i++]; }
  expect(type, val) {
    const tk = this.peek();
    if (tk.type !== type || (val != null && tk.value !== val)) {
      throw new ParseError(`Expected ${val ?? type}`, tk.pos);
    }
    return this.eat();
  }

  parseExpression(minPrec = 0) {
    let left = this.parseUnary();

    // implicit multiplication + binary operators + postfix
    while (true) {
      const tk = this.peek();

      if (tk.type === TT.BANG) {
        this.eat();
        left = Node.factorial(left);
        // Guard against chained factorials like 5!!! which explode
        let bangCount = 1;
        while (this.peek().type === TT.BANG) {
          if (bangCount >= 2) throw new ParseError('Chained factorials (e.g. 5!!!) are not supported', this.peek().pos);
          this.eat();
          left = Node.factorial(left);
          bangCount++;
        }
        continue;
      }

      // implicit multiplication: number/) followed by ident/( -> insert *
      if (
        (tk.type === TT.IDENT || tk.type === TT.LPAREN || tk.type === TT.NUMBER)
        && this.canImplicitMul(left)
      ) {
        // implicit * has precedence of *
        const prec = PREC['*'];
        if (prec < minPrec) break;
        const right = this.parseUnary();
        left = Node.binary('*', left, right);
        continue;
      }

      if (tk.type !== TT.OP || tk.value === '=') break;
      const prec = PREC[tk.value];
      if (prec == null || prec < minPrec) break;

      this.eat();
      const nextMin = RIGHT_ASSOC.has(tk.value) ? prec : prec + 1;
      const right = this.parseExpression(nextMin);
      left = Node.binary(tk.value, left, right);
    }
    return left;
  }

  canImplicitMul(left) {
    // Only allow if `left` is a "value" expression (number / call / ident / paren / factorial / unary).
    return ['Num', 'Ident', 'Call', 'Binary', 'Unary', 'Factorial'].includes(left.type);
  }

  parseUnary() {
    const tk = this.peek();
    if (tk.type === TT.OP && (tk.value === '+' || tk.value === '-')) {
      this.eat();
      const arg = this.parseUnary();
      return tk.value === '-' ? Node.unary('-', arg) : arg;
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const tk = this.eat();
    if (tk.type === TT.NUMBER) return Node.num(tk.value);
    if (tk.type === TT.LPAREN) {
      const e = this.parseExpression(0);
      this.expect(TT.RPAREN);
      return e;
    }
    if (tk.type === TT.IDENT) {
      if (this.peek().type === TT.LPAREN) {
        this.eat(); // (
        const args = [];
        if (this.peek().type !== TT.RPAREN) {
          args.push(this.parseExpression(0));
          while (this.peek().type === TT.COMMA) {
            this.eat();
            args.push(this.parseExpression(0));
          }
        }
        this.expect(TT.RPAREN);
        return Node.call(tk.value, args);
      }
      return Node.ident(tk.value);
    }
    throw new ParseError(`Unexpected token "${tk.value ?? tk.type}"`, tk.pos);
  }
}

export function parse(input) {
  const tokens = tokenize(input);
  const p = new Parser(tokens);
  if (p.peek().type === TT.EOF) {
    throw new ParseError('Empty expression', 0);
  }
  const ast = p.parseExpression(0);
  if (p.peek().type !== TT.EOF) {
    throw new ParseError(`Unexpected token "${p.peek().value}"`, p.peek().pos);
  }
  return ast;
}
