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
 * Fills an audio buffer's single channel with brown noise (a running integral
 * of white noise, normalized). Brown noise is weighted to low frequencies, so
 * it reads as ocean/wind rather than static. `gain` scales the final amplitude.
 *
 * @param {AudioBuffer} buffer
 * @param {number} [gain]
 */
function fillBrownNoise(buffer, gain = 3.5) {
  fillBrownNoise2(buffer, 0, gain);
}

/**
 * Like {@link fillBrownNoise} but targets a specific channel, so stereo buffers
 * can be filled with independent (decorrelated) noise per side.
 *
 * The buffer is made loop-SEAMLESS: brown noise doesn't naturally wrap, so a
 * raw looped buffer clicks every time it restarts (the last sample doesn't
 * match the first). We generate a little extra tail and cosine-crossfade it
 * back over the head, so the seam is continuous and the loop is silent.
 *
 * @param {AudioBuffer} buffer
 * @param {number} channel
 * @param {number} [gain]
 */
function fillBrownNoise2(buffer, channel, gain = 3.5) {
  const data = buffer.getChannelData(channel);
  const n = data.length;
  const fade = Math.min(Math.floor(buffer.sampleRate * 0.05), Math.floor(n / 4));
  const tmp = new Float32Array(n + fade);
  let last = 0;
  for (let i = 0; i < tmp.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    tmp[i] = last * gain;
  }
  for (let i = 0; i < n; i++) data[i] = tmp[i];
  // Crossfade the head with the natural continuation past the end (tmp[n..]),
  // so playback flows tmp[n-1] → data[0] (= tmp[n]) without a discontinuity.
  for (let j = 0; j < fade; j++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * j) / fade); // 0 → 1
    data[j] = data[j] * w + tmp[n + j] * (1 - w);
  }
}

/**
 * Generates a stereo "decaying noise" impulse response for a ConvolverNode — a
 * cheap synthetic reverb that gives the soundscape a sense of open space (a
 * beach, not a sealed room). Left/right are independent so the tail is wide.
 *
 * @param {AudioContext} ctx
 * @param {number} [seconds]  tail length
 * @param {number} [decay]    higher = faster falloff
 * @returns {AudioBuffer}
 */
function makeReverbImpulse(ctx, seconds = 2.6, decay = 2.2) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/**
 * Builds and starts a self-contained "calm sea" soundscape using the Web Audio
 * API — no audio file needed. Several layers, plus stereo width and a touch of
 * reverb, make it read as real surf rather than a steady drone:
 *
 *   1. A quiet STEREO brown-noise bed (independent L/R) — the distant
 *      ocean/wind floor that surrounds the listener.
 *   2. Discrete WAVE EVENTS at irregular intervals, each panned somewhere in
 *      the field. A wave is itself three bands: a low BODY that swells and
 *      breaks, a high FIZZ that peaks just *after* the break and lingers (the
 *      sound of foam), and a sparse CRACKLE of foam bursts during the recede.
 *   3. Sparse WATER BUBBLES — short sine "plinks" with a fast upward pitch
 *      sweep, sometimes in little clusters, for close-up intimacy.
 *
 * Everything runs into a light convolution reverb for open-air space.
 *
 * @param {AudioContext} ctx
 * @returns {() => void} stop function that tears the graph down
 */
function startSeaSound(ctx) {
  let stopped = false;
  /** @type {Set<ReturnType<typeof setTimeout>>} */
  const timers = new Set();
  /**
   * setTimeout that auto-forgets itself and no-ops after teardown.
   * @param {() => void} fn
   * @param {number} ms
   */
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!stopped) fn();
    }, ms);
    timers.add(id);
    return id;
  }

  /**
   * @param {number} min
   * @param {number} max
   */
  const rand = (min, max) => min + Math.random() * (max - min);

  // --- Master + reverb space -----------------------------------------------
  // master → dry → out, and master → reverb → wet → out. The fade-in lives on
  // master so it covers every layer at once.
  const master = ctx.createGain();
  master.gain.value = 0.0001;

  const dry = ctx.createGain();
  dry.gain.value = 1;
  const convolver = ctx.createConvolver();
  convolver.buffer = makeReverbImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = 0.28;

  master.connect(dry).connect(ctx.destination);
  master.connect(convolver).connect(wet).connect(ctx.destination);

  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 2.5);

  // --- Layer 1: the constant distant-ocean bed (stereo) --------------------
  // Two independent channels of brown noise so the floor is wide, not a point.
  const bedBuffer = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) fillBrownNoise2(bedBuffer, ch, 3.5);
  const bed = ctx.createBufferSource();
  bed.buffer = bedBuffer;
  bed.loop = true;

  const bedLowpass = ctx.createBiquadFilter();
  bedLowpass.type = 'lowpass';
  bedLowpass.frequency.value = 480;

  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.05;
  bed.connect(bedLowpass).connect(bedGain).connect(master);

  // --- Wave + bubble source noise ------------------------------------------
  // One looped noise buffer feeds every wave; per-wave filters/gains shape each
  // one so they never sound identical.
  const waveBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
  fillBrownNoise(waveBuffer, 6.5);
  const waveSource = ctx.createBufferSource();
  waveSource.buffer = waveBuffer;
  waveSource.loop = true;
  // DC-blocking high-pass: brown noise carries sub-bass/DC that, when a wave's
  // gain envelope snaps shut, thumps audibly through the (DC-passing) lowpass.
  // Strip everything below ~35 Hz so wave ends fade silently.
  const waveDcBlock = ctx.createBiquadFilter();
  waveDcBlock.type = 'highpass';
  waveDcBlock.frequency.value = 35;
  const waveBus = ctx.createGain();
  waveBus.gain.value = 1;
  waveSource.connect(waveDcBlock).connect(waveBus);

  // Bubble bus: gentle lowpass so plinks sit underwater-soft, kept quiet.
  const bubbleLowpass = ctx.createBiquadFilter();
  bubbleLowpass.type = 'lowpass';
  bubbleLowpass.frequency.value = 1400;
  const bubbleBus = ctx.createGain();
  bubbleBus.gain.value = 0.5;
  bubbleLowpass.connect(bubbleBus).connect(master);

  bed.start();
  waveSource.start();

  /**
   * Schedules one breaking wave, panned somewhere in the stereo field.
   * @param {number} now  ctx time to begin the swell
   * @param {number} peak  peak gain of this wave (varies per wave)
   * @param {number} length  total seconds from first swell to silence
   */
  function scheduleWave(now, peak, length) {
    const crest = now + length * 0.42; // moment the wave breaks
    const end = now + length;

    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(rand(-0.7, 0.7), now);
    pan.connect(master);

    // BODY: low/mid wash. Lowpass sweeps up toward the break, then dulls.
    const bodyLp = ctx.createBiquadFilter();
    bodyLp.type = 'lowpass';
    bodyLp.frequency.setValueAtTime(350, now);
    bodyLp.frequency.exponentialRampToValueAtTime(1500, crest);
    bodyLp.frequency.exponentialRampToValueAtTime(420, end);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.0001, now);
    bodyGain.gain.exponentialRampToValueAtTime(peak, crest);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, end);
    waveBus.connect(bodyLp).connect(bodyGain).connect(pan);

    // FIZZ: high foam hiss. Peaks just AFTER the break and lingers — this is
    // the "sssss" of foam that outlasts the crash.
    const fizzHp = ctx.createBiquadFilter();
    fizzHp.type = 'highpass';
    fizzHp.frequency.value = 1800;
    const fizzGain = ctx.createGain();
    const fizzPeakT = crest + length * 0.08;
    fizzGain.gain.setValueAtTime(0.0001, now);
    fizzGain.gain.exponentialRampToValueAtTime(peak * 0.5, fizzPeakT);
    fizzGain.gain.exponentialRampToValueAtTime(0.0001, end + length * 0.1);
    waveBus.connect(fizzHp).connect(fizzGain).connect(pan);

    // CRACKLE: sparse foam bursts scattered through the recede. A highpassed
    // tap whose gain gets short random spikes — the rice-krispie of wet sand.
    const crackHp = ctx.createBiquadFilter();
    crackHp.type = 'highpass';
    crackHp.frequency.value = 3200;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.0001, now);
    waveBus.connect(crackHp).connect(crackGain).connect(pan);
    const bursts = 14 + Math.floor(Math.random() * 14);
    for (let i = 0; i < bursts; i++) {
      const t = rand(crest, end);
      const amp = peak * rand(0.05, 0.22);
      crackGain.gain.setValueAtTime(0.0001, t);
      crackGain.gain.linearRampToValueAtTime(amp, t + 0.006);
      crackGain.gain.exponentialRampToValueAtTime(0.0001, t + rand(0.03, 0.09));
    }

    // Tear down this wave's nodes once everything has receded.
    later(() => {
      try {
        bodyGain.disconnect();
        bodyLp.disconnect();
        fizzGain.disconnect();
        fizzHp.disconnect();
        crackGain.disconnect();
        crackHp.disconnect();
        pan.disconnect();
      } catch {
        // already gone
      }
    }, (length * 1.2 + 0.5) * 1000);
  }

  /**
   * Schedules one water bubble: a sine that snaps on and sweeps up in pitch
   * over a few tens of ms, then decays — the classic "plink/bloop" of a bubble
   * rising and popping. Pitch, level and position vary so no two are alike.
   * @param {number} now  ctx time to fire
   */
  function scheduleBubble(now) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const base = rand(260, 900);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 2, now + 0.06);

    const g = ctx.createGain();
    const peak = rand(0.05, 0.1);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peak, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(rand(-0.5, 0.5), now);

    osc.connect(g).connect(pan).connect(bubbleLowpass);
    osc.start(now);
    osc.stop(now + 0.22);
    osc.onended = () => {
      try {
        g.disconnect();
        pan.disconnect();
      } catch {
        // already gone
      }
    };
  }

  // Schedule waves with irregular timing so the rhythm feels natural, not
  // metronomic. Waves overlap a little (the next starts before the previous
  // foam is gone), like a real shoreline. Occasional bigger "set" waves.
  function loopWaves() {
    if (stopped) return;
    const big = Math.random() < 0.25;
    const length = big ? rand(11, 14) : rand(7, 11);
    const peak = big ? rand(0.16, 0.22) : rand(0.09, 0.15);
    scheduleWave(ctx.currentTime + 0.05, peak, length);
    const gap = length * rand(0.5, 0.78);
    later(loopWaves, gap * 1000);
  }
  loopWaves();

  // Bubbles arrive sporadically, sometimes alone and sometimes in a short
  // cluster of 2–4 (a little stream rising), then a longer quiet gap. Sparse
  // on purpose — an accent, not a texture.
  function loopBubbles() {
    if (stopped) return;
    const cluster = 1 + Math.floor(Math.random() * 4);
    for (let i = 0; i < cluster; i++) {
      scheduleBubble(ctx.currentTime + 0.05 + i * rand(0.05, 0.17));
    }
    later(loopBubbles, rand(2.5, 8.5) * 1000);
  }
  later(loopBubbles, 1500);

  return () => {
    stopped = true;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      bed.stop(ctx.currentTime + 0.6);
      waveSource.stop(ctx.currentTime + 0.6);
    } catch {
      // already stopped
    }
  };
}

/**
 * Full-screen underwater meditation scene: drifting caustic light, rising
 * bubbles, a breathing orb that guides a slow 4-4-6 breath, and an optional
 * synthesized soundscape of breaking waves. Elapsed time counts UP (no
 * countdown — CLAUDE.md rule 6).
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

  // A small school of fish drifting across at calm, varied speeds. Even-indexed
  // fish swim left→right (facing right), odd ones the reverse, so the scene
  // never feels like a one-way parade. Stable across renders.
  const fish = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const rightward = i % 2 === 0;
        return {
          id: i,
          emoji: i % 3 === 0 ? '🐠' : '🐟',
          top: 18 + ((i * 23 + 9) % 60), // vertical lane, %
          size: 22 + ((i * 11) % 18), // px
          duration: 26 + ((i * 9) % 22), // 26–48s, unhurried
          delay: (i * 6.5) % 24,
          bob: ((i % 3) - 1) * 14, // px of vertical drift mid-swim
          opacity: 0.45 + ((i * 17) % 30) / 100,
          rightward,
        };
      }),
    []
  );

  // Seaweed anchored along the seabed, each blade swaying on its own slow cycle.
  const seaweed = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const height = 110 + ((i * 37) % 150); // px
        const width = 16 + ((i * 5) % 14);
        const curve = i % 2 === 0 ? 1 : -1; // which way the frond leans
        // A tapered, S-curved leaf in a (width × height) box, base centred at
        // the bottom and tip near the top — far more organic than a rectangle.
        const cx = width / 2;
        const lean = curve * width * 0.35;
        const path = [
          `M ${cx} ${height}`,
          `C ${cx + curve * width * 0.5} ${height * 0.66},`,
          `  ${cx + lean} ${height * 0.3},`,
          `  ${cx + lean * 0.4} 2`,
          `C ${cx + lean} ${height * 0.32},`,
          `  ${cx - curve * width * 0.2} ${height * 0.68},`,
          `  ${cx} ${height}`,
          'Z',
        ].join(' ');
        return {
          id: i,
          left: Math.round((i * 37 + 4) % 96),
          height,
          width,
          path,
          duration: 7 + ((i * 7) % 7), // 7–13s sway
          delay: (i * 1.3) % 6,
          tilt: 4 + ((i * 3) % 6), // degrees of base sway
        };
      }),
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

      {/* Seaweed swaying along the seabed */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
        {seaweed.map((w) => (
          <svg
            key={w.id}
            className="meditation-seaweed absolute bottom-0 origin-bottom"
            width={w.width}
            height={w.height}
            viewBox={`0 0 ${w.width} ${w.height}`}
            style={{
              left: `${w.left}%`,
              // @ts-ignore — CSS custom property
              '--seaweed-tilt': `${w.tilt}deg`,
              animation: `seaweed-sway ${w.duration}s ease-in-out ${w.delay}s infinite`,
            }}
          >
            <defs>
              <linearGradient id={`seaweed-grad-${w.id}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="rgb(6 78 59)" stopOpacity="0.8" />
                <stop offset="55%" stopColor="rgb(15 118 110)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="rgb(45 212 191)" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <path d={w.path} fill={`url(#seaweed-grad-${w.id})`} />
          </svg>
        ))}
      </div>

      {/* Drifting fish */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {fish.map((f) => (
          <span
            key={f.id}
            className="meditation-fish absolute left-0 will-change-transform"
            style={{
              top: `${f.top}%`,
              fontSize: `${f.size}px`,
              // @ts-ignore — CSS custom properties
              '--fish-bob': `${f.bob}px`,
              '--fish-opacity': f.opacity,
              // `reverse` plays the swim keyframe backwards (124vw → -12vw), so
              // leftward fish actually travel right→left, not just face that way.
              animation: `fish-swim ${f.duration}s linear ${f.delay}s infinite ${
                f.rightward ? 'normal' : 'reverse'
              }`,
            }}
          >
            {/* 🐟/🐠 face left by default; flip only the rightward swimmers. */}
            <span
              className="inline-block"
              style={{ transform: f.rightward ? 'scaleX(-1)' : 'none' }}
            >
              {f.emoji}
            </span>
          </span>
        ))}
      </div>

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
