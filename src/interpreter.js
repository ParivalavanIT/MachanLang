const Environment = require('./environment');
const { MachanRuntimeError } = require('./errors');

class ReturnSignal {
  constructor(value) {
    this.value = value;
  }
}

class Interpreter {
  constructor() {
    this.global = new Environment();
  }

  run(program) {
    return this.evaluateProgram(program, this.global);
  }

  evaluateProgram(program, env) {
    let last;
    for (const stmt of program.body) {
      last = this.evaluate(stmt, env, stmt.line || 0);
    }
    return last;
  }

  evaluate(node, env, lineHint = 0) {
    switch (node.type) {
      case 'VariableDeclaration':
        return env.set(node.name, this.evaluate(node.value, env, node.line), node.line);
      case 'ConstantDeclaration':
        return env.setConst(node.name, this.evaluate(node.value, env, node.line), node.line);
      case 'PrintStatement': {
        const value = this.evaluate(node.expression, env, node.line);
        if (node.mode === 'error') {
          console.error(String(value));
        } else {
          console.log(String(value));
        }
        return null;
      }
      case 'IfStatement': {
        const test = this.evaluate(node.test, env, node.line);
        if (test) {
          return this.executeBlock(node.consequent, env, node.line);
        }
        if (node.alternate) {
          return this.executeBlock(node.alternate, env, node.line);
        }
        return null;
      }
      case 'WhileStatement': {
        let last;
        while (this.evaluate(node.test, env, node.line)) {
          last = this.executeBlock(node.body, env, node.line);
        }
        return last;
      }
      case 'RepeatStatement': {
        const countVal = this.evaluate(node.count, env, node.line);
        const count = Number(countVal);
        if (Number.isNaN(count)) {
          throw new MachanRuntimeError(`seri illa da execution 😐 (line ${node.line})`, node.line);
        }
        let last;
        for (let i = 0; i < count; i += 1) {
          last = this.executeBlock(node.body, env, node.line);
        }
        return last;
      }
      case 'FunctionDeclaration': {
        const func = {
          type: 'Function',
          params: node.params,
          body: node.body,
          env,
        };
        env.set(node.name, func, node.line);
        return func;
      }
      case 'ReturnStatement': {
        const value = node.value ? this.evaluate(node.value, env, node.line) : null;
        throw new ReturnSignal(value);
      }
      case 'ExpressionStatement':
        return this.evaluate(node.expression, env, node.line);
      case 'EndStatement':
        return null;
      case 'BinaryExpression':
        return this.evaluateBinary(node, env, lineHint);
      case 'UnaryExpression':
        return this.evaluateUnary(node, env, lineHint);
      case 'NumericLiteral':
      case 'StringLiteral':
        return node.value;
      case 'ArrayLiteral':
        return node.elements.map((el) => this.evaluate(el, env, lineHint));
      case 'Identifier':
        return env.get(node.name, node.line || lineHint);
      case 'CallExpression':
        return this.evaluateCall(node, env, lineHint);
      case 'IndexAccess': {
        const arr = this.evaluate(node.array, env, lineHint);
        const idx = this.evaluate(node.index, env, lineHint);
        if (arr == null || typeof arr !== 'object') {
          throw new MachanRuntimeError(`seri illa da execution 😐 (line ${lineHint})`, lineHint);
        }
        return arr[idx];
      }
      default:
        throw new MachanRuntimeError(`seri illa da execution 😐 (line ${lineHint})`, lineHint);
    }
  }

  executeBlock(statements, env, lineHint) {
    let last;
    for (const stmt of statements) {
      last = this.evaluate(stmt, env, stmt.line || lineHint);
    }
    return last;
  }

  evaluateBinary(node, env, lineHint) {
    const left = this.evaluate(node.left, env, lineHint);
    const right = this.evaluate(node.right, env, lineHint);
    switch (node.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '==':
        return left == right; // eslint-disable-line eqeqeq
      case '!=':
        return left != right; // eslint-disable-line eqeqeq
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case 'and':
        return Boolean(left) && Boolean(right);
      case 'or':
        return Boolean(left) || Boolean(right);
      default:
        throw new MachanRuntimeError(`seri illa da execution 😐 (line ${lineHint})`, lineHint);
    }
  }

  evaluateUnary(node, env, lineHint) {
    const value = this.evaluate(node.argument, env, lineHint);
    switch (node.operator) {
      case '-':
        return -value;
      case 'not':
        return !Boolean(value);
      default:
        throw new MachanRuntimeError(`seri illa da execution 😐 (line ${lineHint})`, lineHint);
    }
  }

  evaluateCall(node, env, lineHint) {
    const callee = this.evaluate(node.callee, env, lineHint);
    if (!callee || callee.type !== 'Function') {
      throw new MachanRuntimeError(`seri illa da execution 😐 (line ${lineHint})`, lineHint);
    }
    const args = node.args.map((arg) => this.evaluate(arg, env, lineHint));
    const callEnv = new Environment(callee.env);
    for (let i = 0; i < callee.params.length; i += 1) {
      callEnv.set(callee.params[i], args[i], lineHint);
    }
    try {
      let last;
      for (const stmt of callee.body) {
        last = this.evaluate(stmt, callEnv, lineHint);
      }
      return last;
    } catch (err) {
      if (err instanceof ReturnSignal) {
        return err.value;
      }
      throw err;
    }
  }
}

module.exports = Interpreter;
