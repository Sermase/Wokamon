import { useEffect, useMemo, useState } from 'react';
import { dispatch } from '../data/store.js';
import { describe, RULES, STATUS_LABELS } from '../game/creatures.js';
import { selectFeatured, totalNeed } from '../game/engine.js';
import { babyGenotype } from '../game/genetics.js';
import { isBedtime, partOfDay } from '../game/time.js';
import { CreatureOf, Creature } from '../art/Creature.jsx';
import { HabitatScene } from '../art/Habitat.jsx';
import { Chevron, CrystalIcon, EnergyIcon, FootIcon, GearIcon } from '../ui/Icons.jsx';
import { Cost, Meter, fmt } from '../ui/kit.jsx';

const STATUS_CHIP = { happy: 'meadow', sad: 'sky', starving: 'sun', sick: 'berry', dead: 'grey' };

// Cada toque da 500 pasos de comida, o lo que falte para completar la ración.
export function feedAmount(wok) {
  const left = wok.need - wok.fedToday;
  return left > 0 ? Math.min(RULES.feedChunk, left) : RULES.feedChunk;
}

export function moodLine(wok, sleeping) {
  if (wok.status === 'dead') return 'Ahora es un fantasma. Puedes despedirte desde el Criadero.';
  if (sleeping) return 'Está durmiendo. Tócalo para despertarlo.';
  const left = Math.max(0, wok.need - wok.fedToday);
  if (wok.status === 'sick') return 'Está enfermo: dale medicina y que no le falte su ración.';
  if (wok.status === 'starving') return `Tiene muchísima hambre. Le faltan ${fmt(left)} pasos de ración.`;
  if (wok.status === 'sad') return wok.playedToday ? 'Sigue algo decaído. Que no le falte comida.' : 'Está decaído. Jugar con él le anima.';
  if (left > 0) return `Le faltan ${fmt(left)} pasos para completar su ración de hoy.`;
  return 'Ración completa. Está de maravilla.';
}

export function Wallet({ game }) {
  return (
    <div className="wallet">
      <span className="pill num" title="Energía: pasos disponibles para cuidar"><EnergyIcon />{fmt(game.player.energy)}</span>
      <span className="pill num" title="Cristales"><CrystalIcon />{fmt(game.player.crystals)}</span>
    </div>
  );
}

export default function Home({ game, session, prefs, steps, reactions, onPet, onOpenSettings, onOpenCreature, onStartSteps, onGoBreed }) {
  const living = game.wokamons.filter((w) => !w.dead);
  const roster = living.length ? living : game.wokamons;
  const featured = selectFeatured(game);
  const [currentId, setCurrentId] = useState(featured?.id);
  const [awakeUntil, setAwakeUntil] = useState(0);
  const [, setClock] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const current = roster.find((w) => w.id === currentId) || featured;
  const wok = useMemo(() => (current ? describe(current) : null), [current]);
  const index = current ? roster.findIndex((w) => w.id === current.id) : -1;
  const part = partOfDay();
  const sleeping = Boolean(wok && wok.status !== 'dead' && isBedtime() && Date.now() > awakeUntil);
  const need = totalNeed(game);
  const today = game.player.stepsToday;

  const go = (delta) => {
    const next = roster[(index + delta + roster.length) % roster.length];
    setCurrentId(next.id);
  };
  const wake = () => setAwakeUntil(Date.now() + 3 * 60 * 1000);

  const feed = () => {
    wake();
    dispatch('feed', { id: wok.id, amount: feedAmount(wok) });
  };

  const initial = (session.user?.name || 'Invitado').charAt(0).toUpperCase();

  return (
    <div className="screen">
      <div className="topbar">
        <button className="avatar" onClick={onOpenSettings} aria-label="Ajustes y cuenta">
          {session.user?.photo ? <img src={session.user.photo} alt="" referrerPolicy="no-referrer" /> : initial}
        </button>
        <Wallet game={game} />
      </div>

      <div className="habitat">
        <HabitatScene part={part} />
        {wok ? (
          <>
            <button
              className="habitat-creature"
              onClick={() => { if (sleeping) wake(); else onPet(wok.id); }}
              aria-label={sleeping ? `Despertar a ${wok.name}` : `Acariciar a ${wok.name}`}
            >
              <CreatureOf wok={wok} sleeping={sleeping} reaction={reactions[wok.id]} />
            </button>
            {roster.length > 1 && (
              <>
                <button className="btn habitat-nav prev" onClick={() => go(-1)} aria-label="Anterior"><Chevron dir="left" width="20" /></button>
                <button className="btn habitat-nav next" onClick={() => go(1)} aria-label="Siguiente"><Chevron width="20" /></button>
                <div className="habitat-dots" aria-hidden="true">
                  {roster.slice(0, 8).map((w) => <span key={w.id} className={w.id === current.id ? 'on' : ''} />)}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="habitat-empty">
            <div className="egg-wrap" style={{ filter: 'brightness(0) opacity(0.25)', width: 130, height: 130 }}>
              <Creature genotype={babyGenotype()} motion="none" seed="silhouette" />
            </div>
            <div className="bubble">
              <h2>¿Quién anda por ahí?</h2>
              <p className="muted" style={{ fontWeight: 600 }}>Da tus primeros pasos y algo se acercará.</p>
            </div>
          </div>
        )}
      </div>

      {wok && (
        <section className="stack" aria-label={`Estado de ${wok.name}`}>
          <div className="creature-title">
            <h1>{wok.name}</h1>
            <button className="btn small" onClick={() => onOpenCreature(wok.id)}>Ficha</button>
          </div>
          <div className="row wrap">
            <span className="chip crystal">Nivel {wok.level}</span>
            <span className="chip sky">{wok.stage}</span>
            {wok.status !== 'dead' && <span className={`chip ${STATUS_CHIP[wok.status]}`}>{sleeping ? 'Dormido' : STATUS_LABELS[wok.status]}</span>}
          </div>
          <p className="mood-line">{moodLine(wok, sleeping)}</p>
          {wok.status !== 'dead' && (
            <div className="card stack">
              <Meter label="Ración" value={wok.fedToday} max={wok.need} color="var(--sun)" text={`${fmt(wok.fedToday)} / ${fmt(wok.need)}`} />
              <Meter label="Ánimo" value={wok.joy} color="var(--berry)" />
              <Meter label="Salud" value={wok.vitality} max={wok.maxVitality} color="var(--meadow)" />
            </div>
          )}
          {wok.status !== 'dead' && (
            <div className="actions">
              <button className="btn big sun" onClick={feed}>
                Dar de comer
                <Cost energy={feedAmount(wok)} />
              </button>
              <button className="btn big" onClick={() => { wake(); dispatch('play', { id: wok.id }); }}>
                Jugar
                <Cost energy={RULES.playCost} />
              </button>
              {wok.disease > 0 && (
                <button className="btn big berry full" onClick={() => dispatch('cure', { id: wok.id })}>
                  Darle medicina
                  <Cost crystals={RULES.cureCost} />
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <WalkCard game={game} today={today} need={need} steps={steps} prefs={prefs} onStartSteps={onStartSteps} />

      <Happenings game={game} onGoBreed={onGoBreed} />

      {prefs.devTools && <DevTools wokId={wok?.id} />}
    </div>
  );
}

function WalkCard({ game, today, need, steps, prefs, onStartSteps }) {
  const target = need || 4000;
  const filled = Math.min(10, Math.floor((today / target) * 10));
  return (
    <section className="card" aria-label="Pasos de hoy">
      <div className="card-title">
        <h3>Hoy has caminado</h3>
        <span className="muted small num">{fmt(game.player.totalSteps)} en total</span>
      </div>
      <div className="walk-big num">{fmt(today)} <span style={{ fontSize: 20 }}>pasos</span></div>
      <div className="trail" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <FootIcon key={i} filled={i < filled} flip={i % 2 === 1} style={{ transform: `translateY(${i % 2 ? 6 : 0}px) rotate(${i % 2 ? 8 : -8}deg)` }} />
        ))}
      </div>
      <p className="muted small">
        {need === 0 ? 'Cada paso es energía para cuidar a tus Wokamon.'
          : today >= need ? `Ya has cubierto los ${fmt(need)} pasos que comen al día. Lo que camines de más se guarda.`
            : `Tus Wokamon comen ${fmt(need)} pasos al día. El día se cierra a las 5:00.`}
      </p>
      <div className="sensor-row">
        {steps.status === 'on' ? (
          <span className="sensor-state"><span className="live-dot" />{steps.source === 'native' ? 'Contando pasos, también con la app cerrada' : 'Contando pasos con la app abierta'}</span>
        ) : steps.status === 'unavailable' ? (
          <span className="sensor-state muted">{prefs.devTools ? 'Este dispositivo no cuenta pasos: usa las pruebas de abajo.' : 'Este dispositivo no cuenta pasos. En ajustes puedes activar las herramientas de prueba.'}</span>
        ) : steps.status === 'denied' ? (
          <span className="sensor-state muted">Sin permiso para contar pasos. Actívalo en los ajustes del móvil.</span>
        ) : (
          <>
            <span className="sensor-state muted">El contador está apagado.</span>
            <button className="btn small meadow" onClick={onStartSteps}>Contar mis pasos</button>
          </>
        )}
      </div>
    </section>
  );
}

function Happenings({ game, onGoBreed }) {
  const c = game.courtship;
  const ready = game.eggs.filter((e) => e.points >= e.target).length;
  const warming = game.eggs.length - ready;
  if (!c && !game.eggs.length) return null;
  return (
    <section className="card stack" aria-label="En marcha">
      {c && (
        <button className="row" style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left' }} onClick={() => onGoBreed('courtship')}>
          <div className="grow">
            <h3>Paseo de cortejo</h3>
            <p className="muted small">{c.parent.name} y {c.partner.name}: faltan {fmt(c.target - c.walked)} pasos.</p>
          </div>
          <Chevron width="22" />
        </button>
      )}
      {game.eggs.length > 0 && (
        <button className="row" style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left' }} onClick={() => onGoBreed('incubator')}>
          <div className="grow">
            <h3>{ready ? (ready === 1 ? 'Un huevo listo para abrir' : `${ready} huevos listos para abrir`) : 'Incubadora'}</h3>
            <p className="muted small">{warming ? `${warming} ${warming === 1 ? 'huevo se incuba' : 'huevos se incuban'} mientras caminas.` : 'Ábrelos desde Cría.'}</p>
          </div>
          <Chevron width="22" />
        </button>
      )}
    </section>
  );
}

function DevTools({ wokId }) {
  return (
    <section className="card dev stack" aria-label="Herramientas de prueba">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3>Herramientas de prueba</h3>
        <GearIcon width="22" />
      </div>
      <div className="row">
        <button className="btn small" onClick={() => dispatch('devSteps', { steps: 1000 })}>+1.000 pasos</button>
        <button className="btn small" onClick={() => dispatch('devSteps', { steps: 10000 })}>+10.000 pasos</button>
        <button className="btn small" onClick={() => dispatch('devPassDay')}>Pasar un día</button>
        <button className="btn small" onClick={() => dispatch('devCrystals', { amount: 20 })}>+20 cristales</button>
        {wokId && <button className="btn small" onClick={() => dispatch('devLevel', { id: wokId })}>Subir de nivel</button>}
      </div>
    </section>
  );
}
