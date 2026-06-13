// @ts-check

/**
 * Session page — the "Start With Me" body double experience.
 * Streaming UI implemented in Phase 2.
 *
 * @param {{ params: Promise<{ id: string }> }} props
 */
export default async function SessionPage({ params }) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-stone-500 text-sm">Session {id}</p>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Starting up your session…</h1>
      {/* Session UI — Phase 2 */}
    </main>
  );
}
