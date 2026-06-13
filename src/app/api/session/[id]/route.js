// @ts-check
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { UserMessageSchema } from '@/lib/schemas/session.js';

/**
 * POST /api/session/[id]
 * Accepts a user message or synthetic check-in, streams session agent response.
 * Full session agent implemented in Phase 2.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body;
  try {
    body = UserMessageSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (body.sessionId !== id) {
    return NextResponse.json({ error: 'Session ID mismatch' }, { status: 400 });
  }

  // Phase 2: session agent stream goes here
  return NextResponse.json({ message: 'Session agent not yet implemented — Phase 2' }, { status: 501 });
}
