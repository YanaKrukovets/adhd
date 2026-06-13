#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * PreToolUse hook for Write and Edit on src/lib/prompts/*.md files.
 * Requires the /prompt-change skill to have created .prompt-change-session marker.
 * Exit 2 = block. Exit 0 = allow.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const MARKER_FILE = path.join(PROJECT_ROOT, '.prompt-change-session');

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
  if (typeof filePath !== 'string') process.exit(0);

  const isPromptFile = filePath.includes('src/lib/prompts/') && filePath.endsWith('.md');
  if (!isPromptFile) process.exit(0);

  if (!fs.existsSync(MARKER_FILE)) {
    console.error(`
🚫 BLOCKED: Prompt files may only be edited via the /prompt-change skill.

Reason: prompt changes require eval baselines to be recorded before editing,
and eval scores must be compared after. Bypassing this causes silent regression.

To edit a prompt:
1. Run /prompt-change in your Claude Code session
2. It will create .prompt-change-session and guide you through the eval-gated workflow
`);
    process.exit(2);
  }

  process.exit(0);
});
