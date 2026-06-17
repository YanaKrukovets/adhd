// @ts-check
import { signIn } from '@/lib/auth.js';

export const metadata = {
  title: 'Sign in · Focus Copilot',
};

/**
 * @param {{ searchParams: Promise<{ callbackUrl?: string }> }} props
 */
export default async function SignInPage({ searchParams }) {
  const { callbackUrl = '/app' } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Sign in
        </h1>
        <p className="mt-3 text-stone-600 leading-relaxed">
          Welcome back. Sign in with Google — no password needed.
        </p>

        <form
          className="mt-10"
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: callbackUrl });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-white hover:bg-stone-700 transition-colors"
          >
            Continue with Google
          </button>
        </form>

        <p className="mt-12 text-sm text-stone-400">
          No timers. No streaks. No judgment.
        </p>
      </div>
    </main>
  );
}
