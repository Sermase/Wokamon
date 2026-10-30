// Genética mendeliana de los Wokamon.
// Cada locus tiene dos alelos (uno de cada progenitor); se expresa el de mayor dominancia.
// Los códigos de alelo son los mismos que en la versión 1 para conservar las partidas guardadas.

export const ALLELES = {
  bodyBase: {
    R: { name: 'round', dominance: 3 },
    b: { name: 'bean', dominance: 1 },
    p: { name: 'pear', dominance: 1 },
    c: { name: 'cloud', dominance: 1 },
    o: { name: 'blob', dominance: 1 },
    s: { name: 'squishy', dominance: 1 },
  },
  bodyProportion: {
    B: { name: 'balanced', dominance: 3 },
    c: { name: 'chubby', dominance: 1 },
    t: { name: 'tall', dominance: 1 },
    y: { name: 'tiny', dominance: 1 },
  },
  limbType: {
    S: { name: 'stubby', dominance: 3 },
    f: { name: 'soft', dominance: 1 },
    l: { name: 'long', dominance: 1 },
    p: { name: 'springy', dominance: 1 },
  },
  headMerge: {
    I: { name: 'integrated', dominance: 3 },
    s: { name: 'semi-separated', dominance: 1 },
  },
  topAppendage: {
    H: { name: 'horns', dominance: 4 },
    a: { name: 'antennae', dominance: 3 },
    e: { name: 'ears', dominance: 2 },
    s: { name: 'sprouts', dominance: 1 },
    n: { name: 'none', dominance: 1 },
  },
  tailType: {
    N: { name: 'none', dominance: 4 },
    p: { name: 'pom', dominance: 3 },
    s: { name: 'spike', dominance: 2 },
    f: { name: 'fluff', dominance: 1 },
  },
  bellyShape: {
    O: { name: 'oval', dominance: 3 },
    h: { name: 'heart', dominance: 1 },
    t: { name: 'teardrop', dominance: 1 },
    c: { name: 'cloud', dominance: 1 },
    n: { name: 'none', dominance: 1 },
  },
  eyeShape: {
    R: { name: 'round', dominance: 3 },
    s: { name: 'sleepy', dominance: 1 },
    k: { name: 'sparkle', dominance: 1 },
    w: { name: 'wide', dominance: 1 },
    d: { name: 'droopy', dominance: 1 },
  },
  pupilStyle: {
    D: { name: 'dot', dominance: 3 },
    g: { name: 'glossy', dominance: 1 },
    s: { name: 'star', dominance: 1 },
    l: { name: 'slit', dominance: 1 },
  },
  mouthStyle: {
    S: { name: 'smile', dominance: 3 },
    o: { name: 'open-smile', dominance: 1 },
    f: { name: 'tiny-fang', dominance: 1 },
    y: { name: 'shy', dominance: 1 },
  },
  surfaceType: {
    S: { name: 'smooth', dominance: 3 },
    p: { name: 'plush', dominance: 1 },
    j: { name: 'jelly', dominance: 1 },
    f: { name: 'fuzzy', dominance: 1 },
    m: { name: 'matte', dominance: 1 },
  },
  metabolism: {
    E: { name: 'efficient', dominance: 3 },
    f: { name: 'fast', dominance: 1 },
    n: { name: 'normal', dominance: 1 },
  },
  longevity: {
    L: { name: 'long-lived', dominance: 3 },
    s: { name: 'short-lived', dominance: 1 },
    n: { name: 'normal', dominance: 1 },
  },
  diseaseResilience: {
    I: { name: 'immune-boosted', dominance: 3 },
    d: { name: 'delicate', dominance: 1 },
    n: { name: 'normal', dominance: 1 },
  },
  vitalityStorage: {
    V: { name: 'high-vitality', dominance: 3 },
    n: { name: 'normal', dominance: 1 },
  },
};

export const LOCI = Object.keys(ALLELES);

export const LOCUS_GROUPS = [
  { id: 'body', label: 'Cuerpo', loci: ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape'] },
  { id: 'face', label: 'Cara y piel', loci: ['eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType'] },
  { id: 'bio', label: 'Biología', loci: ['metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage'] },
];

export const LOCUS_LABELS = {
  bodyBase: 'Silueta',
  bodyProportion: 'Proporción',
  limbType: 'Patas',
  headMerge: 'Cabeza',
  topAppendage: 'Sobre la cabeza',
  tailType: 'Cola',
  bellyShape: 'Barriga',
  eyeShape: 'Ojos',
  pupilStyle: 'Pupilas',
  mouthStyle: 'Boca',
  surfaceType: 'Piel',
  metabolism: 'Metabolismo',
  longevity: 'Longevidad',
  diseaseResilience: 'Defensas',
  vitalityStorage: 'Reserva vital',
};

export const TRAIT_LABELS = {
  bodyBase: { round: 'Redonda', bean: 'Alubia', pear: 'Pera', cloud: 'Nube', blob: 'Gota', squishy: 'Mochi' },
  bodyProportion: { balanced: 'Equilibrada', chubby: 'Rechoncha', tall: 'Espigada', tiny: 'Diminuta' },
  limbType: { stubby: 'Cortitas', soft: 'Almohadilla', long: 'Largas', springy: 'Muelle' },
  headMerge: { integrated: 'Integrada', 'semi-separated': 'Separada' },
  topAppendage: { horns: 'Cuernos', antennae: 'Antenas', ears: 'Orejas', sprouts: 'Brote', none: 'Nada' },
  tailType: { none: 'Sin cola', pom: 'Pompón', spike: 'Pinchos', fluff: 'Plumero' },
  bellyShape: { oval: 'Óvalo', heart: 'Corazón', teardrop: 'Gota', cloud: 'Nube', none: 'Lisa' },
  eyeShape: { round: 'Redondos', sleepy: 'Dormilones', sparkle: 'Brillantes', wide: 'Grandotes', droopy: 'Caídos' },
  pupilStyle: { dot: 'Punto', glossy: 'Brillo', star: 'Estrella', slit: 'Felina' },
  mouthStyle: { smile: 'Sonrisa', 'open-smile': 'Carcajada', 'tiny-fang': 'Colmillito', shy: 'Tímida' },
  surfaceType: { smooth: 'Lisa', plush: 'Peluche', jelly: 'Gelatina', fuzzy: 'Peluda', matte: 'Mate' },
  metabolism: { efficient: 'Eficiente', fast: 'Rápido', normal: 'Normal' },
  longevity: { 'long-lived': 'Larga', 'short-lived': 'Corta', normal: 'Normal' },
  diseaseResilience: { 'immune-boosted': 'Fuertes', delicate: 'Delicadas', normal: 'Normales' },
  vitalityStorage: { 'high-vitality': 'Elevada', normal: 'Normal' },
};

export const BIO_HELP = {
  metabolism: { efficient: 'Necesita un 15 % menos de pasos al día', fast: 'Crece un 20 % más rápido, pero come un 10 % más' },
  longevity: { 'long-lived': 'Vive 6 días más', 'short-lived': 'Vive 3 días menos' },
  diseaseResilience: { 'immune-boosted': 'Enferma menos y se cura antes', delicate: 'Enferma con más facilidad' },
  vitalityStorage: { 'high-vitality': '+20 de salud máxima' },
};

const DEFAULT_ALLELE = {
  bodyBase: 'R', bodyProportion: 'B', limbType: 'S', headMerge: 'I', topAppendage: 'n',
  tailType: 'N', bellyShape: 'O', eyeShape: 'R', pupilStyle: 'D', mouthStyle: 'S',
  surfaceType: 'S', metabolism: 'n', longevity: 'n', diseaseResilience: 'n', vitalityStorage: 'n',
};

export const COLOR_GENES = ['huePrimary', 'satPrimary', 'lightPrimary', 'hueSecondary', 'satSecondary', 'lightSecondary', 'hueAccent', 'patternContrast'];

const DEFAULT_COLORS = {
  huePrimary: [40, 50], satPrimary: [80, 80], lightPrimary: [60, 60],
  hueSecondary: [30, 30], satSecondary: [70, 70], lightSecondary: [80, 80],
  hueAccent: [140, 150], patternContrast: [0.2, 0.2],
};

export function traitLabel(locus, value) {
  return TRAIT_LABELS[locus]?.[value] ?? value;
}

export function alleleName(locus, allele) {
  return ALLELES[locus]?.[allele]?.name ?? null;
}

export function alleleForName(locus, name) {
  const entry = Object.entries(ALLELES[locus] || {}).find(([, info]) => info.name === name);
  return entry ? entry[0] : null;
}

function validAllele(locus, allele) {
  return ALLELES[locus]?.[allele] ? allele : DEFAULT_ALLELE[locus];
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// Devuelve un genotipo completo y válido (rellena huecos de partidas antiguas o códigos manipulados).
export function sanitizeGenotype(genotype = {}) {
  const clean = {};
  for (const locus of LOCI) {
    const pair = Array.isArray(genotype[locus]) ? genotype[locus] : [];
    clean[locus] = [validAllele(locus, pair[0]), validAllele(locus, pair[1] ?? pair[0])];
  }
  const colors = genotype.colorGenes || {};
  clean.colorGenes = {};
  for (const gene of COLOR_GENES) {
    const pair = Array.isArray(colors[gene]) ? colors[gene] : DEFAULT_COLORS[gene];
    const isHue = gene.startsWith('hue');
    const isContrast = gene === 'patternContrast';
    const max = isHue ? 360 : isContrast ? 1 : 100;
    clean.colorGenes[gene] = [0, 1].map((i) => {
      const v = clampNumber(pair[i] ?? pair[0], 0, max, DEFAULT_COLORS[gene][i]);
      return isContrast ? Math.round(v * 100) / 100 : Math.round(v);
    });
  }
  return clean;
}

export function expressAllele(locus, pair) {
  const a = ALLELES[locus][pair[0]];
  const b = ALLELES[locus][pair[1]];
  return (a.dominance >= b.dominance ? a : b).name;
}

export function getPhenotype(genotype) {
  const phenotype = {};
  for (const locus of LOCI) phenotype[locus] = expressAllele(locus, genotype[locus]);
  return phenotype;
}

// Media circular: la media de 350° y 10° es 0°, no 180°.
export function circularMeanHue(a, b) {
  const rad = Math.PI / 180;
  const x = Math.cos(a * rad) + Math.cos(b * rad);
  const y = Math.sin(a * rad) + Math.sin(b * rad);
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return Math.round(a);
  return Math.round(((Math.atan2(y, x) / rad) + 360) % 360);
}

export function getColors(genotype) {
  const g = genotype.colorGenes;
  const avg = (pair) => (pair[0] + pair[1]) / 2;
  return {
    primary: { h: circularMeanHue(...g.huePrimary), s: Math.round(avg(g.satPrimary)), l: Math.round(avg(g.lightPrimary)) },
    secondary: { h: circularMeanHue(...g.hueSecondary), s: Math.round(avg(g.satSecondary)), l: Math.round(avg(g.lightSecondary)) },
    accentHue: circularMeanHue(...g.hueAccent),
    pattern: avg(g.patternContrast),
  };
}

export function getHeterozygosity(genotype) {
  const hetero = LOCI.filter((locus) => genotype[locus][0] !== genotype[locus][1]).length;
  return Math.round((hetero / LOCI.length) * 100);
}

const pick = (arr, rand) => arr[Math.floor(rand() * arr.length)];

// Cruce mendeliano: un alelo al azar de cada progenitor, con una pequeña probabilidad de mutación.
export function cross(genoA, genoB, rand = Math.random, mutationRate = 0.03) {
  const child = {};
  for (const locus of LOCI) {
    const fromA = pick(genoA[locus], rand);
    const fromB = pick(genoB[locus], rand);
    child[locus] = [fromA, fromB].map((allele) =>
      rand() < mutationRate ? pick(Object.keys(ALLELES[locus]), rand) : allele,
    );
  }
  child.colorGenes = {};
  for (const gene of COLOR_GENES) {
    child.colorGenes[gene] = [pick(genoA.colorGenes[gene], rand), pick(genoB.colorGenes[gene], rand)];
    if (gene.startsWith('hue') && rand() < 0.25) {
      // Deriva de color suave para que ninguna cría sea idéntica a sus padres.
      const i = rand() < 0.5 ? 0 : 1;
      child.colorGenes[gene][i] = Math.round((child.colorGenes[gene][i] + (rand() * 30 - 15) + 360) % 360);
    }
  }
  return child;
}

// Probabilidades de fenotipo para un locus (cuadro de Punnett 2×2).
export function punnett(genoA, genoB, locus) {
  const counts = {};
  for (const a of genoA[locus]) {
    for (const b of genoB[locus]) {
      const name = expressAllele(locus, [a, b]);
      counts[name] = (counts[name] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, n]) => ({ name, chance: n / 4 }))
    .sort((x, y) => y.chance - x.chance);
}

export function randomGenotype(rand = Math.random) {
  const geno = {};
  for (const locus of LOCI) {
    const alleles = Object.keys(ALLELES[locus]);
    geno[locus] = [pick(alleles, rand), pick(alleles, rand)];
  }
  const r = (min, max) => Math.round(min + rand() * (max - min));
  const hue = r(0, 359);
  geno.colorGenes = {
    huePrimary: [hue, (hue + r(-25, 25) + 360) % 360],
    satPrimary: [r(55, 90), r(55, 90)],
    lightPrimary: [r(52, 74), r(52, 74)],
    hueSecondary: [r(0, 359), r(0, 359)],
    satSecondary: [r(45, 90), r(45, 90)],
    lightSecondary: [r(70, 90), r(70, 90)],
    hueAccent: [r(0, 359), r(0, 359)],
    patternContrast: [Math.round((0.1 + rand() * 0.3) * 100) / 100, Math.round((0.1 + rand() * 0.3) * 100) / 100],
  };
  return geno;
}

export function babyGenotype() {
  return sanitizeGenotype({
    bodyBase: ['R', 'R'], bodyProportion: ['B', 'B'], limbType: ['S', 'S'], headMerge: ['I', 'I'],
    topAppendage: ['s', 's'], tailType: ['f', 'f'], bellyShape: ['O', 'O'], eyeShape: ['R', 'R'],
    pupilStyle: ['D', 'D'], mouthStyle: ['S', 'S'], surfaceType: ['S', 'S'], metabolism: ['n', 'n'],
    longevity: ['n', 'n'], diseaseResilience: ['n', 'n'], vitalityStorage: ['n', 'n'],
    colorGenes: DEFAULT_COLORS,
  });
}

// Total de rasgos visibles/biológicos posibles, para la Wokadex.
export function allTraits() {
  return LOCI.map((locus) => ({
    locus,
    values: [...new Set(Object.values(ALLELES[locus]).map((a) => a.name))],
  }));
}
