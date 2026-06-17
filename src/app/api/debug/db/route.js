// @ts-check
import { NextResponse } from 'next/server';
import postgres from 'postgres';

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

  const sql = postgres(dbUrl, { prepare: false, connect_timeout: 10 });
  try {
    const ping = await sql`select 1 as ok`;
    result.ping = ping[0];
    const join = await sql`
      select "sessions"."session_token", "users"."id"
      from "sessions" inner join "users" on "users"."id" = "sessions"."user_id"
      limit 1`;
    result.joinRows = join.length;
    result.ok = true;
  } catch (e) {
    result.ok = false;
    result.error = describe(e);
  } finally {
    await sql.end({ timeout: 2 });
  }

  return NextResponse.json(result);
}
