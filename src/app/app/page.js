// @ts-check

export const metadata = { title: 'Today — Focus Copilot' };

/**
 * Today view — ≤3 task cards + intention input box.
 * Full implementation in Phase 3.
 */
export default function TodayPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-stone-900">What would you like to work on?</h1>
      <p className="mt-2 text-stone-500 text-sm">Type anything — vague is fine.</p>
      {/* IntentionInput component — Phase 1 */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <textarea
          className="w-full resize-none text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
          rows={3}
          placeholder="e.g. I need to deal with my taxes"
          aria-label="What do you want to work on?"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
          >
            Make a plan
          </button>
        </div>
      </div>
      {/* Today task cards — Phase 3 */}
    </main>
  );
}
