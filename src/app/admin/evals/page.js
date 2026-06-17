// @ts-check
import { getAgentCallStats } from '@/lib/db/queries.js';

export const metadata = { title: 'Eval Dashboard — Focus Copilot' };

/**
 * Internal eval dashboard.
 * Shows eval scores per prompt version, cost per call, and calibration data.
 */
export default async function EvalsPage() {
  let stats = [];
  try {
    stats = await getAgentCallStats();
  } catch {
    // DB not connected in dev without env
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold text-stone-900">Eval Dashboard</h1>
      <p className="mt-2 text-stone-500 text-sm">Agent call costs and eval scores. Internal use only.</p>

      <section className="mt-8">
        <h2 className="text-lg font-medium text-stone-800">Agent Call Costs</h2>
        {stats.length === 0 ? (
          <p className="mt-3 text-stone-500 text-sm">No agent calls recorded yet.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200">
                <th scope="col" className="pb-2 pr-4">Model</th>
                <th scope="col" className="pb-2 pr-4">Calls</th>
                <th scope="col" className="pb-2 pr-4">Total cost</th>
                <th scope="col" className="pb-2">Avg latency</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((row) => (
                <tr key={row.model} className="border-b border-stone-100">
                  <td className="py-2 pr-4 font-mono">{row.model}</td>
                  <td className="py-2 pr-4">{row.count}</td>
                  <td className="py-2 pr-4">${row.totalCost?.toFixed(4)}</td>
                  <td className="py-2">{Math.round(row.avgLatencyMs)}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-stone-800">Eval Scores</h2>
        <p className="mt-2 text-stone-500 text-sm">Run <code>npm run evals:planner</code> or <code>npm run evals:session</code> to generate results.</p>
      </section>
    </main>
  );
}
