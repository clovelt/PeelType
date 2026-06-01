const audioState = globalThis.__tiritaAudioState || (globalThis.__tiritaAudioState = {
  soundArmed: false,
  audioCtx: null,
  audioMasterGain: null,
  audioMuted: localStorage.getItem('tirita.audioMuted') === '1',
  lastPeelSoundTime: 0,
  ambientLayers: new Map()
});

export function isSoundArmed() {
  return audioState.soundArmed;
}

// onFirstArm is an optional callback invoked once when audio is first armed.
// main.js passes its game-state trigger loop here so armAudio stays pure audio.
export function armAudio(onFirstArm = null) {
  if (audioState.soundArmed) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audioState.audioCtx ||= new AudioContextClass();
  audioState.audioCtx.resume?.();
  if (!audioState.audioMasterGain) {
    audioState.audioMasterGain = audioState.audioCtx.createGain();
    audioState.audioMasterGain.gain.value = 0;
    audioState.audioMasterGain.gain.setValueAtTime(0, audioState.audioCtx.currentTime);
    audioState.audioMasterGain.gain.setTargetAtTime(audioState.audioMuted ? 0 : 1, audioState.audioCtx.currentTime + 0.04, 0.42);
    audioState.audioMasterGain.connect(audioState.audioCtx.destination);
  }
  audioState.soundArmed = true;
  onFirstArm?.();
}

export function zzfx({ frequency = 220, duration = 0.06, volume = 0.08, type = 'sine', attack = 0.004, release = 0.04, slide = 0, noise = 0 } = {}) {
  if (audioState.audioMuted || !audioState.soundArmed || !audioState.audioCtx) return;
  const sampleRate = audioState.audioCtx.sampleRate;
  const length = Math.max(1, Math.floor(duration * sampleRate));
  const buffer = audioState.audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const progress = i / length;
    const freq = Math.max(20, frequency + slide * progress);
    phase += freq / sampleRate;
    const wave = type === 'triangle'
      ? 1 - 4 * Math.abs(Math.round(phase - 0.25) - (phase - 0.25))
      : type === 'sawtooth'
        ? 2 * (phase - Math.floor(phase + 0.5))
        : Math.sin(phase * Math.PI * 2);
    const grit = (Math.random() * 2 - 1) * noise;
    const envIn = Math.min(1, t / attack);
    const envOut = Math.min(1, (duration - t) / release);
    data[i] = (wave * (1 - noise) + grit) * volume * Math.max(0, Math.min(envIn, envOut));
  }
  const source = audioState.audioCtx.createBufferSource();
  const gain = audioState.audioCtx.createGain();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audioState.audioMasterGain ?? audioState.audioCtx.destination);
  source.start();
}

// Handles the audio-state half of muting (gain ramp + localStorage).
// The DOM button update stays in main.js's setAudioMuted wrapper.
export function applyAudioMutedState(muted) {
  audioState.audioMuted = Boolean(muted);
  localStorage.setItem('tirita.audioMuted', audioState.audioMuted ? '1' : '0');
  if (audioState.audioCtx && audioState.audioMasterGain) {
    const now = audioState.audioCtx.currentTime;
    audioState.audioMasterGain.gain.cancelScheduledValues(now);
    audioState.audioMasterGain.gain.setValueAtTime(audioState.audioMasterGain.gain.value, now);
    audioState.audioMasterGain.gain.setTargetAtTime(audioState.audioMuted ? 0 : 1, now, 0.12);
  }
}

export function playPeelSound() {
  const now = performance.now();
  if (now - audioState.lastPeelSoundTime < 22) return;
  audioState.lastPeelSoundTime = now;
  zzfx({
    frequency: 420 + Math.random() * 260,
    duration: 0.045 + Math.random() * 0.025,
    volume: 0.018,
    type: 'triangle',
    attack: 0.002,
    release: 0.055,
    slide: -180 - Math.random() * 120,
    noise: 0.28
  });
}

export function playGrabSound() {
  zzfx({ frequency: 180, duration: 0.055, volume: 0.055, type: 'sine', attack: 0.001, release: 0.05, slide: 80, noise: 0.12 });
}

export function playDropSound() {
  zzfx({ frequency: 115, duration: 0.075, volume: 0.06, type: 'triangle', attack: 0.002, release: 0.08, slide: -55, noise: 0.18 });
}

export function playParagraphAppearSound() {
  zzfx({ frequency: 260, duration: 0.16, volume: 0.035, type: 'sine', attack: 0.015, release: 0.14, slide: 180, noise: 0.05 });
  setTimeout(() => zzfx({ frequency: 390, duration: 0.11, volume: 0.025, type: 'sine', attack: 0.01, release: 0.1, slide: 120, noise: 0.04 }), 45);
}

export function playPeelPointCompleteSound() {
  zzfx({ frequency: 520, duration: 0.09, volume: 0.028, type: 'triangle', attack: 0.006, release: 0.08, slide: 90, noise: 0.12 });
}

export function playParagraphCompleteSound() {
  zzfx({ frequency: 180, duration: 0.18, volume: 0.04, type: 'sine', attack: 0.01, release: 0.16, slide: -60, noise: 0.08 });
  setTimeout(() => zzfx({ frequency: 260, duration: 0.12, volume: 0.025, type: 'triangle', attack: 0.008, release: 0.1, slide: -80, noise: 0.1 }), 55);
}

export function playNamedSound(name) {
  if (name === 'poof') zzfx({ frequency: 92, duration: 0.24, volume: 0.055, type: 'sine', attack: 0.018, release: 0.22, slide: -40, noise: 0.65 });
  else if (name === 'spark') zzfx({ frequency: 980, duration: 0.08, volume: 0.04, type: 'triangle', attack: 0.002, release: 0.08, slide: -520, noise: 0.3 });
  else if (name === 'thud') zzfx({ frequency: 55, duration: 0.2, volume: 0.07, type: 'sine', attack: 0.001, release: 0.2, slide: -28, noise: 0.58 });
  else if (name === 'geyser') zzfx({ frequency: 72, duration: 0.46, volume: 0.075, type: 'sawtooth', attack: 0.004, release: 0.42, slide: -30, noise: 0.72 });
  else if (name === 'crack') zzfx({ frequency: 320, duration: 0.09, volume: 0.05, type: 'sawtooth', attack: 0.001, release: 0.09, slide: -280, noise: 0.55 });
  else if (name === 'drop') zzfx({ frequency: 180, duration: 0.14, volume: 0.04, type: 'sine', attack: 0.002, release: 0.13, slide: -90, noise: 0.08 });
  else zzfx({ frequency: 240, duration: 0.12, volume: 0.035, type: 'sine', attack: 0.01, release: 0.11, noise: 0.1 });
}

export function setAudioParamSmooth(param, value, startTime, timeConstant = 0.35) {
  if (!param) return;
  const current = Number.isFinite(param.value) ? param.value : 0;
  param.cancelScheduledValues(startTime);
  param.setValueAtTime(current, startTime);
  param.setTargetAtTime(value, startTime, timeConstant);
}

export function ensureAmbientLayer(name, gainValue = 0.035) {
  if (!audioState.soundArmed || !audioState.audioCtx || audioState.ambientLayers.has(name)) return audioState.ambientLayers.get(name);
  const osc = audioState.audioCtx.createOscillator();
  const gain = audioState.audioCtx.createGain();
  const filter = audioState.audioCtx.createBiquadFilter();
  const isLatido = name.includes('latido');
  const isTension = name.includes('tension');
  const isSpiral = name.includes('spiral');
  const now = audioState.audioCtx.currentTime;
  const filterFreq = isLatido ? (name.includes('alto') ? 260 : 180) : isTension ? 380 : isSpiral ? 440 : 520;
  osc.type = isLatido ? 'sine' : (isTension || isSpiral) ? 'sawtooth' : 'triangle';
  osc.frequency.setValueAtTime(isLatido ? (name.includes('alto') ? 78 : 54) : isTension ? 210 : isSpiral ? 174 : 146, now);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.setValueAtTime(0.45, now);
  gain.gain.value = 0;
  gain.gain.setValueAtTime(0, now);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioState.audioMasterGain ?? audioState.audioCtx.destination);
  osc.start(now + 0.035);
  const layer = { osc, gain, targetGain: gainValue };
  audioState.ambientLayers.set(name, layer);
  return layer;
}

export function runAmbientAction(action = {}) {
  if (!audioState.soundArmed || !audioState.audioCtx) return;
  const name = action.name || 'ambient';
  const target = ensureAmbientLayer(name, Number(action.gain ?? 0.035));
  if (!target) return;
  const now = audioState.audioCtx.currentTime;
  if (action.mode === 'crossfade') {
    for (const [layerName, layer] of audioState.ambientLayers) {
      const value = layerName === name ? layer.targetGain : 0;
      const start = layerName === name ? now + 0.08 : now;
      setAudioParamSmooth(layer.gain.gain, value, start, layerName === name ? 0.45 : 0.32);
    }
  } else {
    setAudioParamSmooth(target.gain.gain, target.targetGain, now + 0.08, 0.45);
  }
}
