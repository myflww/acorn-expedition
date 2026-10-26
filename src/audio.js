// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

const MAX_VOICES = 64;

export const AUDIO_MATERIAL = Object.freeze({
  WOOD: "wood",
  GLASS: "glass",
  STONE: "stone",
});

export const AUDIO_MUSIC_THEME = Object.freeze({
  EXPEDITION: "expedition",
  MYSTIC: "mystic",
  STRONGHOLD: "stronghold",
});

const MATERIAL_ALIASES = Object.freeze({
  wood: AUDIO_MATERIAL.WOOD,
  timber: AUDIO_MATERIAL.WOOD,
  plank: AUDIO_MATERIAL.WOOD,
  "canvas-screen": AUDIO_MATERIAL.WOOD,
  "resin-timber": AUDIO_MATERIAL.WOOD,
  glass: AUDIO_MATERIAL.GLASS,
  ice: AUDIO_MATERIAL.GLASS,
  crystal: AUDIO_MATERIAL.GLASS,
  "resin-glass": AUDIO_MATERIAL.GLASS,
  stone: AUDIO_MATERIAL.STONE,
  rock: AUDIO_MATERIAL.STONE,
  masonry: AUDIO_MATERIAL.STONE,
  "packed-earth": AUDIO_MATERIAL.STONE,
  "leaf-iron-plate": AUDIO_MATERIAL.STONE,
});

// Structure movement needs more detail than the three broad impact families.
// Each authored construction keeps an individual profile while legacy callers
// can continue using wood/glass/stone through playMaterialHit().
export const STRUCTURE_SOUND_PROFILES = Object.freeze({
  wood: Object.freeze({ family: "wood", tone: 118, cutoff: 1200 }),
  "resin-timber": Object.freeze({ family: "resin", tone: 92, cutoff: 820 }),
  "canvas-screen": Object.freeze({ family: "cloth", tone: 310, cutoff: 1500 }),
  ice: Object.freeze({ family: "ice", tone: 720, cutoff: 2600 }),
  glass: Object.freeze({ family: "ice", tone: 720, cutoff: 2600 }),
  crystal: Object.freeze({ family: "ice", tone: 720, cutoff: 2600 }),
  "resin-glass": Object.freeze({ family: "resin-glass", tone: 540, cutoff: 1900 }),
  stone: Object.freeze({ family: "stone", tone: 68, cutoff: 520 }),
  rock: Object.freeze({ family: "stone", tone: 68, cutoff: 520 }),
  masonry: Object.freeze({ family: "stone", tone: 68, cutoff: 520 }),
  "packed-earth": Object.freeze({ family: "earth", tone: 82, cutoff: 420 }),
  "leaf-iron-plate": Object.freeze({ family: "plate", tone: 155, cutoff: 1450 }),
});

const STRUCTURE_EVENT_GAPS = Object.freeze({
  slide: 0.11,
  impact: 0.055,
  drop: 0.085,
  break: 0.07,
});

const MUSIC_PRESETS = Object.freeze({
  [AUDIO_MUSIC_THEME.EXPEDITION]: Object.freeze({
    bpm: 92,
    root: 196,
    progression: Object.freeze([[0, 4, 7], [-2, 2, 5], [-5, 0, 4], [-3, 2, 5]]),
    melody: Object.freeze([7, 9, 11, 9, 7, 4, 2, null, 4, 7, 9, 7, 5, 4, 2, null]),
  }),
  [AUDIO_MUSIC_THEME.MYSTIC]: Object.freeze({
    bpm: 76,
    root: 174.61,
    progression: Object.freeze([[0, 3, 7], [-2, 3, 5], [-5, 0, 3], [-2, 2, 7]]),
    melody: Object.freeze([7, null, 10, 7, 5, null, 3, 2, 0, null, 3, 5, 7, 5, 3, null]),
  }),
  [AUDIO_MUSIC_THEME.STRONGHOLD]: Object.freeze({
    bpm: 84,
    root: 146.83,
    progression: Object.freeze([[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 4]]),
    melody: Object.freeze([0, 0, 3, 5, 7, 5, 3, 0, -2, -2, 2, 3, 5, 3, 2, null]),
  }),
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Small, dependency-free Web Audio synthesizer for the game's semantic sounds.
 * Call unlock() from a pointer or keyboard handler before playing any sounds.
 */
export class SoundFX {
  constructor({
    muted = false,
    volume = 1,
    sfxVolume = 1,
    musicVolume = 0.34,
  } = {}) {
    this._muted = Boolean(muted);
    this._volume = clamp(Number(volume) || 0, 0, 1);
    this._sfxVolume = clamp(Number(sfxVolume) || 0, 0, 1);
    this._musicVolume = clamp(Number(musicVolume) || 0, 0, 1);
    this._disposed = false;
    this._unavailable = false;
    this._context = null;
    this._master = null;
    this._sfxBus = null;
    this._structureBus = null;
    this._structureCompressor = null;
    this._musicBus = null;
    this._voices = new Set();
    this._unlockPromise = null;
    this._musicSource = null;
    this._musicRequested = false;
    this._musicPaused = false;
    this._musicTheme = AUDIO_MUSIC_THEME.EXPEDITION;
    this._musicBuffers = new Map();
    this._structureEventTimes = new Map();
    this._structureEventWindow = [];
  }

  /**
   * Lazily creates/resumes Web Audio. This promise always resolves and never
   * rejects, so it is safe for event handlers to ignore or await it.
   *
   * @returns {Promise<boolean>} whether audio is ready to play
   */
  unlock() {
    if (this._disposed || this._unavailable) return Promise.resolve(false);

    if (!this._context && !this._createContext()) {
      return Promise.resolve(false);
    }

    const context = this._context;
    if (context.state === "running") {
      this._unlockPromise = null;
      if (this._musicRequested && !this._musicPaused) this._beginMusicLoop();
      return Promise.resolve(true);
    }
    let resumeResult;

    try {
      resumeResult =
        context.state !== "running" && context.state !== "closed"
          ? context.resume()
          : undefined;
    } catch (_error) {
      resumeResult = undefined;
    }

    // A resume() request made before a user gesture may remain pending. Never
    // let that stale promise block a later pointer/key gesture from retrying.
    const unlockAttempt = Promise.resolve(resumeResult)
      .then(
        () => !this._disposed && context.state === "running",
        () => false,
      )
      .then((ready) => {
        if (ready && this._musicRequested && !this._musicPaused) {
          this._beginMusicLoop();
        }
        return ready;
      });
    this._unlockPromise = unlockAttempt;
    void unlockAttempt.then(() => {
      if (this._unlockPromise === unlockAttempt) this._unlockPromise = null;
    });
    return unlockAttempt;
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    const context = this._context;
    const master = this._master;

    if (!context || !master || context.state === "closed") return;

    const now = context.currentTime;
    this._rampGain(master.gain, this._muted ? 0 : this._volume, now, 0.02);
  }

  setVolume(volume) {
    this._volume = clamp(Number(volume) || 0, 0, 1);
    if (!this._master || !this._context || this._context.state === "closed") return;
    this._rampGain(
      this._master.gain,
      this._muted ? 0 : this._volume,
      this._context.currentTime,
      0.02,
    );
  }

  setSfxVolume(volume) {
    this._sfxVolume = clamp(Number(volume) || 0, 0, 1);
    if (!this._sfxBus || !this._context || this._context.state === "closed") return;
    this._rampGain(
      this._sfxBus.gain,
      this._sfxVolume,
      this._context.currentTime,
      0.02,
    );
  }

  setMusicVolume(volume) {
    this._musicVolume = clamp(Number(volume) || 0, 0, 1);
    if (!this._musicBus || !this._context || this._context.state === "closed") return;
    this._rampGain(
      this._musicBus.gain,
      this._musicVolume,
      this._context.currentTime,
      0.08,
    );
  }

  get muted() {
    return this._muted;
  }

  get volume() {
    return this._volume;
  }

  get sfxVolume() {
    return this._sfxVolume;
  }

  get musicVolume() {
    return this._musicVolume;
  }

  get musicPlaying() {
    return Boolean(this._musicSource);
  }

  get ready() {
    return Boolean(
      !this._disposed
      && !this._unavailable
      && this._context?.state === "running",
    );
  }

  getStatus() {
    return Object.freeze({
      ready: this.ready,
      contextState: this._unavailable
        ? "unavailable"
        : this._context?.state || "idle",
      muted: this._muted,
      musicRequested: this._musicRequested,
      musicPaused: this._musicPaused,
      musicPlaying: this.musicPlaying,
      volume: this._volume,
      sfxVolume: this._sfxVolume,
      musicVolume: this._musicVolume,
    });
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._unlockPromise = null;
    this._musicRequested = false;
    this._stopMusicSource();

    for (const voice of [...this._voices]) this._stopVoice(voice);

    for (const node of [
      this._structureBus,
      this._structureCompressor,
      this._sfxBus,
      this._musicBus,
      this._master,
    ]) {
      if (node) {
        try {
          node.disconnect();
        } catch (_error) {
          // It may already be disconnected by the browser.
        }
      }
    }

    const context = this._context;
    this._master = null;
    this._sfxBus = null;
    this._structureBus = null;
    this._structureCompressor = null;
    this._musicBus = null;
    this._context = null;
    this._musicBuffers.clear();
    this._structureEventTimes.clear();
    this._structureEventWindow = [];

    if (context && context.state !== "closed") {
      try {
        const closing = context.close();
        if (closing && typeof closing.catch === "function") {
          closing.catch(() => {});
        }
      } catch (_error) {
        // Closing an interrupted or already-closing context can throw.
      }
    }
  }

  stretch() {
    this._tone(200 + Math.random() * 100, 0.05, "square", 0.16);
  }

  launch() {
    this._tone(300, 0.15, "sweepUp", 0.22);
  }

  /**
   * Starts a generated, seamless background loop. Calling this before the
   * first user gesture is safe: the request is remembered and begins after
   * unlock() succeeds.
   *
   * @param {"expedition"|"mystic"|"stronghold"} theme
   * @returns {Promise<boolean>} whether the loop is playing
   */
  startMusic(theme = AUDIO_MUSIC_THEME.EXPEDITION) {
    this.requestMusic(theme);
    return this.unlock().then((ready) => {
      if (ready) this._beginMusicLoop();
      return Boolean(ready && this._musicSource);
    });
  }

  /**
   * Remembers a music theme without creating or resuming AudioContext. Page
   * setup uses this path, then the first real user gesture calls unlock().
   */
  requestMusic(theme = AUDIO_MUSIC_THEME.EXPEDITION) {
    const nextTheme = Object.hasOwn(MUSIC_PRESETS, theme)
      ? theme
      : AUDIO_MUSIC_THEME.EXPEDITION;

    if (this._musicTheme !== nextTheme) {
      this._musicTheme = nextTheme;
      this._stopMusicSource();
    }

    this._musicRequested = true;
    this._musicPaused = false;
    return this.ready ? this._beginMusicLoop() : false;
  }

  stopMusic() {
    this._musicRequested = false;
    this._musicPaused = false;
    this._stopMusicSource();
  }

  pauseMusic() {
    if (!this._musicRequested) return;
    this._musicPaused = true;
    this._stopMusicSource();
  }

  resumeMusic() {
    if (!this._musicRequested) return Promise.resolve(false);
    this._musicPaused = false;
    return this.unlock().then((ready) => {
      if (ready) this._beginMusicLoop();
      return Boolean(ready && this._musicSource);
    });
  }

  /** Play a material-specific impact and return false for unknown materials. */
  playMaterialHit(material, intensity = 1) {
    const normalized = this._normalizeMaterial(material);
    if (normalized === AUDIO_MATERIAL.WOOD) this.hitWood(intensity);
    else if (normalized === AUDIO_MATERIAL.GLASS) this.hitGlass(intensity);
    else if (normalized === AUDIO_MATERIAL.STONE) this.hitStone(intensity);
    else return false;
    return true;
  }

  /** Play a material-specific destruction sound and return false for unknown materials. */
  playMaterialBreak(material, intensity = 1) {
    const normalized = this._normalizeMaterial(material);
    if (normalized === AUDIO_MATERIAL.WOOD) this.breakWood(intensity);
    else if (normalized === AUDIO_MATERIAL.GLASS) this.breakGlass(intensity);
    else if (normalized === AUDIO_MATERIAL.STONE) this.breakStone(intensity);
    else return false;
    return true;
  }

  /** Low-priority, throttled friction grains for a supported moving block. */
  playStructureSlide(material, intensity = 1) {
    const profile = this._structureProfile(material);
    if (!profile) return false;
    if (!this._takeStructureEvent("slide", profile.family)) return true;
    const now = this._now();
    if (now === null) return true;
    const force = Math.min(0.58, this._normalizeIntensity(intensity));
    const bus = this._structureBus || this._sfxBus;
    const pitch = this._jitter(profile.tone, 0.045);
    if (profile.family === "cloth") {
      this._noise(0.11, 0.045 + force * 0.055, now, {
        highpass: 260, lowpass: profile.cutoff, outputBus: bus,
      });
    } else if (["ice", "resin-glass", "plate"].includes(profile.family)) {
      this._noise(0.075, 0.025 + force * 0.045, now, {
        highpass: 380, lowpass: profile.cutoff, outputBus: bus,
      });
      this._tone(pitch, 0.065, "sine", 0.025 + force * 0.035, now, bus);
    } else {
      this._noise(0.095, 0.035 + force * 0.06, now, {
        lowpass: profile.cutoff, outputBus: bus,
      });
      this._tone(pitch, 0.055, "triangle", 0.02 + force * 0.035, now, bus);
    }
    return true;
  }

  /** A new block-to-block collision, separate from projectile impact. */
  playStructureImpact(material, intensity = 1) {
    const profile = this._structureProfile(material);
    if (!profile) return false;
    if (!this._takeStructureEvent("impact", profile.family)) return true;
    this._playStructureTransient(profile, intensity, "impact");
    return true;
  }

  /** A block entering ground or platform contact after a meaningful fall. */
  playStructureDrop(material, intensity = 1) {
    const profile = this._structureProfile(material);
    if (!profile) return false;
    if (!this._takeStructureEvent("drop", profile.family)) return true;
    this._playStructureTransient(profile, intensity, "drop");
    return true;
  }

  /** High-priority destruction layer; intentionally does not stack a hit sound. */
  playStructureBreak(material, intensity = 1) {
    const profile = this._structureProfile(material);
    if (!profile) return false;
    if (!this._takeStructureEvent("break", profile.family)) return true;
    const now = this._now();
    if (now === null) return true;
    const force = this._normalizeIntensity(intensity);
    const bus = this._structureBus || this._sfxBus;
    const pitch = this._jitter(profile.tone, 0.05);
    const duration = profile.family === "stone" ? 0.22
      : profile.family === "earth" ? 0.19
        : profile.family === "cloth" ? 0.15 : 0.13;
    const noiseVolume = 0.07 + force * 0.11;
    this._noise(duration, noiseVolume, now, {
      lowpass: profile.cutoff, outputBus: bus,
      highpass: profile.family === "cloth" ? 240 : null,
    });
    if (profile.family === "ice") {
      for (const [index, ratio] of [1, 1.42, 1.9].entries()) {
        this._tone(pitch * ratio, 0.075 - index * 0.009, "sine", 0.045 + force * 0.045,
          now + index * 0.022, bus);
      }
    } else if (profile.family === "resin-glass") {
      for (const [index, ratio] of [1, 1.5, 2.25].entries()) {
        this._tone(pitch * ratio, 0.07, "sine", 0.04 + force * 0.04,
          now + index * 0.018, bus);
      }
    } else if (profile.family === "cloth") {
      this._tone(pitch, 0.08, "triangle", 0.025 + force * 0.035, now, bus);
    } else {
      this._tone(pitch, duration * 0.72, "triangle", 0.07 + force * 0.1, now, bus);
      this._tone(pitch * (profile.family === "plate" ? 1.48 : 1.7), 0.055,
        "triangle", 0.035 + force * 0.05, now + 0.032, bus);
    }
    return true;
  }

  fireBurst() {
    const now = this._now();
    if (now === null) return;
    this._noise(0.16, 0.13, now, { lowpass: 1450 });
    this._tone(210, 0.17, "sweepUp", 0.16, now);
    this._tone(520, 0.08, "sine", 0.07, now + 0.045);
  }

  hitWood(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._noise(0.045 + force * 0.035, 0.08 + force * 0.13, now, {
      lowpass: 1800,
    });
    this._tone(105 + force * 65, 0.045 + force * 0.025, "triangle", 0.08 + force * 0.1, now);
  }

  breakWood(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._noise(0.18 + force * 0.1, 0.18 + force * 0.2, now, {
      lowpass: 2400,
    });
    this._tone(170, 0.075, "sweepDown", 0.12 + force * 0.12, now);
    this._tone(260, 0.045, "triangle", 0.08 + force * 0.08, now + 0.035);
    this._tone(120, 0.09, "triangle", 0.1 + force * 0.1, now + 0.085);
  }

  hitStone(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._noise(0.055 + force * 0.055, 0.1 + force * 0.17, now, {
      lowpass: 950,
    });
    this._tone(62 + force * 46, 0.08 + force * 0.05, "sine", 0.12 + force * 0.18, now);
    this._tone(680 - force * 180, 0.035, "triangle", 0.06 + force * 0.07, now);
  }

  breakStone(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._noise(0.3 + force * 0.16, 0.22 + force * 0.25, now, {
      lowpass: 1200,
    });
    this._tone(74, 0.28 + force * 0.08, "sweepDown", 0.22 + force * 0.22, now);
    this._tone(310, 0.07, "triangle", 0.08 + force * 0.1, now + 0.045);
    this._tone(220, 0.08, "triangle", 0.08 + force * 0.09, now + 0.12);
    this._tone(155, 0.1, "triangle", 0.07 + force * 0.08, now + 0.2);
  }

  hitGlass(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._tone(1280 + force * 420, 0.1 + force * 0.05, "sine", 0.09 + force * 0.12, now);
    this._tone(1920 + force * 510, 0.07 + force * 0.04, "sine", 0.05 + force * 0.08, now + 0.008);
  }

  breakGlass(intensity = 1) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    this._noise(0.22 + force * 0.12, 0.12 + force * 0.16, now, {
      highpass: 2100,
    });
    const shards = [2380, 1840, 2860, 1510, 3220];
    for (let i = 0; i < shards.length; i += 1) {
      this._tone(
        shards[i] * (0.9 + force * 0.16),
        0.055 + (shards.length - i) * 0.008,
        "sine",
        0.045 + force * 0.07,
        now + i * 0.025,
      );
    }
  }

  // Existing levels call the transparent building material "ice". Keep these
  // aliases so old callers gain the new glass timbre without a data migration.
  hitIce(intensity = 1) {
    this.hitGlass(intensity);
  }

  breakIce(intensity = 1) {
    this.breakGlass(intensity);
  }

  boom() {
    const now = this._now();
    if (now === null) return;
    this._noise(0.4, 0.34, now);
    this._tone(60, 0.35, "sweepDown", 0.48, now);
  }

  squirrelPop() {
    this._melody([600, 900, 1300], [0.08, 0.08, 0.1], "square", 0.18);
  }

  win() {
    this._melody([523, 659, 784, 1047], 0.12, "square", 0.17);
  }

  lose() {
    this._melody([392, 330, 262], 0.2, "sine", 0.19);
  }

  egg() {
    this._melody([784, 988, 1175, 1568], 0.09, "sine", 0.16);
  }

  combo(n) {
    const amount = Number.isFinite(Number(n)) ? clamp(Number(n), 0, 24) : 0;
    this._tone(440 * Math.pow(1.12, amount), 0.07, "square", 0.16);
  }

  slowmo() {
    this._tone(880, 0.3, "sweepDown", 0.18);
  }

  ui() {
    this._tone(660, 0.045, "sine", 0.11);
  }

  _normalizeMaterial(material) {
    return MATERIAL_ALIASES[String(material || "").trim().toLowerCase()] || null;
  }

  _normalizeIntensity(intensity) {
    return clamp(Number(intensity) || 0.5, 0.15, 1.5);
  }

  _structureProfile(material) {
    return STRUCTURE_SOUND_PROFILES[String(material || "").trim().toLowerCase()] || null;
  }

  _jitter(value, spread = 0.04) {
    return value * (1 + (Math.random() * 2 - 1) * spread);
  }

  _takeStructureEvent(kind, family) {
    const now = this._now();
    if (now === null) return false;
    const key = `${kind}:${family}`;
    const previous = this._structureEventTimes.get(key) ?? -Infinity;
    if (now - previous < (STRUCTURE_EVENT_GAPS[kind] || 0.06)) return false;
    this._structureEventWindow = this._structureEventWindow
      .filter((entry) => now - entry.time < 0.05);
    const mainCount = this._structureEventWindow
      .filter((entry) => entry.kind !== "slide").length;
    const slideCount = this._structureEventWindow
      .filter((entry) => entry.kind === "slide").length;
    if ((kind === "slide" && slideCount >= 2)
      || (kind !== "slide" && kind !== "break" && mainCount >= 3)
      || (kind === "break" && mainCount >= 4)) return false;
    this._structureEventTimes.set(key, now);
    this._structureEventWindow.push({ time: now, kind });
    return true;
  }

  _playStructureTransient(profile, intensity, kind) {
    const now = this._now();
    if (now === null) return;
    const force = this._normalizeIntensity(intensity);
    const bus = this._structureBus || this._sfxBus;
    const pitch = this._jitter(profile.tone, 0.04);
    const drop = kind === "drop";
    const duration = drop ? 0.14 : 0.07;
    const volume = (drop ? 0.075 : 0.045) + force * (drop ? 0.11 : 0.075);
    this._noise(duration, volume * 0.72, now, {
      lowpass: profile.cutoff,
      outputBus: bus,
    });
    if (profile.family === "cloth") {
      this._noise(duration * 1.15, volume * 0.62, now, {
        highpass: 260, outputBus: bus,
      });
      return;
    }
    const oscillator = ["ice", "resin-glass"].includes(profile.family) ? "sine" : "triangle";
    this._tone(drop && profile.family !== "ice" ? pitch * 0.82 : pitch,
      duration, oscillator, volume, now, bus);
    if (profile.family === "ice") {
      this._tone(pitch * 1.5, duration * 0.72, "sine", volume * 0.48, now + 0.009, bus);
    } else if (profile.family === "resin-glass") {
      this._tone(pitch * 1.5, duration * 0.78, "sine", volume * 0.42, now + 0.012, bus);
    } else if (profile.family === "plate") {
      this._tone(pitch * 1.48, 0.045, "triangle", volume * 0.4, now + 0.025, bus);
    }
  }

  _rampGain(gain, target, now, duration) {
    try {
      if (typeof gain.cancelAndHoldAtTime === "function") {
        gain.cancelAndHoldAtTime(now);
      } else {
        const current = gain.value;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(current, now);
      }
      gain.linearRampToValueAtTime(target, now + duration);
    } catch (_error) {
      gain.value = target;
    }
  }

  _beginMusicLoop() {
    const context = this._context;
    if (
      this._disposed ||
      !this._musicRequested ||
      this._musicPaused ||
      !context ||
      !this._musicBus ||
      context.state !== "running"
    ) return false;

    if (this._musicSource && this._musicSource.theme === this._musicTheme) return true;
    this._stopMusicSource();

    try {
      let buffer = this._musicBuffers.get(this._musicTheme);
      if (!buffer) {
        buffer = this._createMusicBuffer(MUSIC_PRESETS[this._musicTheme]);
        this._musicBuffers.set(this._musicTheme, buffer);
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(this._musicBus);
      const record = { source, theme: this._musicTheme };
      this._musicSource = record;
      source.onended = () => {
        if (this._musicSource === record) this._musicSource = null;
        try { source.disconnect(); } catch (_error) { /* already disconnected */ }
      };
      source.start(context.currentTime);
      return true;
    } catch (_error) {
      this._musicSource = null;
      return false;
    }
  }

  _stopMusicSource() {
    const record = this._musicSource;
    if (!record) return;
    this._musicSource = null;
    record.source.onended = null;
    try { record.source.stop(); } catch (_error) { /* already stopped */ }
    try { record.source.disconnect(); } catch (_error) { /* already disconnected */ }
  }

  _createMusicBuffer(preset) {
    const context = this._context;
    const sampleRate = context.sampleRate;
    const beatLength = 60 / preset.bpm;
    const duration = beatLength * 16;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = context.createBuffer(2, frameCount, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const noteHz = (semitones, octave = 0) =>
      preset.root * Math.pow(2, semitones / 12 + octave);

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const beatPosition = t / beatLength;
      const beatIndex = Math.floor(beatPosition) % 16;
      const beatPhase = beatPosition - Math.floor(beatPosition);
      const barPhase = (beatPosition % 4) / 4;
      const chord = preset.progression[Math.floor(beatIndex / 4)];
      const padEnvelope = Math.pow(Math.sin(Math.PI * barPhase), 2) * 0.032;
      let padLeft = 0;
      let padRight = 0;
      for (let note = 0; note < chord.length; note += 1) {
        const hz = noteHz(chord[note]);
        padLeft += Math.sin(Math.PI * 2 * hz * t + note * 0.2);
        padRight += Math.sin(Math.PI * 2 * hz * 1.002 * t - note * 0.18);
      }
      const melodyStep = preset.melody[beatIndex];
      const pluckEnvelope = melodyStep === null ? 0 : Math.exp(-beatPhase * 6) * 0.07;
      const melodyHz = melodyStep === null ? 0 : noteHz(melodyStep, 1);
      const melodyLeft = Math.sin(Math.PI * 2 * melodyHz * t) * pluckEnvelope;
      const melodyRight = Math.sin(Math.PI * 2 * melodyHz * 1.003 * t) * pluckEnvelope;
      const bassPhase = (beatPosition % 2) / 2;
      const bassHz = noteHz(chord[0], -1);
      const bass = Math.sin(Math.PI * 2 * bassHz * t) * Math.exp(-bassPhase * 7) * 0.065;
      const edgeFade = Math.min(1, t / 0.06, (duration - t) / 0.06);
      left[i] = (padLeft * padEnvelope + melodyLeft + bass) * edgeFade;
      right[i] = (padRight * padEnvelope + melodyRight + bass) * edgeFade;
    }
    return buffer;
  }

  _createContext() {
    const scope = typeof globalThis === "undefined" ? null : globalThis;
    const AudioContextClass =
      scope && (scope.AudioContext || scope.webkitAudioContext);

    if (!AudioContextClass) {
      this._unavailable = true;
      return false;
    }

    let context;
    try {
      context = new AudioContextClass({ latencyHint: "interactive" });
    } catch (_withOptionsError) {
      try {
        context = new AudioContextClass();
      } catch (_error) {
        this._unavailable = true;
        return false;
      }
    }

    try {
      const master = context.createGain();
      const sfxBus = context.createGain();
      const musicBus = context.createGain();
      const structureBus = context.createGain();
      master.gain.value = this._muted ? 0 : this._volume;
      sfxBus.gain.value = this._sfxVolume;
      structureBus.gain.value = 0.72;
      musicBus.gain.value = this._musicVolume;
      let structureCompressor = null;
      if (typeof context.createDynamicsCompressor === "function") {
        structureCompressor = context.createDynamicsCompressor();
        structureCompressor.threshold.setValueAtTime(-18, context.currentTime);
        structureCompressor.knee.setValueAtTime(12, context.currentTime);
        structureCompressor.ratio.setValueAtTime(4, context.currentTime);
        structureCompressor.attack.setValueAtTime(0.006, context.currentTime);
        structureCompressor.release.setValueAtTime(0.14, context.currentTime);
        structureBus.connect(structureCompressor);
        structureCompressor.connect(sfxBus);
      } else structureBus.connect(sfxBus);
      sfxBus.connect(master);
      musicBus.connect(master);
      master.connect(context.destination);
      this._context = context;
      this._master = master;
      this._sfxBus = sfxBus;
      this._structureBus = structureBus;
      this._structureCompressor = structureCompressor;
      this._musicBus = musicBus;
      return true;
    } catch (_error) {
      try {
        const closing = context.close();
        if (closing && typeof closing.catch === "function") {
          closing.catch(() => {});
        }
      } catch (_closeError) {
        // Ignore cleanup failures for an unusable context.
      }
      this._unavailable = true;
      return false;
    }
  }

  _canPlay() {
    return Boolean(
      !this._disposed &&
        !this._muted &&
        this._context &&
        this._master &&
        this._sfxBus &&
        this._context.state === "running",
    );
  }

  _now() {
    return this._canPlay() ? this._context.currentTime : null;
  }

  _tone(frequency, duration, type, volume, startAt, outputBus = this._sfxBus) {
    if (!this._canPlay()) return;

    const context = this._context;
    const start = Math.max(
      context.currentTime,
      Number.isFinite(startAt) ? startAt : context.currentTime,
    );
    const length = clamp(Number(duration) || 0.05, 0.01, 2);
    const end = start + length;
    const hz = clamp(Number(frequency) || 220, 20, 18000);
    const level = clamp(Number(volume) || 0.1, 0.001, 0.7);

    try {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();

      oscillator.type = ["sine", "square", "triangle", "sawtooth"].includes(type)
        ? type
        : "square";
      oscillator.frequency.setValueAtTime(hz, start);
      if (type === "sweepUp") {
        oscillator.type = "sine";
        oscillator.frequency.exponentialRampToValueAtTime(
          clamp(hz * 3, 20, 18000),
          end,
        );
      } else if (type === "sweepDown") {
        oscillator.type = "sine";
        oscillator.frequency.exponentialRampToValueAtTime(
          clamp(hz * 0.3, 20, 18000),
          end,
        );
      }

      envelope.gain.setValueAtTime(0, start);
      envelope.gain.linearRampToValueAtTime(
        level,
        Math.min(end, start + 0.006),
      );
      envelope.gain.linearRampToValueAtTime(0, end);

      oscillator.connect(envelope);
      envelope.connect(outputBus || this._sfxBus);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
      this._trackVoice(oscillator, [oscillator, envelope]);
    } catch (_error) {
      // A context can be interrupted/closed between the readiness check and use.
    }
  }

  _noise(duration, volume, startAt, {
    lowpass = null,
    highpass = null,
    outputBus = this._sfxBus,
  } = {}) {
    if (!this._canPlay()) return;

    const context = this._context;
    const start = Math.max(
      context.currentTime,
      Number.isFinite(startAt) ? startAt : context.currentTime,
    );
    const length = clamp(Number(duration) || 0.08, 0.01, 1);
    const end = start + length;
    const frameCount = Math.max(1, Math.ceil(context.sampleRate * length));

    try {
      const buffer = context.createBuffer(1, frameCount, context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) {
        const progress = i / samples.length;
        samples[i] =
          (Math.random() * 2 - 1) *
          (1 - progress) *
          Math.sin(progress * Math.PI);
      }

      const source = context.createBufferSource();
      const envelope = context.createGain();
      source.buffer = buffer;
      envelope.gain.setValueAtTime(clamp(Number(volume) || 0.2, 0.001, 0.7), start);
      envelope.gain.linearRampToValueAtTime(0, end);
      const filterFrequency = Number(lowpass) || Number(highpass) || 0;
      let filter = null;
      if (filterFrequency > 0 && typeof context.createBiquadFilter === "function") {
        filter = context.createBiquadFilter();
        filter.type = Number(lowpass) > 0 ? "lowpass" : "highpass";
        filter.frequency.setValueAtTime(
          clamp(filterFrequency, 40, 18000),
          start,
        );
        source.connect(filter);
        filter.connect(envelope);
      } else {
        source.connect(envelope);
      }
      envelope.connect(outputBus || this._sfxBus);
      source.start(start);
      source.stop(end + 0.01);
      this._trackVoice(source, filter ? [source, filter, envelope] : [source, envelope]);
    } catch (_error) {
      // Treat transient Web Audio failures as a dropped sound effect.
    }
  }

  _melody(frequencies, durations, type, volume) {
    const now = this._now();
    if (now === null) return;

    let cursor = now;
    for (let i = 0; i < frequencies.length; i += 1) {
      const duration = Array.isArray(durations) ? durations[i] : durations;
      const safeDuration = clamp(Number(duration) || 0.1, 0.01, 1);
      this._tone(frequencies[i], safeDuration, type, volume, cursor);
      cursor += safeDuration;
    }
  }

  _trackVoice(source, nodes) {
    const voice = { source, nodes };
    this._voices.add(voice);

    source.onended = () => this._cleanupVoice(voice);

    while (this._voices.size > MAX_VOICES) {
      const oldest = this._voices.values().next().value;
      if (!oldest) break;
      this._stopVoice(oldest);
    }
  }

  _stopVoice(voice) {
    if (!voice || !this._voices.has(voice)) return;
    this._voices.delete(voice);
    voice.source.onended = null;
    try {
      voice.source.stop();
    } catch (_error) {
      // A source can only be stopped once.
    }
    this._disconnectVoice(voice);
  }

  _cleanupVoice(voice) {
    if (!this._voices.delete(voice)) return;
    voice.source.onended = null;
    this._disconnectVoice(voice);
  }

  _disconnectVoice(voice) {
    for (const node of voice.nodes) {
      try {
        node.disconnect();
      } catch (_error) {
        // The node may already be disconnected.
      }
    }
  }
}
