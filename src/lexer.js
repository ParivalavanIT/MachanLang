const { MachanSyntaxError } = require('./errors');

const KEYWORDS = {
  'set da': 'SET',
  'respect anna': 'CONST',
  'mass solu': 'PRINT_MASS',
  'solu': 'PRINT',
  'kathu': 'PRINT_ERR',
  'if da': 'IF',
  'illa na': 'ELSE',
  'repeat pannunga': 'REPEAT',
  'while da': 'WHILE',
  'function machi': 'FUNCTION',
  'intha vechiko': 'RETURN',
  'mudichu': 'END',
  'athuvum': 'AND',
  'ethavathu': 'OR',
  'kedayathu': 'NOT',
  'na': 'NA',
  'times': 'TIMES',
};

const MULTIWORD = [
  'respect anna',
  'function machi',
  'repeat pannunga',
  'mass solu',
  'set da',
  'if da',
  'illa na',
  'while da',
  'intha vechiko',
];

const TWO_CHAR_OPS = ['==', '!=', '<=', '>='];
const ONE_CHAR_OPS = ['=', '+', '-', '*', '/', '%', '<', '>', '(', ')', '[', ']', ',', ];

function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}

function isAlphaNumeric(ch) {
  return isAlpha(ch) || isDigit(ch);
}

function boundaryChar(ch) {
  return ch === undefined || ch === '' || /\s/.test(ch) || ONE_CHAR_OPS.includes(ch);
}

function lex(source) {
  const lines = source.split(/\r?\n/);
  const tokens = [];
  const indentStack = [0];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx += 1) {
    const rawLine = lines[lineIdx];
    const lineNumber = lineIdx + 1;

    if (/^\s*$/.test(rawLine)) {
      continue;
    }

    let i = 0;
    let indent = 0;
    while (i < rawLine.length) {
      const ch = rawLine[i];
      if (ch === ' ') {
        indent += 1;
      } else if (ch === '\t') {
        indent += 2;
      } else {
        break;
      }
      i += 1;
    }

    const prevIndent = indentStack[indentStack.length - 1];
    if (indent > prevIndent) {
      indentStack.push(indent);
      tokens.push({ type: 'INDENT', line: lineNumber });
    } else if (indent < prevIndent) {
      while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        tokens.push({ type: 'DEDENT', line: lineNumber });
      }
      if (indent !== indentStack[indentStack.length - 1]) {
        throw new MachanSyntaxError(`dei code ah correct ah podu da 😤 (line ${lineNumber})`, lineNumber);
      }
    }

    while (i < rawLine.length) {
      const ch = rawLine[i];

      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }

      let matchedMulti = false;
      for (const phrase of MULTIWORD) {
        if (rawLine.startsWith(phrase, i)) {
          const after = rawLine[i + phrase.length];
          if (boundaryChar(after)) {
            tokens.push({ type: KEYWORDS[phrase], value: phrase, line: lineNumber });
            i += phrase.length;
            matchedMulti = true;
            break;
          }
        }
      }
      if (matchedMulti) continue;

      const twoChar = rawLine.slice(i, i + 2);
      if (TWO_CHAR_OPS.includes(twoChar)) {
        tokens.push({ type: 'OP', value: twoChar, line: lineNumber });
        i += 2;
        continue;
      }

      if (ONE_CHAR_OPS.includes(ch)) {
        tokens.push({ type: 'OP', value: ch, line: lineNumber });
        i += 1;
        continue;
      }

      if (ch === '"' || ch === "'") {
        const quote = ch;
        i += 1;
        let str = '';
        let closed = false;
        while (i < rawLine.length) {
          const c = rawLine[i];
          if (c === '\\') {
            const next = rawLine[i + 1];
            if (next === 'n') str += '\n';
            else if (next === 't') str += '\t';
            else if (next === quote) str += quote;
            else if (next === '\\') str += '\\';
            else str += next;
            i += 2;
            continue;
          }
          if (c === quote) {
            closed = true;
            i += 1;
            break;
          }
          str += c;
          i += 1;
        }
        if (!closed) {
          throw new MachanSyntaxError(`dei code ah correct ah podu da 😤 (line ${lineNumber})`, lineNumber);
        }
        tokens.push({ type: 'STRING', value: str, line: lineNumber });
        continue;
      }

      if (isDigit(ch)) {
        let numStr = '';
        while (i < rawLine.length && (isDigit(rawLine[i]) || rawLine[i] === '.')) {
          numStr += rawLine[i];
          i += 1;
        }
        tokens.push({ type: 'NUMBER', value: Number(numStr), line: lineNumber });
        continue;
      }

      if (isAlpha(ch)) {
        let ident = '';
        while (i < rawLine.length && isAlphaNumeric(rawLine[i])) {
          ident += rawLine[i];
          i += 1;
        }
        if (KEYWORDS[ident]) {
          tokens.push({ type: KEYWORDS[ident], value: ident, line: lineNumber });
        } else {
          tokens.push({ type: 'IDENT', value: ident, line: lineNumber });
        }
        continue;
      }

      throw new MachanSyntaxError(`dei code ah correct ah podu da 😤 (line ${lineNumber})`, lineNumber);
    }

    tokens.push({ type: 'NEWLINE', line: lineNumber });
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: 'DEDENT', line: lines.length });
  }

  tokens.push({ type: 'EOF', line: lines.length });
  return { tokens, lines };
}

module.exports = lex;
