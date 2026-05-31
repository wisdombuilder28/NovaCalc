// Walks the AST and computes a numeric result. No eval/Function.
import { CONSTANTS } from '../core/constants.js';
import { buildFunctions } from '../engine/functions.js';
import { EvalError } from '../engine/errors.js';

export function createEvaluator({ getAngleMode, getAns, getMemory, variables = {} }) {
  const fns = buildFunctions(getAngleMode);

  function evalNode(node, scope) {
    switch (node.type) {
      case 'Num': return node.value;
      case 'Ident': {
        const name = node.name;
        if (scope && name in scope) return scope[name];
        if (name in CONSTANTS) return CONSTANTS[name];
        if (name === 'Ans' || name === 'ans') return getAns?.() ?? 0;
        if (name === 'M' || name === 'mem') return getMemory?.() ?? 0;
        if (name in variables) return variables[name];
        throw new EvalError(`Unknown identifier "${name}"`);
      }
      case 'Unary': {
        const v = evalNode(node.arg, scope);
        return node.op === '-' ? -v : v;
      }
      case 'Binary': {
        const a = evalNode(node.left, scope);
        const b = evalNode(node.right, scope);
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/':
            if (b === 0) throw new EvalError('Division by zero');
            return a / b;
          case '%': return a % b;
          case '^': return Math.pow(a, b);
        }
        throw new EvalError(`Unknown operator "${node.op}"`);
      }
      case 'Factorial': {
        const v = evalNode(node.arg, scope);
        return fns.fact.fn(v);
      }
      case 'Call': {
        const def = fns[node.name];
        if (!def) throw new EvalError(`Unknown function "${node.name}"`);
        const args = node.args.map(a => evalNode(a, scope));
        if (def.arity !== -1 && args.length !== def.arity) {
          throw new EvalError(`${node.name}() expects ${def.arity} argument(s)`);
        }
        return def.fn(...args);
      }
    }
    throw new EvalError(`Unknown node type "${node.type}"`);
  }

  return { evalNode };
}
