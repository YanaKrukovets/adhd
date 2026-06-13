#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * PreToolUse hook for Bash commands.
 * Reads tool input from stdin, blocks destructive operations.
 * Exit 2 = block with message. Exit 0 = allow.
 */

const PROD_DB_PATTERNS = [
  /neon\.tech/,
  /supabase\.co/,
  /DATABASE_URL.*postgresql/,
];

const BLOCKED_PATTERNS = [
  {
    pattern: /rm\s+-rf\s+(?!node_modules|\.next|\.turbo|dist|build|coverage|\.playwright)(\S+)/,
    reason: 'rm -rf outside safe directories is blocked. Specify node_modules, .next, dist, or build explicitly.',
  },
  {
    pattern: /drizzle-kit\s+drop/,
    reason: 'drizzle-kit drop is blocked. Use /db-migrate skill to review and apply schema changes safely.',
  },
  {
    pattern: /git\s+push\s+.*--force.*\s+.*main|git\s+push\s+.*main.*--force/,
    reason: 'Force-pushing to main is blocked.',
  },
  {
    pattern: /DELETE\s+FROM\s+(?!\w*test\w*)/i,
    reason: 'DELETE FROM non-test tables is blocked. Use a migration or explicit user approval.',
  },
  {
    pattern: /TRUNCATE\s+(?!\w*test\w*)/i,
    reason: 'TRUNCATE on non-test tables is blocked.',
  },
  {
    pattern: /DROP\s+TABLE/i,
    reason: 'DROP TABLE is blocked. Use /db-migrate skill to review destructive migrations.',
  },
];

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

  const command = toolInput?.command ?? toolInput?.cmd ?? '';
  if (typeof command !== 'string') process.exit(0);

  // Check for production DB URL in command
  for (const pattern of PROD_DB_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`\n🚫 BLOCKED: Command contains a production database URL pattern.\nRun DB operations via env var DATABASE_URL, never inline credentials.\n`);
      process.exit(2);
    }
  }

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      console.error(`\n🚫 BLOCKED: ${reason}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
});
