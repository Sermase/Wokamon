import { useMemo, useState } from 'react';
import { allTraits, alleleForName, babyGenotype, LOCUS_GROUPS, LOCUS_LABELS, traitLabel, sanitizeGenotype } from '../game/genetics.js';
import { totalNeed } from '../game/engine.js';
import { addDays, careDayKey, parseKey } from '../game/time.js';
import { Creature } from '../art/Creature.jsx';
import { CrystalIcon, EggIcon, FlaskIcon, FootIcon, GhostIcon, GiftIcon, HangerIcon, HeartIcon, LeafIcon } from '../ui/Icons.jsx';
import { Segmented, fmt } from '../ui/kit.jsx';
import { Wallet } from './Home.jsx';

export default function Journal({ game }) {
  const [view, setView] = useState('steps');
  return (
    <div className="screen">
      <div className="topbar">
        <h1>Diario</h1>
        <Wallet game={game} />
      </div>
      <Segmented label="Secciones del diario" value={view} onChange={setView} options={[
        { value: 'steps', label: 'Pasos' },
        { value: 'dex', label: 'Wokadex' },
        { value: 'log', label: 'Bitácora' },
      ]} />
      {view === 'steps' && <Steps game={game} />}
      {view === 'dex' && <Dex game={game} />}
      {view === 'log' && <Log game={game} />}
    </div>
  );
}

function useDays(game, count) {
  return useMemo(() => {
    const today = careDayKey();
    const byDate = new Map(game.player.stepHistory.map((d) => [d.date, d]));
    return Array.from({ length: count }, (_, i) => {
      const key = addDays(today, i - count + 1);
      const steps = key === today ? game.player.stepsToday : byDate.get(key)?.steps || 0;
      return { key, steps, today: key === today };
    });
  }, [game, count]);
}

function Steps({ game }) {
  const week = useDays(game, 7);
  const month = useDays(game, 30);
  const need = totalNeed(game);
  const max = Math.max(need, ...week.map((d) => d.steps), 1000) * 1.1;
  const best = Math.max(game.player.stepsToday, ...game.player.stepHistory.map((d) => d.steps), 0);
  const avg = Math.round(week.reduce((s, d) => s + d.steps, 0) / 7);
  const W = 320;
  const H = 170;
  const barW = 30;
  const gap = (W - 7 * barW) / 6;
  const y = (v) => H - 24 - (v / max) * (H - 40);
  const monthMax = Math.max(...month.map((d) => d.steps), 1);

  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Últimos 7 días</h3>{need > 0 && <span className="muted small">La línea es lo que comen al día</span>}</div>
        <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pasos de los últimos 7 días">
          {week.map((d, i) => {
            const x = i * (barW + gap);
            const top = y(d.steps);
            const label = parseKey(d.key).toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
            return (
              <g key={d.key}>
                <rect x={x} y={Math.min(top, H - 26)} width={barW} height={Math.max(2, H - 24 - top)} rx="8" fill={d.today ? 'var(--sun)' : need && d.steps >= need ? 'var(--meadow)' : '#cfd6ff'} stroke="var(--ink)" strokeWidth="2.5" />
                <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--ink-soft)">{d.today ? 'hoy' : label}</text>
              </g>
            );
          })}
          {need > 0 && <line x1="0" x2={W} y1={y(need)} y2={y(need)} stroke="var(--berry)" strokeWidth="2.5" strokeDasharray="6 6" />}
        </svg>
      </section>
      <section className="card stat-trio">
        <div><span className="muted small">Total</span><strong className="num">{fmt(game.player.totalSteps)}</strong></div>
        <div><span className="muted small">Mejor día</span><strong className="num">{fmt(best)}</strong></div>
        <div><span className="muted small">Media semanal</span><strong className="num">{fmt(avg)}</strong></div>
        <div><span className="muted small">Racha</span><strong className="num">{game.player.streak} {game.player.streak === 1 ? 'día' : 'días'}</strong></div>
        <div><span className="muted small">Mejor racha</span><strong className="num">{game.player.bestStreak || 0} {game.player.bestStreak === 1 ? 'día' : 'días'}</strong></div>
        <div><span className="muted small">Wokamon criados</span><strong className="num">{game.wokamons.length + game.memorial.length}</strong></div>
      </section>
      <section className="card">
        <h3 style={{ marginBottom: 8 }}>Últimos 30 días</h3>
        <svg className="chart" viewBox="0 0 300 70" role="img" aria-label="Pasos de los últimos 30 días">
          {month.map((d, i) => {
            const h = Math.max(3, (d.steps / monthMax) * 60);
            return <rect key={d.key} x={i * 10} y={66 - h} width="7" height={h} rx="3" fill={d.today ? 'var(--sun)' : 'var(--meadow)'} stroke="var(--ink)" strokeWidth="1.5" />;
          })}
        </svg>
      </section>
    </>
  );
}

const SHOWCASE_COLORS = {
  huePrimary: [222, 222], satPrimary: [62, 62], lightPrimary: [74, 74], hueSecondary: [45, 45], satSecondary: [85, 85],
  lightSecondary: [88, 88], hueAccent: [340, 340], patternContrast: [0.1, 0.1],
};

function showcase(locus, value) {
  const allele = alleleForName(locus, value);
  const base = babyGenotype();
  return sanitizeGenotype({ ...base, topAppendage: ['n', 'n'], tailType: ['N', 'N'], colorGenes: SHOWCASE_COLORS, [locus]: [allele, allele] });
}

function Dex({ game }) {
  const traits = allTraits();
  const total = traits.reduce((s, t) => s + t.values.length, 0);
  const found = traits.reduce((s, t) => s + t.values.filter((v) => game.dex[t.locus]?.includes(v)).length, 0);
  return (
    <>
      <section className="card">
        <div className="card-title"><h3>Rasgos descubiertos</h3><strong className="num">{found} de {total}</strong></div>
        <div className="meter-track"><div className="meter-fill" style={{ width: `${(found / total) * 100}%`, background: 'var(--crystal)' }} /></div>
        <p className="muted small" style={{ marginTop: 8 }}>Se descubren al tener un Wokamon con ese rasgo visible o al conocer a una pareja que lo tenga. En el laboratorio solo puedes usar rasgos descubiertos.</p>
      </section>
      {LOCUS_GROUPS.map((group) => (
        <section key={group.id} className="stack">
          <h2>{group.label}</h2>
          {group.loci.map((locus) => {
            const values = traits.find((t) => t.locus === locus).values;
            const visual = group.id !== 'bio';
            return (
              <div key={locus} className="stack" style={{ gap: 6 }}>
                <h3>{LOCUS_LABELS[locus]}</h3>
                <div className="dex-grid">
                  {values.map((value) => {
                    const known = game.dex[locus]?.includes(value);
                    if (!known) {
                      return (
                        <div key={value} className={`dex-cell locked ${visual ? '' : 'text'}`}>
                          {visual && <div className="q">?</div>}
                          <span>Sin descubrir</span>
                        </div>
                      );
                    }
                    return (
                      <div key={value} className={`dex-cell ${visual ? '' : 'text'}`}>
                        {visual && <Creature genotype={showcase(locus, value)} seed={`${locus}${value}`} motion="none" />}
                        <span>{traitLabel(locus, value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </>
  );
}

const LOG_ICON = {
  walk: [FootIcon, '#d4f6e4'], care: [HeartIcon, '#ffd9e1'], breed: [HeartIcon, '#ffe2ea'], hatch: [EggIcon, '#fff1c4'],
  gift: [GiftIcon, '#dbe8ff'], death: [GhostIcon, '#ececf4'], lab: [FlaskIcon, '#e8e0ff'], crystal: [CrystalIcon, '#e8e0ff'],
  shop: [HangerIcon, '#fff1c4'],
};

function dayLabel(date) {
  const key = careDayKey(date);
  const today = careDayKey();
  if (key === today) return 'Hoy';
  if (key === addDays(today, -1)) return 'Ayer';
  return date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function Log({ game }) {
  if (!game.log.length) {
    return (
      <section className="card empty">
        <LeafIcon width="48" height="48" />
        <h3>Aún no ha pasado nada</h3>
        <p className="muted">Aquí irás viendo nacimientos, paseos y cierres de cada día.</p>
      </section>
    );
  }
  let last = '';
  return (
    <section className="card log">
      {game.log.map((item) => {
        const date = new Date(item.at);
        const label = dayLabel(date);
        const header = label !== last ? label : null;
        last = label;
        const [Icon, bg] = LOG_ICON[item.type] || LOG_ICON.walk;
        return (
          <div key={item.id}>
            {header && <div className="log-day">{header.charAt(0).toUpperCase() + header.slice(1)}</div>}
            <div className="log-item">
              <span className="log-icon" style={{ background: bg }}><Icon /></span>
              <div>
                <div style={{ fontWeight: 600 }}>{item.text}</div>
                <div className="muted small">{date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
