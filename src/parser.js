const { MachanSyntaxError } = require('./errors');

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  current() {
    return this.tokens[this.pos];
  }

  advance() {
    if (this.pos < this.tokens.length - 1) this.pos += 1;
    return this.current();
  }

  match(type, value = null) {
    const token = this.current();
    if (!token) return false;
    if (token.type !== type) return false;
    if (value !== null && token.value !== value) return false;
    this.advance();
    return true;
  }

  expect(type, value = null) {
    const token = this.current();
    if (!token || token.type !== type || (value !== null && token.value !== value)) {
      const line = token ? token.line : 0;
      throw new MachanSyntaxError(`dei code ah correct ah podu da 😤 (line ${line})`, line);
    }
    this.advance();
    return token;
  }

  skipNewlines() {
    while (this.match('NEWLINE')) {
      // skip
    }
  }

  parse() {
    const statements = [];
    this.skipNewlines();
    while (this.current().type !== 'EOF') {
      if (this.match('DEDENT')) {
        continue;
      }
      statements.push(this.parseStatement());
      this.skipNewlines();
    }
    return { type: 'Program', body: statements };
  }

  parseStatement() {
    const token = this.current();

    if (this.match('SET')) {
      const nameTok = this.expect('IDENT');
      this.expect('OP', '=');
      const value = this.parseExpression();
      return { type: 'VariableDeclaration', name: nameTok.value, value, line: nameTok.line };
    }

    if (this.match('CONST')) {
      const nameTok = this.expect('IDENT');
      this.expect('OP', '=');
      const value = this.parseExpression();
      return { type: 'ConstantDeclaration', name: nameTok.value, value, line: nameTok.line };
    }

    if (this.match('PRINT')) {
      const expr = this.parseExpression();
      return { type: 'PrintStatement', mode: 'normal', expression: expr, line: token.line };
    }

    if (this.match('PRINT_MASS')) {
      const expr = this.parseExpression();
      return { type: 'PrintStatement', mode: 'mass', expression: expr, line: token.line };
    }

    if (this.match('PRINT_ERR')) {
      const expr = this.parseExpression();
      return { type: 'PrintStatement', mode: 'error', expression: expr, line: token.line };
    }

    if (this.match('IF')) {
      const test = this.parseExpression();
      if (this.current().type === 'NA') this.advance();
      const consequent = this.parseBlock();
      let alternate = null;
      this.skipNewlines();
      if (this.match('ELSE')) {
        alternate = this.parseBlock();
      }
      return { type: 'IfStatement', test, consequent, alternate, line: token.line };
    }

    if (this.match('WHILE')) {
      const test = this.parseExpression();
      const body = this.parseBlock();
      return { type: 'WhileStatement', test, body, line: token.line };
    }

    if (this.match('REPEAT')) {
      const count = this.parseExpression();
      this.expect('TIMES');
      const body = this.parseBlock();
      return { type: 'RepeatStatement', count, body, line: token.line };
    }

    if (this.match('FUNCTION')) {
      const nameTok = this.expect('IDENT');
      this.expect('OP', '(');
      const params = [];
      if (!this.match('OP', ')')) {
        do {
          const paramTok = this.expect('IDENT');
          params.push(paramTok.value);
        } while (this.match('OP', ','));
        this.expect('OP', ')');
      }
      const body = this.parseBlock();
      return { type: 'FunctionDeclaration', name: nameTok.value, params, body, line: nameTok.line };
    }

    if (this.match('RETURN')) {
      if (['NEWLINE', 'DEDENT', 'EOF'].includes(this.current().type)) {
        return { type: 'ReturnStatement', value: null, line: token.line };
      }
      const value = this.parseExpression();
      return { type: 'ReturnStatement', value, line: token.line };
    }

    if (this.match('END')) {
      return { type: 'EndStatement', line: token.line };
    }

    const expr = this.parseExpression();
    return { type: 'ExpressionStatement', expression: expr, line: token.line };
  }

  parseBlock() {
    this.skipNewlines();
    this.expect('INDENT');
    this.skipNewlines();
    const statements = [];
    while (this.current().type !== 'DEDENT' && this.current().type !== 'EOF') {
      if (this.match('END')) {
        this.skipNewlines();
        continue;
      }
      statements.push(this.parseStatement());
      this.skipNewlines();
    }
    this.expect('DEDENT');
    return statements;
  }

  parseExpression() {
    return this.parseOr();
  }

  parseOr() {
    let expr = this.parseAnd();
    while (this.match('OR')) {
      const right = this.parseAnd();
      expr = { type: 'BinaryExpression', operator: 'or', left: expr, right };
    }
    return expr;
  }

  parseAnd() {
    let expr = this.parseEquality();
    while (this.match('AND')) {
      const right = this.parseEquality();
      expr = { type: 'BinaryExpression', operator: 'and', left: expr, right };
    }
    return expr;
  }

  parseEquality() {
    let expr = this.parseComparison();
    while (this.current().type === 'OP' && ['==', '!='].includes(this.current().value)) {
      const op = this.current().value;
      this.advance();
      const right = this.parseComparison();
      expr = { type: 'BinaryExpression', operator: op, left: expr, right };
    }
    return expr;
  }

  parseComparison() {
    let expr = this.parseTerm();
    while (this.current().type === 'OP' && ['<', '<=', '>', '>='].includes(this.current().value)) {
      const op = this.current().value;
      this.advance();
      const right = this.parseTerm();
      expr = { type: 'BinaryExpression', operator: op, left: expr, right };
    }
    return expr;
  }

  parseTerm() {
    let expr = this.parseFactor();
    while (this.current().type === 'OP' && ['+', '-'].includes(this.current().value)) {
      const op = this.current().value;
      this.advance();
      const right = this.parseFactor();
      expr = { type: 'BinaryExpression', operator: op, left: expr, right };
    }
    return expr;
  }

  parseFactor() {
    let expr = this.parseUnary();
    while (this.current().type === 'OP' && ['*', '/', '%'].includes(this.current().value)) {
      const op = this.current().value;
      this.advance();
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator: op, left: expr, right };
    }
    return expr;
  }

  parseUnary() {
    if (this.match('NOT')) {
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: 'not', argument };
    }
    if (this.current().type === 'OP' && this.current().value === '-') {
      this.advance();
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator: '-', argument };
    }
    return this.parseCall();
  }

  parseCall() {
    let expr = this.parsePrimary();
    while (true) {
      if (this.match('OP', '(')) {
        const args = [];
        if (!this.match('OP', ')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('OP', ','));
          this.expect('OP', ')');
        }
        expr = { type: 'CallExpression', callee: expr, args };
        continue;
      }
      if (this.match('OP', '[')) {
        const index = this.parseExpression();
        this.expect('OP', ']');
        expr = { type: 'IndexAccess', array: expr, index };
        continue;
      }
      break;
    }
    return expr;
  }

  parsePrimary() {
    const token = this.current();

    if (this.match('NUMBER')) {
      return { type: 'NumericLiteral', value: token.value };
    }

    if (this.match('STRING')) {
      return { type: 'StringLiteral', value: token.value };
    }

    if (this.match('IDENT')) {
      return { type: 'Identifier', name: token.value, line: token.line };
    }

    if (this.match('OP', '[')) {
      const elements = [];
      if (!this.match('OP', ']')) {
        do {
          elements.push(this.parseExpression());
        } while (this.match('OP', ','));
        this.expect('OP', ']');
      }
      return { type: 'ArrayLiteral', elements };
    }

    if (this.match('OP', '(')) {
      const expr = this.parseExpression();
      this.expect('OP', ')');
      return expr;
    }

    const line = token ? token.line : 0;
    throw new MachanSyntaxError(`dei code ah correct ah podu da 😤 (line ${line})`, line);
  }
}

module.exports = Parser;
