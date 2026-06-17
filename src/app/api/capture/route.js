// @ts-check
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { auth } from '@/lib/auth.js';
import { createTask } from '@/lib/db/queries.js';

// Validates the request body: text must be a non-empty string up to 500 chars.
const CaptureSchema = z.object({
  text: z.string().min(1).max(500),
});

/**
 * POST /api/capture
 * Quick-captures a thought as a pending task with no AI planning.
 * Saved for later planning — doesn't appear in today's list yet.
 */
export async function POST(request) {
  // Make sure the user is logged in; reject anonymous requests.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  // Parse and validate the JSON body; return 400 if it doesn't match the schema.
  let body;
  try {
    body = CaptureSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err.errors ?? err.message },
      { status: 400 }
    );
  }

  // Save the captured thought as a task that hasn't been AI-planned yet.
  // intentionId: null  — not linked to any session intention
  // isToday: false     — hidden from today's list until the planner promotes it
  // order: 999         — sorts to the bottom of the inbox
  let task;
  try {
    task = await createTask({
      id: randomUUID(),
      userId,
      intentionId: null,
      title: body.text,
      firstAction: 'Open this task and break it into steps', // placeholder until planner runs
      estimateMinutes: 30,  // default estimate before AI planning
      energy: 'medium',     // default energy level before AI planning
      blockers: [],
      state: 'pending',
      isToday: false,
      order: 999,
    });
  } catch (err) {
    console.error('[capture] createTask failed:', err);
    return NextResponse.json(
      { error: "Couldn't save that — give it another try." },
      { status: 502 }
    );
  }

  // Return the new task's ID so the client can reference it.
  return NextResponse.json({ ok: true, taskId: task.id });
}
