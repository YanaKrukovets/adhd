// @ts-check
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth.js';
import { PlanRequestSchema } from '@/lib/schemas/api.js';

/**
 * POST /api/plan
 * Accepts a raw intention and returns a structured plan.
 * Full planner agent implemented in Phase 1.
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = PlanRequestSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request', details: err.errors ?? err.message }, { status: 400 });
  }

  // Phase 1: planner agent call goes here
  return NextResponse.json({ message: 'Planner not yet implemented — Phase 1', intention: body.intention }, { status: 501 });
}
