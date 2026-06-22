// @ts-check
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import {
  getTodayTasks,
  getQueuedTaskCount,
  getDoneTasks,
} from '@/lib/db/queries.js';

// postgres-js (auth + DB queries) requires the Node.js runtime.
export const runtime = 'nodejs';

/**
 * GET /api/tasks?view=today|history
 *
 * Read endpoints for native/non-RSC clients. The web app reads this same data
 * directly in server components (TodayTaskList, history/page); these routes
 * expose it over HTTP for the iOS app. Both views are deterministic reads — no
 * LLM, no writes — and reuse the existing query functions in queries.js.
 *
 * - view=today   → { tasks, queuedCount }  (today list, max 3, + pending pool count)
 * - view=history → { tasks }               (done tasks, most recent first)
 *
 * @param {Request} request
 */
export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const view = new URL(request.url).searchParams.get('view') ?? 'today';

  try {
    if (view === 'today') {
      const [tasks, queuedCount] = await Promise.all([
        getTodayTasks(userId),
        getQueuedTaskCount(userId),
      ]);
      return NextResponse.json({ tasks, queuedCount });
    }

    if (view === 'history') {
      const tasks = await getDoneTasks(userId);
      return NextResponse.json({ tasks });
    }

    return NextResponse.json(
      { error: "Invalid view — use 'today' or 'history'." },
      { status: 400 }
    );
  } catch (err) {
    console.error('[tasks] read failed:', err);
    return NextResponse.json(
      { error: "Couldn't load your tasks just now — give it another moment." },
      { status: 502 }
    );
  }
}
