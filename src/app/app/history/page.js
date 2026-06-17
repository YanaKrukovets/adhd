// @ts-check
import Link from 'next/link';
import { auth } from '@/lib/auth.js';
import { getDoneTasks } from '@/lib/db/queries.js';

export const metadata = { title: 'Things you got done — Focus Copilot' };

/**
 * Wins log. Shows only completed tasks — nothing else.
 */
export default async function HistoryPage() {
  const session = await auth();

  let tasks = [];
  if (session?.user?.id) {
    try {
      tasks = await getDoneTasks(session.user.id);
    } catch {
      // DB unavailable in dev without env
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Link href="/app" className="text-xs text-stone-500 hover:text-stone-800 transition-colors">
        ← Today
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900">Things you got done</h1>
      <p className="mt-2 text-stone-500 text-sm">A record of what you finished. Nothing else.</p>

      {tasks.length === 0 ? (
        <div className="mt-8 text-stone-500 text-sm">Nothing here yet — go finish something!</div>
      ) : (
        <ul className="mt-8 flex flex-col gap-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3"
            >
              <span aria-hidden="true" className="mt-0.5 text-stone-300">✓</span>
              <div>
                <p className="text-stone-800 font-medium leading-snug">{task.title}</p>
                {task.completedAt && (
                  <p className="mt-0.5 text-xs text-stone-600">
                    {new Date(task.completedAt).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
