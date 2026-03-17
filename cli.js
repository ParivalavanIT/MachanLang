#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const lex = require('./src/lexer');
const Parser = require('./src/parser');
const Interpreter = require('./src/interpreter');
const { MachanError } = require('./src/errors');

function printError(err, lines) {
  const lineNum = err.line || 0;
  const lineText = lines && lines[lineNum - 1] ? lines[lineNum - 1] : '';
  const header = err.message;
  console.error(header);
  if (lineNum > 0) {
    console.error(`line ${lineNum} | ${lineText}`);
  }
}

function runFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const { tokens, lines } = lex(source);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const interpreter = new Interpreter();
  interpreter.run(ast);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 2 || args[0] !== 'run') {
    console.error('usage: node cli.js run <file.machan>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), args[1]);
  try {
    runFile(filePath);
  } catch (err) {
    if (err instanceof MachanError) {
      const source = fs.readFileSync(filePath, 'utf8');
      const lines = source.split(/\r?\n/);
      printError(err, lines);
      process.exit(1);
    }
    throw err;
  }
}

main();
