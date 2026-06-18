// @ts-check
import { Suspense } from 'react';
import Link from 'next/link';
import IntentionInput from '@/components/IntentionInput.js';
import TodayTaskList from '@/components/TodayTaskList.js';
import EnergyPicker from '@/components/EnergyPicker.js';
import QuickCapture from '@/components/QuickCapture.js';

export const metadata = { title: 'Today — Focus Copilot' };

/**
 * @param {{ searchParams: Promise<Record<string, string>> }} props
 */
export default async function TodayPage({ searchParams }) {
  const params = await searchParams;
  const energy = ['low', 'medium', 'high'].includes(params?.e) ? params.e : 'medium';

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-stone-900">What would you like to work on?</h1>
      <p className="mt-2 text-stone-500 text-sm">Type anything — vague is fine.</p>

      {/* Feeling-too-much-to-start escape hatches. Overwhelm is an initiation
          blocker — these lower the temperature before the task list. */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/app/calm"
          className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-100 transition-colors"
        >
          💬 Feeling overwhelmed? Talk it down
        </Link>
        <Link
          href="/app/meditate"
          className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 hover:bg-cyan-100 transition-colors"
        >
          🌊 Just breathe for a minute
        </Link>
      </div>

      <IntentionInput />
      {/* EnergyPicker is client-only; Suspense prevents server rendering from blocking */}
      <Suspense fallback={null}>
        <EnergyPicker />
      </Suspense>
      <TodayTaskList energy={energy} />
      <QuickCapture />
    </main>
  );
}
