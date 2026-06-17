// @ts-check
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Lazy singleton — connection is created on first access so imports don't
// throw in test environments that mock DB calls before the real URL is needed.
let _db;

/** @returns {ReturnType<typeof drizzle>} */
function getDb() {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    // Config tuned for Supabase's transaction-mode pooler (Supavisor, 6543)
    // running behind serverless functions:
    // - `prepare: false`: the pooler doesn't support prepared statements.
    // - `max: 1`: one connection per warm serverless instance.
    // - `idle_timeout`: proactively close idle connections client-side so a
    //   warm instance never reuses one the pooler has already closed (the
    //   cause of intermittent "Failed query" / empty-error reads).
    const queryClient = postgres(process.env.DATABASE_URL, {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    _db = drizzle(queryClient, { schema });
  }
  return _db;
}

/** @type {ReturnType<typeof drizzle>} */
export const db = new Proxy(/** @type {any} */ ({}), {
  get(_target, prop) {
    return getDb()[prop];
  },
  // Auth.js's DrizzleAdapter uses `instanceof`/prototype-chain checks to detect
  // the dialect, which bypass the `get` trap — forward those too.
  getPrototypeOf() {
    return Reflect.getPrototypeOf(getDb());
  },
});
