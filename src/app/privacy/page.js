// @ts-check
import Link from 'next/link';

export const metadata = {
  title: 'Privacy — Focus Copilot',
  description: 'What Focus Copilot collects, why, and your choices.',
};

const LAST_UPDATED = 'June 18, 2026';

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
        ← Back
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-stone-900">Privacy</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 leading-relaxed text-stone-700">
        <p>
          Focus Copilot is built for people with ADHD, and the things you type here — what you need
          to do, what you&apos;re stuck on — can be personal. This page explains plainly what we
          store, why, and what we don&apos;t do.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">What we collect</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="font-medium text-stone-900">Your email address</strong> — used only
              to sign you in and link your data to your account.
            </li>
            <li>
              <strong className="font-medium text-stone-900">What you write</strong> — the
              intentions, tasks, and messages you enter, plus the plans and session summaries
              generated from them.
            </li>
            <li>
              <strong className="font-medium text-stone-900">Session activity</strong> — when you
              start, pause, or finish a task, and check-in timing. This helps the companion stay
              gentle and well-timed.
            </li>
            <li>
              <strong className="font-medium text-stone-900">Basic technical logs</strong> — for
              each AI request we record the model used, token counts, latency, and cost so we can
              keep the service running and affordable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">AI processing</h2>
          <p className="mt-3">
            To turn your intentions into plans and to power the in-session companion, the text you
            enter is sent to{' '}
            <strong className="font-medium text-stone-900">Google&apos;s Gemini API</strong>. Your
            use of this feature is also subject to Google&apos;s applicable terms and privacy
            practices. We send only what&apos;s needed to generate a useful response.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">What we don&apos;t do</h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>We don&apos;t sell your data.</li>
            <li>We don&apos;t show ads or use your content for advertising.</li>
            <li>
              We don&apos;t share your tasks or messages with anyone other than the service
              providers needed to run the app (such as our database host and the AI provider above).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">Your choices</h2>
          <p className="mt-3">
            Your data is yours. You can ask us to export or delete your account and everything tied
            to it at any time — see the contact below. Deleting your account removes your tasks,
            sessions, and summaries.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-stone-900">Contact</h2>
          <p className="mt-3">
            Questions, or want your data deleted? Email{' '}
            <a
              href="mailto:yanashelli@gmail.com"
              className="text-stone-900 underline hover:text-stone-600"
            >
              yanashelli@gmail.com
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-stone-500">
          This page is a plain-language summary, not legal advice. As the product grows, this policy
          may be updated — the date at the top reflects the latest version.
        </p>
      </div>

      <div className="mt-12 flex gap-4 text-sm text-stone-500">
        <Link href="/about" className="hover:text-stone-700">
          About
        </Link>
        <Link href="/how-it-works" className="hover:text-stone-700">
          How it works
        </Link>
      </div>
    </main>
  );
}
