#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * PreToolUse hook for Write and Edit.
 * Blocks writes to protected files and TypeScript file creation.
 * Exit 2 = block with message. Exit 0 = allow.
 */

const path = require('path');

/** @type {RegExp[]} Patterns for files that must never be written */
const PROTECTED_PATTERNS = [
  /^\.env($|\.)/,                          // .env, .env.local, .env.production etc
  /^drizzle\/\d{4}_.*\.sql$/,              // applied migration files (read-only)
  /scripts\/evals\/fixtures\/golden-set\.json$/,  // frozen judge-drift baseline
];

/** @param {string} filePath */
function isTypeScriptFile(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  let toolInput;
  try {
    const parsed = JSON.parse(input);
    toolInput = parsed?.tool_input ?? parsed;
  } catch {
    process.exit(0);
  }

  const filePath = toolInput?.file_path ?? toolInput?.path ?? '';
  if (typeof filePath !== 'string' || filePath === '') process.exit(0);

  const normalised = filePath.replace(/\\/g, '/');
  const relative = normalised.includes('focus-copilot/')
    ? normalised.split('focus-copilot/').pop()
    : path.basename(normalised);

  // Block TypeScript files
  if (isTypeScriptFile(normalised)) {
    console.error(`\n🚫 BLOCKED: TypeScript files are not permitted in this project.\nThis codebase is JavaScript-only (// @ts-check + JSDoc).\nCreate "${path.basename(normalised, path.extname(normalised))}.js" instead.\n`);
    process.exit(2);
  }

  // Block protected files
  for (const pattern of PROTECTED_PATTERNS) {
    if (pattern.test(relative ?? normalised)) {
      console.error(`\n🚫 BLOCKED: "${relative}" is a protected file and cannot be edited directly.\n`);
      process.exit(2);
    }
  }

  process.exit(0);
});
