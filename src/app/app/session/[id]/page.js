// @ts-check
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth.js';
import { getWorkSession, getTaskById } from '@/lib/db/queries.js';
import SessionChat from '@/components/SessionChat.js';

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
