// @ts-check
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/lib/auth.js';
import { PlanRequestSchema } from '@/lib/schemas/api.js';
import { runPlanner, PLANNER_PROMPT_VERSION } from '@/lib/agents/planner.js';
import {
  getUserById,
  getRecentThroughput,
  createIntention,
  updateIntentionPlan,
  createTask,
} from '@/lib/db/queries.js';

/**
 * POST /api/plan
 * Accepts a raw intention and returns a structured plan.
 */
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let body;
  try {
    body = PlanRequestSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'Invalid request', details: err.errors ?? err.message },
      { status: 400 }
    );
  }

  const intentionId = randomUUID();
  let plan;
  let createdTasks;
  try {
    const [user, recentThroughput] = await Promise.all([
      getUserById(userId),
      getRecentThroughput(userId),
    ]);

    await createIntention({
      id: intentionId,
      userId,
      rawText: body.intention,
      promptVersion: PLANNER_PROMPT_VERSION,
    });

    plan = await runPlanner({
      intention: body.intention,
      clarifyingAnswer: body.clarifying_answer,
      context: {
        timezone: body.context?.timezone ?? user?.timezone ?? 'UTC',
        energy_level: body.context?.energy_level ?? user?.energyPreference ?? 'medium',
        recent_throughput: recentThroughput,
      },
      userId,
    });

    await updateIntentionPlan(intentionId, userId, plan);

    // Clarifying question — return without creating tasks yet
    if (plan.clarifying_question) {
      return NextResponse.json({
        intentionId,
        clarifying_question: plan.clarifying_question,
      });
    }

    // Create tasks in parallel
    createdTasks = await Promise.all(
      plan.tasks.map((task, i) => {
        const isToday = plan.suggested_today.includes(i);
        return createTask({
          id: randomUUID(),
          userId,
          intentionId,
          title: task.title,
          firstAction: task.first_action,
          estimateMinutes: task.estimate_minutes,
          energy: task.energy,
          blockers: task.blockers,
          state: isToday ? 'today' : 'pending',
          isToday,
          order: i,
        });
      })
    );
  } catch (err) {
    console.error('[plan] planning flow failed:', err);
    return NextResponse.json(
      { error: "Couldn't put together a plan just now — give it another moment and try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    intentionId,
    plan,
    taskCount: createdTasks.length,
  });
}
