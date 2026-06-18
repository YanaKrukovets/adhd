// @ts-check
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth.js';
import { getWorkSession, getTaskById, getSessionMessages } from '@/lib/db/queries.js';
import SessionChat from '@/components/SessionChat.js';

/**
 * Maps persisted transcript rows to the UIMessage shape useChat expects as
 * initial state.
 * @param {Array<{ id: string, role: 'user' | 'assistant', content: string }>} rows
 */
function toUIMessages(rows) {
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    parts: [{ type: 'text', text: r.content }],
  }));
}

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function SessionPage({ params }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  const { id } = await params;
  const workSession = await getWorkSession(id, session.user.id);
  if (!workSession) notFound();

  const task = workSession.taskId ? await getTaskById(workSession.taskId) : null;

  // An ended session has no live chat to resume — show the wrap-up directly so
  // a refresh lands on the summary instead of re-greeting the user.
  if (workSession.state === 'ended') {
    return (
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link href="/app" className="text-xs text-stone-500 hover:text-stone-800 transition-colors">
          ← Back
        </Link>
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-lg font-medium text-stone-900">Session wrapped up.</p>
          {workSession.summary && (
            <p className="mt-2 text-stone-600 text-sm">{workSession.summary}</p>
          )}
          {workSession.tomorrowFirstAction && (
            <div className="mt-4 rounded-lg bg-stone-50 px-4 py-3">
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Next time</p>
              <p className="mt-1 text-stone-800">{workSession.tomorrowFirstAction}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  const initialMessages = toUIMessages(await getSessionMessages(id));

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/app" className="text-xs text-stone-500 hover:text-stone-800 transition-colors">
        ← Back
      </Link>

      <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">Working on</p>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">
          {task?.title ?? 'Open session'}
        </h1>
        {task?.firstAction && (
          <p className="mt-1 text-sm text-stone-500">First step: {task.firstAction}</p>
        )}
      </div>

      <div className="mt-6">
        <SessionChat
          sessionId={id}
          taskTitle={task?.title ?? 'your task'}
          firstAction={task?.firstAction ?? ''}
          initialMessages={initialMessages}
        />
      </div>
    </main>
  );
}

/**
 * @param {{ params: Promise<{ id: string }> }} props
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: `Session — Focus Copilot` };
}
