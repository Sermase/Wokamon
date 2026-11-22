// Convierte una partida de la versión 1 (documento users/{uid} + subcolecciones) al formato v2.
import { reconcile } from './engine.js';
import { careDayKey } from './time.js';

const LEGACY_LOG_TYPES = { WALK: 'walk', FEED: 'care', BREED: 'breed', HATCH: 'hatch', GIFT: 'gift', CLAIM: 'gift', SHOP_BUY: 'lab' };

// Genotipos muy antiguos (5 loci: bodyType, ears, eyes, horns, wings).
function upgradeAncientGenotype(geno = {}) {
  if (geno.bodyBase) return geno;
  const body = (v) => ({ round: 'R', oval: 'R', squarish: 'b', cloud: 'c', blob: 'o', squishy: 's' }[v] || 'R');
  const top = (v) => ({ neon: 'H', ram: 'e' }[v] || 'n');
  const eye = (v) => ({ round: 'R', sleepy: 's', sparkle: 'k', fire: 'w' }[v] || 'R');
  return {
    bodyBase: [body(geno.bodyType?.[0]), body(geno.bodyType?.[1])],
    topAppendage: [top(geno.horns?.[0]), top(geno.horns?.[1])],
    eyeShape: [eye(geno.eyes?.[0]), eye(geno.eyes?.[1])],
    colorGenes: geno.colorGenes,
  };
}

function legacyParent(node) {
  if (!node) return null;
  return {
    id: node.id || null,
    name: node.name || 'Desconocido',
    generation: node.generation || 1,
    genotype: upgradeAncientGenotype(node.genotype || {}),
  };
}

function legacyParents(tree) {
  if (!tree) return null;
  return { a: legacyParent(tree.parentA), b: legacyParent(tree.parentB) };
}

export function migrateLegacy({ doc = {}, wokamons = [], eggs = [], history = [] }, now = new Date()) {
  const u = doc.user || {};
  const state = {
    version: 2,
    player: {
      energy: u.totalEnergy || 0,
      crystals: u.crystals ?? 5,
      stepsToday: u.stepsToday || 0,
      usedToday: 0,
      stepsPendingCrystal: u.stepsPendingCrystal || 0,
      totalSteps: (u.stepHistory || []).reduce((sum, d) => sum + (d.steps || 0), u.stepsToday || 0),
      firstWalkDone: Boolean(u.firstWalkDone || wokamons.length),
      lastCareKey: u.lastCareSettlementKey || careDayKey(now),
      stepHistory: (u.stepHistory || []).map((d) => ({ date: d.date, steps: d.steps || 0, used: d.used || 0 })),
      createdAt: now.toISOString(),
    },
    wokamons: wokamons.map((w) => ({
      id: w.id,
      name: w.name,
      level: w.level,
      growth: w.growth,
      age: w.age,
      hunger: w.hunger,
      joy: w.joy,
      disease: w.disease,
      vitality: w.vitality,
      deficitDays: w.dailyDeficitDays || 0,
      fedToday: 0,
      generation: w.generation,
      genotype: upgradeAncientGenotype(w.genotype || {}),
      parents: legacyParents(w.familyTree),
      favorite: Boolean(w.isFavorite || w.favorite),
      dead: w.status === 'dead',
      bornAt: now.toISOString(),
    })),
    eggs: eggs
      .filter((e) => e.isViable !== false)
      .map((e) => ({
        id: e.id,
        generation: e.generation,
        genotype: upgradeAncientGenotype(e.genotype || {}),
        parents: legacyParents(e.familyTree),
        points: e.pointsCurrent || 0,
        target: e.pointsTarget || 1500,
        caregiverId: e.incubatingParentId || null,
        laidAt: now.toISOString(),
      })),
    courtship: null,
    dex: {},
    memorial: [],
    redeemed: [],
    log: history
      .slice()
      .sort((a, b) => (b.timestampOrder || 0) - (a.timestampOrder || 0))
      .slice(0, 60)
      .map((h) => ({
        id: h.id,
        type: LEGACY_LOG_TYPES[h.type] || 'walk',
        text: h.text,
        at: new Date(h.timestampOrder || now.getTime()).toISOString(),
      })),
  };

  const m = doc.matingState;
  if (m && ['paired', 'walking', 'completed'].includes(m.stage) && m.partnerWokamon?.genotype) {
    const parent = state.wokamons.find((w) => w.id === m.parentAId);
    if (parent) {
      state.courtship = {
        parentId: parent.id,
        parent: { id: parent.id, name: parent.name, generation: parent.generation || 1, genotype: parent.genotype },
        partner: { name: m.partnerWokamon.name || 'Pareja', generation: 1, genotype: m.partnerWokamon.genotype, source: 'wild' },
        walked: m.stage === 'completed' ? (m.stepsTarget || 5000) : (m.stepsWalked || 0),
        target: m.stepsTarget || 5000,
        startedAt: now.toISOString(),
      };
    }
  }

  return reconcile(state, { now });
}
