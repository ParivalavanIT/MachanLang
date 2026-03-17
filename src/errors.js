class MachanError extends Error {
  constructor(message, line) {
    super(message);
    this.name = this.constructor.name;
    this.line = line;
  }
}

class MachanSyntaxError extends MachanError {}
class UndefinedVariableError extends MachanError {}
class ConstantReassignError extends MachanError {}
class MachanRuntimeError extends MachanError {}

module.exports = {
  MachanError,
  MachanSyntaxError,
  UndefinedVariableError,
  ConstantReassignError,
  MachanRuntimeError,
};
