// @ts-check
import Link from 'next/link';

export const metadata = {
  title: 'Check your email · Focus Copilot',
};

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <div className="max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Check your email
        </h1>
        <p className="mt-3 text-stone-600 leading-relaxed">
          We just sent you a sign-in link. Open it on this device to continue —
          you can close this tab.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
