// Estado global: partida + sesión. Un único sitio que aplica acciones, guarda y emite eventos.
import { useSyncExternalStore } from 'react';
import { actions, newGameState, reconcile } from '../game/engine.js';

const MODE_KEY = 'wokamon.mode';
const GUEST_KEY = 'wokamon.v2.guest';
const PREFS_KEY = 'wokamon.prefs';
export const IS_DEMO = import.meta.env.MODE === 'demo';

const storage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* almacenamiento no disponible */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* idem */ }
  },
};

function readJSON(key, fallback) {
  try { return JSON.parse(storage.get(key)) ?? fallback; } catch { return fallback; }
}

let game = null;
let session = { status: 'booting', mode: null, user: null, error: null, saving: false, lastSavedAt: null };
let prefs = { devTools: IS_DEMO, ...readJSON(PREFS_KEY, {}) };
let snapshot = { game, session, prefs };
const listeners = new Set();
const eventListeners = new Set();
let cloud = null;
let saveTimer = null;
let unwatchAuth = null;

function publish() {
  snapshot = { game, session, prefs };
  listeners.forEach((l) => l());
}

function setSession(patch) {
  session = { ...session, ...patch };
  publish();
}

function emit(events) {
  for (const e of events) eventListeners.forEach((l) => l(e));
}

// ---------- Guardado ----------

async function persistNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!game) return;
  if (session.mode === 'guest') {
    storage.set(GUEST_KEY, JSON.stringify(game));
    return;
  }
  if (session.mode === 'cloud' && session.user && cloud) {
    setSession({ saving: true });
    try {
      await cloud.saveGame(session.user, game);
      setSession({ saving: false, lastSavedAt: Date.now(), error: null });
    } catch (err) {
      console.error('No se pudo guardar en la nube', err);
      setSession({ saving: false, error: 'save' });
    }
  }
}

function scheduleSave(delay = 1500) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persistNow, delay);
}

if (typeof window !== 'undefined') {
  const flush = () => { if (saveTimer) persistNow(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

// ---------- Acciones ----------

export function dispatch(type, payload = {}) {
  if (!game || !actions[type]) return [];
  const draft = structuredClone(game);
  const events = actions[type](draft, payload, { now: new Date(), owner: session.user?.name || null }) || [];
  game = draft;
  publish();
  scheduleSave(type === 'addSteps' ? 4000 : 800);
  emit(events);
  return events;
}

export function onGameEvent(listener) {
  eventListeners.add(listener);
  return () => eventListeners.delete(listener);
}

export function setPref(key, value) {
  prefs = { ...prefs, [key]: value };
  storage.set(PREFS_KEY, JSON.stringify(prefs));
  publish();
}

// ---------- Sesión ----------

function startGuest() {
  const saved = readJSON(GUEST_KEY, null);
  game = saved ? reconcile(saved) : newGameState();
  storage.set(MODE_KEY, 'guest');
  session = { ...session, status: 'ready', mode: 'guest', user: null, error: null };
  publish();
  persistNow();
  dispatch('settle');
}

async function loadCloud() {
  // En la demo no se incluye Firebase.
  if (!cloud) cloud = import.meta.env.MODE === 'demo' ? null : await import('./cloud.js');
  if (!cloud) throw new Error('Sin conexión a la nube en la demo');
  return cloud;
}

async function attachCloudUser(user) {
  setSession({ status: 'loading', mode: 'cloud', user });
  try {
    const { state, source } = await cloud.loadGame(user);
    let next = state;
    if (!next) {
      // Cuenta nueva: si venías jugando como invitado, tu partida se sube a la cuenta.
      const guest = readJSON(GUEST_KEY, null);
      next = guest ? reconcile(guest) : newGameState();
    }
    game = next;
    session = { ...session, status: 'ready', mode: 'cloud', user, error: null, migrated: source === 'legacy' };
    publish();
    if (source !== 'cloud') await persistNow();
    dispatch('settle');
  } catch (err) {
    console.error(err);
    setSession({ status: 'error', error: 'load' });
  }
}

async function watchCloud() {
  await loadCloud();
  unwatchAuth?.();
  unwatchAuth = cloud.watchAuth((user) => {
    if (user) {
      if (session.user?.uid !== user.uid || session.status !== 'ready') attachCloudUser(user);
    } else if (session.mode === 'cloud') {
      game = null;
      session = { ...session, status: 'welcome', mode: null, user: null };
      storage.remove(MODE_KEY);
      publish();
    }
  });
}

export async function boot() {
  if (IS_DEMO) return startGuest();
  const mode = storage.get(MODE_KEY);
  if (mode === 'guest') return startGuest();
  if (mode === 'cloud') {
    setSession({ status: 'loading', mode: 'cloud' });
    try {
      await watchCloud();
    } catch (err) {
      console.error(err);
      setSession({ status: 'error', error: 'offline' });
    }
    return undefined;
  }
  setSession({ status: 'welcome' });
  return undefined;
}

export const session$ = {
  playAsGuest: startGuest,

  async signIn(method, id, password) {
    try {
      await loadCloud();
      storage.set(MODE_KEY, 'cloud');
      if (method === 'google') await cloud.signInGoogle();
      else if (method === 'signup') await cloud.signUpEmail(id, password);
      else await cloud.signInEmail(id, password);
      await watchCloud();
      return { ok: true };
    } catch (err) {
      console.error(err);
      if (session.mode !== 'cloud' || !session.user) storage.set(MODE_KEY, session.mode || '');
      return { ok: false, message: cloud ? cloud.friendlyError(err) : 'No hay conexión con el servidor.' };
    }
  },

  async signOut() {
    await persistNow();
    if (session.mode === 'cloud' && cloud) {
      await cloud.signOut();
      return;
    }
    storage.remove(MODE_KEY);
    game = null;
    session = { ...session, status: 'welcome', mode: null, user: null };
    publish();
  },

  retry: boot,
};

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useStore() {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function getGame() {
  return game;
}
