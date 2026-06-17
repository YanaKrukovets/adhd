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
    const queryClient = postgres(process.env.DATABASE_URL);
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
