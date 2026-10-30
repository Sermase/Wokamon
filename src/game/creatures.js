import { getPhenotype, getColors, getHeterozygosity, randomGenotype, sanitizeGenotype } from './genetics.js';

export const RULES = {
  stepsPerCrystal: 1000,
  stepsPerGrowth: 40, // 4.000 pasos de ración = 100 de crecimiento = 1 nivel
  growthPerLevel: 100,
  baseNeed: { Niño: 2500, Adulto: 4000, Anciano: 3000 },
  overfeedRatio: 1.5, // se puede dar hasta un 150 % de la ración diaria
  feedChunk: 500,
  playCost: 200,
  playJoy: 25,
  cureCost: 10,
  labEditCost: 10,
  recolorCost: 3,
  rerollCost: 2,
  courtshipSteps: 5000,
  eggPoints: 1500,
  stepsPerEggPoint: 5, // 7.500 pasos para eclosionar (la mitad con cuidador)
  caregiverNightBonus: 100,
  energyCarryCap: 5000,
  maxSettleDays: 14,
  adultLevel: 3,
  adultAge: 7,
  baseLifespan: 30,
  releaseReward: 15,
  giftCreatureReward: 10,
  giftEggReward: 8,
  failedEggReward: 15,
};

const NAMES = ['Woki', 'Bambam', 'Puff', 'Chispas', 'Gordo', 'Zipo', 'Kiko', 'Tito', 'Mimo', 'Nono', 'Lulu', 'Jojo',
  'Dodo', 'Fifi', 'Gugu', 'Rulu', 'Pip', 'Pompa', 'Trufa', 'Bolita', 'Churro', 'Miga', 'Toffee', 'Nube', 'Brizna',
  'Coco', 'Moka', 'Pistacho', 'Garbanzo', 'Rosquilla'];

const WILD_PREFIX = ['Salvaje', 'Errante', 'Montaraz', 'Silvestre', 'Del bosque', 'Del río'];

export function uid(prefix = 'wk') {
  const rnd = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rnd}`;
}

export function randomName(rand = Math.random) {
  return NAMES[Math.floor(rand() * NAMES.length)];
}

export function wildName(rand = Math.random) {
  return `${randomName(rand)} ${WILD_PREFIX[Math.floor(rand() * WILD_PREFIX.length)].toLowerCase()}`;
}

export function lifespanOf(wok) {
  const p = getPhenotype(wok.genotype);
  const het = getHeterozygosity(wok.genotype);
  let days = RULES.baseLifespan;
  if (p.topAppendage === 'horns') days -= 2;
  if (p.surfaceType === 'jelly') days += 2;
  if (het >= 80) days += 3;
  else if (het >= 40) days += 1;
  if (p.longevity === 'long-lived') days += 6;
  if (p.longevity === 'short-lived') days -= 3;
  return Math.max(24, Math.min(42, days));
}

export function maxVitalityOf(genotype) {
  const p = getPhenotype(genotype);
  let v = p.bodyBase === 'round' || p.bodyBase === 'squishy' ? 120 : 100;
  if (p.vitalityStorage === 'high-vitality') v += 20;
  return v;
}

export function stageOf(wok) {
  if (wok.dead) return 'Fantasma';
  const lifespan = lifespanOf(wok);
  if (wok.age >= Math.floor(lifespan * 0.75)) return 'Anciano';
  if (wok.age >= RULES.adultAge || wok.level >= RULES.adultLevel) return 'Adulto';
  return 'Niño';
}

export function dailyNeedOf(wok) {
  const stage = stageOf(wok);
  if (stage === 'Fantasma') return 0;
  const p = getPhenotype(wok.genotype);
  let need = RULES.baseNeed[stage];
  if (getHeterozygosity(wok.genotype) >= 80) need *= 0.9;
  if (p.metabolism === 'efficient') need *= 0.85;
  if (p.metabolism === 'fast') need *= 1.1;
  return Math.round(need / 50) * 50;
}

export function growthMultiplierOf(wok) {
  const het = getHeterozygosity(wok.genotype);
  let m = het >= 80 ? 1.3 : het >= 40 ? 1.15 : 1;
  if (getPhenotype(wok.genotype).metabolism === 'fast') m *= 1.2;
  return m;
}

export function statusOf(wok) {
  if (wok.dead) return 'dead';
  if (wok.disease >= 60) return 'sick';
  if (wok.hunger <= 15 || wok.deficitDays >= 4) return 'starving';
  if (wok.joy <= 40 || wok.hunger <= 45 || wok.deficitDays >= 2) return 'sad';
  return 'happy';
}

export const STATUS_LABELS = {
  happy: 'Feliz',
  sad: 'Decaído',
  starving: 'Hambriento',
  sick: 'Enfermo',
  dead: 'Fantasma',
};

export function isAdult(wok) {
  const s = stageOf(wok);
  return s === 'Adulto' || s === 'Anciano';
}

// Todo lo que la interfaz necesita saber de un Wokamon, calculado a partir del genotipo y sus stats.
export function describe(wok) {
  const phenotype = getPhenotype(wok.genotype);
  const need = dailyNeedOf(wok);
  return {
    ...wok,
    phenotype,
    colors: getColors(wok.genotype),
    stage: stageOf(wok),
    status: statusOf(wok),
    need,
    rationPct: need ? Math.min(100, Math.round((wok.fedToday / need) * 100)) : 0,
    lifespan: lifespanOf(wok),
    maxVitality: maxVitalityOf(wok.genotype),
    heterozygosity: getHeterozygosity(wok.genotype),
  };
}

export function createWokamon({ name, genotype, generation = 1, parents = null, nowIso } = {}) {
  const geno = sanitizeGenotype(genotype);
  return {
    id: uid('wk'),
    name: name || randomName(),
    level: 1,
    growth: 0,
    age: 0,
    hunger: 100,
    joy: 100,
    disease: 0,
    vitality: maxVitalityOf(geno),
    deficitDays: 0,
    fedToday: 0,
    playedToday: false,
    generation,
    genotype: geno,
    parents,
    favorite: false,
    dead: false,
    bornAt: nowIso || new Date().toISOString(),
  };
}

export function createWildPartner(rand = Math.random) {
  return { name: wildName(rand), genotype: sanitizeGenotype(randomGenotype(rand)), source: 'wild' };
}

export function parentSummary(wok) {
  return {
    id: wok.id || null,
    name: wok.name,
    generation: wok.generation || 1,
    genotype: wok.genotype,
  };
}
