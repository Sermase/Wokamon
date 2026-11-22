import { useEffect, useMemo, useState } from 'react';
import { dispatch } from '../data/store.js';
import { describe, RULES, isAdult } from '../game/creatures.js';
import { ALLELES, BIO_HELP, LOCUS_GROUPS, LOCUS_LABELS, traitLabel } from '../game/genetics.js';
import { Creature, CreatureOf } from '../art/Creature.jsx';
import { Backdrop } from '../art/Habitat.jsx';
import { PencilIcon, StarIcon } from '../ui/Icons.jsx';
import { Cost, Meter, Sheet, fmt } from '../ui/kit.jsx';
import { ACCESSORIES } from '../game/accessories.js';
import { AccessoryIcon } from '../art/Accessory.jsx';
import { creaturePalette } from '../art/palette.js';
import { feedAmount, moodLine } from './Home.jsx';

export default function CreatureSheet({ game, id, reaction, onClose, onPet }) {
  const raw = game.wokamons.find((w) => w.id === id);
  const wok = useMemo(() => (raw ? describe(raw) : null), [raw]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => { setEditing(false); setConfirm(null); }, [id]);

  if (!wok) return <Sheet open={false} />;
  const dead = wok.status === 'dead';

  const saveName = (e) => {
    e.preventDefault();
    dispatch('rename', { id: wok.id, name });
    setEditing(false);
  };

  const ask = (action, run) => {
    if (confirm === action) {
      setConfirm(null);
      run();
    } else {
      setConfirm(action);
    }
  };

  return (
    <Sheet open onClose={onClose} label={`Ficha de ${wok.name}`}>
      <div className="sheet-hero">
        <Backdrop hue={wok.colors.primary.h} dim={dead} />
        <CreatureOf wok={wok} reaction={reaction} idle onClick={() => !dead && onPet(wok.id)} />
      </div>

      {editing ? (
        <form className="row" onSubmit={saveName}>
          <input className="field grow" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} aria-label="Nuevo nombre" autoFocus />
          <button className="btn sun" type="submit">Guardar</button>
        </form>
      ) : (
        <div className="creature-title">
          <h1>{wok.name}</h1>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn icon-btn small" onClick={() => { setName(wok.name); setEditing(true); }} aria-label="Cambiar nombre"><PencilIcon width="20" /></button>
            {!dead && (
              <button className="btn icon-btn small" onClick={() => dispatch('setFavorite', { id: wok.id })} aria-label={wok.favorite ? 'Es tu favorito' : 'Marcar como favorito'} aria-pressed={wok.favorite}>
                <StarIcon filled={wok.favorite} width="22" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="row wrap">
        <span className="chip crystal">Nivel {wok.level}</span>
        <span className="chip sky">{wok.stage}</span>
        <span className="chip grey">Generación {wok.generation}</span>
        <span className="chip grey">{wok.age} {wok.age === 1 ? 'día' : 'días'} de vida</span>
      </div>
      <p className="mood-line">{moodLine(wok, false)}</p>

      {!dead && (
        <>
          <div className="card stack">
            <Meter label="Ración" value={wok.fedToday} max={wok.need} color="var(--sun)" text={`${fmt(wok.fedToday)} / ${fmt(wok.need)}`} />
            <Meter label="Ánimo" value={wok.joy} color="var(--berry)" />
            <Meter label="Salud" value={wok.vitality} max={wok.maxVitality} color="var(--meadow)" text={`${Math.round(wok.vitality)} / ${wok.maxVitality}`} />
            <Meter label="Crecer" value={wok.growth} max={RULES.growthPerLevel} color="var(--crystal)" text={`Nv ${wok.level + 1}`} />
            {wok.disease > 0 && <Meter label="Enfermedad" value={wok.disease} color="#9bd26a" />}
          </div>
          <div className="actions">
            <button className="btn big sun" onClick={() => dispatch('feed', { id: wok.id, amount: feedAmount(wok) })}>Dar de comer<Cost energy={feedAmount(wok)} /></button>
            <button className="btn big" onClick={() => dispatch('play', { id: wok.id })}>Jugar<Cost energy={RULES.playCost} /></button>
            {wok.disease > 0 && <button className="btn big berry full" onClick={() => dispatch('cure', { id: wok.id })}>Darle medicina<Cost crystals={RULES.cureCost} /></button>}
          </div>
        </>
      )}

      {!dead && <Wardrobe game={game} wok={wok} />}

      <section className="card stack">
        <h3>Biología</h3>
        <div className="stack small" style={{ gap: 4 }}>
          {!dead && <Fact label="Come al día" value={`${fmt(wok.need)} pasos`} />}
          <Fact label="Vida esperada" value={`unos ${wok.lifespan} días`} />
          <Fact label="Mezcla genética" value={`${wok.heterozygosity} %`} />
        </div>
        {wok.heterozygosity >= 40 && !dead && (
          <p className="muted small">Al ser tan mestizo crece un {wok.heterozygosity >= 80 ? '30' : '15'} % más rápido y vive algo más (vigor híbrido).</p>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginBottom: 4 }}>Genes</h3>
        <p className="muted small" style={{ marginBottom: 6 }}>Cada rasgo tiene dos alelos, uno de cada progenitor. Se ve el dominante (en amarillo); el otro queda oculto, pero puede salir en sus crías.</p>
        {LOCUS_GROUPS.map((group) => (
          <details key={group.id} className="group" open={group.id === 'body'}>
            <summary>{group.label}</summary>
            <div className="genes">
              {group.loci.map((locus) => <GeneRow key={locus} locus={locus} pair={wok.genotype[locus]} value={wok.phenotype[locus]} />)}
            </div>
          </details>
        ))}
      </section>

      {wok.parents?.a && wok.parents?.b && (
        <section className="card stack">
          <h3>Familia</h3>
          <div className="pair">
            <Parent p={wok.parents.a} />
            <span />
            <Parent p={wok.parents.b} />
          </div>
        </section>
      )}

      <section className="stack">
        {!dead && isAdult(raw) && (
          <button className="btn block" onClick={() => dispatch('shareForBreeding', { id: wok.id })}>Compartir para cruzar con un amigo</button>
        )}
        {!dead && (
          <button className="btn block" onClick={() => ask('gift', () => { dispatch('giftCreature', { id: wok.id }); onClose(); })}>
            {confirm === 'gift' ? `Sí, regalar a ${wok.name}` : `Regalar a un amigo (+${RULES.giftCreatureReward} cristales)`}
          </button>
        )}
        <button className="btn block berry" onClick={() => ask('release', () => { dispatch('release', { id: wok.id }); onClose(); })}>
          {confirm === 'release' ? (dead ? 'Sí, despedirme' : `Sí, liberar a ${wok.name}`) : dead ? 'Despedirse' : `Liberar (+${RULES.releaseReward} cristales)`}
        </button>
        {confirm && <p className="muted small" style={{ textAlign: 'center' }}>Toca otra vez para confirmar. No se puede deshacer.</p>}
      </section>
    </Sheet>
  );
}

function Fact({ label, value }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className="muted">{label}</span>
      <strong className="num">{value}</strong>
    </div>
  );
}

export function GeneRow({ locus, pair, value, children }) {
  const [a, b] = pair;
  const domA = ALLELES[locus][a].dominance >= ALLELES[locus][b].dominance;
  const hidden = a !== b ? traitLabel(locus, ALLELES[locus][domA ? b : a].name) : null;
  const help = BIO_HELP[locus]?.[value];
  return (
    <div className="gene">
      <span className="label">{LOCUS_LABELS[locus]}</span>
      <div className="alleles" aria-label={`Alelos ${a} y ${b}`}>
        {children || (
          <>
            <span className={`allele ${domA ? 'dom' : ''}`}>{a}</span>
            <span className={`allele ${!domA || a === b ? 'dom' : ''}`}>{b}</span>
          </>
        )}
      </div>
      <span>
        <span className="value">{traitLabel(locus, value)}</span>
        {hidden && <span className="hint">, oculto: {hidden.toLowerCase()}</span>}
        {help && <span className="hint" style={{ display: 'block' }}>{help}</span>}
      </span>
    </div>
  );
}

function Parent({ p }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {p.genotype ? <Creature genotype={p.genotype} seed={p.id || p.name} motion="none" /> : null}
      <strong style={{ display: 'block' }}>{p.name}</strong>
      <span className="muted small">Generación {p.generation || 1}{p.owner ? `, de ${p.owner}` : ''}</span>
    </div>
  );
}


function Wardrobe({ game, wok }) {
  const [ask, setAsk] = useState(null);
  const pal = useMemo(() => creaturePalette(wok.colors), [wok.colors]);
  const owned = game.player.owned || [];
  const worn = Object.values(wok.outfit || {});
  const tap = (acc) => {
    if (owned.includes(acc.id)) {
      setAsk(null);
      dispatch('wear', { id: wok.id, item: acc.id });
    } else if (ask === acc.id) {
      setAsk(null);
      const events = dispatch('buyAccessory', { item: acc.id });
      if (events.some((e) => e.type === 'bought')) dispatch('wear', { id: wok.id, item: acc.id });
    } else {
      setAsk(acc.id);
    }
  };
  return (
    <section className="card stack">
      <div className="card-title" style={{ marginBottom: 0 }}>
        <h3>Armario</h3>
        <span className="muted small">Toca para ponérselo</span>
      </div>
      <div className="wardrobe">
        {ACCESSORIES.map((acc) => {
          const isOwned = owned.includes(acc.id);
          const on = worn.includes(acc.id);
          const asking = ask === acc.id;
          return (
            <button key={acc.id} className={`wardrobe-item ${on ? 'on' : ''} ${isOwned ? '' : 'locked'}`} onClick={() => tap(acc)} aria-pressed={on}>
              <span className="wardrobe-art"><AccessoryIcon id={acc.id} pal={pal} ink="var(--ink)" /></span>
              <span className="wardrobe-name">{asking ? '¿Comprar?' : acc.name}</span>
              {!isOwned && <Cost crystals={acc.price} />}
              {isOwned && <span className="sub">{on ? 'Puesto' : 'Tuyo'}</span>}
            </button>
          );
        })}
      </div>
      {ask && <p className="muted small">Toca otra vez para comprarlo con cristales.</p>}
    </section>
  );
}
