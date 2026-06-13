// @ts-check

export const metadata = { title: 'Wins — Focus Copilot' };

/**
 * History page shows ONLY completed tasks (wins log, not an audit).
 * Full implementation in Phase 3.
 */
export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-stone-900">Things you got done</h1>
      <p className="mt-2 text-stone-500 text-sm">A record of what you finished. Nothing else.</p>
      {/* Done task list — Phase 3 */}
      <div className="mt-8 text-stone-400 text-sm">No completed tasks yet.</div>
    </main>
  );
}
