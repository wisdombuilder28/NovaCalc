// AST node constructors. Keeps tree shape consistent for evaluator + solver.
export const Node = {
  num: (value) => ({ type: 'Num', value }),
  ident: (name) => ({ type: 'Ident', name }),
  unary: (op, arg) => ({ type: 'Unary', op, arg }),
  binary: (op, left, right) => ({ type: 'Binary', op, left, right }),
  call: (name, args) => ({ type: 'Call', name, args }),
  factorial: (arg) => ({ type: 'Factorial', arg }),
};
