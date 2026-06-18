// @ts-check
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth.js';
import MeditationScene from '@/components/MeditationScene.js';

export const metadata = { title: 'Breathe — Focus Copilot' };

export default async function MeditatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/signin');

  return <MeditationScene />;
}
