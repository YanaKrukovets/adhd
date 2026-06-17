'use client';
// @ts-check
import { useState } from 'react';

/**
 * Lightweight brain-dump input.
 * Saves a thought as a pending task (no AI planning, doesn't touch today's list).
 * The user can plan it properly later from history.
 */
export default function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));

  async function handleSubmit(/** @type {React.FormEvent} */ e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setText('');
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 1800);
    } catch {
      setError("Couldn't save that — give it another try.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm text-stone-400 hover:text-stone-600 transition-colors"
      >
        + Capture a thought
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-3 shadow-sm"
    >
      {saved ? (
        <p className="text-sm text-stone-500 py-1">Saved. Plan it when you&apos;re ready.</p>
      ) : (
        <>
          <input
            type="text"
            className="w-full bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none"
            placeholder="Something you don&apos;t want to forget&hellip;"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            disabled={loading}
            maxLength={500}
          />
          {error && (
            <p role="alert" className="mt-1 text-xs text-red-600">{error}</p>
          )}
          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => { setOpen(false); setText(''); }}
              className="text-xs text-stone-400 hover:text-stone-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="rounded-lg bg-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-300 transition-colors disabled:opacity-40"
            >
              {loading ? 'Saving…' : 'Save for later'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
