// @ts-check
import { NextResponse } from 'next/server';
import { convertToModelMessages } from 'ai';
import { auth } from '@/lib/auth.js';
import { CalmRequestSchema } from '@/lib/schemas/calm.js';
import { runCalmAgent } from '@/lib/agents/calm.js';
import { friendlyStreamError } from '@/lib/session-error.js';

// postgres-js (auth) requires the Node.js runtime, and the streamed response
// needs headroom beyond the default function timeout.
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/calm
 * Stateless grounding chat. Accepts a UIMessage array from useChat and streams
 * the Calm Companion's reply. No work session, no task binding, no persistence —
 * this is a transient conversation for down-regulating overwhelm.
 *
 * @param {Request} request
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let body;
  try {
    body = CalmRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // convertToModelMessages is async in ai v6 — must be awaited, otherwise a
  // Promise is passed to streamText and it throws when validating the list.
  const messages = await convertToModelMessages(body.messages);

  const result = runCalmAgent({ userId, messages });

  return result.toUIMessageStreamResponse({
    onError: (error) => {
      const e = /** @type {any} */ (error);
      console.error('[calm] stream error:', {
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
