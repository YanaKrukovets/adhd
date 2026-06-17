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
          Welcome back. Pick a way to sign in — no password needed.
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

        <div className="my-6 flex items-center gap-3 text-sm text-stone-400">
          <span className="h-px flex-1 bg-stone-200" />
          or
          <span className="h-px flex-1 bg-stone-200" />
        </div>

        <form
          className="flex flex-col gap-3"
          action={async (formData) => {
            'use server';
            await signIn('resend', {
              email: formData.get('email'),
              redirectTo: callbackUrl,
            });
          }}
        >
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-stone-300 px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg border border-stone-300 px-6 py-3 text-base font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Email me a sign-in link
          </button>
        </form>

        <p className="mt-12 text-sm text-stone-400">
          No timers. No streaks. No judgment.
        </p>
      </div>
    </main>
  );
}
