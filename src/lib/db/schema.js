// @ts-check
import { pgTable, text, timestamp, integer, jsonb, boolean, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),
  timezone: text('timezone').default('UTC'),
  energyPreference: text('energy_preference').default('medium'), // low | medium | high
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// ---- Application tables ----

export const intentions = pgTable('intentions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rawText: text('raw_text').notNull(),
  clarifyingQuestion: text('clarifying_question'),
  clarifyingAnswer: text('clarifying_answer'),
  planJson: jsonb('plan_json'),             // PlanSchema output stored as JSON
  promptVersion: text('prompt_version').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  intentionId: text('intention_id').references(() => intentions.id),
  title: text('title').notNull(),
  firstAction: text('first_action').notNull(),
  estimateMinutes: integer('estimate_minutes').notNull(),
  actualMinutes: integer('actual_minutes'),
  energy: text('energy').notNull().default('medium'), // low | medium | high
  blockers: jsonb('blockers').default([]),
  // State: pending | today | in_progress | done | deferred
  // NOTE: 'overdue' is NEVER a valid state — work rolls forward silently
  state: text('state').notNull().default('pending'),
  isToday: boolean('is_today').default(false),
  order: integer('order').default(0),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }),
});

export const workSessions = pgTable('work_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id),
  promptVersion: text('prompt_version').notNull(),
  state: text('state').notNull().default('active'), // active | ended
  // When set, system check-ins are silenced until this timestamp (flow state)
  flowModeUntil: timestamp('flow_mode_until', { mode: 'date' }),
  summary: text('summary'),
  tomorrowFirstAction: text('tomorrow_first_action'),
  startedAt: timestamp('started_at', { mode: 'date' }).defaultNow().notNull(),
  endedAt: timestamp('ended_at', { mode: 'date' }),
});

export const sessionEvents = pgTable('session_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => workSessions.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // user_message | agent_message | tool_call | checkin | system
  role: text('role'),                       // user | assistant | system
  content: text('content'),
  toolName: text('tool_name'),
  toolInput: jsonb('tool_input'),
  toolResult: jsonb('tool_result'),
  // Arbitrary per-event metadata. For checkin events: { sent_at, response_delay_seconds, abandoned }
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});

export const agentCalls = pgTable('agent_calls', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  sessionId: text('session_id'),
  agentType: text('agent_type').notNull(), // planner | session | eval_judge
  model: text('model').notNull(),
  promptVersion: text('prompt_version').notNull(),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  costUsd: real('cost_usd'),
  latencyMs: integer('latency_ms'),
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
});
