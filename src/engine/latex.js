// AST -> LaTeX string for KaTeX rendering.
const FUNC_LATEX = {
  sqrt: (a) => `\\sqrt{${a}}`,
  cbrt: (a) => `\\sqrt[3]{${a}}`,
  nroot: (n, x) => `\\sqrt[${n}]{${x}}`,
  abs: (a) => `\\left|${a}\\right|`,
  ln: (a) => `\\ln\\left(${a}\\right)`,
  log: (a) => `\\log\\left(${a}\\right)`,
  log2: (a) => `\\log_{2}\\left(${a}\\right)`,
  exp: (a) => `e^{${a}}`,
  fact: (a) => `\\left(${a}\\right)!`,
  factorial: (a) => `\\left(${a}\\right)!`,
};

const TRIG = new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh']);

const OP_LATEX = { '*': '\\cdot ', '/': null, '+': '+', '-': '-', '^': '^', '%': '\\bmod ' };

const PREC = { '+':1,'-':1,'*':2,'/':2,'%':2,'^':3 };

export function astToLatex(node) {
  return render(node, 0);
}

function render(node, parentPrec) {
  switch (node.type) {
    case 'Num': return formatNum(node.value);
    case 'Ident': return identLatex(node.name);
    case 'Unary': return `-${render(node.arg, 3)}`;
    case 'Factorial': return `${render(node.arg, 4)}!`;
    case 'Call': {
      const name = node.name;
      const args = node.args.map(a => render(a, 0));
      if (FUNC_LATEX[name]) return FUNC_LATEX[name](...args);
      if (TRIG.has(name)) return `\\${name.replace(/^a/, 'arc')}\\left(${args.join(',')}\\right)`;
      return `\\mathrm{${name}}\\left(${args.join(',')}\\right)`;
    }
    case 'Binary': {
      const p = PREC[node.op] ?? 0;
      if (node.op === '/') {
        return `\\frac{${render(node.left, 0)}}{${render(node.right, 0)}}`;
      }
      if (node.op === '^') {
        const base = render(node.left, 4);
        const exp = render(node.right, 0);
        const out = `${base}^{${exp}}`;
        return p < parentPrec ? `\\left(${out}\\right)` : out;
      }
      const out = `${render(node.left, p)}${OP_LATEX[node.op] ?? node.op}${render(node.right, p + 1)}`;
      return p < parentPrec ? `\\left(${out}\\right)` : out;
    }
  }
  return '';
}

function identLatex(name) {
  if (name === 'pi' || name === 'PI') return '\\pi';
  if (name === 'tau') return '\\tau';
  if (name === 'Ans' || name === 'ans') return '\\mathrm{Ans}';
  return name.length === 1 ? name : `\\mathrm{${name}}`;
}

function formatNum(n) {
  if (!Number.isFinite(n)) return n > 0 ? '\\infty' : '-\\infty';
  return Number(n.toPrecision(12)).toString();
}
