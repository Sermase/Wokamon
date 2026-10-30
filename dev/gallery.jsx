import { createRoot } from 'react-dom/client';
import { Creature } from '../src/art/Creature.jsx';
import { babyGenotype, sanitizeGenotype, randomGenotype } from '../src/game/genetics.js';
import { seeded } from '../src/art/palette.js';

const base = babyGenotype();
const rnd = seeded('gallery');
const set = (over) => sanitizeGenotype({ ...base, ...over });
const motion = new URLSearchParams(location.search).get('motion') || 'none';
const items = [
  ['bebé', base, {}],
  ['round ears', set({ topAppendage: ['e','e'], colorGenes: { ...base.colorGenes, huePrimary: [200,210], hueSecondary:[340,340] } }), {}],
  ['bean horns', set({ bodyBase: ['b','b'], topAppendage: ['H','H'], tailType:['s','s'], colorGenes: { ...base.colorGenes, huePrimary: [0,10], satPrimary:[85,85], lightPrimary:[58,58], hueAccent:[45,45] } }), {}],
  ['pear antennae', set({ bodyBase: ['p','p'], topAppendage: ['a','a'], pupilStyle:['s','s'], eyeShape:['k','k'], colorGenes: { ...base.colorGenes, huePrimary: [265,270], hueAccent:[45,50] } }), {}],
  ['cloud plush', set({ bodyBase: ['c','c'], surfaceType: ['p','p'], bellyShape:['h','h'], topAppendage:['e','e'], colorGenes: { ...base.colorGenes, huePrimary: [330,330], lightPrimary:[72,72] } }), {}],
  ['blob jelly', set({ bodyBase: ['o','o'], surfaceType: ['j','j'], eyeShape:['w','w'], pupilStyle:['l','l'], tailType:['f','f'], colorGenes: { ...base.colorGenes, huePrimary: [175,180], hueAccent:[300,300] } }), {}],
  ['squishy mochi', set({ bodyBase: ['s','s'], bodyProportion:['y','y'], limbType:['f','f'], tailType:['N','N'], colorGenes: { ...base.colorGenes, huePrimary: [355,355], lightPrimary:[78,78], satPrimary:[85,85] } }), {}],
  ['panda semi', set({ headMerge: ['s','s'], bodyProportion:['c','c'], topAppendage:['e','e'], eyeShape:['s','s'], mouthStyle:['y','y'], tailType:['p','p'], colorGenes: { ...base.colorGenes, huePrimary: [210,210], satPrimary:[12,12], lightPrimary:[30,30], hueSecondary:[0,0], satSecondary:[0,0], lightSecondary:[96,96] } }), {}],
  ['fuzzy long', set({ surfaceType: ['f','f'], limbType:['l','l'], bodyProportion:['t','t'], mouthStyle:['f','f'], colorGenes: { ...base.colorGenes, huePrimary: [28,30], lightPrimary:[55,55] } }), {}],
  ['springy matte', set({ limbType: ['p','p'], surfaceType:['m','m'], mouthStyle:['o','o'], bellyShape:['c','c'], colorGenes: { ...base.colorGenes, huePrimary: [140,150], hueAccent:[20,20], patternContrast:[0.35,0.35] } }), {}],
  ['droopy teardrop', set({ eyeShape: ['d','d'], bellyShape:['t','t'], pupilStyle:['g','g'], colorGenes: { ...base.colorGenes, huePrimary: [220,225], lightPrimary:[64,64], hueAccent:[190,190] } }), {}],
  ['sad', set({ topAppendage:['e','e'] }), { mood: 'sad' }],
  ['starving', base, { mood: 'starving' }],
  ['sick', base, { mood: 'sick' }],
  ['sleeping', set({ topAppendage:['e','e'] }), { sleeping: true }],
  ['dead', base, { mood: 'dead', stage: 'Fantasma' }],
  ['niño', base, { stage: 'Niño' }],
  ['anciano', set({ topAppendage:['H','H'] }), { stage: 'Anciano' }],
  ...Array.from({ length: 18 }, (_, i) => [`random ${i}`, sanitizeGenotype(randomGenotype(rnd)), {}]),
];
createRoot(document.getElementById('root')).render(
  <div className="grid">{items.map(([name, g, o], i) => (
    <div className="cell" key={i}><Creature genotype={g} seed={'s' + i} motion={motion} {...o} /><div>{name}</div></div>
  ))}</div>
);
import { Egg } from '../src/art/Egg.jsx';
const eggRoot = document.createElement('div');
document.body.appendChild(eggRoot);
createRoot(eggRoot).render(
  <div className="grid">{['S','p','j','f','m'].map((s, i) => (
    <div className="cell" key={s}><Egg genotype={sanitizeGenotype({ ...randomGenotype(rnd), surfaceType: [s, s] })} seed={'e' + i} progress={i * 0.3} motion="none" /><div>egg {s}</div></div>
  ))}</div>
);
