// Motor del juego: acciones puras que modifican un borrador del estado y devuelven eventos para la interfaz.
import { cross, getPhenotype, LOCI, randomGenotype, sanitizeGenotype, alleleName, babyGenotype } from './genetics.js';
import {
  RULES, createWokamon, createWildPartner, dailyNeedOf, describe, growthMultiplierOf, isAdult, lifespanOf,
  maxVitalityOf, parentSummary, stageOf, statusOf, uid, randomName,
} from './creatures.js';
import { addDays, careDayKey, daysBetween } from './time.js';
import { codeFingerprint, decodeCode, encodeCode } from './codes.js';

const fmt = (n) => Math.round(n).toLocaleString('es-ES');
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));

export function newGameState(now = new Date()) {
  return reconcile({
    version: 2,
    player: {
      energy: 0,
      crystals: 5,
      stepsToday: 0,
      usedToday: 0,
      stepsPendingCrystal: 0,
      totalSteps: 0,
      firstWalkDone: false,
      lastCareKey: careDayKey(now),
      stepHistory: [],
      createdAt: now.toISOString(),
    },
    wokamons: [],
    eggs: [],
    courtship: null,
    wildPartner: null,
    friendPartner: null,
    dex: {},
    memorial: [],
    redeemed: [],
    log: [],
  }, { now });
}

function addLog(state, type, text, now) {
  state.log.unshift({ id: uid('log'), type, text, at: now.toISOString() });
  if (state.log.length > 80) state.log.length = 80;
}

function registerDex(state, genotype) {
  const phenotype = getPhenotype(genotype);
  const fresh = [];
  for (const locus of LOCI) {
    const list = state.dex[locus] || (state.dex[locus] = []);
    if (!list.includes(phenotype[locus])) {
      list.push(phenotype[locus]);
      fresh.push({ locus, value: phenotype[locus] });
    }
  }
  return fresh;
}

function findWok(state, id) {
  return state.wokamons.find((w) => w.id === id);
}

function aliveWoks(state) {
  return state.wokamons.filter((w) => !w.dead);
}

function fail(text) {
  return [{ type: 'error', text }];
}

// Reparte crecimiento y gestiona subidas de nivel y de etapa.
function grow(state, wok, gain, events) {
  const stageBefore = stageOf(wok);
  wok.growth += gain;
  while (wok.growth >= RULES.growthPerLevel) {
    wok.growth -= RULES.growthPerLevel;
    wok.level += 1;
    const reward = wok.level * 2;
    state.player.crystals += reward;
    events.push({ type: 'levelUp', id: wok.id, name: wok.name, level: wok.level, crystals: reward });
  }
  wok.growth = Math.round(wok.growth * 10) / 10;
  if (stageBefore === 'Niño' && stageOf(wok) === 'Adulto') {
    events.push({ type: 'grownUp', id: wok.id, name: wok.name });
  }
}

function eat(state, wok, amount, events) {
  const need = dailyNeedOf(wok) || 1;
  wok.fedToday += amount;
  state.player.usedToday += amount;
  wok.hunger = clamp(wok.hunger + (amount / need) * 40);
  grow(state, wok, (amount / RULES.stepsPerGrowth) * growthMultiplierOf(wok), events);
}

function spawnStray(state, now, events, first) {
  const wok = createWokamon({
    name: first ? 'Woki Bebé' : randomName(),
    genotype: first ? babyGenotype() : sanitizeGenotype(randomGenotype()),
    nowIso: now.toISOString(),
  });
  wok.favorite = true;
  state.wokamons.push(wok);
  registerDex(state, wok.genotype);
  state.player.firstWalkDone = true;
  addLog(state, 'hatch', first ? 'Tus primeros pasos han atraído a Woki Bebé.' : `${wok.name} te ha seguido durante el paseo y se ha quedado contigo.`, now);
  events.push({ type: 'newFriend', id: wok.id, name: wok.name, first });
}

function layEgg(state, now, events) {
  const c = state.courtship;
  if (!c) return;
  const parentNow = findWok(state, c.parentId);
  const parentA = parentNow ? parentSummary(parentNow) : c.parent;
  const generation = Math.max(parentA.generation || 1, c.partner.generation || 1) + 1;
  const egg = {
    id: uid('egg'),
    generation,
    genotype: sanitizeGenotype(cross(parentA.genotype, c.partner.genotype)),
    parents: { a: parentA, b: { name: c.partner.name, generation: c.partner.generation || 1, genotype: c.partner.genotype, owner: c.partner.owner || null } },
    points: 0,
    target: RULES.eggPoints,
    caregiverId: null,
    laidAt: now.toISOString(),
  };
  state.eggs.push(egg);
  state.courtship = null;
  addLog(state, 'breed', `${parentA.name} y ${c.partner.name} han puesto un huevo de generación ${generation}.`, now);
  events.push({ type: 'eggLaid', eggId: egg.id, parentA: parentA.name, parentB: c.partner.name });
}

function warmEggs(state, steps, events) {
  for (const egg of state.eggs) {
    if (egg.points >= egg.target) continue;
    const caregiver = egg.caregiverId && findWok(state, egg.caregiverId);
    const rate = caregiver && !caregiver.dead ? 2 : 1;
    egg.points = Math.min(egg.target, egg.points + (steps / RULES.stepsPerEggPoint) * rate);
    if (egg.points >= egg.target) events.push({ type: 'eggReady', eggId: egg.id });
  }
}

// ---------- Acciones ----------

export const actions = {
  addSteps(state, { steps }, { now }) {
    const n = Math.max(0, Math.floor(Number(steps) || 0));
    if (!n) return [];
    const events = [];
    const p = state.player;
    p.stepsToday += n;
    p.totalSteps += n;
    p.energy += n;
    p.stepsPendingCrystal += n;
    const crystals = Math.floor(p.stepsPendingCrystal / RULES.stepsPerCrystal);
    if (crystals > 0) {
      p.crystals += crystals;
      p.stepsPendingCrystal -= crystals * RULES.stepsPerCrystal;
      events.push({ type: 'crystals', amount: crystals });
    }

    const nobodyHome = aliveWoks(state).length === 0 && state.eggs.length === 0 && !state.courtship;
    if (nobodyHome && (!p.firstWalkDone || p.stepsToday >= 500)) {
      spawnStray(state, now, events, !p.firstWalkDone);
    }

    // Los huevos que ya existían se calientan con todos los pasos; el que se pone ahora, solo con los que sobren.
    warmEggs(state, n, events);
    if (state.courtship) {
      const missing = state.courtship.target - state.courtship.walked;
      state.courtship.walked = Math.min(state.courtship.target, state.courtship.walked + n);
      if (state.courtship.walked >= state.courtship.target) {
        const before = state.eggs.length;
        layEgg(state, now, events);
        const leftover = n - missing;
        if (leftover > 0 && state.eggs.length > before) {
          const egg = state.eggs[state.eggs.length - 1];
          egg.points = Math.min(egg.target, leftover / RULES.stepsPerEggPoint);
        }
      }
    }
    return events;
  },

  feed(state, { id, amount }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead) return fail('Ese Wokamon ya no puede comer.');
    const need = dailyNeedOf(wok);
    const room = Math.floor(need * RULES.overfeedRatio - wok.fedToday);
    if (room <= 0) return fail(`${wok.name} está a reventar. Mañana más.`);
    if (state.player.energy < 1) return fail('No te queda energía. ¡Toca caminar!');
    const want = amount === 'ration' ? Math.max(need - wok.fedToday, RULES.feedChunk) : (amount || RULES.feedChunk);
    const give = Math.floor(Math.min(want, state.player.energy, room));
    state.player.energy -= give;
    const events = [{ type: 'fed', id, amount: give }];
    eat(state, wok, give, events);
    return events;
  },

  play(state, { id }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead) return [];
    if (state.player.energy < RULES.playCost) return fail(`Jugar cuesta ${RULES.playCost} de energía.`);
    state.player.energy -= RULES.playCost;
    state.player.usedToday += RULES.playCost;
    wok.joy = clamp(wok.joy + RULES.playJoy);
    wok.playedToday = true;
    const events = [{ type: 'played', id }];
    grow(state, wok, 2, events);
    return events;
  },

  pet(state, { id }, { now }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead) return [];
    const last = wok.lastPetAt ? new Date(wok.lastPetAt).getTime() : 0;
    if (now.getTime() - last > 10 * 60 * 1000) {
      wok.joy = clamp(wok.joy + 3);
      wok.lastPetAt = now.toISOString();
    }
    return [];
  },

  cure(state, { id }, { now }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead || wok.disease <= 0) return [];
    if (state.player.crystals < RULES.cureCost) return fail(`La medicina cuesta ${RULES.cureCost} cristales.`);
    state.player.crystals -= RULES.cureCost;
    wok.disease = 0;
    wok.vitality = Math.min(maxVitalityOf(wok.genotype), wok.vitality + 30);
    addLog(state, 'care', `${wok.name} se ha tomado su medicina.`, now);
    return [{ type: 'cured', id, name: wok.name }];
  },

  rename(state, { id, name }) {
    const wok = findWok(state, id);
    const clean = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 16);
    if (!wok || !clean) return [];
    wok.name = clean;
    return [];
  },

  setFavorite(state, { id }) {
    for (const w of state.wokamons) w.favorite = w.id === id;
    return [];
  },

  release(state, { id }, { now }) {
    const wok = findWok(state, id);
    if (!wok) return [];
    const events = [];
    if (wok.dead) {
      state.memorial.unshift({ id: wok.id, name: wok.name, generation: wok.generation, age: wok.age, level: wok.level, genotype: wok.genotype, diedAt: wok.diedAt || now.toISOString() });
      state.memorial.length = Math.min(state.memorial.length, 40);
      addLog(state, 'death', `Te has despedido de ${wok.name}.`, now);
    } else {
      state.player.crystals += RULES.releaseReward;
      addLog(state, 'gift', `${wok.name} ha vuelto a la naturaleza (+${RULES.releaseReward} cristales).`, now);
      events.push({ type: 'crystals', amount: RULES.releaseReward });
    }
    detach(state, id);
    return events;
  },

  startCourtship(state, { parentId, partner: which }, { now }) {
    if (state.courtship) return fail('Ya hay un cortejo en marcha.');
    const parent = findWok(state, parentId);
    if (!parent || parent.dead || !isAdult(parent)) return fail('Solo los Wokamon adultos pueden criar.');
    const partner = which === 'friend' ? state.friendPartner : state.wildPartner;
    if (!partner) return fail('Elige una pareja primero.');
    state.courtship = {
      parentId,
      parent: parentSummary(parent),
      partner: { ...partner },
      walked: 0,
      target: RULES.courtshipSteps,
      startedAt: now.toISOString(),
    };
    registerDex(state, partner.genotype);
    if (which === 'wild') state.wildPartner = createWildPartner();
    addLog(state, 'breed', `${parent.name} ha empezado un paseo de cortejo con ${partner.name}.`, now);
    return [{ type: 'courtshipStarted' }];
  },

  cancelCourtship(state) {
    state.courtship = null;
    return [];
  },

  rerollWild(state) {
    if (state.player.crystals < RULES.rerollCost) return fail(`Buscar otra pareja cuesta ${RULES.rerollCost} cristales.`);
    state.player.crystals -= RULES.rerollCost;
    state.wildPartner = createWildPartner();
    return [];
  },

  assignCaregiver(state, { eggId, wokId }) {
    const egg = state.eggs.find((e) => e.id === eggId);
    if (!egg) return [];
    if (!wokId) {
      egg.caregiverId = null;
      return [];
    }
    const wok = findWok(state, wokId);
    if (!wok || wok.dead || !isAdult(wok)) return fail('El cuidador tiene que ser adulto.');
    for (const other of state.eggs) if (other.caregiverId === wokId) other.caregiverId = null;
    egg.caregiverId = wokId;
    return [];
  },

  hatch(state, { eggId, name }, { now }) {
    const egg = state.eggs.find((e) => e.id === eggId);
    if (!egg || egg.points < egg.target) return [];
    const baby = createWokamon({
      name: String(name || '').trim().slice(0, 16) || randomName(),
      genotype: egg.genotype,
      generation: egg.generation,
      parents: egg.parents,
      nowIso: now.toISOString(),
    });
    state.eggs = state.eggs.filter((e) => e.id !== eggId);
    state.wokamons.push(baby);
    const fresh = registerDex(state, baby.genotype);
    addLog(state, 'hatch', `Ha nacido ${baby.name} (generación ${baby.generation}).`, now);
    return [{ type: 'hatched', id: baby.id, name: baby.name, fresh }];
  },

  labEdit(state, { eggId, locus, index, allele }, { now }) {
    const egg = state.eggs.find((e) => e.id === eggId);
    if (!egg || !LOCI.includes(locus) || ![0, 1].includes(index)) return [];
    const name = alleleName(locus, allele);
    if (!name) return [];
    if (!(state.dex[locus] || []).includes(name)) return fail('Solo puedes insertar rasgos que ya hayas descubierto.');
    if (egg.genotype[locus][index] === allele) return [];
    if (state.player.crystals < RULES.labEditCost) return fail(`Cada edición cuesta ${RULES.labEditCost} cristales.`);
    state.player.crystals -= RULES.labEditCost;
    egg.genotype[locus][index] = allele;
    addLog(state, 'lab', `Has editado un gen de un huevo de generación ${egg.generation}.`, now);
    return [];
  },

  labRecolor(state, { eggId }) {
    const egg = state.eggs.find((e) => e.id === eggId);
    if (!egg) return [];
    if (state.player.crystals < RULES.recolorCost) return fail(`Recolorear cuesta ${RULES.recolorCost} cristales.`);
    state.player.crystals -= RULES.recolorCost;
    egg.genotype.colorGenes = sanitizeGenotype(randomGenotype()).colorGenes;
    return [];
  },

  giftCreature(state, { id }, { now }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead) return [];
    const code = encodeCode({
      type: 'creature',
      creature: { name: wok.name, level: wok.level, generation: wok.generation, genotype: wok.genotype, parents: wok.parents || null },
      nonce: uid('g'),
    });
    detach(state, id);
    state.player.crystals += RULES.giftCreatureReward;
    addLog(state, 'gift', `Has regalado a ${wok.name} (+${RULES.giftCreatureReward} cristales).`, now);
    return [{ type: 'code', code, kind: 'gift', label: wok.name }];
  },

  giftEgg(state, { eggId }, { now }) {
    const egg = state.eggs.find((e) => e.id === eggId);
    if (!egg) return [];
    const code = encodeCode({
      type: 'egg',
      egg: { generation: egg.generation, genotype: egg.genotype, parents: egg.parents },
      nonce: uid('g'),
    });
    state.eggs = state.eggs.filter((e) => e.id !== eggId);
    state.player.crystals += RULES.giftEggReward;
    addLog(state, 'gift', `Has regalado un huevo (+${RULES.giftEggReward} cristales).`, now);
    return [{ type: 'code', code, kind: 'gift', label: 'un huevo' }];
  },

  shareForBreeding(state, { id }, { owner }) {
    const wok = findWok(state, id);
    if (!wok || wok.dead) return [];
    const code = encodeCode({ type: 'partner', partner: { name: wok.name, generation: wok.generation, genotype: wok.genotype, owner: owner || null } });
    return [{ type: 'code', code, kind: 'partner', label: wok.name }];
  },

  redeem(state, { code }, { now }) {
    const data = decodeCode(code);
    if (!data) return fail('Ese código no es válido. Revisa que esté completo.');
    const print = codeFingerprint(code);
    if (data.type !== 'partner' && state.redeemed.includes(print)) return fail('Ya has canjeado este código.');

    if (data.type === 'partner') {
      const p = data.partner || {};
      state.friendPartner = {
        name: String(p.name || 'Amigo').slice(0, 24),
        generation: Number(p.generation) || 1,
        genotype: sanitizeGenotype(p.genotype),
        owner: p.owner ? String(p.owner).slice(0, 40) : null,
        source: 'friend',
      };
      return [{ type: 'partnerReady', name: state.friendPartner.name }];
    }

    state.redeemed.unshift(print);
    state.redeemed.length = Math.min(state.redeemed.length, 100);

    if (data.type === 'egg') {
      const e = data.egg || {};
      state.eggs.push({
        id: uid('egg'),
        generation: Number(e.generation) || 1,
        genotype: sanitizeGenotype(e.genotype),
        parents: e.parents || null,
        points: 0,
        target: RULES.eggPoints,
        caregiverId: null,
        laidAt: now.toISOString(),
      });
      addLog(state, 'gift', 'Has recibido un huevo de regalo.', now);
      return [{ type: 'received', what: 'egg' }];
    }

    const c = data.creature || {};
    const wok = createWokamon({
      name: String(c.name || '').slice(0, 16) || randomName(),
      genotype: c.genotype,
      generation: Number(c.generation) || 1,
      parents: c.parents || null,
      nowIso: now.toISOString(),
    });
    wok.level = Math.max(1, Math.min(99, Number(c.level) || 1));
    state.wokamons.push(wok);
    registerDex(state, wok.genotype);
    addLog(state, 'gift', `${wok.name} ha llegado como regalo.`, now);
    return [{ type: 'received', what: 'creature', id: wok.id, name: wok.name }];
  },

  settle(state, _payload, { now }) {
    const current = careDayKey(now);
    const p = state.player;
    if (!p.lastCareKey) {
      p.lastCareKey = current;
      return [];
    }
    const days = daysBetween(p.lastCareKey, current);
    if (days <= 0) return [];
    const run = Math.min(days, RULES.maxSettleDays);
    const report = { days, entries: {}, steps: p.stepsToday, eggsReady: [] };
    const events = [];
    for (let i = 0; i < run; i += 1) {
      settleOneDay(state, addDays(p.lastCareKey, i), report, now, events);
    }
    p.lastCareKey = current;
    events.push({ type: 'settled', report: { ...report, entries: Object.values(report.entries) } });
    return events;
  },

  devSteps(state, { steps }, ctx) {
    return actions.addSteps(state, { steps }, ctx);
  },

  devLevel(state, { id }) {
    const wok = findWok(state, id) || selectFeatured(state);
    if (!wok || wok.dead) return [];
    const events = [];
    grow(state, wok, RULES.growthPerLevel, events);
    return events;
  },

  devCrystals(state, { amount }) {
    state.player.crystals += amount;
    return [{ type: 'crystals', amount }];
  },

  devPassDay(state, _p, ctx) {
    // Simula que ha pasado un día: retrocede la marca del último cierre y liquida.
    state.player.lastCareKey = addDays(careDayKey(ctx.now), -1);
    return actions.settle(state, null, ctx);
  },
};

function detach(state, id) {
  state.wokamons = state.wokamons.filter((w) => w.id !== id);
  for (const egg of state.eggs) if (egg.caregiverId === id) egg.caregiverId = null;
  if (state.courtship?.parentId === id) state.courtship = null;
}

function settleOneDay(state, dayKey, report, now, events) {
  const p = state.player;
  const living = aliveWoks(state);

  // 1) Lo que sobre de energía se reparte solo entre quienes no completaron su ración.
  const byHunger = [...living].sort((a, b) => a.fedToday / (dailyNeedOf(a) || 1) - b.fedToday / (dailyNeedOf(b) || 1));
  for (const wok of byHunger) {
    const missing = dailyNeedOf(wok) - wok.fedToday;
    const give = Math.min(missing, p.energy);
    if (give > 0) {
      p.energy -= give;
      eat(state, wok, give, events);
    }
  }

  // 2) Efectos del día según la ración cubierta.
  for (const wok of living) {
    const need = dailyNeedOf(wok);
    const cover = need ? Math.min(1, wok.fedToday / need) : 1;
    const missing = 1 - cover;
    const ph = getPhenotype(wok.genotype);
    const maxVit = maxVitalityOf(wok.genotype);
    const entry = report.entries[wok.id] || (report.entries[wok.id] = {
      id: wok.id, name: wok.name, cover, hungryDays: 0, levelBefore: wok.level, died: false, statusBefore: statusOf(wok),
    });

    if (cover >= 1) {
      wok.deficitDays = 0;
      wok.hunger = clamp(wok.hunger + 12);
      wok.joy = clamp(wok.joy + (wok.playedToday ? 10 : -4));
      wok.disease = clamp(wok.disease - (ph.diseaseResilience === 'immune-boosted' ? 10 : 6));
      wok.vitality = Math.min(maxVit, wok.vitality + 5);
    } else {
      entry.hungryDays += 1;
      wok.deficitDays += 1;
      const hungerLoss = ph.metabolism === 'efficient' ? 15 : ph.metabolism === 'fast' ? 27 : 22;
      wok.hunger = clamp(wok.hunger - Math.ceil(hungerLoss * missing));
      wok.joy = clamp(wok.joy - Math.ceil(16 * missing) - (wok.playedToday ? 0 : 4));
      if (wok.deficitDays >= 2) {
        const sick = ph.diseaseResilience === 'delicate' ? 10 : ph.diseaseResilience === 'immune-boosted' ? 4 : 7;
        wok.disease = clamp(wok.disease + Math.ceil(sick * missing));
      }
      if (wok.deficitDays >= 4 || wok.hunger <= 10 || wok.disease >= 65) {
        const penalty = (wok.hunger <= 10 ? 4 : 0) + (wok.disease >= 65 ? 4 : 0);
        wok.vitality = Math.max(0, wok.vitality - Math.ceil(10 * missing + penalty));
      }
    }

    wok.age += 1;
    const lifespan = lifespanOf(wok);
    if (wok.age >= lifespan) {
      const frail = wok.age >= lifespan + 5 || wok.hunger < 45 || wok.disease > 35 || wok.vitality < maxVit * 0.45;
      if (frail) wok.vitality = Math.max(0, wok.vitality - 8);
    }

    wok.fedToday = 0;
    wok.playedToday = false;

    if (wok.vitality <= 0) {
      wok.dead = true;
      wok.diedAt = now.toISOString();
      wok.favorite = false;
      entry.died = true;
      addLog(state, 'death', `${wok.name} se ha convertido en fantasma tras ${wok.age} días.`, now);
      events.push({ type: 'died', id: wok.id, name: wok.name });
      for (const egg of state.eggs) if (egg.caregiverId === wok.id) egg.caregiverId = null;
      continue;
    }

    if (statusOf(wok) === 'happy' && Math.random() < 0.08) p.crystals += wok.level;
    entry.levelAfter = wok.level;
    entry.statusAfter = statusOf(wok);
  }

  // 3) Los cuidadores dan calor extra por la noche.
  for (const egg of state.eggs) {
    const caregiver = egg.caregiverId && findWok(state, egg.caregiverId);
    if (caregiver && !caregiver.dead && egg.points < egg.target) {
      egg.points = Math.min(egg.target, egg.points + RULES.caregiverNightBonus);
      if (egg.points >= egg.target) report.eggsReady.push(egg.id);
    }
  }

  // 4) Cierre del día.
  p.stepHistory.push({ date: dayKey, steps: p.stepsToday, used: p.usedToday });
  if (p.stepHistory.length > 60) p.stepHistory.splice(0, p.stepHistory.length - 60);
  if (p.stepsToday > 0 || living.length) {
    addLog(state, 'walk', `Día cerrado: ${fmt(p.stepsToday)} pasos caminados, ${fmt(p.usedToday)} usados en cuidados.`, now);
  }
  p.stepsToday = 0;
  p.usedToday = 0;
  p.energy = Math.min(p.energy, RULES.energyCarryCap);
  state.wildPartner = createWildPartner();
}

// Garantiza que el estado está completo y coherente (partidas viejas, datos de otro dispositivo…).
export function reconcile(state, { now = new Date() } = {}) {
  const s = state;
  s.version = 2;
  s.player = {
    energy: 0, crystals: 5, stepsToday: 0, usedToday: 0, stepsPendingCrystal: 0, totalSteps: 0,
    firstWalkDone: false, lastCareKey: careDayKey(now), stepHistory: [], createdAt: now.toISOString(),
    ...(s.player || {}),
  };
  for (const key of ['energy', 'crystals', 'stepsToday', 'usedToday', 'stepsPendingCrystal', 'totalSteps']) {
    s.player[key] = Math.max(0, Number(s.player[key]) || 0);
  }
  s.wokamons = (s.wokamons || []).map((w) => {
    const genotype = sanitizeGenotype(w.genotype);
    const maxVit = maxVitalityOf(genotype);
    const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return {
      ...w,
      id: w.id || uid('wk'),
      name: String(w.name || randomName()).slice(0, 16),
      level: Math.max(1, num(w.level, 1)),
      growth: Math.max(0, num(w.growth, 0)),
      age: Math.max(0, Math.floor(num(w.age, 0))),
      hunger: clamp(num(w.hunger, 100)),
      joy: clamp(num(w.joy, 100)),
      disease: clamp(num(w.disease, 0)),
      vitality: Math.max(0, Math.min(maxVit, num(w.vitality, maxVit))),
      deficitDays: Math.max(0, num(w.deficitDays, 0)),
      fedToday: Math.max(0, num(w.fedToday, 0)),
      playedToday: Boolean(w.playedToday),
      generation: Math.max(1, num(w.generation, 1)),
      favorite: Boolean(w.favorite),
      dead: Boolean(w.dead),
      genotype,
    };
  });
  s.eggs = (s.eggs || []).map((e) => ({
    ...e,
    id: e.id || uid('egg'),
    generation: Math.max(1, Number(e.generation) || 1),
    genotype: sanitizeGenotype(e.genotype),
    points: Math.max(0, Number(e.points) || 0),
    target: Number(e.target) || RULES.eggPoints,
    caregiverId: e.caregiverId && s.wokamons.some((w) => w.id === e.caregiverId && !w.dead) ? e.caregiverId : null,
  }));
  s.dex = s.dex || {};
  for (const w of s.wokamons) registerDex(s, w.genotype);
  s.memorial = s.memorial || [];
  s.redeemed = s.redeemed || [];
  s.log = s.log || [];
  s.friendPartner = s.friendPartner || null;
  if (!s.wildPartner) s.wildPartner = createWildPartner();
  if (s.courtship && !s.courtship.partner?.genotype) s.courtship = null;
  if (s.courtship) {
    const c = s.courtship;
    c.partner.genotype = sanitizeGenotype(c.partner.genotype);
    c.parent = c.parent || (findWok(s, c.parentId) ? parentSummary(findWok(s, c.parentId)) : null);
    if (!c.parent) s.courtship = null;
    else {
      c.parent.genotype = sanitizeGenotype(c.parent.genotype);
      c.walked = Number(c.walked) || 0;
      c.target = Number(c.target) || RULES.courtshipSteps;
      if (c.walked >= c.target) layEgg(s, now, []);
    }
  }
  return s;
}

// Selectores de conveniencia para la interfaz.
export function selectFeatured(state) {
  const alive = state.wokamons.filter((w) => !w.dead);
  const pool = alive.length ? alive : state.wokamons;
  if (!pool.length) return null;
  return pool.find((w) => w.favorite) || [...pool].sort((a, b) => b.level - a.level)[0];
}

export function totalNeed(state) {
  return state.wokamons.filter((w) => !w.dead).reduce((sum, w) => sum + dailyNeedOf(w), 0);
}

export { describe };
