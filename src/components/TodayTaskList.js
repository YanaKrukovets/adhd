// @ts-check
import { auth } from '@/lib/auth.js';
import { getTodayTasks } from '@/lib/db/queries.js';
import TaskCard from './TaskCard.js';

const ENERGY_RANK = { low: 0, medium: 1, high: 2 };

/**
 * Server component — fetches today's tasks (max 3) and renders them,
 * sorted to match the user's current energy level.
 *
 * @param {{ energy?: string }} props
 */
export default async function TodayTaskList({ energy = 'medium' }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  let tasks = [];
  try {
    tasks = await getTodayTasks(session.user.id);
  } catch {
    // DB unavailable in dev without env
  }

  // Sort tasks to match energy: foggy → easy first, sharp → hard first
  if (energy === 'low' || energy === 'high') {
    tasks = [...tasks].sort((a, b) => {
      const aRank = ENERGY_RANK[/** @type {string} */ (a.energy)] ?? 1;
      const bRank = ENERGY_RANK[/** @type {string} */ (b.energy)] ?? 1;
      return energy === 'low' ? aRank - bRank : bRank - aRank;
    });
  }

  if (tasks.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
        <p className="text-stone-400 text-sm">Nothing on your list for today.</p>
        <p className="mt-1 text-stone-400 text-sm">Add something above to get started.</p>
      </div>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-stone-500 uppercase tracking-wide">Today</h2>
      <div className="mt-3 flex flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            firstAction={task.firstAction}
            estimateMinutes={task.estimateMinutes}
            energy={/** @type {'low'|'medium'|'high'} */ (task.energy)}
          />
        ))}
      </div>
    </section>
  );
}
