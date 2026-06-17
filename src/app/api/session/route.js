// @ts-check
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth.js';
import { StartSessionSchema } from '@/lib/schemas/api.js';
import { createWorkSession } from '@/lib/db/queries.js';
import { SESSION_PROMPT_VERSION } from '@/lib/agents/session.js';

/**
 * POST /api/session
 * Creates a new work session for a task and returns the session ID.
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let body;
  try {
    body = StartSessionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const sessionId = randomUUID();
  try {
    await createWorkSession({
      id: sessionId,
      userId,
      taskId: body.taskId,
      promptVersion: SESSION_PROMPT_VERSION,
    });
  } catch (err) {
    console.error('[session] createWorkSession failed:', err);
    return NextResponse.json(
      { error: "Couldn't start the session — give it another try." },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId });
}
