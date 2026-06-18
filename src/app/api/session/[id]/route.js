// @ts-check
import { NextResponse } from 'next/server';
import { convertToModelMessages } from 'ai';
import { auth } from '@/lib/auth.js';
import { getWorkSession, getTaskById, appendSessionEvent } from '@/lib/db/queries.js';
import { runSessionAgent } from '@/lib/agents/session.js';
import { friendlyStreamError } from '@/lib/session-error.js';
import { randomUUID } from 'crypto';

// postgres-js (auth + DB queries) requires the Node.js runtime, and the
// streamed agent response needs headroom beyond the default function timeout.
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Extracts the concatenated text content from a UIMessage's parts.
 *
 * @param {{ parts?: Array<{ type: string, text?: string }> }} [message]
 * @returns {string}
 */
function getMessageText(message) {
  return (message?.parts ?? [])
    .filter((p) => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

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
  const lastUserText = getMessageText(lastUserMessage);

  // Silently drop automated check-ins while flow mode is active
  const isCheckin = lastUserText.startsWith('[session:checkin]') ||
    body.type === 'system-checkin';
  if (isCheckin && workSession.flowModeUntil && new Date() < workSession.flowModeUntil) {
    return new Response(null, { status: 204 });
  }

  if (lastUserMessage && !lastUserText.startsWith('[session:')) {
    appendSessionEvent({
      id: randomUUID(),
      sessionId,
      eventType: 'user_message',
      role: 'user',
      content: lastUserText,
    }).catch((err) => console.error('[session] persist user message:', err));
  }

  const task = workSession.taskId ? await getTaskById(workSession.taskId) : null;
  // convertToModelMessages is async in ai v6 — must be awaited, otherwise a
  // Promise is passed to streamText and it throws "messages.some is not a
  // function" when validating the message list.
  const messages = await convertToModelMessages(uiMessages);

  const result = runSessionAgent({
    sessionId,
    userId,
    taskTitle: task?.title ?? 'your task',
    firstAction: task?.firstAction ?? '',
    startedAt: workSession.startedAt,
    messages,
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      // Surface the real cause in server logs — without this the failure is
      // invisible in production (Vercel) and only the generic copy is seen.
      const e = /** @type {any} */ (error);
      console.error('[session] stream error:', {
        name: e?.name,
        statusCode: e?.statusCode ?? e?.status,
        message: e?.message,
        causeName: e?.lastError?.name ?? e?.cause?.name,
        causeMessage: e?.lastError?.message ?? e?.cause?.message,
      });
      return friendlyStreamError(error);
    },
  });
}
