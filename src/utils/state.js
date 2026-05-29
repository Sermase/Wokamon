// Wokamon Evolucionado - Global State Management (Mendelian Genetics & Firebase Cloud Edition)

import { auth, db } from './firebase.js';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';


// Helper to generate unique IDs
export function generateId() {
  return 'wk_' + Math.random().toString(36).substr(2, 9);
}

// Predefined names for Wokamons
const WOKAMON_NAMES = [
  'Woki', 'Bambam', 'Puff', 'Chispas', 'Gordo', 'Zipo', 'Kiko', 'Tito', 
  'Mimo', 'Nono', 'Lulu', 'Jojo', 'Dodo', 'Fifi', 'Gugu', 'Rulu', 'Pip'
];

const DAILY_STEP_LIMIT_FREE = 10000;
const DAILY_STEPS_PER_WOKAMON = 5000;
const BASE_LIFESPAN_DAYS = 30;
const DAILY_CARE_CUTOFF_HOUR = 5;

function normalizeAuthEmail(identifier) {
  const value = identifier.trim().toLowerCase();
  return value.includes('@') ? value : `${value}@wokamon.com`;
}

function getFriendlyAuthError(error, fallback = 'No se pudo completar la autenticación') {
  const code = error?.code || '';
  if (code.includes('email-already-in-use')) return 'Ese email ya tiene un criadero.';
  if (code.includes('invalid-email')) return 'El email no tiene un formato válido.';
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential')) {
    return 'Email/usuario o contraseña incorrectos.';
  }
  if (code.includes('popup-closed-by-user') || code.includes('canceled') || code.includes('cancelled')) {
    return 'Inicio de sesión cancelado.';
  }
  return fallback;
}

function getAuthDisplayName(firebaseUser) {
  if (!firebaseUser) return null;
  if (firebaseUser.displayName) return firebaseUser.displayName;
  if (firebaseUser.email?.endsWith('@wokamon.com')) {
    const username = firebaseUser.email.replace('@wokamon.com', '');
    return username.charAt(0).toUpperCase() + username.slice(1);
  }
  return firebaseUser.email || 'Jugador';
}

function getLocalCareCycleKey(date = new Date()) {
  const cycleDate = new Date(date);
  if (cycleDate.getHours() < DAILY_CARE_CUTOFF_HOUR) {
    cycleDate.setDate(cycleDate.getDate() - 1);
  }

  const year = cycleDate.getFullYear();
  const month = String(cycleDate.getMonth() + 1).padStart(2, '0');
  const day = String(cycleDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDaysBetweenCareKeys(previousKey, currentKey) {
  const parseKey = (key) => {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const diffMs = parseKey(currentKey).getTime() - parseKey(previousKey).getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function getRandomName() {
  return WOKAMON_NAMES[Math.floor(Math.random() * WOKAMON_NAMES.length)];
}

export const TRAIT_LABELS_ES = {
  bodyType: 'Cuerpo',
  ears: 'Orejas',
  eyes: 'Ojos',
  horns: 'Cuernos',
  wings: 'Alas'
};

export const TRAIT_VALUE_LABELS_ES = {
  round: 'redondo',
  oval: 'ovalado',
  squarish: 'cuadrado',
  cloud: 'nube',
  blob: 'gota',
  teddy: 'de oso',
  pointy: 'puntiagudas',
  floppy: 'caidas',
  long: 'largas',
  fire: 'de fuego',
  sparkle: 'brillantes',
  sleepy: 'somnolientos',
  normal: 'normales',
  neon: 'de neon',
  ram: 'de carnero',
  small: 'pequenos',
  none: 'sin rasgo',
  angel: 'de angel',
  dragon: 'de dragon'
};

export function getTraitLabel(trait) {
  return TRAIT_LABELS_ES[trait] || trait;
}

export function getTraitValueLabel(value, trait = '') {
  if (value === 'none' && trait === 'horns') return 'sin cuernos';
  if (value === 'none' && trait === 'wings') return 'sin alas';
  return TRAIT_VALUE_LABELS_ES[value] || value;
}

// ==========================================
// REAL BIOLOGY MENDELIAN GENETICS DEFINITION
// ==========================================

export const ALLELES_DOMINANCE = {
  bodyType: {
    'R': { name: 'round', dominance: 3, label: 'Cuerpo Redondo (Dom. R)' },
    'o': { name: 'oval', dominance: 1, label: 'Cuerpo Ovalado (Rec. o)' },
    'q': { name: 'squarish', dominance: 1, label: 'Cuerpo Cuadrado (Rec. q)' },
    'c': { name: 'cloud', dominance: 1, label: 'Cuerpo Nube (Rec. c)' },
    'b': { name: 'blob', dominance: 1, label: 'Cuerpo Blob (Rec. b)' }
  },
  ears: {
    'T': { name: 'teddy', dominance: 3, label: 'Orejas de Oso (Dom. T)' },
    'p': { name: 'pointy', dominance: 1, label: 'Orejas Puntiagudas (Rec. p)' },
    'f': { name: 'floppy', dominance: 1, label: 'Orejas caídas (Rec. f)' },
    'l': { name: 'long', dominance: 1, label: 'Orejas Largas (Rec. l)' }
  },
  eyes: {
    'F': { name: 'fire', dominance: 4, label: 'Ojos de Fuego (Prem. Dom. F)' },
    'S': { name: 'sparkle', dominance: 3, label: 'Ojos Brillantes (Dom. S)' },
    'y': { name: 'sleepy', dominance: 1, label: 'Ojos Somnolientos (Rec. y)' },
    'n': { name: 'normal', dominance: 1, label: 'Ojos Normales (Rec. n)' }
  },
  horns: {
    'N': { name: 'neon', dominance: 4, label: 'Cuernos de neón (Prem. Dom. N)' },
    'M': { name: 'ram', dominance: 3, label: 'Cuernos de carnero (Dom. M)' },
    'A': { name: 'small', dominance: 2, label: 'Cuernos pequeños (Dom. A)' },
    'h': { name: 'none', dominance: 1, label: 'Sin Cuernos (Rec. h)' }
  },
  wings: {
    'D': { name: 'dragon', dominance: 4, label: 'Alas de dragón (Prem. Dom. D)' },
    'G': { name: 'angel', dominance: 3, label: 'Alas de ángel (Dom. G)' },
    'w': { name: 'none', dominance: 1, label: 'Sin Alas (Rec. w)' }
  }
};

// Convert a pair of alleles to its expressed Phenotype
export function getPhenotype(genotype) {
  const phenotype = {};
  for (const trait in genotype) {
    const alleles = genotype[trait];
    const alleleA = alleles[0];
    const alleleB = alleles[1];
    
    const infoA = ALLELES_DOMINANCE[trait][alleleA];
    const infoB = ALLELES_DOMINANCE[trait][alleleB];
    
    if (infoA.dominance >= infoB.dominance) {
      phenotype[trait] = infoA.name;
    } else {
      phenotype[trait] = infoB.name;
    }
  }
  return phenotype;
}

export function getAlleleForName(locus, name) {
  for (const allele in ALLELES_DOMINANCE[locus]) {
    if (ALLELES_DOMINANCE[locus][allele].name === name) {
      return allele;
    }
  }
  return null;
}

// Calculate the percentage of Heterozygous Loci (genetic heterogeneity)
export function getHeterozygosity(genotype) {
  let heterozygousLoci = 0;
  const traits = ['bodyType', 'ears', 'eyes', 'horns', 'wings'];
  traits.forEach(trait => {
    if (genotype[trait][0] !== genotype[trait][1]) {
      heterozygousLoci += 1;
    }
  });
  return (heterozygousLoci / 5) * 100;
}

// Perform Mendelian Segregation (Hybrid cross)
export function mendelianCross(parentAGenotype, parentBGenotype) {
  const childGenotype = {};
  const traits = ['bodyType', 'ears', 'eyes', 'horns', 'wings'];
  traits.forEach(trait => {
    const alleleFromA = parentAGenotype[trait][Math.floor(Math.random() * 2)];
    const alleleFromB = parentBGenotype[trait][Math.floor(Math.random() * 2)];
    childGenotype[trait] = [alleleFromA, alleleFromB];
  });
  return childGenotype;
}

// Calculate Punnett Square probabilities based on Mendelian Segregation
export function calculatePunnettSquare(parentAGenotype, parentBGenotype) {
  const probabilities = {};
  const traits = ['bodyType', 'ears', 'eyes', 'horns', 'wings'];
  
  traits.forEach(trait => {
    const parentAAlleles = parentAGenotype[trait];
    const parentBAlleles = parentBGenotype[trait];
    
    const combinations = [];
    parentAAlleles.forEach(alA => {
      parentBAlleles.forEach(alB => {
        combinations.push([alA, alB]);
      });
    });
    
    const counts = {};
    combinations.forEach(combo => {
      const tempGenotype = { [trait]: combo };
      const expressName = getPhenotype(tempGenotype)[trait];
      counts[expressName] = (counts[expressName] || 0) + 1;
    });
    
    probabilities[trait] = [];
    for (const name in counts) {
      probabilities[trait].push({
        name: name,
        chance: counts[name] / 4
      });
    }
    probabilities[trait].sort((a, b) => b.chance - a.chance);
  });
  
  return probabilities;
}

export function getMaxVitality(genotype) {
  const phenotype = getPhenotype(genotype);
  if (phenotype.bodyType === 'round' || phenotype.bodyType === 'oval') {
    return 120;
  }
  return 100;
}

export function getWokamonScale(genotype) {
  const phenotype = getPhenotype(genotype);
  if (phenotype.bodyType === 'cloud' && (phenotype.horns === 'ram' || phenotype.horns === 'neon')) {
    return 1.25; // Large scale
  }
  if (phenotype.bodyType === 'blob' || phenotype.ears === 'floppy') {
    return 0.85; // Small scale
  }
  return 1.0; // Medium scale
}

// Create a baby Wokamon Niño with homozygous low heterozygosity genes
export function createWokamonChild(name = 'Bebé Woki') {
  const genotype = {
    bodyType: ['R', 'R'],
    ears: ['T', 'T'],
    eyes: ['n', 'n'],
    horns: ['h', 'h'],
    wings: ['w', 'w']
  };
  const phenotype = getPhenotype(genotype);
  const maxVit = getMaxVitality(genotype);
  
  return {
    id: generateId(),
    name: name,
    level: 1,
    growth: 0,
    age: 0, 
    hunger: 100, 
    joy: 100,
    disease: 0,
    vitality: maxVit,
    status: 'happy',
    stage: 'Niño',
    generation: 1,
    genotype: genotype,
    heterozygosity: getHeterozygosity(genotype),
    familyTree: null,
    genetics: {
      bodyType: phenotype.bodyType,
      ears: phenotype.ears,
      eyes: phenotype.eyes,
      horns: phenotype.horns,
      wings: phenotype.wings,
      primaryColor: '#ffcc00', 
      bellyColor: '#ffe57f',
      paintedPattern: null
    }
  };
}

// Initial template for a User Account Profile
const defaultState = {
  user: {
    stepsToday: 0,
    totalEnergy: 10,
    crystals: 5,
    isPremium: false,
    firstWalkDone: false,
    lastCareSettlementKey: null,
    stepHistory: [],
  },
  wokamons: [],
  eggs: [],
  matingState: {
    stage: 'idle',
    parentAId: null,
    parentBId: null,
    partnerName: '',
    partnerWokamon: null,
    stepsWalked: 0,
    stepsTarget: 5000,
    successChance: 0.5,
    isViable: true,
    resultEggColor: '#f5f5f5',
    resultEggGenetics: null
  },
  shop: {
    unlockedGenes: ['normal', 'teddy', 'small', 'none']
  },
  collection: [],
  history: []
};

class GameState {
  get currentUser() {
    return getAuthDisplayName(auth.currentUser);
  }

  get currentUserPhoto() {
    return auth.currentUser?.photoURL || null;
  }

  constructor() {
    this.activeUser = null;
    this.userStats = { ...defaultState.user };
    this.wokamons = [];
    this.eggs = [];
    this.matingState = { ...defaultState.matingState };
    this.shop = { ...defaultState.shop };
    this.collection = [];
    this.history = [];
    this.listeners = [];
    this.isLoading = false;

    // Listen to Firebase Auth
    onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        this.isLoading = true;
        this.activeUser = firebaseUser.uid;
        await this.loadUserData(firebaseUser.uid);
        await this.saveUserProfile(firebaseUser);
      } else {
        this.activeUser = null;
        this.resetLocalInMemory();
      }
      this.isLoading = false;
      this.notify();
    });
  }

  resetLocalInMemory() {
    this.userStats = JSON.parse(JSON.stringify(defaultState.user));
    this.wokamons = [];
    this.eggs = [];
    this.matingState = JSON.parse(JSON.stringify(defaultState.matingState));
    this.shop = JSON.parse(JSON.stringify(defaultState.shop));
    this.collection = [];
    this.history = [];
  }

  async loadUserData(uid) {
    try {
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        this.userStats = { ...JSON.parse(JSON.stringify(defaultState.user)), ...(data.user || {}) };
        this.matingState = data.matingState || JSON.parse(JSON.stringify(defaultState.matingState));
        this.shop = data.shop || JSON.parse(JSON.stringify(defaultState.shop));
        this.collection = data.collection || [];
      } else {
        const initialUserDoc = {
          user: JSON.parse(JSON.stringify(defaultState.user)),
          matingState: JSON.parse(JSON.stringify(defaultState.matingState)),
          shop: JSON.parse(JSON.stringify(defaultState.shop)),
          collection: [],
          profile: {}
        };
        await setDoc(userRef, initialUserDoc);
        this.userStats = initialUserDoc.user;
        this.matingState = initialUserDoc.matingState;
        this.shop = initialUserDoc.shop;
        this.collection = initialUserDoc.collection;
      }
      
      // Load Wokamons
      const woksColl = collection(db, 'users', uid, 'wokamons');
      const woksSnap = await getDocs(woksColl);
      this.wokamons = woksSnap.docs.map(d => d.data());
      this.wokamons.forEach(w => this.normalizeWokamonLifecycle(w));
      
      // Load Eggs
      const eggsColl = collection(db, 'users', uid, 'eggs');
      const eggsSnap = await getDocs(eggsColl);
      this.eggs = eggsSnap.docs.map(d => d.data());
      
      // Load History
      const historyColl = collection(db, 'users', uid, 'history');
      const historySnap = await getDocs(historyColl);
      this.history = historySnap.docs.map(d => d.data());
      this.history.sort((a, b) => b.timestampOrder - a.timestampOrder);
    } catch (e) {
      console.error('Error loading user data from Firestore:', e);
    }
  }

  async saveAll() {
    if (!this.activeUser) {
      this.notify();
      return;
    }
    
    this.notify(); // Instant local notify for zero-latency UI responses
    
    try {
      const uid = this.activeUser;
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        user: this.userStats,
        matingState: this.matingState,
        shop: this.shop,
        collection: this.collection
      }, { merge: true });
      
      // Write each wokamon
      for (const w of this.wokamons) {
        const wRef = doc(db, 'users', uid, 'wokamons', w.id);
        await setDoc(wRef, w);
      }
      
      // Write each egg
      for (const e of this.eggs) {
        const eRef = doc(db, 'users', uid, 'eggs', e.id);
        await setDoc(eRef, e);
      }
    } catch (e) {
      console.error('Error syncing state to Cloud Firestore:', e);
    }
  }

  // Active Session state accessor
  get activeState() {
    return {
      user: this.userStats,
      wokamons: this.wokamons,
      eggs: this.eggs,
      matingState: this.matingState,
      shop: this.shop,
      collection: this.collection,
      history: this.history,
      isLoading: this.isLoading
    };
  }

  // Listener pattern
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.activeState));
  }

  // ==========================================
  // SESSION AUTHENTICATION ACTIONS
  // ==========================================

  async signUp(username, password) {
    if (!username || !password) return { success: false, message: 'Falta usuario o contraseña' };
    const email = normalizeAuthEmail(username);
    const displayName = username.includes('@') ? username.split('@')[0] : username.trim();
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName });
      await this.saveUserProfile(credential.user);
      this.logActivity('WALK', `Bienvenido a Wokamon, ${displayName}. Tu criadero biológico ha sido creado.`);
      return { success: true };
    } catch (error) {
      return { success: false, message: getFriendlyAuthError(error, 'Error en el registro') };
    }
  }

  async signIn(username, password) {
    if (!username || !password) return { success: false, message: 'Falta usuario o contraseña' };
    const email = normalizeAuthEmail(username);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await this.saveUserProfile(credential.user);
      this.logActivity('WALK', `Sesión iniciada como ${getAuthDisplayName(credential.user)}.`);
      return { success: true };
    } catch (error) {
      return { success: false, message: getFriendlyAuthError(error, 'Usuario o contraseña incorrectos') };
    }
  }

  async signInWithGoogle() {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle({
        skipNativeAuth: true,
        scopes: ['email', 'profile']
      });

      if (!auth.currentUser && result.credential) {
        const credential = GoogleAuthProvider.credential(
          result.credential.idToken || null,
          result.credential.accessToken || null
        );
        await signInWithCredential(auth, credential);
      }

      const signedUser = auth.currentUser;
      if (signedUser) {
        await this.saveUserProfile(signedUser);
        this.logActivity('WALK', `Sesión iniciada con Google como ${getAuthDisplayName(signedUser)}.`);
      }

      return { success: true };
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return { success: false, message: getFriendlyAuthError(error, 'No se pudo iniciar sesión con Google') };
    }
  }

  async signInWithPlayGames() {
    try {
      const result = await FirebaseAuthentication.signInWithPlayGames({
        skipNativeAuth: true,
        scopes: ['games_lite']
      });

      if (!auth.currentUser && result.credential) {
        const credential = GoogleAuthProvider.credential(
          result.credential.idToken || null,
          result.credential.accessToken || null
        );
        await signInWithCredential(auth, credential);
      }

      const signedUser = auth.currentUser;
      if (signedUser) {
        await this.saveUserProfile(signedUser);
        this.logActivity('WALK', 'Sesión iniciada con Google Play Games.');
      }

      return { success: true };
    } catch (error) {
      console.error('Play Games sign-in failed:', error);
      return { success: false, message: getFriendlyAuthError(error, 'Google Play Games aún no está disponible en este dispositivo') };
    }
  }

  async signOut() {
    try {
      await FirebaseAuthentication.signOut().catch(() => {});
      await fbSignOut(auth);
    } catch (e) {
      console.error(e);
    }
  }

  async saveUserProfile(firebaseUser) {
    if (!firebaseUser) return;
    try {
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        profile: {
          uid: firebaseUser.uid,
          email: firebaseUser.email || null,
          displayName: getAuthDisplayName(firebaseUser),
          photoUrl: firebaseUser.photoURL || null,
          providerIds: firebaseUser.providerData?.map(provider => provider.providerId) || [],
          lastLoginAt: Date.now()
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error saving auth profile:', error);
    }
  }

  loadState() {
    return this.activeState;
  }

  // Activity Log creation
  async logActivity(type, text) {
    if (!this.activeUser) return;

    const timestampOrder = Date.now();
    const newLog = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      type: type, // WALK, FEED, BREED, HATCH, GIFT, CLAIM, SHOP_BUY
      text: text,
      timestamp: new Date().toLocaleTimeString(),
      timestampOrder: timestampOrder
    };

    this.history.unshift(newLog);
    if (this.history.length > 40) {
      this.history.pop();
    }
    
    this.notify();

    // Async background save to Firestore
    try {
      const logRef = doc(db, 'users', this.activeUser, 'history', newLog.id);
      await setDoc(logRef, newLog);
    } catch (e) {
      console.error('Error logging activity to cloud:', e);
    }
  }

  // Add phenotype signature to discovery album
  registerDiscovery(wokamon) {
    if (!this.activeUser) return;
    const signature = `bodyType:${wokamon.genetics.bodyType}|ears:${wokamon.genetics.ears}|eyes:${wokamon.genetics.eyes}|horns:${wokamon.genetics.horns}|wings:${wokamon.genetics.wings}`;
    if (!this.collection.includes(signature)) {
      this.collection.push(signature);
      this.logActivity('HATCH', `Registrado en Wokadex: ${wokamon.name} descubrió nuevos rasgos.`);
      this.saveAll();
    }
  }

  // ==========================================
  // GAMEPLAY STATE MODIFIERS
  // ==========================================

  getUser() { return this.userStats; }
  getWokamons() { return this.wokamons; }
  getEggs() { return this.eggs; }
  getMatingState() { return this.matingState; }
  getShop() { return this.shop; }

  togglePremium() {
    this.userStats.isPremium = !this.userStats.isPremium;
    this.logActivity('SHOP_BUY', this.userStats.isPremium ? 'Suscripción Premium activada.' : 'Suscripción Premium desactivada.');
    this.saveAll();
  }

  getWokamonLifespan(wokamon) {
    const phenotype = getPhenotype(wokamon.genotype);
    let lifespan = BASE_LIFESPAN_DAYS;

    if (phenotype.wings === 'angel' || phenotype.wings === 'dragon') lifespan += 4;
    if (phenotype.bodyType === 'cloud' || phenotype.bodyType === 'blob') lifespan += 2;
    if (phenotype.eyes === 'sparkle' || phenotype.eyes === 'fire') lifespan += 2;
    if (phenotype.horns === 'ram' || phenotype.horns === 'neon') lifespan -= 2;
    if (wokamon.heterozygosity >= 80) lifespan += 3;
    else if (wokamon.heterozygosity >= 40) lifespan += 1;
    if (wokamon.efficientMetabolism) lifespan += 2;

    return Math.max(24, Math.min(42, lifespan));
  }

  getDailyStepNeed(wokamon) {
    const phenotype = getPhenotype(wokamon.genotype);
    let need = DAILY_STEPS_PER_WOKAMON;

    if (wokamon.efficientMetabolism) need *= 0.85;
    if (phenotype.bodyType === 'cloud' || phenotype.bodyType === 'blob') need *= 0.95;
    if (wokamon.heterozygosity >= 80) need *= 0.9;

    return Math.round(need / 50) * 50;
  }

  normalizeWokamonLifecycle(wokamon) {
    if (!wokamon) return null;

    const maxVit = getMaxVitality(wokamon.genotype);
    const lifespan = this.getWokamonLifespan(wokamon);

    if (wokamon.age === undefined || Number.isNaN(Number(wokamon.age))) wokamon.age = 0;
    if (wokamon.joy === undefined) wokamon.joy = 100;
    if (wokamon.disease === undefined) wokamon.disease = 0;
    if (wokamon.vitality === undefined) wokamon.vitality = maxVit;
    if (wokamon.dailyDeficitDays === undefined) wokamon.dailyDeficitDays = 0;
    if (wokamon.dailyStepNeed === undefined) wokamon.dailyStepNeed = this.getDailyStepNeed(wokamon);
    wokamon.maxVitality = maxVit;
    wokamon.lifespanDays = lifespan;

    if (wokamon.status === 'dead') {
      wokamon.stage = 'Fantasma';
      return wokamon;
    }

    if (wokamon.age >= Math.floor(lifespan * 0.75)) {
      wokamon.stage = 'Anciano';
    } else if (wokamon.age >= 7 || wokamon.level >= 3) {
      wokamon.stage = 'Adulto';
    } else {
      wokamon.stage = 'Niño';
    }

    return wokamon;
  }

  recordStepHistory(steps, used) {
    const date = new Date().toISOString().slice(0, 10);
    const history = this.userStats.stepHistory || [];
    const existing = history.find(item => item.date === date);

    if (existing) {
      existing.steps = Math.max(existing.steps || 0, steps || 0);
      existing.used = (existing.used || 0) + (used || 0);
    } else {
      history.push({ date, steps: steps || 0, used: used || 0 });
    }

    this.userStats.stepHistory = history.slice(-30);
  }

  addSteps(amount, source = 'manual') {
    if (!this.activeUser) return { actualAdded: 0, energyEarned: 0, firstChildTriggered: false };
    
    const limit = this.userStats.isPremium ? Infinity : DAILY_STEP_LIMIT_FREE;
    
    let actualAdded = amount;
    if (this.userStats.stepsToday + amount > limit) {
      actualAdded = Math.max(0, limit - this.userStats.stepsToday);
    }

    this.userStats.stepsToday += actualAdded;
    
    const energyEarned = actualAdded;
    this.userStats.totalEnergy += energyEarned;

    if (actualAdded >= 200) {
      const action = source === 'mobile' ? 'Sincronizaste pasos' : 'Sumaste pasos';
      this.logActivity('WALK', `Pasos: ${action.toLowerCase()} +${actualAdded}.`);
    }

    let firstChildTriggered = false;
    if (actualAdded > 0 && this.wokamons.length === 0 && !this.userStats.firstWalkDone) {
      const firstChild = createWokamonChild('Woki Bebé');
      this.wokamons.push(firstChild);
      this.registerDiscovery(firstChild);
      this.userStats.firstWalkDone = true;
      firstChildTriggered = true;
      
      this.logActivity('HATCH', 'Tus primeros pasos atrajeron a Woki Bebé.');
    }

    if (this.matingState.stage === 'walking') {
      this.matingState.stepsWalked += actualAdded;
      if (this.matingState.stepsWalked >= this.matingState.stepsTarget) {
        this.matingState.stepsWalked = this.matingState.stepsTarget;
        
        const roll = Math.random();
        this.matingState.isViable = roll <= this.matingState.successChance;
        
        this.matingState.stage = 'completed';
        this.logActivity('BREED', `Caminata del huevo completada con viabilidad: ${this.matingState.isViable ? 'viable' : 'crítica'}.`);
      }
    }

    const livingWoks = this.wokamons.filter(w => w.status !== 'dead');
    if (this.eggs.length > 0 && livingWoks.length === 0 && actualAdded > 0) {
      const directWarmth = Math.floor(actualAdded / 10);
      this.eggs.forEach(egg => {
        egg.pointsCurrent = Math.min(egg.pointsTarget, egg.pointsCurrent + directWarmth * 3);
        egg.incubationProgress = parseFloat(((egg.pointsCurrent / egg.pointsTarget) * 15).toFixed(2));
      });
    }

    this.saveAll();
    return { actualAdded, energyEarned, firstChildTriggered };
  }

  feedWokamon(id, energyAmount) {
    const wokamon = this.wokamons.find(w => w.id === id);
    if (!wokamon || wokamon.status === 'dead') return false;
    if (wokamon.hunger >= 100) return false;

    if (this.userStats.totalEnergy < energyAmount) return false;

    this.userStats.totalEnergy -= energyAmount;
    wokamon.hunger = Math.min(100, wokamon.hunger + 30);
    
    // Ears affect joy boost
    const phenotype = getPhenotype(wokamon.genotype);
    if (phenotype.ears === 'pointy' || phenotype.ears === 'floppy') {
      wokamon.joy = Math.min(100, (wokamon.joy || 100) + 15);
    }
    
    // Growth multiplier modified by Hybrid Vigor (Variabilidad / Heterocigosis)
    let growthMultiplier = 1.0;
    if (wokamon.heterozygosity >= 80) {
      growthMultiplier = 1.30; // +30% Hybrid Vigor
    } else if (wokamon.heterozygosity >= 40) {
      growthMultiplier = 1.15; // +15% Hybrid Vigor
    }
    
    wokamon.growth += Math.floor((energyAmount / 5) * growthMultiplier);
    this.logActivity('FEED', `Alimentaste a ${wokamon.name} con ${energyAmount} pasos. Hambre +30%.`);
    
    if (wokamon.growth >= 100) {
      wokamon.level += 1;
      wokamon.growth = wokamon.growth - 100;
      this.normalizeWokamonLifecycle(wokamon);

      this.logActivity('FEED', `${wokamon.name} ha evolucionado a nivel ${wokamon.level} (${wokamon.stage}).`);
      this.userStats.crystals += wokamon.level * 2;
    }

    // Health updates based on stats
    if (wokamon.disease >= 50) {
      wokamon.status = 'sick';
    } else if (wokamon.hunger > 50) {
      wokamon.status = 'happy';
    } else if (wokamon.hunger > 20) {
      wokamon.status = 'depressed';
    }

    this.eggs.forEach(egg => {
      if (egg.incubatingParentId === id) {
        egg.pointsCurrent = Math.min(egg.pointsTarget, egg.pointsCurrent + 120);
        egg.incubationProgress = parseFloat(((egg.pointsCurrent / egg.pointsTarget) * 15).toFixed(2));
      }
    });

    this.saveAll();
    return true;
  }

  cureWokamon(id) {
    const wokamon = this.wokamons.find(w => w.id === id);
    if (!wokamon || wokamon.status === 'dead') return false;

    const cost = 10; // 10 Cristales
    if (this.userStats.crystals < cost) return false;

    this.userStats.crystals -= cost;
    wokamon.disease = 0; // Cured!
    const maxVit = getMaxVitality(wokamon.genotype);
    wokamon.vitality = Math.min(maxVit, (wokamon.vitality || maxVit) + 30);
    
    if (wokamon.hunger > 25) {
      wokamon.status = 'happy';
    } else {
      wokamon.status = 'starving';
    }

    this.logActivity('FEED', `Suministraste medicina a ${wokamon.name} (-10 cristales). Curado.`);
    this.saveAll();
    return true;
  }

  assignParentToEgg(eggId, parentId) {
    const egg = this.eggs.find(e => e.id === eggId);
    if (!egg) return false;

    if (parentId === 'none') {
      egg.incubatingParentId = null;
      this.saveAll();
      return true;
    }

    const parent = this.wokamons.find(w => w.id === parentId);
    if (!parent || parent.status === 'dead' || parent.stage === 'Niño') return false;

    const isAlreadyIncubating = this.eggs.some(e => e.id !== eggId && e.incubatingParentId === parentId);
    if (isAlreadyIncubating) return false;

    egg.incubatingParentId = parentId;
    this.logActivity('BREED', `Asignaste a ${parent.name} para incubar el huevo.`);
    this.saveAll();
    return true;
  }

  async releaseWokamon(id) {
    const targetWok = this.wokamons.find(w => w.id === id);
    if (!targetWok) return false;

    this.wokamons = this.wokamons.filter(w => w.id !== id);
    this.eggs.forEach(egg => {
      if (egg.incubatingParentId === id) {
        egg.incubatingParentId = null;
      }
    });

    this.userStats.crystals += 15;
    this.logActivity('GIFT', `Liberaste a ${targetWok.name} en la naturaleza (+15 cristales).`);
    this.saveAll();

    // Explicit cloud delete
    if (this.activeUser) {
      try {
        await deleteDoc(doc(db, 'users', this.activeUser, 'wokamons', id));
      } catch (e) { console.error('Error deleting wokamon from cloud:', e); }
    }
    return true;
  }

  giftWokamon(id) {
    const wokamon = this.wokamons.find(w => w.id === id);
    if (!wokamon) return null;
    
    const payload = {
      type: 'wokamon',
      wokamon: { ...wokamon, id: generateId(), age: 0 }
    };

    this.wokamons = this.wokamons.filter(w => w.id !== id);
    this.eggs.forEach(egg => {
      if (egg.incubatingParentId === id) {
        egg.incubatingParentId = null;
      }
    });

    this.userStats.crystals += 10;
    this.logActivity('GIFT', `Empaquetaste a ${wokamon.name} como código de regalo (+10 cristales).`);
    this.saveAll();

    // Explicit cloud delete
    if (this.activeUser) {
      try {
        deleteDoc(doc(db, 'users', this.activeUser, 'wokamons', id));
      } catch (e) { console.error(e); }
    }

    return btoa(JSON.stringify(payload));
  }

  giftEgg(id) {
    const egg = this.eggs.find(e => e.id === id);
    if (!egg) return null;
    
    const payload = {
      type: 'egg',
      egg: { ...egg, id: generateId(), incubatingParentId: null, pointsCurrent: 0, incubationProgress: 0 }
    };

    this.eggs = this.eggs.filter(e => e.id !== id);
    this.userStats.crystals += 8;
    this.logActivity('GIFT', `Empaquetaste Huevo Gen ${egg.generation} como código de regalo (+8 cristales).`);
    this.saveAll();

    // Explicit cloud delete
    if (this.activeUser) {
      try {
        deleteDoc(doc(db, 'users', this.activeUser, 'eggs', id));
      } catch (e) { console.error(e); }
    }

    return btoa(JSON.stringify(payload));
  }

  claimGiftedCode(base64Code) {
    if (!this.activeUser) return null;

    try {
      const payload = JSON.parse(atob(base64Code));
      
      if (payload.type === 'egg') {
        const egg = payload.egg;
        egg.id = 'egg_' + Math.random().toString(36).substr(2, 9);
        this.eggs.push(egg);
        this.logActivity('CLAIM', 'Importaste un huevo genético de un amigo.');
        this.saveAll();
        return { type: 'egg', item: egg };
      }
      
      if (payload.type === 'wokamon') {
        const wokamon = payload.wokamon;
        wokamon.id = generateId();
        this.wokamons.push(wokamon);
        this.registerDiscovery(wokamon);
        this.logActivity('CLAIM', `Adoptaste al Wokamon ${wokamon.name} de un amigo.`);
        this.saveAll();
        return { type: 'wokamon', item: wokamon };
      }
    } catch (e) {
      console.error('Invalid code redemption', e);
    }
    return null;
  }

  startNfcMating(parentAId, stepsTarget = 5000) {
    const parentA = this.wokamons.find(w => w.id === parentAId);
    if (!parentA || parentA.status === 'dead' || parentA.stage === 'Niño') return false;

    const friendWokamonTypes = [
      {
        name: 'Dragón Rojo',
        genetics: {
          bodyType: 'blob', ears: 'pointy', eyes: 'fire', horns: 'ram', wings: 'dragon',
          primaryColor: '#e53935', bellyColor: '#ffb300', paintedPattern: null
        },
        genotype: {
          bodyType: ['b', 'b'], ears: ['p', 'p'], eyes: ['F', 'n'], horns: ['M', 'h'], wings: ['D', 'w']
        }
      },
      {
        name: 'Bunny Purpurina',
        genetics: {
          bodyType: 'cloud', ears: 'long', eyes: 'sparkle', horns: 'none', wings: 'angel',
          primaryColor: '#d81b60', bellyColor: '#f8bbd0', paintedPattern: null
        },
        genotype: {
          bodyType: ['c', 'c'], ears: ['l', 'l'], eyes: ['S', 'y'], horns: ['h', 'h'], wings: ['G', 'w']
        }
      }
    ];

    const partner = friendWokamonTypes[Math.floor(Math.random() * friendWokamonTypes.length)];
    const successChance = Math.min(1.0, stepsTarget / 10000);

    this.matingState = {
      stage: 'paired',
      parentAId: parentAId,
      parentBId: 'friend_wok',
      partnerName: 'Paco_Caminante',
      partnerWokamon: partner,
      stepsWalked: 0,
      stepsTarget: stepsTarget,
      successChance: successChance,
      isViable: true,
      resultEggColor: '#f5f5f5',
      resultEggGenetics: null
    };

    this.logActivity('BREED', `Ritual NFC: Wokamon ${parentA.name} acoplado con ${partner.name}.`);
    this.saveAll();
    return true;
  }

  cancelMating() {
    this.matingState = {
      stage: 'idle',
      parentAId: null,
      parentBId: null,
      partnerName: '',
      partnerWokamon: null,
      stepsWalked: 0,
      stepsTarget: 5000,
      successChance: 0.5,
      isViable: true
    };
    this.saveAll();
  }

  advanceMatingToWalking() {
    if (this.matingState.stage === 'paired') {
      this.matingState.stage = 'walking';
      this.logActivity('BREED', `Empezó la caminata gestacional (${this.matingState.stepsTarget} pasos requeridos).`);
      this.saveAll();
    }
  }

  addMatedEggToIncubator(childGenetics = null) {
    const parentA = this.wokamons.find(w => w.id === this.matingState.parentAId);
    const partner = this.matingState.partnerWokamon;
    if (!partner) return null;
    const gen = parentA ? parentA.generation + 1 : 2;

    const parentAGenotype = parentA.genotype || {
      bodyType: ['R', 'R'], ears: ['T', 'T'], eyes: ['n', 'n'], horns: ['h', 'h'], wings: ['w', 'w']
    };
    const parentBGenotype = partner.genotype;
    const childGenotype = mendelianCross(parentAGenotype, parentBGenotype);

    const targetSteps = this.matingState.stepsTarget;
    const efficientMetabolism = targetSteps >= 8000;
    const resolvedGenetics = childGenetics || {
      primaryColor: parentA?.genetics?.primaryColor || partner.genetics.primaryColor || '#ffcc00',
      bellyColor: parentA?.genetics?.bellyColor || partner.genetics.bellyColor || '#ffe57f',
      paintedPattern: null
    };

    const newEgg = {
      id: 'egg_' + Math.random().toString(36).substr(2, 9),
      name: `Huevo Gen ${gen}`,
      parentAName: parentA ? parentA.name : 'Tú',
      parentBName: partner ? partner.name : 'Paco',
      generation: gen,
      genetics: resolvedGenetics,
      genotype: childGenotype,
      pointsCurrent: 0,
      pointsTarget: 1500,
      incubationProgress: 0,
      incubatingParentId: null,
      isViable: this.matingState.isViable,
      efficientMetabolism: efficientMetabolism,
      familyTree: {
        parentA: {
          id: parentA ? parentA.id : generateId(),
          name: parentA ? parentA.name : 'Silvestre',
          generation: parentA ? parentA.generation : 1,
          genetics: parentA ? parentA.genetics : null,
          genotype: parentAGenotype,
          primaryColor: parentA ? parentA.genetics.primaryColor : '#ffe57f',
          familyTree: parentA ? parentA.familyTree : null
        },
        parentB: {
          id: 'friend_wok_' + generateId(),
          name: partner.name,
          generation: 1,
          genetics: partner.genetics,
          genotype: parentBGenotype,
          primaryColor: partner.genetics.primaryColor,
          familyTree: null
        }
      }
    };

    this.eggs.push(newEgg);
    
    // Reset mating
    this.matingState = {
      stage: 'idle',
      parentAId: null,
      parentBId: null,
      partnerName: '',
      partnerWokamon: null,
      stepsWalked: 0,
      stepsTarget: 5000,
      successChance: 0.5,
      isViable: true
    };

    this.logActivity('BREED', `Huevo Gen ${gen} colocado en incubadora.`);
    this.saveAll();
    return newEgg;
  }

  hatchCompletedEgg(eggId, name = '') {
    const egg = this.eggs.find(e => e.id === eggId);
    if (!egg || egg.pointsCurrent < egg.pointsTarget || !egg.isViable) return null;

    const phenotype = getPhenotype(egg.genotype);
    const maxVit = getMaxVitality(egg.genotype);
    const baby = {
      id: generateId(),
      name: name || getRandomName(),
      level: 1,
      growth: 0,
      age: 0,
      hunger: 100,
      joy: 100,
      disease: 0,
      vitality: maxVit,
      status: 'happy',
      stage: 'Niño',
      generation: egg.generation,
      genotype: egg.genotype,
      heterozygosity: getHeterozygosity(egg.genotype),
      familyTree: egg.familyTree,
      efficientMetabolism: egg.efficientMetabolism,
      genetics: {
        bodyType: phenotype.bodyType,
        ears: phenotype.ears,
        eyes: phenotype.eyes,
        horns: phenotype.horns,
        wings: phenotype.wings,
        primaryColor: egg.genetics?.primaryColor || '#ffcc00',
        bellyColor: egg.genetics?.bellyColor || '#ffe57f',
        paintedPattern: null
      }
    };

    this.eggs = this.eggs.filter(e => e.id !== eggId);
    this.wokamons.push(baby);
    this.registerDiscovery(baby);
    this.logActivity('HATCH', `Ha nacido ${baby.name} del Huevo Gen ${egg.generation}.`);
    this.saveAll();

    if (this.activeUser) {
      deleteDoc(doc(db, 'users', this.activeUser, 'eggs', eggId)).catch(e => console.error(e));
    }

    return baby;
  }

  async cancelFailedEgg(eggId) {
    this.eggs = this.eggs.filter(e => e.id !== eggId);
    this.userStats.crystals += 15;
    this.logActivity('HATCH', 'Huevo no viable eclosionó vacío. +15 cristales concedidos.');
    this.saveAll();

    // Explicit cloud delete
    if (this.activeUser) {
      try {
        await deleteDoc(doc(db, 'users', this.activeUser, 'eggs', eggId));
      } catch (e) { console.error(e); }
    }
  }

  buyShopGene(geneName, crystalCost) {
    if (this.userStats.crystals >= crystalCost && !this.shop.unlockedGenes.includes(geneName)) {
      this.userStats.crystals -= crystalCost;
      this.shop.unlockedGenes.push(geneName);
      this.logActivity('SHOP_BUY', `Desbloqueaste el gen de mutación "${geneName}" en la tienda.`);
      this.saveAll();
      return true;
    }
    return false;
  }

  modifyGenotype(targetId, targetType, locus, alleleIndex, newAllele, crystalCost) {
    if (this.userStats.crystals < crystalCost) return false;
    
    let target = null;
    if (targetType === 'wokamon') {
      target = this.wokamons.find(w => w.id === targetId);
    } else {
      target = this.eggs.find(e => e.id === targetId);
    }
    if (!target || target.status === 'dead') return false;

    // CRISPR Gene Mutation Swap
    target.genotype[locus][alleleIndex] = newAllele;
    
    // Recalculate Phenotype and Heterozygosity based on new Genotype
    const phenotype = getPhenotype(target.genotype);
    target.heterozygosity = getHeterozygosity(target.genotype);
    
    if (targetType === 'wokamon') {
      target.genetics.bodyType = phenotype.bodyType;
      target.genetics.ears = phenotype.ears;
      target.genetics.eyes = phenotype.eyes;
      target.genetics.horns = phenotype.horns;
      target.genetics.wings = phenotype.wings;
      this.normalizeWokamonLifecycle(target);
      this.logActivity('SHOP_BUY', `Modificación CRISPR: Se editó el genoma de ${target.name} (locus ${locus}).`);
    } else {
      // Egg genetics
      target.genetics.bodyType = phenotype.bodyType;
      target.genetics.ears = phenotype.ears;
      target.genetics.eyes = phenotype.eyes;
      target.genetics.horns = phenotype.horns;
      target.genetics.wings = phenotype.wings;
      this.logActivity('SHOP_BUY', `Modificación CRISPR: Se editó el embrión de ${target.name} (alelo ${newAllele}).`);
    }

    this.userStats.crystals -= crystalCost;
    this.saveAll();
    return true;
  }

  settleDailyCareIfNeeded(now = new Date()) {
    if (!this.activeUser) return { settled: false, daysAdvanced: 0 };

    const currentKey = getLocalCareCycleKey(now);

    if (!this.userStats.lastCareSettlementKey) {
      this.userStats.lastCareSettlementKey = currentKey;
      this.saveAll();
      return { settled: false, daysAdvanced: 0 };
    }

    const missedDays = getDaysBetweenCareKeys(this.userStats.lastCareSettlementKey, currentKey);
    if (missedDays <= 0) return { settled: false, daysAdvanced: 0 };

    const daysToAdvance = Math.min(missedDays, 14);
    for (let i = 0; i < daysToAdvance; i += 1) {
      this.advanceOneDay({ automatic: true, persist: false });
    }

    this.userStats.lastCareSettlementKey = currentKey;
    this.logActivity('WALK', `Reparto automático de las 05:00 aplicado (${daysToAdvance} día${daysToAdvance === 1 ? '' : 's'}).`);
    this.saveAll();
    return { settled: true, daysAdvanced: daysToAdvance };
  }

  advanceOneDay(options = {}) {
    if (!this.activeUser) return false;
    const { automatic = false, persist = true } = options;

    const livingWoks = this.wokamons.filter(w => w.status !== 'dead');
    const dailyNeeds = new Map();
    let totalDailyNeed = 0;

    livingWoks.forEach(wokamon => {
      this.normalizeWokamonLifecycle(wokamon);
      const need = this.getDailyStepNeed(wokamon);
      wokamon.dailyStepNeed = need;
      dailyNeeds.set(wokamon.id, need);
      totalDailyNeed += need;
    });

    const availableSteps = this.userStats.totalEnergy || 0;
    const stepsUsed = Math.min(availableSteps, totalDailyNeed);
    const coverageRatio = totalDailyNeed > 0 ? Math.min(1, stepsUsed / totalDailyNeed) : 1;
    this.recordStepHistory(this.userStats.stepsToday || 0, stepsUsed);
    this.userStats.totalEnergy = 0;
    this.userStats.stepsToday = 0;

    this.wokamons.forEach(wokamon => {
      if (wokamon.status === 'dead') return;

      wokamon.age = Math.floor((wokamon.age || 0) + 1);
      const maxVit = getMaxVitality(wokamon.genotype);
      const lifespan = this.getWokamonLifespan(wokamon);
      const missingRatio = 1 - coverageRatio;

      if (coverageRatio >= 1) {
        wokamon.dailyDeficitDays = 0;
        wokamon.hunger = Math.min(100, (wokamon.hunger || 100) + 12);
        wokamon.joy = Math.min(100, (wokamon.joy || 100) + 8);
        wokamon.disease = Math.max(0, (wokamon.disease || 0) - 6);
        wokamon.vitality = Math.min(maxVit, (wokamon.vitality || maxVit) + 5);
      } else {
        wokamon.dailyDeficitDays = (wokamon.dailyDeficitDays || 0) + 1;
        wokamon.hunger = Math.max(0, (wokamon.hunger || 100) - Math.ceil(22 * missingRatio));
        wokamon.joy = Math.max(0, (wokamon.joy || 100) - Math.ceil(16 * missingRatio));

        if (wokamon.dailyDeficitDays >= 2) {
          wokamon.disease = Math.min(100, (wokamon.disease || 0) + Math.ceil(7 * missingRatio));
        }

        if (wokamon.dailyDeficitDays >= 4 || wokamon.hunger <= 10 || wokamon.disease >= 65) {
          const healthPenalty = (wokamon.hunger <= 10 ? 4 : 0) + (wokamon.disease >= 65 ? 4 : 0);
          wokamon.vitality = Math.max(0, (wokamon.vitality || maxVit) - Math.ceil(10 * missingRatio + healthPenalty));
        }
      }

      if (wokamon.age >= lifespan) {
        const oldAgePenalty = wokamon.age >= lifespan + 5 || wokamon.hunger < 45 || wokamon.disease > 35 || wokamon.vitality < maxVit * 0.45;
        if (oldAgePenalty) {
          wokamon.vitality = Math.max(0, (wokamon.vitality || maxVit) - 8);
        }
      }

      if (wokamon.vitality <= 0) {
        wokamon.status = 'dead';
        wokamon.stage = 'Fantasma';
        this.logActivity('HATCH', `${wokamon.name} ha muerto tras varios días con la salud muy baja.`);
        return;
      }

      this.normalizeWokamonLifecycle(wokamon);

      if (wokamon.disease >= 60) {
        wokamon.status = 'sick';
      } else if (wokamon.hunger <= 15 || wokamon.dailyDeficitDays >= 4) {
        wokamon.status = 'starving';
      } else if (wokamon.joy <= 40 || wokamon.hunger <= 45 || wokamon.dailyDeficitDays >= 2) {
        wokamon.status = 'depressed';
      } else {
        wokamon.status = 'happy';
      }

      if (wokamon.status === 'happy' && Math.random() < 0.08) {
        this.userStats.crystals += wokamon.level;
      }
    });

    this.eggs.forEach(egg => {
      if (egg.incubatingParentId) {
        egg.pointsCurrent = Math.min(egg.pointsTarget, egg.pointsCurrent + 100);
        egg.incubationProgress = parseFloat(((egg.pointsCurrent / egg.pointsTarget) * 15).toFixed(2));
      }
    });

    if (!automatic) {
      this.logActivity('WALK', `Ha pasado 1 día en el criadero. Se usaron ${stepsUsed.toLocaleString()} pasos para cuidar a tus Wokamon.`);
    }
    if (persist) {
      this.saveAll();
    }
    return true;
  }

  tickGameTime() {
    // El tiempo ya no avanza en segundo plano; se controla con "Pasar 1 día".
    return false;
  }

  resetAll() {
    this.resetLocalInMemory();
    this.saveAll();
  }
}

export const store = new GameState();
export default store;


