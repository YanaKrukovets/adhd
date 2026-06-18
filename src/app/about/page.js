// @ts-check
import Link from 'next/link';

export const metadata = {
  title: 'About — Focus Copilot',
  description:
    'Focus Copilot is a calm body double for adults with ADHD. It helps you start, not just plan.',
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900">
        About Focus Copilot
      </h1>

      <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-700">
        <p>
          Focus Copilot helps adults with ADHD do the hardest part of any task:{' '}
          <strong className="font-medium text-stone-900">starting it</strong>.
        </p>
        <p>
          Most to-do apps assume the problem is remembering what to do. For a lot of us, the wall
          isn&apos;t memory — it&apos;s activation. You know what needs doing, you just can&apos;t
          begin. So this isn&apos;t another task manager. Everything here is built around one
          question: <em>will this help you start something in the next five minutes?</em>
        </p>
        <p>It does that in two ways:</p>
        <ul className="list-disc space-y-3 pl-6">
          <li>
            <strong className="font-medium text-stone-900">It turns a vague intention into a tiny first step.</strong>{' '}
            Type something fuzzy like &ldquo;I need to deal with my taxes&rdquo; and you get a short,
            ordered list where the very first action is small enough that starting feels obvious.
          </li>
          <li>
            <strong className="font-medium text-stone-900">It sits with you while you work.</strong>{' '}
            Like a calm friend in the room — a body double. It checks in gently, helps break things
            down when they feel too big, and goes quiet when you&apos;re in flow.
          </li>
        </ul>

        <h2 className="pt-4 text-xl font-semibold text-stone-900">What it will never do</h2>
        <p>
          No deadlines. No &ldquo;overdue.&rdquo; No streaks to break. No countdown timers. No more
          than three tasks a day. All of those quietly add pressure and shame — which is exactly
          what makes starting harder. If you don&apos;t finish something, nothing turns red and
          nothing breaks. Unfinished work simply rolls forward.
        </p>
        <p>The voice here is a calm friend, not a coach. That&apos;s the whole point.</p>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-stone-500">
        <Link href="/how-it-works" className="hover:text-stone-700">
          How it works
        </Link>
        <Link href="/privacy" className="hover:text-stone-700">
          Privacy
        </Link>
      </div>
    </main>
  );
}
