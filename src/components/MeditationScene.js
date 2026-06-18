'use client';
// @ts-check
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Breathing cycle phases. Durations in seconds. A continuous 4-4-6 box-ish
 * breath (in / hold / out) — NOT a session countdown. It loops forever; the
 * user leaves when they're ready.
 * @type {Array<{ key: string, label: string, seconds: number, scale: number }>}
 */
const BREATH_PHASES = [
  { key: 'in', label: 'Breathe in', seconds: 4, scale: 1 },
  { key: 'hold', label: 'Hold', seconds: 4, scale: 1 },
  { key: 'out', label: 'Breathe out', seconds: 6, scale: 0.52 },
];

/**
 * Builds and starts a self-contained "calm sea" soundscape using the Web Audio
 * API — looped brown noise through a lowpass filter (the muffled underwater
 * wash) with a slow gain LFO for wave swell. No audio file needed.
 *
 * @param {AudioContext} ctx
 * @returns {() => void} stop function that tears the graph down
 */
function startSeaSound(ctx) {
  // ~3s of brown noise, looped. Brown (vs white) noise is weighted to low
  // frequencies, which reads as ocean/wind rather than static.
  const bufferSize = ctx.sampleRate * 3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Lowpass for the soft, underwater muffle.
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 650;

  // Master gain, kept gentle.
  const master = ctx.createGain();
  master.gain.value = 0.0;

  // Slow swell: an LFO modulating master gain ~ every 9s, like waves rolling in.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.11;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(master.gain);

  source.connect(lowpass).connect(master).connect(ctx.destination);

  source.start();
  lfo.start();
  // Fade in so it doesn't pop on.
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 2.5);

  return () => {
    try {
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      source.stop(ctx.currentTime + 0.5);
      lfo.stop(ctx.currentTime + 0.5);
    } catch {
      // already stopped
    }
  };
}

/**
 * Full-screen underwater meditation scene: drifting caustic light, rising
 * bubbles, a breathing orb that guides a slow 4-4-6 breath, and an optional
 * synthesized sea-sound wash. Elapsed time counts UP (no countdown — CLAUDE.md
 * rule 6).
 */
export default function MeditationScene() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [soundOn, setSoundOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const audioCtxRef = useRef(/** @type {AudioContext|null} */ (null));
  const stopSoundRef = useRef(/** @type {(() => void)|null} */ (null));

  const phase = BREATH_PHASES[phaseIndex];

  // Advance the breathing cycle, each phase lasting its own duration.
  useEffect(() => {
    const t = setTimeout(() => {
      setPhaseIndex((i) => (i + 1) % BREATH_PHASES.length);
    }, phase.seconds * 1000);
    return () => clearTimeout(t);
  }, [phaseIndex, phase.seconds]);

  // Elapsed-time indicator counts up from arrival. This is presence, not a
  // timer to beat — never a countdown.
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Tear down audio on unmount.
  useEffect(() => {
    return () => {
      stopSoundRef.current?.();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Sound must start from a user gesture (browser autoplay policy).
  async function toggleSound() {
    if (soundOn) {
      stopSoundRef.current?.();
      stopSoundRef.current = null;
      setSoundOn(false);
      return;
    }
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      stopSoundRef.current = startSeaSound(ctx);
      setSoundOn(true);
    } catch (err) {
      console.error('[meditation] audio failed:', err);
    }
  }

  // Pre-generate stable bubble configs so they don't reshuffle every render.
  const bubbles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.round((i * 53 + 7) % 100),
        size: 6 + ((i * 7) % 22),
        duration: 9 + ((i * 13) % 12),
        delay: (i * 1.7) % 11,
        drift: ((i % 5) - 2) * 14,
      })),
    []
  );

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-cyan-700 via-teal-800 to-slate-950 text-white">
      {/* Caustic light sheets */}
      <div
        aria-hidden="true"
        className="meditation-caustics pointer-events-none absolute -inset-1/4 mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(40% 30% at 30% 20%, rgba(255,255,255,0.5), transparent 60%), radial-gradient(35% 25% at 70% 35%, rgba(173,255,247,0.45), transparent 60%)',
          animation: 'caustics-drift 18s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden="true"
        className="meditation-caustics pointer-events-none absolute -inset-1/4 mix-blend-soft-light"
        style={{
          background:
            'radial-gradient(45% 30% at 60% 70%, rgba(255,255,255,0.4), transparent 60%), radial-gradient(30% 20% at 25% 60%, rgba(125,211,252,0.4), transparent 60%)',
          animation: 'caustics-drift 26s ease-in-out infinite reverse',
        }}
      />

      {/* Rising bubbles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {bubbles.map((b) => (
          <span
            key={b.id}
            className="meditation-bubble absolute bottom-0 rounded-full bg-white/30 ring-1 ring-white/40"
            style={{
              left: `${b.left}%`,
              width: `${b.size}px`,
              height: `${b.size}px`,
              // @ts-ignore — CSS custom property
              '--bubble-drift': `${b.drift}px`,
              animation: `bubble-rise ${b.duration}s linear ${b.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 py-4">
        <Link
          href="/app"
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur hover:bg-white/20 transition-colors"
        >
          ← Back
        </Link>
        <span
          aria-label={`You've been here ${mm} minutes ${ss} seconds`}
          className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium tabular-nums text-white/80 backdrop-blur"
        >
          {mm}:{ss}
        </span>
      </div>

      {/* Breathing orb */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 px-6">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className="meditation-orb-glow absolute h-72 w-72 rounded-full bg-cyan-200/30 blur-2xl"
            style={{ animation: 'orb-glow 7s ease-in-out infinite' }}
          />
          <div
            className="flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-white/40 to-cyan-100/10 ring-1 ring-white/40 backdrop-blur-sm transition-transform ease-in-out"
            style={{
              transform: `scale(${phase.scale})`,
              transitionDuration: `${phase.seconds}s`,
            }}
          >
            <span aria-live="polite" className="text-lg font-medium tracking-wide text-white drop-shadow">
              {phase.label}
            </span>
          </div>
        </div>

        <p className="max-w-xs text-center text-sm text-white/70">
          Follow the circle. In through your nose, out slowly. Stay as long as you like —
          there&apos;s nowhere to be.
        </p>

        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundOn}
          className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/25 transition-colors"
        >
          {soundOn ? '🔊 Sea sounds on' : '🔇 Turn on sea sounds'}
        </button>
      </div>
    </div>
  );
}
