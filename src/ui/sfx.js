// Efectos de sonido sintetizados (sin archivos) y vibración corta.
let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = Boolean(on);
}

function audio() {
  if (!enabled || typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', gain = 0.12, slide = null } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise({ at = 0, dur = 0.06, gain = 0.08, freq = 1800 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

export function buzz(pattern) {
  if (!enabled) return;
  try { navigator.vibrate?.(pattern); } catch { /* sin vibración */ }
}

export const sfx = {
  pet() { tone(660, { dur: 0.1, slide: 880 }); tone(990, { at: 0.08, dur: 0.12, gain: 0.08 }); },
  eat() { [0.45, 0.62, 0.79].forEach((at) => noise({ at, dur: 0.07, gain: 0.12, freq: 1200 })); tone(520, { at: 0.95, dur: 0.12, slide: 700, gain: 0.07 }); buzz([12, 160, 12, 160, 12]); },
  play() { tone(440, { dur: 0.09, type: 'triangle' }); tone(660, { at: 0.08, dur: 0.09, type: 'triangle' }); tone(880, { at: 0.16, dur: 0.14, type: 'triangle' }); },
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.18, type: 'triangle', gain: 0.11 })); buzz([30, 60, 30]); },
  coin() { tone(988, { dur: 0.07, type: 'square', gain: 0.05 }); tone(1319, { at: 0.07, dur: 0.16, type: 'square', gain: 0.05 }); },
  egg() { [392, 523, 659].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.22, gain: 0.1 })); buzz([40, 80, 40]); },
  crack() { noise({ dur: 0.09, gain: 0.2, freq: 2400 }); noise({ at: 0.05, dur: 0.06, gain: 0.12, freq: 900 }); },
  hatch() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.25, type: 'triangle', gain: 0.1 })); buzz([60, 40, 120]); },
  tap() { tone(520, { dur: 0.05, gain: 0.05 }); },
  error() { tone(220, { dur: 0.16, type: 'sawtooth', gain: 0.04, slide: 180 }); buzz(30); },
  sad() { tone(440, { dur: 0.3, slide: 300, gain: 0.07 }); },
};
