// @ts-check
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth.js';
import { updateTask } from '@/lib/db/queries.js';

const PatchTaskSchema = z.object({
  action: z.enum(['defer']),
});

/**
 * PATCH /api/tasks/[id]
 * Supported actions: defer — moves task off today without judgment.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function PATCH(request, context) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id: taskId } = await context.params;

  let body;
  try {
    body = PatchTaskSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err.errors ?? err.message },
      { status: 400 }
    );
  }

  if (body.action === 'defer') {
    const updated = await updateTask(taskId, userId, {
      state: 'deferred',
      isToday: false,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }
}
