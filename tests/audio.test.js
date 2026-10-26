// Copyright 2026 myflww
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  AUDIO_MATERIAL,
  AUDIO_MUSIC_THEME,
  SoundFX,
  STRUCTURE_SOUND_PROFILES,
} from "../src/audio.js";

const originalAudioContext = globalThis.AudioContext;

afterEach(() => {
  if (originalAudioContext === undefined) delete globalThis.AudioContext;
  else globalThis.AudioContext = originalAudioContext;
});

class FakeParam {
  constructor(value = 0) { this.value = value; }
  cancelAndHoldAtTime() {}
  cancelScheduledValues() {}
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  constructor() {
    this.connections = [];
    this.stopped = false;
    this.onended = null;
  }
  connect(node) { this.connections.push(node); return node; }
  disconnect() { this.connections = []; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 1;
    this.sampleRate = 240;
    this.destination = new FakeNode();
    this.gains = [];
    this.sources = [];
    this.oscillators = [];
    this.compressors = [];
    FakeAudioContext.last = this;
  }
  resume() { this.state = "running"; return Promise.resolve(); }
  close() { this.state = "closed"; return Promise.resolve(); }
  createGain() {
    const node = new FakeNode();
    node.gain = new FakeParam(1);
    this.gains.push(node);
    return node;
  }
  createOscillator() {
    const node = new FakeNode();
    node.frequency = new FakeParam(220);
    node.type = "sine";
    this.oscillators.push(node);
    return node;
  }
  createBuffer(channels, frames) {
    const data = Array.from({ length: channels }, () => new Float32Array(frames));
    return { getChannelData: (channel) => data[channel] };
  }
  createBufferSource() {
    const node = new FakeNode();
    node.loop = false;
    node.buffer = null;
    this.sources.push(node);
    return node;
  }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeParam(350);
    node.type = "lowpass";
    return node;
  }
  createDynamicsCompressor() {
    const node = new FakeNode();
    node.threshold = new FakeParam(-24);
    node.knee = new FakeParam(30);
    node.ratio = new FakeParam(12);
    node.attack = new FakeParam(0.003);
    node.release = new FakeParam(0.25);
    this.compressors.push(node);
    return node;
  }
}

test("material APIs preserve ice compatibility and provide hit/break variants", async () => {
  globalThis.AudioContext = FakeAudioContext;
  const audio = new SoundFX();
  assert.equal(await audio.unlock(), true);

  const constructionAliases = [
    "canvas-screen",
    "resin-timber",
    "packed-earth",
    "resin-glass",
    "leaf-iron-plate",
  ];
  for (const material of ["wood", "glass", "ice", "stone", "rock", ...constructionAliases]) {
    assert.equal(audio.playMaterialHit(material, 0.8), true);
    assert.equal(audio.playMaterialBreak(material, 1.2), true);
  }
  assert.equal(audio.playMaterialHit("cloth"), false);
  assert.equal(audio.playMaterialBreak("cloth"), false);
  assert.deepEqual(AUDIO_MATERIAL, { WOOD: "wood", GLASS: "glass", STONE: "stone" });
  assert.ok(FakeAudioContext.last.oscillators.length > 20);
  assert.ok(FakeAudioContext.last.sources.length > 5);
  audio.dispose();
});

test("master, effects, and music volumes remain independently controllable", async () => {
  globalThis.AudioContext = FakeAudioContext;
  const audio = new SoundFX({ volume: 0.8, sfxVolume: 0.7, musicVolume: 0.25 });
  await audio.unlock();
  const context = FakeAudioContext.last;
  assert.equal(context.gains[0].gain.value, 0.8);
  assert.equal(context.gains[1].gain.value, 0.7);
  assert.equal(context.gains[2].gain.value, 0.25);
  assert.equal(context.gains[3].gain.value, 0.72);
  assert.equal(context.compressors.length, 1);
  assert.equal(context.compressors[0].threshold.value, -18);
  assert.equal(context.compressors[0].ratio.value, 4);

  audio.setMuted(true);
  assert.equal(context.gains[0].gain.value, 0);
  audio.setVolume(0.55);
  audio.setSfxVolume(0.45);
  audio.setMusicVolume(0.15);
  audio.setMuted(false);
  assert.equal(context.gains[0].gain.value, 0.55);
  assert.equal(context.gains[1].gain.value, 0.45);
  assert.equal(context.gains[2].gain.value, 0.15);
});

test("structure movement uses distinct material profiles, event layers, and throttling", async () => {
  globalThis.AudioContext = FakeAudioContext;
  const audio = new SoundFX();
  assert.equal(await audio.unlock(), true);
  const context = FakeAudioContext.last;
  const signatures = new Set(Object.values(STRUCTURE_SOUND_PROFILES)
    .map((profile) => `${profile.family}:${profile.tone}:${profile.cutoff}`));
  assert.equal(signatures.size, 8);
  assert.ok(Object.isFrozen(STRUCTURE_SOUND_PROFILES));

  const materials = [
    "wood", "resin-timber", "canvas-screen", "ice",
    "resin-glass", "stone", "packed-earth", "leaf-iron-plate",
  ];
  for (const material of materials) {
    context.currentTime += 0.2;
    assert.equal(audio.playStructureSlide(material, 0.45), true);
    context.currentTime += 0.2;
    assert.equal(audio.playStructureImpact(material, 0.8), true);
    context.currentTime += 0.2;
    assert.equal(audio.playStructureDrop(material, 1.1), true);
    context.currentTime += 0.2;
    assert.equal(audio.playStructureBreak(material, 1.2), true);
  }
  assert.equal(audio.playStructureImpact("unknown-alloy", 1), false);

  context.currentTime += 0.2;
  const before = context.oscillators.length + context.sources.length;
  audio.playStructureImpact("wood", 1);
  const afterFirst = context.oscillators.length + context.sources.length;
  audio.playStructureImpact("wood", 1);
  const afterRepeat = context.oscillators.length + context.sources.length;
  assert.ok(afterFirst > before);
  assert.equal(afterRepeat, afterFirst, "same material contact is throttled inside the impact gap");
  audio.dispose();
});

test("generated background music loops and supports pause, resume, and stop", async () => {
  globalThis.AudioContext = FakeAudioContext;
  const audio = new SoundFX();
  assert.equal(await audio.startMusic(AUDIO_MUSIC_THEME.STRONGHOLD), true);
  const firstSource = FakeAudioContext.last.sources.at(-1);
  assert.equal(firstSource.loop, true);
  assert.equal(audio.musicPlaying, true);

  audio.pauseMusic();
  assert.equal(firstSource.stopped, true);
  assert.equal(audio.musicPlaying, false);
  assert.equal(await audio.resumeMusic(), true);
  const resumedSource = FakeAudioContext.last.sources.at(-1);
  assert.notEqual(resumedSource, firstSource);
  assert.equal(resumedSource.loop, true);

  audio.stopMusic();
  assert.equal(resumedSource.stopped, true);
  assert.equal(audio.musicPlaying, false);
  audio.dispose();
});

test("deferred music avoids autoplay startup and a later gesture can retry resume", async () => {
  class AutoplayGuardedContext extends FakeAudioContext {
    constructor() {
      super();
      this.resumeCalls = 0;
    }
    resume() {
      this.resumeCalls += 1;
      if (this.resumeCalls === 1) return new Promise(() => {});
      this.state = "running";
      return Promise.resolve();
    }
  }

  FakeAudioContext.last = null;
  globalThis.AudioContext = AutoplayGuardedContext;
  const audio = new SoundFX();

  assert.equal(audio.requestMusic(AUDIO_MUSIC_THEME.EXPEDITION), false);
  assert.equal(FakeAudioContext.last, null, "page setup does not create AudioContext");
  assert.deepEqual(audio.getStatus(), {
    ready: false,
    contextState: "idle",
    muted: false,
    musicRequested: true,
    musicPaused: false,
    musicPlaying: false,
    volume: 1,
    sfxVolume: 1,
    musicVolume: 0.34,
  });

  void audio.unlock();
  const context = FakeAudioContext.last;
  assert.equal(context.resumeCalls, 1);
  assert.equal(context.state, "suspended");

  assert.equal(await audio.unlock(), true);
  assert.equal(context.resumeCalls, 2, "the real gesture retries resume instead of reusing a pending promise");
  assert.equal(audio.ready, true);
  assert.equal(audio.musicPlaying, true);
  assert.equal(audio.getStatus().contextState, "running");
  audio.dispose();
});
