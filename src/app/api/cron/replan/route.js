// @ts-check
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/index.js';
import { users } from '@/lib/db/schema.js';
import { replanToday } from '@/lib/db/queries.js';

/**
 * GET /api/cron/replan
 * Morning re-plan job — called by Vercel Cron (see vercel.json).
 * Requires Authorization: Bearer ${CRON_SECRET} header.
 *
 * For every user, clears today's task list and selects up to 3 new tasks,
 * favouring quick wins (shortest estimate first).
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let userRows = [];
  try {
    userRows = await db.select({ id: users.id }).from(users);
  } catch (err) {
    return NextResponse.json(
      { error: 'DB error', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const results = await Promise.allSettled(
    userRows.map(async ({ id }) => {
      const selected = await replanToday(id);
      return { userId: id, selected: selected.length };
    })
  );

  const summary = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    console.error(`[cron/replan] replanToday failed for user ${userRows[i].id}:`, r.reason);
    return { userId: userRows[i].id, error: r.reason?.message ?? 'unknown' };
  });

  return NextResponse.json({ replanned: userRows.length, summary });
}
