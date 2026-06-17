// @ts-check
import { NextResponse } from 'next/server';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/index.js';
import { sessions, users } from '@/lib/db/schema.js';

// TEMPORARY diagnostic route. Guarded by CRON_SECRET. Remove after debugging.
// GET /api/debug/db?secret=<CRON_SECRET>
export const dynamic = 'force-dynamic';

/** @param {unknown} e */
function describe(e) {
  if (!(e instanceof Error)) return { value: String(e) };
  const any = /** @type {any} */ (e);
  return {
    name: e.name,
    message: e.message,
    code: any.code,
    severity: any.severity_local || any.severity,
    errno: any.errno,
    cause: any.cause ? describe(any.cause) : undefined,
  };
}

export async function GET(/** @type {Request} */ req) {
  const url = new URL(req.url);
  if (url.searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || '';
  // Mask password but reveal host/port/params so we can confirm what Vercel uses.
  const host = dbUrl.replace(/:[^:@]*@/, ':***@').split('@')[1] || '(none)';

  /** @type {Record<string, unknown>} */
  const result = { host, hasUrl: Boolean(dbUrl) };

  const token = url.searchParams.get('token') || '00000000-0000-0000-0000-000000000000';

  // A) Fresh raw client, PARAMETERIZED where (extended protocol).
  const sql = postgres(dbUrl, { prepare: false, connect_timeout: 10 });
  try {
    const r = await sql`
      select "sessions"."session_token" from "sessions"
      inner join "users" on "users"."id" = "sessions"."user_id"
      where "sessions"."session_token" = ${token} limit 1`;
    result.A_rawParam = { ok: true, rows: r.length };
  } catch (e) {
    result.A_rawParam = { ok: false, error: describe(e) };
  } finally {
    await sql.end({ timeout: 2 });
  }

  // B) The ACTUAL auth path: shared Drizzle `db` client + parameterized where.
  try {
    const r = await db
      .select()
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(eq(sessions.sessionToken, token));
    result.B_drizzleShared = { ok: true, rows: r.length };
  } catch (e) {
    result.B_drizzleShared = { ok: false, error: describe(e) };
  }

  return NextResponse.json(result);
}
