const { UndefinedVariableError, ConstantReassignError } = require('./errors');

class Environment {
  constructor(parent = null) {
    this.parent = parent;
    this.values = new Map();
    this.consts = new Set();
  }

  has(name) {
    if (this.values.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  get(name, line) {
    if (this.values.has(name)) return this.values.get(name);
    if (this.parent) return this.parent.get(name, line);
    throw new UndefinedVariableError(`yaaru da idhu? variable theriyala (line ${line})`, line);
  }

  set(name, value, line) {
    if (this.values.has(name)) {
      if (this.consts.has(name)) {
        throw new ConstantReassignError(`respect anna-va touch pannathey da 🙏 (line ${line})`, line);
      }
      this.values.set(name, value);
      return value;
    }

    if (this.parent && this.parent.has(name)) {
      return this.parent.set(name, value, line);
    }

    this.values.set(name, value);
    return value;
  }

  setConst(name, value, line) {
    if (this.values.has(name)) {
      if (this.consts.has(name)) {
        throw new ConstantReassignError(`respect anna-va touch pannathey da 🙏 (line ${line})`, line);
      }
      this.values.set(name, value);
      this.consts.add(name);
      return value;
    }

    if (this.parent && this.parent.has(name)) {
      return this.parent.setConst(name, value, line);
    }

    this.values.set(name, value);
    this.consts.add(name);
    return value;
  }
}

module.exports = Environment;
