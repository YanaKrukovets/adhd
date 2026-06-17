// @ts-check
import { Geist } from 'next/font/google';
import './globals.css';
import { validateEnv } from '@/lib/schemas/api.js';

// Fail loudly at server startup if required env vars are missing.
// Only runs on the server (layout is a Server Component).
if (typeof window === 'undefined') {
  try {
    validateEnv();
  } catch (err) {
    // In dev without a .env file, log a warning but don't crash.
    if (process.env.NODE_ENV === 'production') throw err;
    console.warn('[env] Missing required env vars — some features will not work:', err.message);
  }
}

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });

export const metadata = {
  title: 'Focus Copilot',
  description: 'A calm body double for adults with ADHD. Type what you need to do — get a clear first step.',
  openGraph: {
    title: 'Focus Copilot',
    description: 'A calm body double for adults with ADHD. Type what you need to do — get a clear first step.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Focus Copilot',
    description: 'A calm body double for adults with ADHD. Type what you need to do — get a clear first step.',
  },
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-stone-50 text-stone-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
