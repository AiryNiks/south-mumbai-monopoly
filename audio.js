/**
 * audio.js — AudioManager: a self-contained Web Audio sound-design engine.
 *
 * Every sound is SYNTHESISED procedurally (no external .mp3/.wav files), so the
 * game stays a single static deploy with zero broken-asset risk and works offline.
 *
 * Design goals:
 *   • Premium, balanced, never overbearing — a gentle master gain + per-cue mix.
 *   • Tactile, physical timbres (wood, paper, metal, vault) built from oscillators
 *     and filtered noise rather than cheap square-wave beeps.
 *   • Lazy AudioContext — created/resumed only after a real user gesture so we
 *     respect browser autoplay policy.
 *   • Fully guarded — if Web Audio is unavailable (older browsers / headless test
 *     runners) every call becomes a silent no-op instead of throwing.
 *
 * Public API:
 *   AUDIO.unlock()            — call inside a user gesture to create/resume context
 *   AUDIO.play(name, opts)    — play a named cue (see CUES below)
 *   AUDIO.setMuted(bool)      — mute/unmute (persisted to localStorage)
 *   AUDIO.toggleMuted()       — flip + return new muted state
 *   AUDIO.isMuted()           — current muted state
 *   AUDIO.haptic(pattern)     — navigator.vibrate() wrapper (guarded)
 *   AUDIO.tactile(el, opts)   — bind ATM-style click + haptic to a button
 *   AUDIO.errorFeedback()     — error sound + double-tap haptic (one call)
 */

const AUDIO = (() => {

  const STORAGE_KEY = 'smbg-muted';

  let ctx        = null;     // AudioContext (lazy)
  let masterGain = null;     // master volume node
  let muted      = false;    // user mute state
  const MASTER_VOLUME = 0.5; // keep things gentle — "not overbearing"

  // Restore persisted mute preference.
  try { muted = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}

  // ── Context lifecycle ───────────────────────────────────────────────────────

  function supported() {
    return typeof window !== 'undefined' &&
           (window.AudioContext || window.webkitAudioContext);
  }

  /** Create the context lazily; resume it if a previous gesture suspended it. */
  function unlock() {
    if (!supported()) return;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      try {
        ctx = new AC();
        masterGain = ctx.createGain();
        masterGain.gain.value = muted ? 0 : MASTER_VOLUME;
        masterGain.connect(ctx.destination);
      } catch (e) { ctx = null; return; }
    }
    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().catch(() => {});
    }
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  // ── Low-level synthesis helpers ──────────────────────────────────────────────

  /** A short noise buffer (white noise) — reused for percussive textures. */
  let _noiseBuf = null;
  function noiseBuffer() {
    if (_noiseBuf) return _noiseBuf;
    const len = (ctx.sampleRate * 1.0) | 0;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    _noiseBuf = buf;
    return buf;
  }

  /** Play a filtered noise burst (used for wood, paper, clatter, vault textures). */
  function noiseBurst({ t = 0, dur = 0.12, type = 'bandpass', freq = 1200, q = 1,
                        gain = 0.3, attack = 0.002, decay = null } = {}) {
    if (!ctx) return;
    const start = now() + t;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = ctx.createGain();
    const d = decay == null ? dur : decay;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + attack + d);
    src.connect(filt); filt.connect(g); g.connect(masterGain);
    src.start(start);
    src.stop(start + attack + d + 0.02);
  }

  /** Play a single oscillator "ping/thunk" with an envelope. */
  function tone({ t = 0, freq = 440, endFreq = null, type = 'sine', dur = 0.15,
                  gain = 0.25, attack = 0.004, curve = 'exp' } = {}) {
    if (!ctx) return;
    const start = now() + t;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + attack);
    if (curve === 'exp') {
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    } else {
      g.gain.linearRampToValueAtTime(0.0001, start + dur);
    }
    osc.connect(g); g.connect(masterGain);
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  // ── Named cues ───────────────────────────────────────────────────────────────
  // Each cue is a function that schedules its layers relative to "now".

  const CUES = {

    // The clatter of physical dice tumbling on a smooth surface — a few quick,
    // pitched wooden taps over a soft noise wash.
    dice() {
      const taps = 7;
      for (let i = 0; i < taps; i++) {
        const t = i * (0.045 + Math.random() * 0.03);
        noiseBurst({ t, dur: 0.04, type: 'bandpass', freq: 900 + Math.random() * 1400,
                     q: 2.5, gain: 0.16 + Math.random() * 0.08 });
        tone({ t, freq: 320 + Math.random() * 380, endFreq: 160, type: 'triangle',
               dur: 0.05, gain: 0.06 });
      }
    },

    // A distinct, dry "wooden tick" as a token lands on a tile.
    tick() {
      tone({ freq: 760, endFreq: 360, type: 'triangle', dur: 0.06, gain: 0.16 });
      noiseBurst({ dur: 0.03, type: 'highpass', freq: 2600, gain: 0.08 });
    },

    // Buying a property — a crisp paper-stamp / signing "thunk".
    buy() {
      noiseBurst({ dur: 0.05, type: 'lowpass', freq: 1800, gain: 0.34, attack: 0.001 });
      tone({ t: 0.005, freq: 180, endFreq: 90, type: 'sine', dur: 0.12, gain: 0.22 });
      noiseBurst({ t: 0.01, dur: 0.08, type: 'bandpass', freq: 3200, q: 1.2, gain: 0.07 });
    },

    // Building / upgrading — a short, satisfying wooden block placement (double tap).
    build() {
      tone({ freq: 520, endFreq: 300, type: 'triangle', dur: 0.07, gain: 0.18 });
      tone({ t: 0.085, freq: 440, endFreq: 240, type: 'triangle', dur: 0.09, gain: 0.2 });
      noiseBurst({ t: 0.085, dur: 0.04, type: 'bandpass', freq: 1400, q: 1.5, gain: 0.1 });
    },

    // Rent / income — a premium coin-chink + mechanical cash register feel.
    cash() {
      tone({ freq: 1180, type: 'sine', dur: 0.16, gain: 0.14 });
      tone({ t: 0.05, freq: 1560, type: 'sine', dur: 0.18, gain: 0.12 });
      tone({ t: 0.09, freq: 1980, type: 'sine', dur: 0.2, gain: 0.09 });
      noiseBurst({ t: 0, dur: 0.05, type: 'highpass', freq: 5000, gain: 0.05 });
    },

    // Taking a loan / mortgage — a heavy vault + cash-register "cha-ching".
    vault() {
      tone({ freq: 90, endFreq: 60, type: 'sine', dur: 0.4, gain: 0.3 });        // vault body
      noiseBurst({ t: 0.02, dur: 0.18, type: 'lowpass', freq: 700, gain: 0.22 }); // heavy thud
      tone({ t: 0.18, freq: 1320, type: 'sine', dur: 0.18, gain: 0.12 });         // ching 1
      tone({ t: 0.24, freq: 1760, type: 'sine', dur: 0.22, gain: 0.1 });          // ching 2
    },

    // Auction gavel strike — a sharp woody knock with a short resonant tail.
    gavel() {
      noiseBurst({ dur: 0.04, type: 'bandpass', freq: 1100, q: 1.8, gain: 0.34, attack: 0.001 });
      tone({ freq: 260, endFreq: 120, type: 'triangle', dur: 0.16, gain: 0.26 });
      tone({ t: 0.005, freq: 150, endFreq: 70, type: 'sine', dur: 0.2, gain: 0.18 });
    },

    // "Sold!" — a double gavel strike, a touch brighter.
    sold() {
      CUES.gavel();
      setTimeout(() => { if (!muted) CUES.gavel(); }, 130);
    },

    // ATM / banking button — a crisp metallic membrane switch (not a plastic click).
    atm() {
      noiseBurst({ dur: 0.018, type: 'highpass', freq: 4200, gain: 0.16, attack: 0.0005 });
      tone({ freq: 2400, endFreq: 1500, type: 'square', dur: 0.025, gain: 0.05 });
      tone({ t: 0.012, freq: 900, endFreq: 600, type: 'sine', dur: 0.04, gain: 0.08 });
    },

    // Error / denied — a soft low double-buzz (paired with double-tap haptic).
    error() {
      tone({ freq: 240, endFreq: 180, type: 'sawtooth', dur: 0.1, gain: 0.12 });
      tone({ t: 0.13, freq: 200, endFreq: 140, type: 'sawtooth', dur: 0.13, gain: 0.12 });
    },

    // Repo-rate update chime — a gentle two-note institutional bell.
    chime() {
      tone({ freq: 880, type: 'sine', dur: 0.5, gain: 0.12 });
      tone({ t: 0.16, freq: 1320, type: 'sine', dur: 0.6, gain: 0.1 });
    },
  };

  // ── Public play ──────────────────────────────────────────────────────────────

  function play(name) {
    if (muted) return;
    if (!ctx) unlock();          // first cue may also be the unlocking gesture
    if (!ctx || ctx.state !== 'running') return;
    const cue = CUES[name];
    if (!cue) return;
    try { cue(); } catch (e) { /* never let audio break gameplay */ }
  }

  // ── Mute control ─────────────────────────────────────────────────────────────

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(STORAGE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, now(), 0.02);
    }
    return muted;
  }
  function toggleMuted() { return setMuted(!muted); }
  function isMuted()     { return muted; }

  // ── Haptics ──────────────────────────────────────────────────────────────────

  function haptic(pattern) {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  /**
   * Bind tactile feedback to a button: a sharp haptic + ATM click on press.
   * Use for banking / RBI controls. Safe to call once per element.
   */
  function tactile(el, { sound = 'atm', vibrate = 15 } = {}) {
    if (!el || el._tactileBound) return;
    el._tactileBound = true;
    const onPress = () => {
      haptic(vibrate);          // brief, sharp pulse = physical button resistance
      play(sound);
    };
    el.addEventListener('mousedown', onPress);
    el.addEventListener('touchstart', onPress, { passive: true });
  }

  /** Error state: distinct double-tap vibration + subtle error sound. */
  function errorFeedback() {
    haptic([20, 50, 20]);
    play('error');
  }

  // ── Auto-unlock on the first user interaction anywhere ───────────────────────
  if (typeof window !== 'undefined' && window.addEventListener) {
    const kick = () => { unlock(); };
    window.addEventListener('pointerdown', kick, { once: false, passive: true });
    window.addEventListener('keydown', kick, { once: false });
  }

  return {
    unlock, play, setMuted, toggleMuted, isMuted,
    haptic, tactile, errorFeedback,
  };
})();
