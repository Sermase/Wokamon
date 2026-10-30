import { describe as suite, it, expect } from 'vitest';
import { actions, newGameState, reconcile, totalNeed } from './engine.js';
import { careDayKey, addDays } from './time.js';
import { circularMeanHue, cross, getPhenotype, punnett, sanitizeGenotype, randomGenotype } from './genetics.js';
import { RULES, dailyNeedOf, stageOf, statusOf } from './creatures.js';
import { decodeCode } from './codes.js';
import { migrateLegacy } from './migrate.js';

const at = (iso) => ({ now: new Date(iso) });
const run = (state, type, payload = {}, ctx = at('2026-10-30T12:00:00')) => actions[type](state, payload, ctx);

function freshWithBaby() {
  const s = newGameState(new Date('2026-10-30T10:00:00'));
  const ev = run(s, 'addSteps', { steps: 120 });
  return { s, ev, wok: s.wokamons[0] };
}

suite('genética', () => {
  it('la media de tono es circular', () => {
    expect(circularMeanHue(350, 10)).toBe(0);
    expect(circularMeanHue(40, 50)).toBe(45);
  });

  it('sanea genotipos incompletos o manipulados', () => {
    const g = sanitizeGenotype({ bodyBase: ['X', 'b'], colorGenes: { huePrimary: [999, 'a'] } });
    expect(g.bodyBase).toEqual(['R', 'b']);
    expect(g.colorGenes.huePrimary[0]).toBe(360);
    expect(g.colorGenes.huePrimary[1]).toBe(50);
    expect(g.tailType).toEqual(['N', 'N']);
  });

  it('cuadro de Punnett: Rb × Rb da 75 % redonda', () => {
    const a = sanitizeGenotype({ bodyBase: ['R', 'b'] });
    const res = punnett(a, a, 'bodyBase');
    expect(res[0]).toEqual({ name: 'round', chance: 0.75 });
    expect(res[1]).toEqual({ name: 'bean', chance: 0.25 });
  });

  it('las crías heredan un alelo de cada progenitor sin mutación', () => {
    const a = sanitizeGenotype({ ...randomGenotype(), bodyBase: ['b', 'b'] });
    const b = sanitizeGenotype({ ...randomGenotype(), bodyBase: ['p', 'p'] });
    const child = cross(a, b, Math.random, 0);
    expect(child.bodyBase.sort()).toEqual(['b', 'p']);
    expect(getPhenotype(sanitizeGenotype(child)).bodyBase).toBeDefined();
  });
});

suite('pasos y cuidados', () => {
  it('los primeros pasos traen a Woki Bebé y dan energía', () => {
    const { s, ev, wok } = freshWithBaby();
    expect(wok.name).toBe('Woki Bebé');
    expect(ev.some((e) => e.type === 'newFriend' && e.first)).toBe(true);
    expect(s.player.energy).toBe(120);
  });

  it('1 cristal por cada 1.000 pasos, acumulando restos', () => {
    const { s } = freshWithBaby();
    const before = s.player.crystals;
    run(s, 'addSteps', { steps: 1900 });
    expect(s.player.crystals).toBe(before + 2);
    expect(s.player.stepsPendingCrystal).toBe(20);
  });

  it('dar de comer gasta energía, llena la ración y hace crecer', () => {
    const { s, wok } = freshWithBaby();
    run(s, 'addSteps', { steps: 5000 });
    const need = dailyNeedOf(wok);
    run(s, 'feed', { id: wok.id, amount: 'ration' });
    expect(wok.fedToday).toBe(need);
    expect(s.player.energy).toBe(5120 - need);
    expect(wok.growth + (wok.level - 1) * 100).toBeGreaterThan(0);
  });

  it('no deja comer más del 150 % de la ración', () => {
    const { s, wok } = freshWithBaby();
    run(s, 'addSteps', { steps: 20000 });
    const need = dailyNeedOf(wok);
    for (let i = 0; i < 20; i += 1) run(s, 'feed', { id: wok.id });
    expect(wok.fedToday).toBeLessThanOrEqual(need * RULES.overfeedRatio);
    const ev = run(s, 'feed', { id: wok.id });
    expect(ev[0].type).toBe('error');
  });

  it('el cierre diario reparte la energía sobrante y envejece', () => {
    const { s, wok } = freshWithBaby();
    run(s, 'addSteps', { steps: 3000 });
    const ev = run(s, 'settle', {}, at('2026-10-31T06:00:00'));
    expect(ev.find((e) => e.type === 'settled')).toBeTruthy();
    expect(wok.age).toBe(1);
    expect(wok.deficitDays).toBe(0);
    expect(s.player.stepsToday).toBe(0);
    expect(s.player.stepHistory.at(-1)).toMatchObject({ date: '2026-10-30', steps: 3120 });
    expect(s.player.lastCareKey).toBe('2026-10-31');
  });

  it('antes de las 05:00 sigue siendo el día anterior', () => {
    expect(careDayKey(new Date('2026-10-31T04:59:00'))).toBe('2026-10-30');
    expect(careDayKey(new Date('2026-10-31T05:00:00'))).toBe('2026-10-31');
    const { s } = freshWithBaby();
    expect(run(s, 'settle', {}, at('2026-10-31T03:00:00'))).toEqual([]);
  });

  it('sin pasos durante días enferma y acaba muriendo', () => {
    const { s, wok } = freshWithBaby();
    s.player.energy = 0;
    let died = false;
    let key = '2026-10-30';
    for (let i = 0; i < 40 && !died; i += 1) {
      key = addDays(key, 1);
      const ev = run(s, 'settle', {}, at(`${key}T06:00:00`));
      died = ev.some((e) => e.type === 'died');
    }
    expect(died).toBe(true);
    expect(wok.dead).toBe(true);
    expect(statusOf(wok)).toBe('dead');
  });

  it('se convierte en adulto al llegar a nivel 3', () => {
    const { s, wok } = freshWithBaby();
    wok.level = 2;
    wok.growth = 99;
    run(s, 'addSteps', { steps: 1000 });
    const ev = run(s, 'feed', { id: wok.id, amount: 200 });
    expect(stageOf(wok)).toBe('Adulto');
    expect(ev.some((e) => e.type === 'grownUp')).toBe(true);
  });

  it('si no queda nadie, un Wokamon perdido te sigue al caminar', () => {
    const { s, wok } = freshWithBaby();
    wok.dead = true;
    const ev = run(s, 'addSteps', { steps: 600 });
    expect(ev.some((e) => e.type === 'newFriend' && !e.first)).toBe(true);
  });
});

suite('cría', () => {
  function adultReady() {
    const { s, wok } = freshWithBaby();
    wok.level = 3;
    return { s, wok };
  }

  it('un niño no puede criar', () => {
    const { s, wok } = freshWithBaby();
    const ev = run(s, 'startCourtship', { parentId: wok.id, partner: 'wild' });
    expect(ev[0].type).toBe('error');
  });

  it('el paseo de cortejo pone un huevo y caminar lo incuba', () => {
    const { s, wok } = adultReady();
    run(s, 'startCourtship', { parentId: wok.id, partner: 'wild' });
    expect(s.courtship).toBeTruthy();
    const ev = run(s, 'addSteps', { steps: RULES.courtshipSteps });
    expect(ev.some((e) => e.type === 'eggLaid')).toBe(true);
    expect(s.eggs).toHaveLength(1);
    expect(s.eggs[0].generation).toBe(2);
    const steps = RULES.eggPoints * RULES.stepsPerEggPoint;
    const ev2 = run(s, 'addSteps', { steps });
    expect(ev2.some((e) => e.type === 'eggReady')).toBe(true);
    const ev3 = run(s, 'hatch', { eggId: s.eggs[0].id, name: 'Ñoqui' });
    expect(ev3[0]).toMatchObject({ type: 'hatched', name: 'Ñoqui' });
    expect(s.wokamons).toHaveLength(2);
    expect(s.wokamons[1].parents.a.name).toBe(wok.name);
  });

  it('con cuidador adulto el huevo se incuba al doble de velocidad', () => {
    const { s, wok } = adultReady();
    s.eggs.push({ id: 'egg_x', generation: 2, genotype: wok.genotype, points: 0, target: 1500, caregiverId: null });
    reconcile(s);
    run(s, 'assignCaregiver', { eggId: 'egg_x', wokId: wok.id });
    run(s, 'addSteps', { steps: 1000 });
    expect(s.eggs[0].points).toBe(400);
  });

  it('el laboratorio solo inserta rasgos descubiertos y cobra cristales', () => {
    const { s, wok } = adultReady();
    s.eggs.push({ id: 'egg_x', generation: 2, genotype: wok.genotype, points: 0, target: 1500, caregiverId: null });
    reconcile(s);
    s.player.crystals = 50;
    const locked = run(s, 'labEdit', { eggId: 'egg_x', locus: 'tailType', index: 0, allele: 's' });
    expect(locked[0].type).toBe('error');
    const ok = run(s, 'labEdit', { eggId: 'egg_x', locus: 'bodyBase', index: 0, allele: 'R' });
    expect(ok).toEqual([]);
  });

  it('códigos: compartir para cruzar y regalar', () => {
    const { s, wok } = adultReady();
    const share = run(s, 'shareForBreeding', { id: wok.id });
    const other = newGameState(new Date('2026-10-30T10:00:00'));
    const ev = run(other, 'redeem', { code: share[0].code });
    expect(ev[0]).toMatchObject({ type: 'partnerReady', name: wok.name });
    const gift = run(s, 'giftCreature', { id: wok.id });
    expect(s.wokamons).toHaveLength(0);
    expect(decodeCode(gift[0].code).type).toBe('creature');
    run(other, 'redeem', { code: gift[0].code });
    expect(other.wokamons[0].name).toBe(wok.name);
    const again = run(other, 'redeem', { code: gift[0].code });
    expect(again[0].type).toBe('error');
  });
});

suite('migración v1', () => {
  it('convierte una partida antigua sin perder Wokamon ni huevos', () => {
    const state = migrateLegacy({
      doc: {
        user: { totalEnergy: 3400, crystals: 12, stepsToday: 200, firstWalkDone: true, lastCareSettlementKey: '2026-10-29' },
        matingState: { stage: 'idle' },
      },
      wokamons: [{
        id: 'wk_1', name: 'Kiko', level: 4, growth: 30, age: 9, hunger: 80, joy: 70, disease: 0, vitality: 110, status: 'happy', generation: 1,
        genotype: { bodyBase: ['R', 'b'], topAppendage: ['e', 'n'], colorGenes: { huePrimary: [200, 210] } },
        familyTree: null,
      }, {
        id: 'wk_2', name: 'Viejo', level: 1, status: 'dead', genotype: { bodyType: ['cloud', 'round'], horns: ['neon', 'none'] },
      }],
      eggs: [{ id: 'egg_1', generation: 2, pointsCurrent: 600, pointsTarget: 1500, incubatingParentId: 'wk_1', genotype: {}, isViable: true }],
      history: [{ type: 'FEED', text: 'Hola', timestampOrder: 1000 }],
    }, new Date('2026-10-30T10:00:00'));
    expect(state.player.energy).toBe(3400);
    expect(state.wokamons).toHaveLength(2);
    expect(state.wokamons[0].genotype.bodyBase).toEqual(['R', 'b']);
    expect(state.wokamons[1].dead).toBe(true);
    expect(state.wokamons[1].genotype.bodyBase).toEqual(['c', 'R']);
    expect(state.wokamons[1].genotype.topAppendage).toEqual(['H', 'n']);
    expect(state.eggs[0]).toMatchObject({ points: 600, caregiverId: 'wk_1' });
    expect(state.log[0].type).toBe('care');
    expect(totalNeed(state)).toBeGreaterThan(0);
  });
});

suite('orden de incubación', () => {
  it('el huevo recién puesto solo recibe los pasos que sobran del cortejo', () => {
    const s = newGameState(new Date('2026-10-30T10:00:00'));
    actions.addSteps(s, { steps: 100 }, at('2026-10-30T10:00:00'));
    s.wokamons[0].level = 3;
    actions.startCourtship(s, { parentId: s.wokamons[0].id, partner: 'wild' }, at('2026-10-30T10:00:00'));
    actions.addSteps(s, { steps: RULES.courtshipSteps + 500 }, at('2026-10-30T10:00:00'));
    expect(s.eggs[0].points).toBe(500 / RULES.stepsPerEggPoint);
  });
});
