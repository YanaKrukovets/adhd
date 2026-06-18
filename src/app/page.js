// @ts-check
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center">
      <div className="max-w-xl">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          Focus Copilot
        </h1>
        <p className="mt-6 text-lg text-stone-600 leading-relaxed">
          A calm presence that helps you start. Type what you need to do — get a clear first step and someone to work alongside.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app"
            className="rounded-lg bg-stone-900 px-6 py-3 text-base font-medium text-white hover:bg-stone-700 transition-colors"
          >
            Open Focus Copilot
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-lg border border-stone-300 px-6 py-3 text-base font-medium text-stone-700 hover:bg-stone-100 transition-colors"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-12 text-sm text-stone-500">
          No timers. No streaks. No judgment.
        </p>
        <nav className="mt-8 flex justify-center gap-5 text-sm text-stone-500">
          <Link href="/about" className="hover:text-stone-700 transition-colors">
            About
          </Link>
          <Link href="/how-it-works" className="hover:text-stone-700 transition-colors">
            How it works
          </Link>
          <Link href="/privacy" className="hover:text-stone-700 transition-colors">
            Privacy
          </Link>
        </nav>
      </div>
    </main>
  );
}
