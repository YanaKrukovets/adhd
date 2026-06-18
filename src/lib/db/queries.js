// @ts-check
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from './index.js';
import {
  users, intentions, tasks, workSessions, sessionEvents, agentCalls,
} from './schema.js';

// ---- Users ----

/**
 * @param {string} userId
 * @returns {Promise<typeof users.$inferSelect | undefined>}
 */
export async function getUserById(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user;
}

// ---- Intentions ----

/**
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.userId
 * @param {string} params.rawText
 * @param {string} params.promptVersion
 * @returns {Promise<typeof intentions.$inferSelect>}
 */
export async function createIntention({ id, userId, rawText, promptVersion }) {
  const [intention] = await db.insert(intentions)
    .values({ id, userId, rawText, promptVersion })
    .returning();
  return intention;
}

/**
 * @param {string} intentionId
 * @param {string} userId
 * @param {object} planJson
 * @returns {Promise<typeof intentions.$inferSelect | undefined>}
 */
export async function updateIntentionPlan(intentionId, userId, planJson) {
  const [updated] = await db.update(intentions)
    .set({ planJson })
    .where(and(eq(intentions.id, intentionId), eq(intentions.userId, userId)))
    .returning();
  return updated;
}

// ---- Tasks ----

/**
 * @param {string} taskId
 * @returns {Promise<typeof tasks.$inferSelect | undefined>}
 */
export async function getTaskById(taskId) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  return task;
}

/**
 * @param {string} userId
 * @returns {Promise<Array<typeof tasks.$inferSelect>>}
 */
export async function getTodayTasks(userId) {
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.isToday, true)))
    .orderBy(tasks.order)
    .limit(3);
}

/**
 * @param {object} task
 * @returns {Promise<typeof tasks.$inferSelect>}
 */
export async function createTask(task) {
  const [created] = await db.insert(tasks).values(task).returning();
  return created;
}

/**
 * @param {string} taskId
 * @param {string} userId
 * @param {Partial<typeof tasks.$inferInsert>} updates
 * @returns {Promise<typeof tasks.$inferSelect | undefined>}
 */
export async function updateTask(taskId, userId, updates) {
  const [updated] = await db.update(tasks)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
    .returning();
  return updated;
}

/**
 * @param {string} userId
 * @returns {Promise<Array<typeof tasks.$inferSelect>>}
 */
export async function getDoneTasks(userId) {
  return db.select().from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.state, 'done')))
    .orderBy(desc(tasks.completedAt))
    .limit(50);
}

/**
 * Get all non-done tasks for re-planning (rolls forward silently — no overdue state).
 * @param {string} userId
 * @returns {Promise<Array<typeof tasks.$inferSelect>>}
 */
export async function getPendingTasksForReplan(userId) {
  return db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.state} IN ('pending', 'today', 'deferred')`
    ))
    .orderBy(tasks.createdAt);
}

/**
 * Count tasks waiting in the pending pool (not on today's list, not done).
 * Used only to show a gentle "more ready when you are" hint — the pool itself
 * stays hidden to avoid overwhelm.
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getQueuedTaskCount(userId) {
  const [row] = await db.select({ count: sql`COUNT(*)`.mapWith(Number) })
    .from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.isToday, false),
      eq(tasks.state, 'pending')
    ));
  return row?.count ?? 0;
}

/**
 * Get trailing-7-day actual throughput for calibration weighting.
 * @param {string} userId
 * @returns {Promise<number>} average tasks completed per day
 */
export async function getRecentThroughput(userId) {
  const result = await db.select({
    count: sql`count(*)`.mapWith(Number),
  }).from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.state, 'done'),
      sql`${tasks.completedAt} >= NOW() - INTERVAL '7 days'`
    ));
  return Math.max(1, (result[0]?.count ?? 0) / 7);
}

// ---- Work Sessions ----

/**
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.userId
 * @param {string} [params.taskId]
 * @param {string} params.promptVersion
 * @returns {Promise<typeof workSessions.$inferSelect>}
 */
export async function createWorkSession({ id, userId, taskId, promptVersion }) {
  const [session] = await db.insert(workSessions)
    .values({ id, userId, taskId, promptVersion, state: 'active' })
    .returning();
  return session;
}

/**
 * @param {string} sessionId
 * @param {string} userId
 * @returns {Promise<typeof workSessions.$inferSelect | undefined>}
 */
export async function getWorkSession(sessionId, userId) {
  const [session] = await db.select().from(workSessions)
    .where(and(eq(workSessions.id, sessionId), eq(workSessions.userId, userId)))
    .limit(1);
  return session;
}

/**
 * @param {string} sessionId
 * @param {string} userId
 * @param {Partial<typeof workSessions.$inferInsert>} updates
 * @returns {Promise<typeof workSessions.$inferSelect | undefined>}
 */
export async function updateWorkSession(sessionId, userId, updates) {
  const [updated] = await db.update(workSessions)
    .set(updates)
    .where(and(eq(workSessions.id, sessionId), eq(workSessions.userId, userId)))
    .returning();
  return updated;
}

// ---- Session Events ----

/**
 * @param {object} event
 * @returns {Promise<typeof sessionEvents.$inferSelect>}
 */
export async function appendSessionEvent(event) {
  const [created] = await db.insert(sessionEvents).values(event).returning();
  return created;
}

/**
 * @param {string} sessionId
 * @returns {Promise<Array<typeof sessionEvents.$inferSelect>>}
 */
export async function getSessionEvents(sessionId) {
  return db.select().from(sessionEvents)
    .where(eq(sessionEvents.sessionId, sessionId))
    .orderBy(sessionEvents.createdAt);
}

/**
 * Conversation transcript for rehydrating the chat UI on reload: only the
 * user_message / agent_message events, in chronological order. Synthetic
 * `[session:*]` prompts are never persisted as user_message rows, so they're
 * naturally excluded.
 * @param {string} sessionId
 * @returns {Promise<Array<{ id: string, role: 'user' | 'assistant', content: string }>>}
 */
export async function getSessionMessages(sessionId) {
  const rows = await db.select({
    id: sessionEvents.id,
    role: sessionEvents.role,
    content: sessionEvents.content,
  }).from(sessionEvents)
    .where(and(
      eq(sessionEvents.sessionId, sessionId),
      sql`${sessionEvents.eventType} IN ('user_message', 'agent_message')`
    ))
    .orderBy(sessionEvents.createdAt);

  return rows
    .filter((r) => (r.role === 'user' || r.role === 'assistant') && r.content)
    .map((r) => ({
      id: r.id,
      role: /** @type {'user' | 'assistant'} */ (r.role),
      content: /** @type {string} */ (r.content),
    }));
}

// ---- Agent Calls ----

/**
 * @param {object} call
 * @returns {Promise<typeof agentCalls.$inferSelect>}
 */
export async function logAgentCall(call) {
  const [created] = await db.insert(agentCalls).values(call).returning();
  return created;
}

/**
 * Morning replan: carry yesterday's unfinished plan forward first, then backfill
 * up to the 3-task cap with quick wins. Unfinished work rolls forward silently —
 * it is never dropped from the list (hard rule #3).
 * @param {string} userId
 * @returns {Promise<Array<typeof tasks.$inferSelect>>} today's task list
 */
export async function replanToday(userId) {
  // Yesterday's unfinished plan: still flagged today and not done. These roll
  // forward — capture them BEFORE clearing flags so they keep priority.
  const carriedForward = await db.select().from(tasks)
    .where(and(
      eq(tasks.userId, userId),
      eq(tasks.isToday, true),
      sql`${tasks.state} IN ('today', 'deferred')`
    ))
    .orderBy(tasks.order, tasks.createdAt)
    .limit(3);

  // Clear today from everything not done/in_progress
  await db.update(tasks)
    .set({ isToday: false, state: 'pending' })
    .where(and(
      eq(tasks.userId, userId),
      sql`${tasks.state} IN ('today', 'pending', 'deferred')`
    ));

  // Backfill remaining slots with quick wins (shortest estimate first),
  // excluding anything already carried forward.
  const carriedIds = carriedForward.map((t) => t.id);
  const remaining = 3 - carriedForward.length;
  const backfill = remaining > 0
    ? await db.select().from(tasks)
        .where(and(
          eq(tasks.userId, userId),
          eq(tasks.state, 'pending'),
          carriedIds.length ? sql`${tasks.id} != ALL(${carriedIds})` : sql`TRUE`
        ))
        .orderBy(tasks.estimateMinutes, tasks.createdAt)
        .limit(remaining)
    : [];

  const selected = [...carriedForward, ...backfill];
  if (selected.length === 0) return [];

  const ids = selected.map((t) => t.id);
  await db.update(tasks)
    .set({ isToday: true, state: 'today' })
    .where(and(eq(tasks.userId, userId), sql`${tasks.id} = ANY(${ids})`));

  return selected;
}

/**
 * @returns {Promise<Array<{model: string, totalCost: number, count: number, avgLatencyMs: number}>>}
 */
export async function getAgentCallStats() {
  return db.select({
    model: agentCalls.model,
    totalCost: sql`SUM(${agentCalls.costUsd})`.mapWith(Number),
    count: sql`COUNT(*)`.mapWith(Number),
    avgLatencyMs: sql`AVG(${agentCalls.latencyMs})`.mapWith(Number),
  }).from(agentCalls)
    .groupBy(agentCalls.model);
}
