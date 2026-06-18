// @ts-check
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import {
  getTodayTasks,
  pullNextPendingTasks,
  MAX_TODAY_TASKS,
} from '@/lib/db/queries.js';
import { RefillResponseSchema } from '@/lib/schemas/api.js';

/**
 * POST /api/tasks/refill
 * Tops the today list back up to MAX_TODAY_TASKS by pulling the next pending
 * tasks forward. Deterministic, no LLM in the loop. The number moved is capped
 * by free slots, so the today list can never exceed the hard cap (rule #4).
 *
 * @param {Request} _request
 */
export async function POST(_request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const todayTasks = await getTodayTasks(userId);
  const freeSlots = MAX_TODAY_TASKS - todayTasks.length;
  const moved = await pullNextPendingTasks(userId, freeSlots);

  return NextResponse.json(RefillResponseSchema.parse({ moved }));
}
