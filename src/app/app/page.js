// @ts-check
import { Suspense } from 'react';
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
