// Firebase (Auth + Firestore). Se carga bajo demanda para que el modo invitado no descargue nada de esto.
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, indexedDBLocalPersistence, initializeAuth,
  onAuthStateChanged, signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, updateProfile,
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, serverTimestamp, setDoc,
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { migrateLegacy } from '../game/migrate.js';
import { reconcile } from '../game/engine.js';

const firebaseConfig = {
  projectId: 'wokamon-cd2ec',
  appId: '1:155455530301:web:e215bb02faf3fc3de31154',
  storageBucket: 'wokamon-cd2ec.firebasestorage.app',
  apiKey: 'AIzaSyBPiIYgDkkwxxceWFcciwGWEdrmPmg_ALA',
  authDomain: 'wokamon-cd2ec.firebaseapp.com',
  messagingSenderId: '155455530301',
  measurementId: 'G-27T9NZ8T55',
};

const app = initializeApp(firebaseConfig);
const native = Capacitor.isNativePlatform();
// En la app nativa no hay ventanas emergentes: persistencia en IndexedDB sin resolutor de popups.
export const auth = native ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);
const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  }
})();

export function userInfo(u) {
  if (!u) return null;
  let name = u.displayName;
  if (!name && u.email?.endsWith('@wokamon.com')) {
    const raw = u.email.replace('@wokamon.com', '');
    name = raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  return { uid: u.uid, name: name || u.email || 'Jugador', email: u.email || null, photo: u.photoURL || null };
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, (u) => callback(userInfo(u)));
}

// "usuario" a secas se guarda como usuario@wokamon.com (igual que en la versión 1).
const toEmail = (id) => {
  const v = id.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@wokamon.com`;
};

export function friendlyError(error) {
  const code = error?.code || error?.message || '';
  if (code.includes('email-already-in-use')) return 'Ya existe una cuenta con ese usuario o email.';
  if (code.includes('invalid-email')) return 'Ese email no tiene un formato válido.';
  if (code.includes('weak-password')) return 'La contraseña necesita al menos 6 caracteres.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) return 'Usuario o contraseña incorrectos.';
  if (code.includes('popup-closed') || code.includes('cancel')) return 'Has cancelado el inicio de sesión.';
  if (code.includes('network')) return 'Sin conexión. Prueba de nuevo cuando tengas internet.';
  return 'No se ha podido iniciar sesión. Inténtalo otra vez.';
}

export async function signInEmail(id, password) {
  await signInWithEmailAndPassword(auth, toEmail(id), password);
}

export async function signUpEmail(id, password) {
  const cred = await createUserWithEmailAndPassword(auth, toEmail(id), password);
  const displayName = id.includes('@') ? id.split('@')[0] : id.trim();
  await updateProfile(cred.user, { displayName });
}

export async function signInGoogle() {
  if (native) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true });
    const credential = GoogleAuthProvider.credential(result.credential?.idToken || null, result.credential?.accessToken || null);
    await signInWithCredential(auth, credential);
    return;
  }
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOut() {
  if (native) {
    try {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      await FirebaseAuthentication.signOut();
    } catch { /* sin sesión nativa */ }
  }
  await fbSignOut(auth);
}

// Carga la partida: formato v2 si existe; si no, migra la partida de la versión 1 sin borrar nada.
export async function loadGame(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : null;
  if (data?.game) return { state: reconcile(data.game), source: 'cloud' };
  if (data?.user) {
    const [w, e, h] = await Promise.all(['wokamons', 'eggs', 'history'].map((name) => getDocs(collection(db, 'users', user.uid, name))));
    const state = migrateLegacy({
      doc: data,
      wokamons: w.docs.map((d) => d.data()),
      eggs: e.docs.map((d) => d.data()),
      history: h.docs.map((d) => d.data()),
    });
    return { state, source: 'legacy' };
  }
  return { state: null, source: 'empty' };
}

export async function saveGame(user, state) {
  await setDoc(doc(db, 'users', user.uid), {
    game: state,
    gameUpdatedAt: serverTimestamp(),
    profile: { uid: user.uid, displayName: user.name, email: user.email, photoUrl: user.photo, lastSeenAt: Date.now() },
  }, { mergeFields: ['game', 'gameUpdatedAt', 'profile'] });
}
