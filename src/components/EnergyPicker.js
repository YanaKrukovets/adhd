'use client';
// @ts-check
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const TODAY_KEY = 'fc_energy_date';
const ENERGY_KEY = 'fc_energy';
const OPTIONS = [
  { value: 'low', label: 'Foggy', description: "Hard to focus, easy tasks only" },
  { value: 'medium', label: 'Doing okay', description: "Normal day, mix of tasks" },
  { value: 'high', label: 'Feeling sharp', description: "Good focus, ready for anything" },
];

/**
 * Shows a one-tap energy check once per day.
 * Stores selection in localStorage and syncs to URL search param ?e=.
 * On subsequent loads today, silently restores the param.
 */
export default function EnergyPicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem(TODAY_KEY);
    const savedEnergy = localStorage.getItem(ENERGY_KEY);

    if (savedDate === today && savedEnergy) {
      // Already picked today — silently apply to URL if missing
      if (!searchParams.get('e')) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('e', savedEnergy);
        router.replace(`?${params.toString()}`, { scroll: false });
      }
      return;
    }
    // Use a microtask to avoid setting state synchronously inside the effect body
    Promise.resolve().then(() => setShow(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** @param {string} value */
  function pick(value) {
    const today = new Date().toDateString();
    localStorage.setItem(TODAY_KEY, today);
    localStorage.setItem(ENERGY_KEY, value);
    setShow(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('e', value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  if (!show) return null;

  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-stone-700">How are you right now?</p>
      <p className="mt-0.5 text-xs text-stone-400">Your tasks will be sorted to match.</p>
      <div className="mt-3 flex flex-col gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => pick(opt.value)}
            aria-label={`${opt.label}: ${opt.description}`}
            className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-left hover:border-stone-400 hover:bg-white transition-colors"
          >
            <span className="text-sm font-medium text-stone-900">{opt.label}</span>
            <span className="text-xs text-stone-400">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
