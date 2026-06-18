// @ts-check
import { auth } from '@/lib/auth.js';
import { getTodayTasks, getQueuedTaskCount, MAX_TODAY_TASKS } from '@/lib/db/queries.js';
import TaskCard from './TaskCard.js';
import RefillButton from './RefillButton.js';

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
  let queuedCount = 0;
  try {
    [tasks, queuedCount] = await Promise.all([
      getTodayTasks(session.user.id),
      getQueuedTaskCount(session.user.id),
    ]);
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

  // Queue affordance: if there's a free slot AND tasks are waiting, offer to pull
  // the next one over. If the list is already full (no free slot), stay quiet with
  // the gentle hint — we never let the user push past the cap.
  const hasFreeSlot = tasks.length < MAX_TODAY_TASKS;
  const queueAffordance =
    queuedCount === 0 ? null : hasFreeSlot ? (
      <RefillButton queuedCount={queuedCount} />
    ) : (
      <p className="mt-3 text-center text-xs text-stone-400">
        {queuedCount} more ready when you are.
      </p>
    );

  if (tasks.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center">
        <p className="text-stone-400 text-sm">Nothing on your list for today.</p>
        <p className="mt-1 text-stone-400 text-sm">Add something above to get started.</p>
        {queueAffordance}
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
      {queueAffordance}
    </section>
  );
}
