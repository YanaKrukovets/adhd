'use client';
// @ts-check

/**
 * Error boundary for the /app section.
 * Next.js renders this when an unhandled error occurs in an /app/* page.
 *
 * @param {{ error: Error, reset: () => void }} props
 */
export default function AppError({ error, reset }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-stone-800">Something went sideways.</h1>
      <p className="mt-2 text-stone-500 text-sm">
        {error?.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors"
      >
        Try again
      </button>
      <p className="mt-4 text-xs text-stone-600">
        If this keeps happening,{' '}
        <a href="/app" className="underline">go back to today</a>.
      </p>
    </main>
  );
}
