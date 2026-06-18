// @ts-check
import Link from 'next/link';

export const metadata = {
  title: 'How it works — Focus Copilot',
  description: 'A short guide to using Focus Copilot.',
};

/**
 * @param {{ n: number, title: string, children: React.ReactNode }} props
 */
function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-medium text-white">
        {n}
      </span>
      <div>
        <h3 className="text-lg font-medium text-stone-900">{title}</h3>
        <p className="mt-1 leading-relaxed text-stone-700">{children}</p>
      </div>
    </li>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900">How it works</h1>
      <p className="mt-4 text-lg leading-relaxed text-stone-600">
        There&apos;s no setup and nothing to organize. Here&apos;s the whole flow.
      </p>

      <ol className="mt-10 space-y-8">
        <Step n={1} title="Sign in">
          Sign in with your email — you&apos;ll get a link to click. No password to remember.
        </Step>
        <Step n={2} title="Dump what's on your mind">
          Type what you need to do in one messy sentence. Don&apos;t organize it; that&apos;s the
          app&apos;s job. &ldquo;I need to sort out my car registration&rdquo; is plenty.
        </Step>
        <Step n={3} title="Answer one question (sometimes)">
          If your intention is genuinely unclear, you&apos;ll get a single question. Otherwise you
          go straight to a plan.
        </Step>
        <Step n={4} title="Look at today's tasks">
          You&apos;ll see at most three tasks, each with a small first action. Pick whichever feels
          least awful — the order doesn&apos;t matter.
        </Step>
        <Step n={5} title="Start a session">
          Open a session on that task and just do the first action. It&apos;s tiny on purpose. The
          companion stays with you while you work.
        </Step>
        <Step n={6} title="Talk to it like a person">
          Say <em>&ldquo;this feels too big&rdquo;</em> and it&apos;ll break the task down. Say{' '}
          <em>&ldquo;leave me to it&rdquo;</em> and it goes quiet. Say{' '}
          <em>&ldquo;I&apos;m stuck waiting on X&rdquo;</em> and it logs it and moves on.
        </Step>
        <Step n={7} title="Settle first if your head is too loud">
          If you can&apos;t even think about starting, ask for the meditation assistant. It walks you
          through a short, guided pause — slow down, breathe, and make a little space — so the first
          step feels reachable again.
        </Step>
        <Step n={8} title="Talk it through when the block is in your head">
          Sometimes the wall isn&apos;t the task, it&apos;s the overwhelm or shame around it. Ask for
          the psychologist assistant and it&apos;ll talk things through with you, gently and without
          judgement. It&apos;s support to help you start — not a replacement for real therapy.
        </Step>
        <Step n={9} title="Say 'done' when you're done">
          No need to invent next steps. It&apos;ll wrap up the session and leave you one small thing
          to start with tomorrow.
        </Step>
      </ol>

      <div className="mt-12 rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-medium text-stone-900">If you don&apos;t finish, that&apos;s fine</h2>
        <p className="mt-2 leading-relaxed text-stone-700">
          Nothing turns red. Nothing breaks. There are no streaks, no overdue labels, and no timers
          ticking down. Come back whenever you like — unfinished work quietly rolls forward.
        </p>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-stone-500">
        <Link href="/about" className="hover:text-stone-700">
          About
        </Link>
        <Link href="/privacy" className="hover:text-stone-700">
          Privacy
        </Link>
      </div>
    </main>
  );
}
