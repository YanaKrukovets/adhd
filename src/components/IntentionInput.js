'use client';
// @ts-check
import { useState } from 'react';

/**
 * Intention input form. Handles the full planner flow:
 * submit → optional clarifying question → plan created.
 */
export default function IntentionInput() {
  const [intention, setIntention] = useState('');
  const [clarifyingQuestion, setClarifyingQuestion] = useState(/** @type {string|null} */ (null));
  const [clarifyingAnswer, setClarifyingAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(/** @type {{taskCount: number}|null} */ (null));
  const [error, setError] = useState(/** @type {string|null} */ (null));

  /** @param {React.FormEvent} e */
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      /** @type {Record<string, unknown>} */
      const body = { intention };
      if (clarifyingQuestion && clarifyingAnswer.trim()) {
        body.clarifying_answer = clarifyingAnswer.trim();
      }

      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong.');
      }

      if (data.clarifying_question) {
        setClarifyingQuestion(data.clarifying_question);
      } else {
        setResult({ taskCount: data.taskCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setIntention('');
    setClarifyingQuestion(null);
    setClarifyingAnswer('');
    setResult(null);
    setError(null);
  }

  if (result) {
    return (
      <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-stone-700">
          Plan ready — {result.taskCount} task{result.taskCount !== 1 ? 's' : ''} added to your list.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-sm text-stone-500 underline"
        >
          Plan something else
        </button>
      </div>
    );
  }

  const canSubmit = !loading && intention.trim().length > 0 &&
    (!clarifyingQuestion || clarifyingAnswer.trim().length > 0);

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <textarea
        className="w-full resize-none text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
        rows={3}
        placeholder="e.g. I need to deal with my taxes"
        aria-label="What do you want to work on?"
        value={intention}
        onChange={(e) => setIntention(e.target.value)}
        disabled={loading || !!clarifyingQuestion}
      />

      {clarifyingQuestion && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <p className="text-sm text-stone-700">{clarifyingQuestion}</p>
          <input
            type="text"
            className="mt-2 w-full text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none border-b border-stone-200 pb-1"
            placeholder="Your answer…"
            aria-label="Answer to clarifying question"
            value={clarifyingAnswer}
            onChange={(e) => setClarifyingAnswer(e.target.value)}
            autoFocus
            disabled={loading}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-40"
        >
          {loading ? 'Working…' : clarifyingQuestion ? 'Continue' : 'Make a plan'}
        </button>
      </div>
    </form>
  );
}
