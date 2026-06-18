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
 * The random walk has no inherent amplitude ceiling, so after generating it we
 * normalize down (never up) whenever its peak exceeds `peakLimit` — this bounds
 * clipping deterministically regardless of buffer length or gain, instead of
 * relying on a low-enough gain to make an excursion merely unlikely over a
 * long, many-times-looped buffer.
 *
 * @param {AudioBuffer} buffer
 * @param {number} channel
 * @param {number} [gain]
 * @param {number} [peakLimit]
 */
function fillBrownNoise2(buffer, channel, gain = 3.5, peakLimit = 0.9) {
  const data = buffer.getChannelData(channel);
  const n = data.length;
  const fade = Math.min(Math.floor(buffer.sampleRate * 0.05), Math.floor(n / 4));
  const tmp = new Float32Array(n + fade);
  let last = 0;
  let peak = 0;
  for (let i = 0; i < tmp.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    tmp[i] = last * gain;
    if (Math.abs(tmp[i]) > peak) peak = Math.abs(tmp[i]);
  }
  if (peak > peakLimit) {
    const scale = peakLimit / peak;
    for (let i = 0; i < tmp.length; i++) tmp[i] *= scale;
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
 * Builds the two looped noise buffers startSeaSound plays. Split out so it can
 * run during idle time after mount (see the effect in MeditationScene) instead
 * of synchronously inside the click handler that starts playback — generating
 * ~3.6M samples via fillBrownNoise/fillBrownNoise2's per-sample loops is cheap
 * in isolation but is the dominant cost when run on the user's click gesture.
 *
 * @param {AudioContext} ctx
 * @returns {{ bedBuffer: AudioBuffer, waveBuffer: AudioBuffer }}
 */
function buildSeaBuffers(ctx) {
  // The bed buffer is long and deliberately not a simple multiple of the wave
  // buffer's length — a short loop occasionally contains a random energy peak
  // that, once looped, recurs at an exactly periodic interval and reads as a
  // "bump" even though the seam itself is click-free. A long, coprime-ish
  // length pushes any such cross-buffer recurrence far enough apart (and keeps
  // the two loops from ever restarting in sync) that it stops being
  // perceptible as periodic. fillBrownNoise2 also bounds each buffer's own
  // peak amplitude, so a recurring peak inside a single buffer is loud at
  // worst, never a hard clip.
  const bedBuffer = ctx.createBuffer(2, ctx.sampleRate * 23, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) fillBrownNoise2(bedBuffer, ch, 3.5);

  // 29s, not a multiple of bedBuffer's 23s — see comment above.
  const waveBuffer = ctx.createBuffer(1, ctx.sampleRate * 29, ctx.sampleRate);
  fillBrownNoise(waveBuffer, 3.2);

  return { bedBuffer, waveBuffer };
}

/**
 * Builds and starts a self-contained "calm sea" soundscape using the Web Audio
 * API — no audio file needed. Several layers, plus stereo width and a touch of
 * reverb, make it read as real surf rather than a steady drone:
 *
 *   1. A quiet STEREO brown-noise bed (independent L/R) — the distant
 *      ocean/wind floor that surrounds the listener.
 *   2. Discrete WAVE EVENTS at irregular intervals, each panned somewhere in
 *      the field. A wave is itself two bands: a low BODY that swells and
 *      breaks, and a high FIZZ that peaks just *after* the break and lingers
 *      (the sound of foam). (A third CRACKLE band of short foam-burst spikes
 *      was removed — its rapid retriggering could land two bursts close
 *      enough together that the gain automation jumped instead of decaying,
 *      producing an audible click that recurred on every wave.)
 *
 * Everything runs into a light convolution reverb for open-air space. The
 * soundscape is intentionally all broadband noise — no tonal/sine accents — so
 * it reads as continuous surf with no periodic "plink" punctuating the calm.
 *
 * @param {AudioContext} ctx
 * @param {{ bedBuffer: AudioBuffer, waveBuffer: AudioBuffer }} buffers  from {@link buildSeaBuffers}
 * @returns {() => void} stop function that tears the graph down
 */
function startSeaSound(ctx, buffers) {
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

  // Gentle safety compressor on the final bus. Soft knee + slow release so that
  // if overlapping waves push the level up it eases the gain down smoothly
  // rather than clamping hard — a hard clamp-then-release is itself an audible
  // thump (limiter "pumping"). With the lower levels below it should barely
  // engage; it's only a backstop.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -10;
  limiter.knee.value = 12;
  limiter.ratio.value = 4;
  limiter.attack.value = 0.02;
  limiter.release.value = 0.4;
  limiter.connect(ctx.destination);

  master.connect(dry).connect(limiter);
  master.connect(convolver).connect(wet).connect(limiter);

  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.11, ctx.currentTime + 2.5);

  // --- Layer 1: the constant distant-ocean bed (stereo) --------------------
  // Two independent channels of brown noise so the floor is wide, not a point.
  const { bedBuffer, waveBuffer } = buffers;
  const bed = ctx.createBufferSource();
  bed.buffer = bedBuffer;
  bed.loop = true;

  // Block sub-bass on the bed too, so any residual low-frequency wander can't
  // thump under the surf.
  const bedHighpass = ctx.createBiquadFilter();
  bedHighpass.type = 'highpass';
  bedHighpass.frequency.value = 30;
  const bedLowpass = ctx.createBiquadFilter();
  bedLowpass.type = 'lowpass';
  bedLowpass.frequency.value = 480;

  const bedGain = ctx.createGain();
  bedGain.gain.value = 0.05;
  bed.connect(bedHighpass).connect(bedLowpass).connect(bedGain).connect(master);

  // --- Wave + bubble source noise ------------------------------------------
  // One looped noise buffer feeds every wave; per-wave filters/gains shape each
  // one so they never sound identical. Source gain (3.2, set in
  // buildSeaBuffers) is kept low and amplitude-normalized so it never clips;
  // loudness is made up downstream on waveBus instead, after the per-wave
  // envelopes/filters have shaped it.
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
  // Compensates the lowered source gain above (6.5 → 3.2) so overall wave
  // loudness is unchanged; safe to boost here since it's after the DC-block
  // and ahead of further per-wave filtering, not the raw unfiltered buffer.
  waveBus.gain.value = 2;
  waveSource.connect(waveDcBlock).connect(waveBus);

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
    // GainNode defaults to 1.0 (full volume), not 0 — setting .value directly
    // here (not just scheduling setValueAtTime for later) matters because the
    // node is connected and already passing audio at that default value for
    // the gap between creation and `now`. Without this, every wave opened
    // with a brief full-volume burst of noise: the periodic crackle/bump.
    bodyGain.gain.value = 0.0001;
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
    fizzGain.gain.value = 0.0001; // see bodyGain comment above
    fizzGain.gain.setValueAtTime(0.0001, now);
    fizzGain.gain.exponentialRampToValueAtTime(peak * 0.5, fizzPeakT);
    fizzGain.gain.exponentialRampToValueAtTime(0.0001, end + length * 0.1);
    waveBus.connect(fizzHp).connect(fizzGain).connect(pan);

    // Tear down this wave's nodes once everything has receded.
    later(() => {
      try {
        bodyGain.disconnect();
        bodyLp.disconnect();
        fizzGain.disconnect();
        fizzHp.disconnect();
        pan.disconnect();
      } catch {
        // already gone
      }
    }, (length * 1.2 + 0.5) * 1000);
  }

  // Schedule waves with irregular timing so the rhythm feels natural, not
  // metronomic. Waves overlap a little (the next starts before the previous
  // foam is gone), like a real shoreline. Occasional bigger "set" waves.
  function loopWaves() {
    if (stopped) return;
    const big = Math.random() < 0.25;
    const length = big ? rand(11, 14) : rand(7, 11);
    // Kept modest so overlapping waves don't stack into the limiter.
    const peak = big ? rand(0.12, 0.16) : rand(0.08, 0.11);
    scheduleWave(ctx.currentTime + 0.05, peak, length);
    const gap = length * rand(0.5, 0.78);
    later(loopWaves, gap * 1000);
  }
  loopWaves();

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
 * Internal render resolution as a fraction of the canvas's CSS size. Caustic
 * light is inherently soft/blurry, so rendering at quarter-res and letting
 * the browser upscale costs a fraction of the fill-rate while looking the
 * same — and unlike the DOM version (two full-screen `mix-blend-soft-light`
 * layers), this never asks the compositor to re-blend the whole viewport.
 */
const CAUSTICS_SCALE = 0.5;

/**
 * @typedef {{ period: number, dir: 1 | -1, radiusFactor: number, color: string }} CausticSheet
 */

/**
 * Per-sheet config for the two overlaid caustic light layers. Each entry picks
 * a distinct period/direction/radius/color so the sheets read as drifting
 * apart rather than in lockstep.
 * @type {Array<CausticSheet>}
 */
const CAUSTIC_SHEETS = [
  { period: 18, dir: 1, radiusFactor: 0.5, color: '255,255,255' },
  { period: 26, dir: -1, radiusFactor: 0.42, color: '173,255,247' },
];

/**
 * Paints one slow-drifting caustic light sheet using an additive radial
 * gradient. The two sheets in CAUSTIC_SHEETS overlaid read as shifting
 * underwater light, replacing what used to be two full-screen
 * `mix-blend-soft-light` divs — that blend mode forces the browser to
 * re-composite the entire viewport every frame, which is the likely cause of
 * the animation reading smooth only while DevTools is open (it changes the
 * compositing path) and of the slow first paint on arrival. A canvas's cost
 * is bounded by its own pixels, not the page, so it stays smooth either way
 * and paints on the very first frame.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width   canvas pixel width (already includes CAUSTICS_SCALE)
 * @param {number} height  canvas pixel height
 * @param {number} t       seconds elapsed
 * @param {CausticSheet} sheet
 */
function drawCausticSheet(ctx, width, height, t, sheet) {
  const angle = (sheet.dir * t * 2 * Math.PI) / sheet.period;
  const cx = width * (0.5 + 0.24 * Math.cos(angle));
  const cy = height * (0.5 + 0.24 * Math.sin(angle * 0.8));
  const radius = Math.max(width, height) * sheet.radiusFactor;
  const alpha = 0.22 + 0.1 * Math.sin(angle * 1.3);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grad.addColorStop(0, `rgba(${sheet.color},${alpha})`);
  grad.addColorStop(1, `rgba(${sheet.color},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
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
  const seaBuffersRef = useRef(
    /** @type {{ bedBuffer: AudioBuffer, waveBuffer: AudioBuffer }|null} */ (null)
  );
  const causticsCanvasRef = useRef(/** @type {HTMLCanvasElement|null} */ (null));

  const phase = BREATH_PHASES[phaseIndex];

  // Drive the caustic light canvas with requestAnimationFrame instead of a
  // CSS animation. It paints on the very first frame (no waiting on the rest
  // of the page's layout/paint) and its cost is bounded by the canvas's own
  // pixels rather than the whole viewport, so it stays smooth regardless of
  // what else is happening on the compositor.
  useEffect(() => {
    const canvas = causticsCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduceMotion = motionQuery.matches;
    /** @type {number | null} */
    let raf = null;

    function paint(t) {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const sheet of CAUSTIC_SHEETS) drawCausticSheet(ctx, width, height, t, sheet);
    }

    function startLoop() {
      const start = performance.now();
      raf = requestAnimationFrame(function tick(now) {
        paint((now - start) / 1000);
        raf = requestAnimationFrame(tick);
      });
    }

    function stopLoop() {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    // Resizing reallocates (and so clears) the canvas's pixel buffer, so a
    // reduced-motion repaint has to be re-triggered here explicitly — the rAF
    // loop that would otherwise cover it is intentionally not running.
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(canvas.clientWidth * CAUSTICS_SCALE * dpr);
      canvas.height = Math.round(canvas.clientHeight * CAUSTICS_SCALE * dpr);
      if (reduceMotion) paint(0);
    }
    resize();
    window.addEventListener('resize', resize);

    // Live-reacts to the OS/browser setting changing while this scene stays
    // mounted, matching how the CSS media query it replaced used to behave.
    function handleMotionChange(e) {
      reduceMotion = e.matches;
      if (reduceMotion) {
        stopLoop();
        paint(0);
      } else {
        startLoop();
      }
    }
    motionQuery.addEventListener('change', handleMotionChange);

    if (reduceMotion) {
      paint(0);
    } else {
      startLoop();
    }

    return () => {
      stopLoop();
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

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

  // Pre-build the noise buffers startSeaSound needs during idle time after
  // mount, rather than synchronously inside toggleSound's click handler — the
  // sample-generation loops are the dominant cost of starting playback, and
  // a user clicking "Turn on sea sounds" expects audio to start immediately.
  // Constructing the AudioContext here (without resuming it) doesn't violate
  // the autoplay policy; only starting playback requires the user gesture.
  useEffect(() => {
    const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
    if (!Ctx) return undefined;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;

    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 0));
    const cancelIdle = window.cancelIdleCallback || clearTimeout;
    const id = idle(() => {
      seaBuffersRef.current = buildSeaBuffers(ctx);
    });

    return () => cancelIdle(id);
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
      const buffers = seaBuffersRef.current ?? buildSeaBuffers(ctx);
      stopSoundRef.current = startSeaSound(ctx, buffers);
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

  // The decorative layers don't depend on elapsed/phase, so we memoize the whole
  // subtree. Without this, the once-a-second `elapsed` tick re-renders every
  // fish/seaweed/bubble node and re-applies its inline animation style mid-flight
  // — which shows up as a small but visible stutter. With a stable element
  // reference React skips reconciling these entirely on timer/phase re-renders.
  const seaLife = useMemo(
    () => (
      <>
        {/* Caustic light sheets — canvas-driven, see the effect above */}
        <canvas
          ref={causticsCanvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />

        {/* Seaweed swaying along the seabed */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
          {seaweed.map((w) => (
            <svg
              key={w.id}
              className="meditation-seaweed absolute bottom-0 origin-bottom will-change-transform"
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
              className="meditation-bubble absolute bottom-0 rounded-full bg-white/30 ring-1 ring-white/40 will-change-transform"
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
      </>
    ),
    [bubbles, fish, seaweed]
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-cyan-700 via-teal-800 to-slate-950 text-white">
      {seaLife}

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
      <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center gap-10 px-6">
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
          aria-label={soundOn ? 'Turn off sea sounds' : 'Turn on sea sounds'}
          className="pointer-events-auto rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/25 transition-colors"
        >
          <span aria-hidden="true">{soundOn ? '🔊' : '🔇'}</span> {soundOn ? 'Sea sounds on' : 'Turn on sea sounds'}
        </button>
      </div>
    </div>
  );
}
