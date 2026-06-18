'use client';
// @ts-check
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ENERGY_LABEL = { low: 'Easy', medium: 'Medium', high: 'Focused' };
const ENERGY_COLOR = {
  low: 'text-emerald-600 bg-emerald-50',
  medium: 'text-amber-600 bg-amber-50',
  high: 'text-rose-600 bg-rose-50',
};

/**
 * @param {object} props
 * @param {string} props.id
 * @param {string} props.title
 * @param {string} props.firstAction
 * @param {number} props.estimateMinutes
 * @param {'low'|'medium'|'high'} props.energy
 * @param {() => void} [props.onDefer]
 * @param {() => void} [props.onComplete]
 */
export default function TaskCard({ id, title, firstAction, estimateMinutes, energy, onDefer, onComplete }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [deferring, setDeferring] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));

  async function startSession() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not start session.');
      router.push(`/app/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setStarting(false);
    }
  }

  async function deferTask() {
    setDeferring(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'defer' }),
      });
      if (!res.ok) throw new Error('Could not defer task.');
      setDismissed(true);
      onDefer?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setDeferring(false);
    }
  }

  async function completeTask() {
    setCompleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' }),
      });
      if (!res.ok) throw new Error('Could not complete task.');
      setDismissed(true);
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setCompleting(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      {/* Small label row: task name + energy badge */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-stone-400 leading-snug">{title}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ENERGY_COLOR[energy] ?? ENERGY_COLOR.medium}`}>
          {ENERGY_LABEL[energy] ?? energy}
        </span>
      </div>

      {/* First action is the hero — this is what the user actually does */}
      <p className="mt-2 text-base font-medium text-stone-900 leading-snug">{firstAction}</p>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{estimateMinutes} min</span>
          <button
            type="button"
            onClick={deferTask}
            disabled={deferring || starting || completing}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-40"
          >
            {deferring ? 'Moving…' : 'not today'}
          </button>
          <button
            type="button"
            onClick={completeTask}
            disabled={completing || starting || deferring}
            aria-label={`Mark ${title} done`}
            className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-40"
          >
            {completing ? 'Saving…' : 'done'}
          </button>
        </div>
        <button
          type="button"
          onClick={startSession}
          disabled={starting || deferring || completing}
          aria-label={starting ? `Starting session for ${title}` : `Start session for ${title}`}
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {starting ? 'Starting…' : 'Start with me'}
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
