// @ts-check
import { readFileSync } from 'fs';
import { join } from 'path';

const PROMPTS_DIR = join(process.cwd(), 'src/lib/prompts');

/**
 * Loads a prompt file and interpolates template variables.
 * Prompts live in src/lib/prompts/*.md — never inline system prompts in code.
 *
 * @param {string} name - filename without extension, e.g. 'planner'
 * @param {Record<string, string>} [vars] - template variables to substitute
 * @returns {string}
 */
export function loadPrompt(name, vars = {}) {
  const filePath = join(PROMPTS_DIR, `${name}.md`);
  let content = readFileSync(filePath, 'utf-8');

  // Strip version comment header
  content = content.replace(/^<!--.*?-->\n/, '');

  // Process {% if var %}...{% endif %} blocks — include only when var is non-empty
  content = content.replace(
    /\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
    (_, varName, inner) => ((vars[varName] ?? '').trim() ? inner : '')
  );

  // Interpolate {{variable}} placeholders
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }

  return content.trim();
}
