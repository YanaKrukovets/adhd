#!/usr/bin/env bash
# PostToolUse hook for Write|Edit.
# Runs Prettier, then ESLint, then scans for shame language.
# Exit 2 = block (violation found). Exit 0 = pass.

set -euo pipefail

# Read tool result JSON from stdin to extract the file path
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
const chunks = [];
process.stdin.on('data', c => chunks.push(c));
process.stdin.on('end', () => {
  try {
    const d = JSON.parse(chunks.join(''));
    const p = d?.tool_input?.file_path || d?.tool_input?.path || d?.file_path || '';
    process.stdout.write(p);
  } catch { process.stdout.write(''); }
});" 2>/dev/null <<< "$INPUT" || echo "")

# If we couldn't extract a path, skip silently
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Only process JS/JSX files for linting
EXT="${FILE_PATH##*.}"
if [[ "$EXT" =~ ^(js|jsx|mjs|cjs)$ ]]; then
  # Auto-format with Prettier (non-blocking — format errors shouldn't stop a write)
  npx prettier --write "$FILE_PATH" --log-level silent 2>/dev/null || true

  # Lint the file
  LINT_OUTPUT=$(npx eslint "$FILE_PATH" --format compact 2>&1 || true)
  if echo "$LINT_OUTPUT" | grep -q "error"; then
    echo ""
    echo "⚠️  ESLint errors in $FILE_PATH:"
    echo "$LINT_OUTPUT"
    echo ""
    # Non-blocking for now (warnings only in CI) — exit 0 but show output
  fi
fi

# Shame language scan — applies to ALL file types in src/
if echo "$FILE_PATH" | grep -q "^.*src/"; then
  SHAME_WORDS=("overdue" "you failed" "failed to" "missed deadline" "streak" "you missed" "behind schedule")
  VIOLATIONS=()
  for word in "${SHAME_WORDS[@]}"; do
    if grep -qi "$word" "$FILE_PATH" 2>/dev/null; then
      LINE=$(grep -ni "$word" "$FILE_PATH" | head -1)
      VIOLATIONS+=("  \"$word\" found at: $LINE")
    fi
  done

  if [ ${#VIOLATIONS[@]} -gt 0 ]; then
    echo ""
    echo "🚫 BLOCKED: Shame language detected in $FILE_PATH"
    echo "The following forbidden phrases were found:"
    for v in "${VIOLATIONS[@]}"; do
      echo "$v"
    done
    echo ""
    echo "Rewrite this copy. Voice is a calm friend, not a judge."
    echo "See CLAUDE.md rule #10 for tone guidance."
    echo ""
    exit 2
  fi
fi

exit 0
