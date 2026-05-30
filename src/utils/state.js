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
  bodyBase: 'Cuerpo',
  bodyProportion: 'Proporciones',
  limbType: 'Extremidades',
  headMerge: 'Unión Cabeza',
  topAppendage: 'Apéndice Sup.',
  tailType: 'Cola',
  bellyShape: 'Barriga',
  eyeShape: 'Forma Ojos',
  pupilStyle: 'Pupilas',
  mouthStyle: 'Boca',
  surfaceType: 'Piel/Textura',
  metabolism: 'Metabolismo',
  longevity: 'Esperanza de Vida',
  diseaseResilience: 'Inmunidad',
  vitalityStorage: 'Reserva Vital',
  // Backwards compatibility keys
  bodyType: 'Cuerpo',
  ears: 'Orejas',
  eyes: 'Ojos',
  horns: 'Cuernos',
  wings: 'Alas'
};

export const TRAIT_VALUE_LABELS_ES = {
  // bodyBase
  round: 'redondo',
  bean: 'alubia',
  pear: 'pera',
  cloud: 'nubes',
  blob: 'gota blob',
  squishy: 'blandito',
  // bodyProportion
  balanced: 'equilibrada',
  chubby: 'regordeta',
  tall: 'esbelta alta',
  tiny: 'diminuta',
  // limbType
  stubby: 'cortas',
  soft: 'suaves',
  long: 'largas',
  springy: 'elásticas',
  // headMerge
  integrated: 'integrada',
  'semi-separated': 'semi-separada',
  // topAppendage
  horns: 'cuernos',
  antennae: 'antenas',
  ears: 'orejitas',
  sprouts: 'brotes',
  none: 'sin apéndices',
  // tailType
  pom: 'pompón',
  spike: 'espinas',
  fluff: 'peluda',
  // bellyShape
  oval: 'ovalada',
  heart: 'corazón',
  teardrop: 'lágrima',
  // eyeShape
  sleepy: 'dormilones',
  sparkle: 'brillantes',
  wide: 'abiertos',
  droopy: 'tristes caídos',
  // pupilStyle
  dot: 'puntos',
  glossy: 'brillosas',
  star: 'estrellas',
  slit: 'felinas',
  // mouthStyle
  smile: 'sonrisa',
  'open-smile': 'sonrisota',
  'tiny-fang': 'colmillito',
  shy: 'tímida',
  // surfaceType
  plush: 'peluche',
  jelly: 'gelatina',
  fuzzy: 'peluda',
  matte: 'mate',
  smooth: 'suave',
  // metabolism
  efficient: 'eficiente',
  fast: 'rápido',
  normal: 'normal',
  // longevity
  'long-lived': 'larga vida',
  'short-lived': 'corta vida',
  // diseaseResilience
  'immune-boosted': 'inmune fuerte',
  delicate: 'delicada',
  // vitalityStorage
  'high-vitality': 'vitalidad elevada',
  
  // Legacy values
  teddy: 'de oso',
  pointy: 'puntiagudas',
  floppy: 'caídas',
  fire: 'de fuego',
  neon: 'de neón',
  ram: 'de carnero',
  small: 'pequeños',
  angel: 'de ángel',
  dragon: 'de dragón'
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
  bodyBase: {
    'R': { name: 'round', dominance: 3, label: 'Cuerpo Redondo (Dom. R)' },
    'b': { name: 'bean', dominance: 1, label: 'Cuerpo Alubia (Rec. b)' },
    'p': { name: 'pear', dominance: 1, label: 'Cuerpo Pera (Rec. p)' },
    'c': { name: 'cloud', dominance: 1, label: 'Cuerpo Nube (Rec. c)' },
    'o': { name: 'blob', dominance: 1, label: 'Cuerpo Blob (Rec. o)' },
    's': { name: 'squishy', dominance: 1, label: 'Cuerpo Blando (Rec. s)' }
  },
  bodyProportion: {
    'B': { name: 'balanced', dominance: 3, label: 'Proporción Equilibrada (Dom. B)' },
    'c': { name: 'chubby', dominance: 1, label: 'Proporción Regordeta (Rec. c)' },
    't': { name: 'tall', dominance: 1, label: 'Proporción Alta (Rec. t)' },
    'y': { name: 'tiny', dominance: 1, label: 'Proporción Diminuta (Rec. y)' }
  },
  limbType: {
    'S': { name: 'stubby', dominance: 3, label: 'Extremidades Cortas (Dom. S)' },
    'f': { name: 'soft', dominance: 1, label: 'Extremidades Suaves (Rec. f)' },
    'l': { name: 'long', dominance: 1, label: 'Extremidades Largas (Rec. l)' },
    'p': { name: 'springy', dominance: 1, label: 'Extremidades Elásticas (Rec. p)' }
  },
  headMerge: {
    'I': { name: 'integrated', dominance: 3, label: 'Cabeza Integrada (Dom. I)' },
    's': { name: 'semi-separated', dominance: 1, label: 'Cabeza Semi-separada (Rec. s)' }
  },
  topAppendage: {
    'H': { name: 'horns', dominance: 4, label: 'Cuernos de Energía (Prem. Dom. H)' },
    'a': { name: 'antennae', dominance: 3, label: 'Antenas Sensoriales (Dom. a)' },
    'e': { name: 'ears', dominance: 2, label: 'Orejas de Animal (Dom. e)' },
    's': { name: 'sprouts', dominance: 1, label: 'Brote de Hojas (Rec. s)' },
    'n': { name: 'none', dominance: 1, label: 'Sin Apéndice (Rec. n)' }
  },
  tailType: {
    'N': { name: 'none', dominance: 4, label: 'Sin Cola (Prem. Dom. N)' },
    'p': { name: 'pom', dominance: 3, label: 'Cola de Pompón (Dom. p)' },
    's': { name: 'spike', dominance: 2, label: 'Cola Espinada (Dom. s)' },
    'f': { name: 'fluff', dominance: 1, label: 'Cola Peluda (Rec. f)' }
  },
  bellyShape: {
    'O': { name: 'oval', dominance: 3, label: 'Barriga Ovalada (Dom. O)' },
    'h': { name: 'heart', dominance: 1, label: 'Barriga de Corazón (Rec. h)' },
    't': { name: 'teardrop', dominance: 1, label: 'Barriga de Gota (Rec. t)' },
    'c': { name: 'cloud', dominance: 1, label: 'Barriga de Nube (Rec. c)' },
    'n': { name: 'none', dominance: 1, label: 'Sin Barriga (Rec. n)' }
  },
  eyeShape: {
    'R': { name: 'round', dominance: 3, label: 'Ojos Redondos (Dom. R)' },
    's': { name: 'sleepy', dominance: 1, label: 'Ojos Dormilones (Rec. s)' },
    'k': { name: 'sparkle', dominance: 1, label: 'Ojos Brillantes (Rec. k)' },
    'w': { name: 'wide', dominance: 1, label: 'Ojos Abiertos (Rec. w)' },
    'd': { name: 'droopy', dominance: 1, label: 'Ojos Caídos (Rec. d)' }
  },
  pupilStyle: {
    'D': { name: 'dot', dominance: 3, label: 'Pupilas de Punto (Dom. D)' },
    'g': { name: 'glossy', dominance: 1, label: 'Pupilas Brillantes (Rec. g)' },
    's': { name: 'star', dominance: 1, label: 'Pupilas de Estrella (Rec. s)' },
    'l': { name: 'slit', dominance: 1, label: 'Pupilas de Felino (Rec. l)' }
  },
  mouthStyle: {
    'S': { name: 'smile', dominance: 3, label: 'Boca Sonriente (Dom. S)' },
    'o': { name: 'open-smile', dominance: 1, label: 'Boca Abierta (Rec. o)' },
    'f': { name: 'tiny-fang', dominance: 1, label: 'Boca con Colmillo (Rec. f)' },
    'y': { name: 'shy', dominance: 1, label: 'Boca Tímida (Rec. y)' }
  },
  surfaceType: {
    'S': { name: 'smooth', dominance: 3, label: 'Textura Suave (Dom. S)' },
    'p': { name: 'plush', dominance: 1, label: 'Textura Peluche (Rec. p)' },
    'j': { name: 'jelly', dominance: 1, label: 'Textura Gelatina (Rec. j)' },
    'f': { name: 'fuzzy', dominance: 1, label: 'Textura Peluda (Rec. f)' },
    'm': { name: 'matte', dominance: 1, label: 'Textura Mate (Rec. m)' }
  },
  metabolism: {
    'E': { name: 'efficient', dominance: 3, label: 'Metabolismo Eficiente (Dom. E)' },
    'f': { name: 'fast', dominance: 1, label: 'Metabolismo Rápido (Rec. f)' },
    'n': { name: 'normal', dominance: 1, label: 'Metabolismo Normal (Rec. n)' }
  },
  longevity: {
    'L': { name: 'long-lived', dominance: 3, label: 'Esperanza Larga (Dom. L)' },
    's': { name: 'short-lived', dominance: 1, label: 'Esperanza Corta (Rec. s)' },
    'n': { name: 'normal', dominance: 1, label: 'Esperanza Normal (Rec. n)' }
  },
  diseaseResilience: {
    'I': { name: 'immune-boosted', dominance: 3, label: 'Inmunidad Fuerte (Dom. I)' },
    'd': { name: 'delicate', dominance: 1, label: 'Inmunidad Delicada (Rec. d)' },
    'n': { name: 'normal', dominance: 1, label: 'Inmunidad Normal (Rec. n)' }
  },
  vitalityStorage: {
    'V': { name: 'high-vitality', dominance: 3, label: 'Reserva Vital Elevada (Dom. V)' },
    'n': { name: 'normal', dominance: 1, label: 'Reserva Vital Normal (Rec. n)' }
  }
};

// Convert a pair of alleles to its expressed Phenotype
export function getPhenotype(genotype) {
  const phenotype = {};
  for (const trait in genotype) {
    if (trait === 'colorGenes') continue;
    const alleles = genotype[trait];
    const alleleA = alleles[0];
    const alleleB = alleles[1];
    
    const infoA = ALLELES_DOMINANCE[trait] ? ALLELES_DOMINANCE[trait][alleleA] : null;
    const infoB = ALLELES_DOMINANCE[trait] ? ALLELES_DOMINANCE[trait][alleleB] : null;
    
    if (!infoA && !infoB) continue;
    if (!infoA) {
      phenotype[trait] = infoB.name;
    } else if (!infoB) {
      phenotype[trait] = infoA.name;
    } else if (infoA.dominance >= infoB.dominance) {
      phenotype[trait] = infoA.name;
    } else {
      phenotype[trait] = infoB.name;
    }
  }
  return phenotype;
}

export function getAlleleForName(locus, name) {
  if (!ALLELES_DOMINANCE[locus]) return null;
  for (const allele in ALLELES_DOMINANCE[locus]) {
    if (ALLELES_DOMINANCE[locus][allele].name === name) {
      return allele;
    }
  }
  return null;
}

// Fallback generators for old database records
export function getFallbackAllele(trait) {
  const defaults = {
    bodyBase: 'R', bodyProportion: 'B', limbType: 'S', headMerge: 'I', topAppendage: 'n',
    tailType: 'N', bellyShape: 'O', eyeShape: 'R', pupilStyle: 'D', mouthStyle: 'S',
    surfaceType: 'S', metabolism: 'n', longevity: 'n', diseaseResilience: 'n', vitalityStorage: 'n'
  };
  return defaults[trait] || 'n';
}

export function getFallbackColorAllele(col) {
  const defaults = {
    huePrimary: [40, 50], satPrimary: [80, 80], lightPrimary: [60, 60],
    hueSecondary: [30, 30], satSecondary: [70, 70], lightSecondary: [80, 80],
    hueAccent: [140, 150], patternContrast: [0.2, 0.2]
  };
  return defaults[col] || [50, 50];
}

// Calculate expressed HSL colors by averaging inherited alleles
export function getExpressedColorHSL(colorGenes, prefix) {
  const hGene = colorGenes ? colorGenes[`hue${prefix}`] || [40, 40] : [40, 40];
  const sGene = colorGenes ? colorGenes[`sat${prefix}`] || [80, 80] : [80, 80];
  const lGene = colorGenes ? colorGenes[`light${prefix}`] || [60, 60] : [60, 60];
  
  const h = Math.round((hGene[0] + hGene[1]) / 2);
  const s = Math.round((sGene[0] + sGene[1]) / 2);
  const l = Math.round((lGene[0] + lGene[1]) / 2);
  
  return { h, s, l, str: `hsl(${h}, ${s}%, ${l}%)` };
}

// Calculate the percentage of Heterozygous Loci (genetic heterogeneity)
export function getHeterozygosity(genotype) {
  let heterozygousLoci = 0;
  const traits = ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape', 'eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType', 'metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage'];
  traits.forEach(trait => {
    if (genotype[trait] && genotype[trait][0] !== genotype[trait][1]) {
      heterozygousLoci += 1;
    }
  });
  return Math.round((heterozygousLoci / traits.length) * 100);
}

// Perform Mendelian Segregation (Hybrid cross)
export function mendelianCross(parentAGenotype, parentBGenotype) {
  const childGenotype = {};
  const traits = ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape', 'eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType', 'metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage'];
  
  traits.forEach(trait => {
    const parentAAlleles = parentAGenotype[trait] || [getFallbackAllele(trait), getFallbackAllele(trait)];
    const parentBAlleles = parentBGenotype[trait] || [getFallbackAllele(trait), getFallbackAllele(trait)];
    
    const alleleFromA = parentAAlleles[Math.floor(Math.random() * 2)];
    const alleleFromB = parentBAlleles[Math.floor(Math.random() * 2)];
    childGenotype[trait] = [alleleFromA, alleleFromB];
  });

  // HSL Color Genes inheritance (averaging Hue, Saturation, Lightness alleles)
  const colors = ['huePrimary', 'satPrimary', 'lightPrimary', 'hueSecondary', 'satSecondary', 'lightSecondary', 'hueAccent', 'patternContrast'];
  childGenotype.colorGenes = {};
  colors.forEach(col => {
    const pAColor = parentAGenotype.colorGenes ? parentAGenotype.colorGenes[col] || getFallbackColorAllele(col) : getFallbackColorAllele(col);
    const pBColor = parentBGenotype.colorGenes ? parentBGenotype.colorGenes[col] || getFallbackColorAllele(col) : getFallbackColorAllele(col);
    
    const alleleFromA = pAColor[Math.floor(Math.random() * 2)];
    const alleleFromB = pBColor[Math.floor(Math.random() * 2)];
    childGenotype.colorGenes[col] = [alleleFromA, alleleFromB];
  });

  return childGenotype;
}

// Calculate Punnett Square probabilities based on Mendelian Segregation
export function calculatePunnettSquare(parentAGenotype, parentBGenotype) {
  const probabilities = {};
  const traits = ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape', 'eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType', 'metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage'];
  
  traits.forEach(trait => {
    const parentAAlleles = parentAGenotype[trait] || [getFallbackAllele(trait), getFallbackAllele(trait)];
    const parentBAlleles = parentBGenotype[trait] || [getFallbackAllele(trait), getFallbackAllele(trait)];
    
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
  let baseVit = 100;
  if (phenotype.bodyBase === 'round' || phenotype.bodyBase === 'squishy') {
    baseVit = 120;
  }
  if (phenotype.vitalityStorage === 'high-vitality') {
    baseVit += 20;
  }
  return baseVit;
}

export function getWokamonScale(genotype) {
  const phenotype = getPhenotype(genotype);
  if (phenotype.bodyProportion === 'tall') return 1.25;
  if (phenotype.bodyProportion === 'tiny') return 0.85;
  if (phenotype.bodyProportion === 'chubby') return 1.1;
  return 1.0;
}

// Create a baby Wokamon Niño with homozygous sprouts and fluff
export function createWokamonChild(name = 'Bebé Woki') {
  const genotype = {
    bodyBase: ['R', 'R'],
    bodyProportion: ['B', 'B'],
    limbType: ['S', 'S'],
    headMerge: ['I', 'I'],
    topAppendage: ['s', 's'], // Sprouts
    tailType: ['f', 'f'], // Fluff
    bellyShape: ['O', 'O'],
    eyeShape: ['R', 'R'],
    pupilStyle: ['D', 'D'],
    mouthStyle: ['S', 'S'],
    surfaceType: ['S', 'S'], // Smooth
    metabolism: ['n', 'n'],
    longevity: ['n', 'n'],
    diseaseResilience: ['n', 'n'],
    vitalityStorage: ['n', 'n'],
    colorGenes: {
      huePrimary: [40, 50], satPrimary: [80, 80], lightPrimary: [60, 60],
      hueSecondary: [30, 30], satSecondary: [70, 70], lightSecondary: [80, 80],
      hueAccent: [140, 150], patternContrast: [0.2, 0.2]
    }
  };
  const phenotype = getPhenotype(genotype);
  const primaryColorHSL = getExpressedColorHSL(genotype.colorGenes, 'Primary');
  const bellyColorHSL = getExpressedColorHSL(genotype.colorGenes, 'Secondary');
  
  return {
    id: generateId(),
    name: name,
    level: 1,
    growth: 0,
    age: 0, 
    hunger: 100, 
    joy: 100,
    disease: 0,
    vitality: 100,
    status: 'happy',
    stage: 'Niño',
    generation: 1,
    genotype: genotype,
    heterozygosity: getHeterozygosity(genotype),
    familyTree: null,
    genetics: {
      bodyBase: phenotype.bodyBase,
      bodyProportion: phenotype.bodyProportion,
      limbType: phenotype.limbType,
      headMerge: phenotype.headMerge,
      topAppendage: phenotype.topAppendage,
      tailType: phenotype.tailType,
      bellyShape: phenotype.bellyShape,
      eyeShape: phenotype.eyeShape,
      pupilStyle: phenotype.pupilStyle,
      mouthStyle: phenotype.mouthStyle,
      surfaceType: phenotype.surfaceType,
      metabolism: phenotype.metabolism,
      longevity: phenotype.longevity,
      diseaseResilience: phenotype.diseaseResilience,
      vitalityStorage: phenotype.vitalityStorage,
      primaryColor: primaryColorHSL.str, 
      bellyColor: bellyColorHSL.str,
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
    stepsPendingCrystal: 0,
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
      this.eggs.forEach(e => this.normalizeWokamonLifecycle(e));
      
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

    if (phenotype.topAppendage === 'horns') lifespan -= 2;
    if (phenotype.surfaceType === 'jelly') lifespan += 2;
    if (wokamon.heterozygosity >= 80) lifespan += 3;
    else if (wokamon.heterozygosity >= 40) lifespan += 1;

    // Physiological locus
    if (phenotype.longevity === 'long-lived') lifespan += 6;
    if (phenotype.longevity === 'short-lived') lifespan -= 3;

    return Math.max(24, Math.min(42, lifespan));
  }

  getDailyStepNeed(wokamon) {
    const phenotype = getPhenotype(wokamon.genotype);
    let need = DAILY_STEPS_PER_WOKAMON;

    if (wokamon.heterozygosity >= 80) need *= 0.9;
    
    // Physiological locus
    if (phenotype.metabolism === 'efficient') need *= 0.85;
    if (phenotype.metabolism === 'fast') need *= 1.10;

    return Math.round(need / 50) * 50;
  }

  normalizeWokamonLifecycle(wokamon) {
    if (!wokamon) return null;

    // Migration of legacy 5-loci save files if needed
    if (!wokamon.genotype.bodyBase) {
      const oldGeno = wokamon.genotype || {};
      
      const mapBodyBase = (val) => {
        if (val === 'round' || val === 'oval') return 'R';
        if (val === 'squarish') return 'b';
        if (val === 'cloud') return 'c';
        if (val === 'blob') return 'o';
        if (val === 'squishy') return 's';
        return 'R';
      };

      const mapTopAppendage = (val) => {
        if (val === 'neon') return 'H';
        if (val === 'ram') return 'e';
        if (val === 'none' || !val) return 'n';
        return 'n';
      };

      const mapEyeShape = (val) => {
        if (val === 'round') return 'R';
        if (val === 'sleepy') return 's';
        if (val === 'sparkle') return 'k';
        if (val === 'fire') return 'w';
        return 'R';
      };

      const baseA = oldGeno.bodyType ? mapBodyBase(oldGeno.bodyType[0]) : 'R';
      const baseB = oldGeno.bodyType ? mapBodyBase(oldGeno.bodyType[1]) : 'R';
      const appA = oldGeno.horns ? mapTopAppendage(oldGeno.horns[0]) : 'n';
      const appB = oldGeno.horns ? mapTopAppendage(oldGeno.horns[1]) : 'n';
      const eyeA = oldGeno.eyes ? mapEyeShape(oldGeno.eyes[0]) : 'R';
      const eyeB = oldGeno.eyes ? mapEyeShape(oldGeno.eyes[1]) : 'R';

      wokamon.genotype = {
        bodyBase: [baseA, baseB],
        bodyProportion: ['B', 'B'],
        limbType: ['S', 'S'],
        headMerge: ['I', 'I'],
        topAppendage: [appA, appB],
        tailType: ['N', 'N'],
        bellyShape: [oldGeno.bodyType && (oldGeno.bodyType[0] === 'round' || oldGeno.bodyType[0] === 'oval') ? 'O' : 'n', 'O'],
        eyeShape: [eyeA, eyeB],
        pupilStyle: ['D', 'D'],
        mouthStyle: ['S', 'S'],
        surfaceType: ['S', 'S'],
        metabolism: ['n', 'n'],
        longevity: ['n', 'n'],
        diseaseResilience: ['n', 'n'],
        vitalityStorage: ['n', 'n'],
        colorGenes: {
          huePrimary: [40, 42], satPrimary: [80, 80], lightPrimary: [60, 60],
          hueSecondary: [30, 30], satSecondary: [70, 70], lightSecondary: [80, 80],
          hueAccent: [140, 150], patternContrast: [0.2, 0.2]
        }
      };
    }

    const maxVit = getMaxVitality(wokamon.genotype);
    const lifespan = this.getWokamonLifespan(wokamon);

    if (wokamon.age === undefined || Number.isNaN(Number(wokamon.age))) wokamon.age = 0;
    if (wokamon.joy === undefined) wokamon.joy = 100;
    if (wokamon.disease === undefined) wokamon.disease = 0;
    if (wokamon.vitality === undefined) wokamon.vitality = maxVit;
    if (wokamon.dailyDeficitDays === undefined) wokamon.dailyDeficitDays = 0;
    
    // Recalculate daily step need and max vitality dynamically
    wokamon.maxVitality = maxVit;
    wokamon.lifespanDays = lifespan;
    wokamon.dailyStepNeed = this.getDailyStepNeed(wokamon);

    const phenotype = getPhenotype(wokamon.genotype);
    wokamon.heterozygosity = getHeterozygosity(wokamon.genotype);

    // Synchronize genetics parameters for rendering
    if (!wokamon.genetics) wokamon.genetics = {};
    wokamon.genetics.bodyBase = phenotype.bodyBase;
    wokamon.genetics.bodyProportion = phenotype.bodyProportion;
    wokamon.genetics.limbType = phenotype.limbType;
    wokamon.genetics.headMerge = phenotype.headMerge;
    wokamon.genetics.topAppendage = phenotype.topAppendage;
    wokamon.genetics.tailType = phenotype.tailType;
    wokamon.genetics.bellyShape = phenotype.bellyShape;
    wokamon.genetics.eyeShape = phenotype.eyeShape;
    wokamon.genetics.pupilStyle = phenotype.pupilStyle;
    wokamon.genetics.mouthStyle = phenotype.mouthStyle;
    wokamon.genetics.surfaceType = phenotype.surfaceType;
    wokamon.genetics.metabolism = phenotype.metabolism;
    wokamon.genetics.longevity = phenotype.longevity;
    wokamon.genetics.diseaseResilience = phenotype.diseaseResilience;
    wokamon.genetics.vitalityStorage = phenotype.vitalityStorage;

    // Express colors from HSL color genes
    const primHSL = getExpressedColorHSL(wokamon.genotype.colorGenes, 'Primary');
    const bellHSL = getExpressedColorHSL(wokamon.genotype.colorGenes, 'Secondary');
    wokamon.genetics.primaryColor = primHSL.str;
    wokamon.genetics.bellyColor = bellHSL.str;

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

    // Accumulate steps for earning crystals (1 crystal per 1000 steps)
    if (this.userStats.stepsPendingCrystal === undefined) {
      this.userStats.stepsPendingCrystal = 0;
    }
    this.userStats.stepsPendingCrystal += actualAdded;
    const crystalsEarned = Math.floor(this.userStats.stepsPendingCrystal / 1000);
    if (crystalsEarned > 0) {
      this.userStats.crystals += crystalsEarned;
      this.userStats.stepsPendingCrystal %= 1000;
      this.logActivity('WALK', `¡Ganaste +${crystalsEarned} 💎 por caminar!`);
    }

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
        
        this.matingState.isViable = true;
        
        this.matingState.stage = 'completed';
        this.logActivity('BREED', `Caminata del huevo completada con viabilidad: viable.`);
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

  addCrystalsManual(amount) {
    if (!this.activeUser) return;
    this.userStats.crystals += amount;
    this.logActivity('WALK', `Añadiste +${amount} 💎 de forma manual (Modo Prueba).`);
    this.saveAll();
  }

  feedWokamon(id, energyAmount) {
    const wokamon = this.wokamons.find(w => w.id === id);
    if (!wokamon || wokamon.status === 'dead') return false;
    if (wokamon.hunger >= 100) return false;

    if (this.userStats.totalEnergy < energyAmount) return false;

    this.userStats.totalEnergy -= energyAmount;
    wokamon.hunger = Math.min(100, wokamon.hunger + 30);
    
    // Growth multiplier modified by Hybrid Vigor (Variabilidad / Heterocigosis)
    const phenotype = getPhenotype(wokamon.genotype);
    let growthMultiplier = 1.0;
    if (wokamon.heterozygosity >= 80) {
      growthMultiplier = 1.30; // +30% Hybrid Vigor
    } else if (wokamon.heterozygosity >= 40) {
      growthMultiplier = 1.15; // +15% Hybrid Vigor
    }

    // Physiology Metabolism locus
    if (phenotype.metabolism === 'fast') {
      growthMultiplier *= 1.20; // +20% fast metabolism growth rate
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
          bodyBase: 'blob', bodyProportion: 'balanced', limbType: 'stubby', headMerge: 'integrated',
          topAppendage: 'horns', tailType: 'spike', bellyShape: 'oval', eyeShape: 'wide',
          pupilStyle: 'slit', mouthStyle: 'tiny-fang', surfaceType: 'smooth',
          primaryColor: '#e53935', bellyColor: '#ffb300', paintedPattern: null
        },
        genotype: {
          bodyBase: ['o', 'o'], bodyProportion: ['B', 'B'], limbType: ['S', 'S'], headMerge: ['I', 'I'],
          topAppendage: ['H', 'H'], tailType: ['s', 's'], bellyShape: ['O', 'O'], eyeShape: ['w', 'w'],
          pupilStyle: ['l', 'l'], mouthStyle: ['f', 'f'], surfaceType: ['S', 'S'],
          metabolism: ['f', 'f'], longevity: ['L', 'L'], diseaseResilience: ['I', 'I'], vitalityStorage: ['n', 'n'],
          colorGenes: {
            huePrimary: [0, 10], satPrimary: [90, 90], lightPrimary: [50, 55],
            hueSecondary: [45, 50], satSecondary: [95, 95], lightSecondary: [50, 50],
            hueAccent: [200, 210], patternContrast: [0.15, 0.15]
          }
        }
      },
      {
        name: 'Bunny Purpurina',
        genetics: {
          bodyBase: 'cloud', bodyProportion: 'balanced', limbType: 'long', headMerge: 'integrated',
          topAppendage: 'ears', tailType: 'pom', bellyShape: 'heart', eyeShape: 'sparkle',
          pupilStyle: 'glossy', mouthStyle: 'smile', surfaceType: 'plush',
          primaryColor: '#d81b60', bellyColor: '#f8bbd0', paintedPattern: null
        },
        genotype: {
          bodyBase: ['c', 'c'], bodyProportion: ['B', 'B'], limbType: ['l', 'l'], headMerge: ['I', 'I'],
          topAppendage: ['e', 'e'], tailType: ['p', 'p'], bellyShape: ['h', 'h'], eyeShape: ['k', 'k'],
          pupilStyle: ['g', 'g'], mouthStyle: ['S', 'S'], surfaceType: ['p', 'p'],
          metabolism: ['E', 'E'], longevity: ['n', 'n'], diseaseResilience: ['n', 'n'], vitalityStorage: ['V', 'V'],
          colorGenes: {
            huePrimary: [320, 330], satPrimary: [80, 85], lightPrimary: [45, 50],
            hueSecondary: [340, 345], satSecondary: [80, 80], lightSecondary: [85, 85],
            hueAccent: [100, 110], patternContrast: [0.25, 0.25]
          }
        }
      },
      {
        name: 'Panda Bambú',
        genetics: {
          bodyBase: 'round', bodyProportion: 'chubby', limbType: 'stubby', headMerge: 'integrated',
          topAppendage: 'ears', tailType: 'pom', bellyShape: 'oval', eyeShape: 'sleepy',
          pupilStyle: 'dot', mouthStyle: 'shy', surfaceType: 'plush',
          primaryColor: '#37474f', bellyColor: '#ffffff', paintedPattern: null
        },
        genotype: {
          bodyBase: ['R', 'R'], bodyProportion: ['c', 'c'], limbType: ['S', 'S'], headMerge: ['I', 'I'],
          topAppendage: ['e', 'e'], tailType: ['p', 'p'], bellyShape: ['O', 'O'], eyeShape: ['s', 's'],
          pupilStyle: ['D', 'D'], mouthStyle: ['y', 'y'], surfaceType: ['p', 'p'],
          metabolism: ['E', 'E'], longevity: ['L', 'L'], diseaseResilience: ['n', 'n'], vitalityStorage: ['n', 'n'],
          colorGenes: {
            huePrimary: [200, 210], satPrimary: [10, 15], lightPrimary: [20, 25],
            hueSecondary: [0, 0], satSecondary: [0, 0], lightSecondary: [98, 98],
            hueAccent: [120, 130], patternContrast: [0.1, 0.1]
          }
        }
      },
      {
        name: 'Gatito Galáctico',
        genetics: {
          bodyBase: 'pear', bodyProportion: 'balanced', limbType: 'springy', headMerge: 'semi-separated',
          topAppendage: 'antennae', tailType: 'fluff', bellyShape: 'cloud', eyeShape: 'sparkle',
          pupilStyle: 'star', mouthStyle: 'tiny-fang', surfaceType: 'jelly',
          primaryColor: '#673ab7', bellyColor: '#e040fb', paintedPattern: null
        },
        genotype: {
          bodyBase: ['p', 'p'], bodyProportion: ['B', 'B'], limbType: ['p', 'p'], headMerge: ['s', 's'],
          topAppendage: ['a', 'a'], tailType: ['f', 'f'], bellyShape: ['c', 'c'], eyeShape: ['k', 'k'],
          pupilStyle: ['s', 's'], mouthStyle: ['f', 'f'], surfaceType: ['j', 'j'],
          metabolism: ['f', 'f'], longevity: ['n', 'n'], diseaseResilience: ['I', 'I'], vitalityStorage: ['V', 'V'],
          colorGenes: {
            huePrimary: [260, 270], satPrimary: [80, 85], lightPrimary: [40, 45],
            hueSecondary: [290, 300], satSecondary: [90, 95], lightSecondary: [60, 65],
            hueAccent: [40, 50], patternContrast: [0.2, 0.2]
          }
        }
      },
      {
        name: 'Mochi Rosado',
        genetics: {
          bodyBase: 'squishy', bodyProportion: 'tiny', limbType: 'soft', headMerge: 'integrated',
          topAppendage: 'none', tailType: 'none', bellyShape: 'none', eyeShape: 'round',
          pupilStyle: 'dot', mouthStyle: 'smile', surfaceType: 'smooth',
          primaryColor: '#ff8a80', bellyColor: '#ff8a80', paintedPattern: null
        },
        genotype: {
          bodyBase: ['s', 's'], bodyProportion: ['y', 'y'], limbType: ['f', 'f'], headMerge: ['I', 'I'],
          topAppendage: ['n', 'n'], tailType: ['N', 'N'], bellyShape: ['n', 'n'], eyeShape: ['R', 'R'],
          pupilStyle: ['D', 'D'], mouthStyle: ['S', 'S'], surfaceType: ['S', 'S'],
          metabolism: ['E', 'E'], longevity: ['n', 'n'], diseaseResilience: ['n', 'n'], vitalityStorage: ['n', 'n'],
          colorGenes: {
            huePrimary: [350, 360], satPrimary: [95, 95], lightPrimary: [70, 75],
            hueSecondary: [350, 360], satSecondary: [95, 95], lightSecondary: [70, 75],
            hueAccent: [180, 190], patternContrast: [0.1, 0.1]
          }
        }
      },
      {
        name: 'Unicornio Cosmos',
        genetics: {
          bodyBase: 'blob', bodyProportion: 'tall', limbType: 'long', headMerge: 'integrated',
          topAppendage: 'horns', tailType: 'fluff', bellyShape: 'heart', eyeShape: 'wide',
          pupilStyle: 'star', mouthStyle: 'open-smile', surfaceType: 'jelly',
          primaryColor: '#00e5ff', bellyColor: '#ffd600', paintedPattern: null
        },
        genotype: {
          bodyBase: ['o', 'o'], bodyProportion: ['t', 't'], limbType: ['l', 'l'], headMerge: ['I', 'I'],
          topAppendage: ['H', 'H'], tailType: ['f', 'f'], bellyShape: ['h', 'h'], eyeShape: ['w', 'w'],
          pupilStyle: ['s', 's'], mouthStyle: ['o', 'o'], surfaceType: ['j', 'j'],
          metabolism: ['f', 'f'], longevity: ['L', 'L'], diseaseResilience: ['I', 'I'], vitalityStorage: ['V', 'V'],
          colorGenes: {
            huePrimary: [185, 190], satPrimary: [95, 100], lightPrimary: [50, 50],
            hueSecondary: [50, 55], satSecondary: [95, 100], lightSecondary: [50, 55],
            hueAccent: [300, 310], patternContrast: [0.3, 0.3]
          }
        }
      }
    ];

    const basePartner = friendWokamonTypes[Math.floor(Math.random() * friendWokamonTypes.length)];
    const partner = JSON.parse(JSON.stringify(basePartner));
    
    // Dynamic randomization of genotype for exciting breeding variety!
    const randomizedGenotype = {};
    for (const locus in ALLELES_DOMINANCE) {
      const alleles = Object.keys(ALLELES_DOMINANCE[locus]);
      const alleleA = alleles[Math.floor(Math.random() * alleles.length)];
      const alleleB = alleles[Math.floor(Math.random() * alleles.length)];
      randomizedGenotype[locus] = [alleleA, alleleB];
    }
    
    // Randomize HSL color genes
    randomizedGenotype.colorGenes = {
      huePrimary: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      satPrimary: [50 + Math.floor(Math.random() * 50), 50 + Math.floor(Math.random() * 50)],
      lightPrimary: [35 + Math.floor(Math.random() * 40), 35 + Math.floor(Math.random() * 40)],
      hueSecondary: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      satSecondary: [50 + Math.floor(Math.random() * 50), 50 + Math.floor(Math.random() * 50)],
      lightSecondary: [40 + Math.floor(Math.random() * 45), 40 + Math.floor(Math.random() * 45)],
      hueAccent: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      patternContrast: [parseFloat((0.1 + Math.random() * 0.3).toFixed(2)), parseFloat((0.1 + Math.random() * 0.3).toFixed(2))]
    };
    
    partner.genotype = randomizedGenotype;
    
    // Recalculate phenotype and expressed color values
    const newPhenotype = getPhenotype(randomizedGenotype);
    const primHSL = getExpressedColorHSL(randomizedGenotype.colorGenes, 'Primary');
    const bellHSL = getExpressedColorHSL(randomizedGenotype.colorGenes, 'Secondary');
    
    partner.genetics = {
      bodyBase: newPhenotype.bodyBase,
      bodyProportion: newPhenotype.bodyProportion,
      limbType: newPhenotype.limbType,
      headMerge: newPhenotype.headMerge,
      topAppendage: newPhenotype.topAppendage,
      tailType: newPhenotype.tailType,
      bellyShape: newPhenotype.bellyShape,
      eyeShape: newPhenotype.eyeShape,
      pupilStyle: newPhenotype.pupilStyle,
      mouthStyle: newPhenotype.mouthStyle,
      surfaceType: newPhenotype.surfaceType,
      metabolism: newPhenotype.metabolism,
      longevity: newPhenotype.longevity,
      diseaseResilience: newPhenotype.diseaseResilience,
      vitalityStorage: newPhenotype.vitalityStorage,
      primaryColor: primHSL.str,
      bellyColor: bellHSL.str,
      paintedPattern: null
    };

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

    this.normalizeWokamonLifecycle(newEgg);
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
        bodyBase: phenotype.bodyBase || 'round',
        bodyProportion: phenotype.bodyProportion || 'balanced',
        limbType: phenotype.limbType || 'stubby',
        headMerge: phenotype.headMerge || 'integrated',
        topAppendage: phenotype.topAppendage || 'none',
        tailType: phenotype.tailType || 'none',
        bellyShape: phenotype.bellyShape || 'oval',
        eyeShape: phenotype.eyeShape || 'round',
        pupilStyle: phenotype.pupilStyle || 'dot',
        mouthStyle: phenotype.mouthStyle || 'smile',
        surfaceType: phenotype.surfaceType || 'smooth',
        metabolism: phenotype.metabolism || 'normal',
        longevity: phenotype.longevity || 'normal',
        diseaseResilience: phenotype.diseaseResilience || 'normal',
        vitalityStorage: phenotype.vitalityStorage || 'normal',
        primaryColor: egg.genetics?.primaryColor || '#ffcc00',
        bellyColor: egg.genetics?.bellyColor || '#ffe57f',
        paintedPattern: null
      }
    };

    // Normalize so all gameplay values, step requirements, lifespan, HSL colors are properly synced/set
    this.normalizeWokamonLifecycle(baby);

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
      const phenotype = getPhenotype(wokamon.genotype);

      if (coverageRatio >= 1) {
        wokamon.dailyDeficitDays = 0;
        wokamon.hunger = Math.min(100, (wokamon.hunger || 100) + 12);
        wokamon.joy = Math.min(100, (wokamon.joy || 100) + 8);
        
        // Sickness decay with diseaseResilience
        let diseaseDecay = 6;
        if (phenotype.diseaseResilience === 'immune-boosted') diseaseDecay = 10;
        wokamon.disease = Math.max(0, (wokamon.disease || 0) - diseaseDecay);
        
        wokamon.vitality = Math.min(maxVit, (wokamon.vitality || maxVit) + 5);
      } else {
        wokamon.dailyDeficitDays = (wokamon.dailyDeficitDays || 0) + 1;
        
        // Hunger loss with metabolism
        let hungerLoss = Math.ceil(22 * missingRatio);
        if (phenotype.metabolism === 'efficient') hungerLoss = Math.ceil(15 * missingRatio);
        if (phenotype.metabolism === 'fast') hungerLoss = Math.ceil(27 * missingRatio);
        
        wokamon.hunger = Math.max(0, (wokamon.hunger || 100) - hungerLoss);
        wokamon.joy = Math.max(0, (wokamon.joy || 100) - Math.ceil(16 * missingRatio));

        // Sickness accumulation with diseaseResilience
        if (wokamon.dailyDeficitDays >= 2) {
          let diseaseAccum = Math.ceil(7 * missingRatio);
          if (phenotype.diseaseResilience === 'delicate') diseaseAccum = Math.ceil(10 * missingRatio);
          if (phenotype.diseaseResilience === 'immune-boosted') diseaseAccum = Math.ceil(4 * missingRatio);
          wokamon.disease = Math.min(100, (wokamon.disease || 0) + diseaseAccum);
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

  mutateChromaticRadiation(eggId) {
    if (this.userStats.crystals < 3) return false;
    const egg = this.eggs.find(e => e.id === eggId);
    if (!egg) return false;

    // Mutate color genes to a fun random surprise combination
    egg.genotype.colorGenes = {
      huePrimary: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      satPrimary: [Math.floor(Math.random() * 40) + 60, Math.floor(Math.random() * 40) + 60],
      lightPrimary: [Math.floor(Math.random() * 30) + 40, Math.floor(Math.random() * 30) + 40],
      
      hueSecondary: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      satSecondary: [Math.floor(Math.random() * 40) + 60, Math.floor(Math.random() * 40) + 60],
      lightSecondary: [Math.floor(Math.random() * 30) + 55, Math.floor(Math.random() * 30) + 55],
      
      hueAccent: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
      patternContrast: [parseFloat((Math.random() * 0.25 + 0.1).toFixed(2)), parseFloat((Math.random() * 0.25 + 0.1).toFixed(2))]
    };

    // Recalculate colors
    const primHSL = getExpressedColorHSL(egg.genotype.colorGenes, 'Primary');
    const bellHSL = getExpressedColorHSL(egg.genotype.colorGenes, 'Secondary');
    egg.genetics.primaryColor = primHSL.str;
    egg.genetics.bellyColor = bellHSL.str;

    this.userStats.crystals -= 3;
    this.logActivity('SHOP_BUY', `Radiación Cromática: Se mutaron aleatoriamente los colores de ${egg.name}.`);
    this.saveAll();
    return true;
  }

  resetAll() {
    this.resetLocalInMemory();
    this.saveAll();
  }
}

export const store = new GameState();
export default store;


