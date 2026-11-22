// Galería de desarrollo: todas las variantes de criaturas, huevos y accesorios en una página.
import { createRoot } from 'react-dom/client';
import { Creature } from '../src/art/Creature.jsx';
import { Egg } from '../src/art/Egg.jsx';
import { babyGenotype, sanitizeGenotype, randomGenotype } from '../src/game/genetics.js';
import { seeded } from '../src/art/palette.js';

const params = new URLSearchParams(location.search);
const motion = params.get('motion') || 'none';
const section = params.get('s') || 'all';
const base = babyGenotype();
const rnd = seeded(params.get('seed') || 'gallery');
const col = (h, l = 64, s = 78) => ({ ...base.colorGenes, huePrimary: [h, h], lightPrimary: [l, l], satPrimary: [s, s] });
const set = (over) => sanitizeGenotype({ ...base, topAppendage: ['n', 'n'], tailType: ['N', 'N'], ...over });

const groups = {
  species: [
    ['gato', set({ topAppendage: ['e', 'e'], tailType: ['f', 'f'], colorGenes: col(205) })],
    ['conejo', set({ topAppendage: ['b', 'b'], tailType: ['p', 'p'], bodyBase: ['p', 'p'], colorGenes: col(330, 76) })],
    ['oso', set({ topAppendage: ['o', 'o'], limbType: ['f', 'f'], bodyProportion: ['c', 'c'], colorGenes: col(28, 52, 55) })],
    ['unicornio', set({ topAppendage: ['u', 'u'], wings: ['a', 'a'], bodyBase: ['o', 'o'], colorGenes: col(265, 78, 70) })],
    ['dragón', set({ topAppendage: ['H', 'H'], wings: ['d', 'd'], tailType: ['s', 's'], mouthStyle: ['f', 'f'], colorGenes: col(150, 55) })],
    ['hada', set({ topAppendage: ['a', 'a'], wings: ['f', 'f'], bodyBase: ['c', 'c'], eyeShape: ['k', 'k'], pupilStyle: ['s', 's'], colorGenes: col(190, 72) })],
    ['diablillo', set({ topAppendage: ['H', 'H'], tailType: ['d', 'd'], bodyBase: ['b', 'b'], mouthStyle: ['f', 'f'], colorGenes: col(0, 60, 80) })],
    ['cerdito', set({ topAppendage: ['e', 'e'], tailType: ['r', 'r'], bodyBase: ['s', 's'], bodyProportion: ['c', 'c'], colorGenes: col(350, 80, 85) })],
    ['pájaro', set({ topAppendage: ['c', 'c'], wings: ['a', 'a'], bodyBase: ['p', 'p'], limbType: ['l', 'l'], colorGenes: col(48, 66, 90) })],
    ['mapache', set({ topAppendage: ['o', 'o'], markings: ['m', 'm'], tailType: ['f', 'f'], colorGenes: col(220, 62, 18) })],
    ['tigre', set({ topAppendage: ['e', 'e'], markings: ['t', 't'], tailType: ['f', 'f'], pupilStyle: ['l', 'l'], colorGenes: col(30, 60, 90) })],
    ['dálmata', set({ topAppendage: ['b', 'b'], markings: ['s', 's'], headMerge: ['s', 's'], colorGenes: col(220, 92, 10) })],
    ['calcetines', set({ topAppendage: ['e', 'e'], markings: ['k', 'k'], tailType: ['p', 'p'], surfaceType: ['p', 'p'], colorGenes: col(255, 40, 30) })],
    ['parche', set({ topAppendage: ['o', 'o'], markings: ['p', 'p'], bodyBase: ['b', 'b'], colorGenes: col(36, 82, 60) })],
    ['gelatina', set({ bodyBase: ['o', 'o'], surfaceType: ['j', 'j'], eyeShape: ['w', 'w'], pupilStyle: ['g', 'g'], colorGenes: col(170, 62) })],
    ['peluche', set({ bodyBase: ['c', 'c'], surfaceType: ['p', 'p'], bellyShape: ['h', 'h'], topAppendage: ['o', 'o'], colorGenes: col(300, 75) })],
    ['peludo', set({ surfaceType: ['f', 'f'], limbType: ['l', 'l'], bodyProportion: ['t', 't'], topAppendage: ['b', 'b'], colorGenes: col(20, 58) })],
    ['muelles', set({ limbType: ['p', 'p'], surfaceType: ['m', 'm'], mouthStyle: ['o', 'o'], bellyShape: ['c', 'c'], colorGenes: col(100, 60) })],
  ],
  states: [
    ['feliz', set({ topAppendage: ['b', 'b'] }), {}],
    ['decaído', set({ topAppendage: ['b', 'b'] }), { mood: 'sad' }],
    ['hambre', set({ topAppendage: ['e', 'e'] }), { mood: 'starving' }],
    ['enfermo', set({ topAppendage: ['e', 'e'] }), { mood: 'sick' }],
    ['dormido', set({ topAppendage: ['o', 'o'] }), { sleeping: true }],
    ['fantasma', set({ topAppendage: ['e', 'e'] }), { mood: 'dead', stage: 'Fantasma' }],
    ['recién nacido', base, { stage: 'Niño', age: 0 }],
    ['niño', set({ topAppendage: ['H', 'H'], wings: ['a', 'a'] }), { stage: 'Niño', age: 4 }],
    ['anciano', set({ topAppendage: ['H', 'H'] }), { stage: 'Anciano' }],
    ['comiendo', set({ topAppendage: ['o', 'o'] }), { reaction: { type: 'eat', key: 1 } }],
    ['bostezo', set({ topAppendage: ['e', 'e'] }), { reaction: { type: 'yawn', key: 1 } }],
    ['nivel', set({ topAppendage: ['e', 'e'] }), { reaction: { type: 'level', key: 1 } }],
  ],
  outfits: [
    ['gorro de lana', set({ topAppendage: ['e', 'e'] }), { outfit: { head: 'beanie', neck: 'scarf' } }],
    ['fiesta', set({ topAppendage: ['o', 'o'] }), { outfit: { head: 'party' } }],
    ['corona', set({ topAppendage: ['H', 'H'] }), { outfit: { head: 'crown' } }],
    ['chistera', set({ topAppendage: ['b', 'b'] }), { outfit: { head: 'tophat', face: 'sunglasses' } }],
    ['lazo', set({ topAppendage: ['b', 'b'], bodyBase: ['p', 'p'] }), { outfit: { head: 'bow' } }],
    ['flor', set({ headMerge: ['s', 's'], topAppendage: ['o', 'o'] }), { outfit: { head: 'flower', neck: 'scarf' } }],
  ],
  random: Array.from({ length: 24 }, (_, i) => [`aleatorio ${i}`, sanitizeGenotype(randomGenotype(rnd))]),
};

function Cell([name, g, o = {}], i) {
  return (
    <div className="cell" key={name + i}>
      <Creature genotype={g} seed={`s${i}${name}`} motion={motion} {...o} />
      <div>{name}</div>
    </div>
  );
}

const shown = section === 'all' ? Object.keys(groups) : section.split(',');
createRoot(document.getElementById('root')).render(
  <>
    {shown.map((k) => <div key={k} className="grid">{groups[k].map(Cell)}</div>)}
    {section === 'all' && (
      <div className="grid">
        {['S', 'p', 'j', 'f', 'm'].map((s, i) => (
          <div className="cell" key={s}><Egg genotype={sanitizeGenotype({ ...randomGenotype(rnd), surfaceType: [s, s] })} seed={`e${i}`} progress={i * 0.3} motion="none" /><div>huevo {s}</div></div>
        ))}
      </div>
    )}
  </>,
);
