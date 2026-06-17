// @ts-check
import { NextResponse } from 'next/server';
import { convertToCoreMessages } from 'ai';
import { auth } from '@/lib/auth.js';
import { getWorkSession, getTaskById, appendSessionEvent } from '@/lib/db/queries.js';
import { runSessionAgent } from '@/lib/agents/session.js';
import { randomUUID } from 'crypto';

/**
 * POST /api/session/[id]
 * Accepts a messages array from useChat and streams the session agent response.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const { id: sessionId } = await params;

  const workSession = await getWorkSession(sessionId, userId);
  if (!workSession) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }
  if (workSession.state === 'ended') {
    return NextResponse.json({ error: 'Session already ended' }, { status: 409 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const uiMessages = body.messages ?? [];
  const lastUserMessage = [...uiMessages].reverse().find((m) => m.role === 'user');

  // Silently drop automated check-ins while flow mode is active
  const isCheckin = lastUserMessage?.content?.startsWith('[session:checkin]') ||
    body.type === 'system-checkin';
  if (isCheckin && workSession.flowModeUntil && new Date() < workSession.flowModeUntil) {
    return new Response(null, { status: 204 });
  }

  if (lastUserMessage && !lastUserMessage.content?.startsWith('[session:')) {
    appendSessionEvent({
      id: randomUUID(),
      sessionId,
      eventType: 'user_message',
      role: 'user',
      content: lastUserMessage.content,
    }).catch((err) => console.error('[session] persist user message:', err));
  }

  const task = workSession.taskId ? await getTaskById(workSession.taskId) : null;
  const messages = convertToCoreMessages(uiMessages);

  const result = runSessionAgent({
    sessionId,
    userId,
    taskTitle: task?.title ?? 'your task',
    firstAction: task?.firstAction ?? '',
    startedAt: workSession.startedAt,
    messages,
  });

  return result.toUIMessageStreamResponse({
    onError: () => "Couldn't reach the assistant just now — give it another moment and try again.",
  });
}
