// Fuente de pasos: sensor nativo de Android (cuenta aunque la app esté cerrada) o acelerómetro del navegador.
// Los pasos se agrupan y se envían en lotes para no guardar la partida a cada paso.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Pedometer } from './pedometer.js';

const StepCounter = registerPlugin('StepCounter');
const ENABLED_KEY = 'wokamon.steps.enabled';
const BASELINE_KEY = 'wokamon.steps.baseline';
const MAX_JUMP = 60000;

const isAndroid = Capacitor.getPlatform() === 'android';

function readStore(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeStore(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch { /* sin almacenamiento */ }
}

export function createStepService(onSteps) {
  let status = 'off'; // off | on | unavailable | denied | needs-tap
  let source = isAndroid ? 'native' : 'motion';
  let pending = 0;
  let flushTimer = null;
  let nativeHandle = null;
  const listeners = new Set();
  const pedometer = new Pedometer((n) => queue(n));
  let motionBound = false;

  const setStatus = (s) => {
    status = s;
    listeners.forEach((l) => l({ status, source }));
  };

  function queue(n) {
    pending += n;
    if (!flushTimer) flushTimer = setTimeout(flush, 2500);
  }

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = null;
    if (pending > 0) {
      const n = pending;
      pending = 0;
      onSteps(n);
    }
  }

  // El contador nativo da el total desde el último reinicio del móvil: sumamos la diferencia.
  function ingestNativeTotal(total) {
    const value = Math.floor(Number(total));
    if (!Number.isFinite(value) || value < 0) return;
    const stored = readStore(BASELINE_KEY);
    const baseline = stored == null ? null : Number(stored);
    writeStore(BASELINE_KEY, value);
    if (baseline == null) return;
    const delta = value >= baseline ? value - baseline : value; // el móvil se reinició
    if (delta > 0) {
      pending += Math.min(delta, MAX_JUMP);
      flush();
    }
  }

  async function startNative(userInitiated) {
    try {
      const info = await StepCounter.status();
      if (!info.available) {
        source = 'motion';
        return startMotion(userInitiated);
      }
      if (!info.granted && !userInitiated) return setStatus('needs-tap');
      const res = await StepCounter.start();
      if (!nativeHandle) {
        nativeHandle = await StepCounter.addListener('steps', (e) => ingestNativeTotal(e.steps));
      }
      if (res.steps != null) ingestNativeTotal(res.steps);
      writeStore(ENABLED_KEY, '1');
      return setStatus('on');
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes('PERMISSION')) return setStatus('denied');
      source = 'motion';
      return startMotion(userInitiated);
    }
  }

  async function startMotion(userInitiated) {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return setStatus('unavailable');
    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        if (!userInitiated) return setStatus('needs-tap');
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') return setStatus('denied');
      }
      if (!motionBound) {
        window.addEventListener('devicemotion', pedometer.handle);
        motionBound = true;
      }
      writeStore(ENABLED_KEY, '1');
      // Si en 3 s no llega ningún dato del sensor, este dispositivo no lo tiene (p. ej. un ordenador).
      let got = false;
      const probe = () => { got = true; window.removeEventListener('devicemotion', probe); };
      window.addEventListener('devicemotion', probe);
      setTimeout(() => {
        window.removeEventListener('devicemotion', probe);
        if (!got && status === 'on') setStatus('unavailable');
      }, 3000);
      return setStatus('on');
    } catch {
      return setStatus('unavailable');
    }
  }

  return {
    get state() { return { status, source }; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    wantsAutoStart() {
      return readStore(ENABLED_KEY) === '1';
    },
    start(userInitiated = true) {
      return source === 'native' ? startNative(userInitiated) : startMotion(userInitiated);
    },
    async stop() {
      flush();
      writeStore(ENABLED_KEY, null);
      if (motionBound) {
        window.removeEventListener('devicemotion', pedometer.handle);
        motionBound = false;
      }
      if (source === 'native') {
        try { await StepCounter.stop(); } catch { /* nada */ }
        nativeHandle?.remove();
        nativeHandle = null;
      }
      setStatus('off');
    },
    // Al volver a la app: recoge lo caminado mientras estaba cerrada.
    async resume() {
      if (status !== 'on') return;
      if (source === 'native') {
        try {
          const info = await StepCounter.status();
          if (info.steps != null) ingestNativeTotal(info.steps);
        } catch { /* nada */ }
      }
      flush();
    },
    flush,
  };
}
