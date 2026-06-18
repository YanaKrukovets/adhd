'use client';
// @ts-check
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Optional "refill" affordance shown only when the today list has free slots and
 * pending tasks are waiting. Pulls the next task(s) forward to top the list back
 * up to the cap — it never grows the list past 3. Calm, opt-in, no pressure.
 *
 * @param {object} props
 * @param {number} props.queuedCount - how many tasks are waiting in the pool
 */
export default function RefillButton({ queuedCount }) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));

  async function pullNext() {
    setPulling(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks/refill', { method: 'POST' });
      if (!res.ok) throw new Error('Could not pull the next task.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPulling(false);
    }
  }

  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        onClick={pullNext}
        disabled={pulling}
        aria-label={pulling ? 'Bringing the next task into today\'s list' : 'Pull the next task into today\'s list'}
        className="text-xs text-stone-500 hover:text-stone-700 transition-colors disabled:opacity-40"
      >
        {pulling ? 'Bringing it over…' : 'Pull the next one over'}
      </button>
      <p className="mt-1 text-xs text-stone-400">
        {queuedCount} ready when you are.
      </p>
      {error && <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
