export class ParseError extends Error {
  constructor(message, position = -1) {
    super(message);
    this.name = 'ParseError';
    this.position = position;
  }
}

export class EvalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvalError';
  }
}
