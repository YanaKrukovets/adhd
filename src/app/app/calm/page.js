// @ts-check
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth.js';
import CalmChat from '@/components/CalmChat.js';

export const metadata = { title: 'A calmer moment — Focus Copilot' };

export default async function CalmPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <Link href="/app" className="text-xs text-stone-500 hover:text-stone-800 transition-colors">
        ← Back
      </Link>

      <div className="mt-4 rounded-xl border border-teal-100 bg-gradient-to-b from-teal-50 to-white p-5 shadow-sm">
        <p className="text-xs font-medium text-teal-700 uppercase tracking-wide">A calmer moment</p>
        <h1 className="mt-1 text-lg font-semibold text-stone-900">
          Let&apos;s take some weight off first.
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          Nothing to finish here. We&apos;ll slow things down, and a next step can wait until
          you&apos;re ready — or skip it entirely.
        </p>
      </div>

      <div className="mt-6">
        <CalmChat />
      </div>
    </main>
  );
}
