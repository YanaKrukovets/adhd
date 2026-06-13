// @ts-check
import { NextResponse } from 'next/server';

/**
 * GET /api/cron/replan
 * Morning re-plan job — called by Vercel Cron.
 * Requires Authorization: Bearer ${CRON_SECRET} header.
 * Full implementation in Phase 3.
 */
export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Phase 3: re-plan logic goes here
  return NextResponse.json({ message: 'Cron re-plan not yet implemented — Phase 3' });
}
