import { useMemo, useState } from 'react';
import { dispatch } from '../data/store.js';
import { describe, isAdult, RULES } from '../game/creatures.js';
import { LOCUS_GROUPS, LOCUS_LABELS, punnett, traitLabel } from '../game/genetics.js';
import { Creature, CreatureOf } from '../art/Creature.jsx';
import { Egg } from '../art/Egg.jsx';
import { FlaskIcon, GiftIcon, HeartIcon } from '../ui/Icons.jsx';
import { Cost, Meter, Segmented, fmt } from '../ui/kit.jsx';
import { Wallet } from './Home.jsx';

export default function Breed({ game, view, setView, onLab, onHatch }) {
  const ready = game.eggs.filter((e) => e.points >= e.target).length;
  return (
    <div className="screen">
      <div className="topbar">
        <h1>Cría</h1>
        <Wallet game={game} />
      </div>
      <Segmented
        label="Secciones de cría"
        value={view}
        onChange={setView}
        options={[
          { value: 'courtship', label: game.courtship ? 'Cortejo en marcha' : 'Cortejo' },
          { value: 'incubator', label: `Incubadora${game.eggs.length ? ` (${game.eggs.length})` : ''}${ready ? ' ¡lista!' : ''}` },
        ]}
      />
      {view === 'courtship' ? <Courtship game={game} /> : <Incubator game={game} onLab={onLab} onHatch={onHatch} />}
    </div>
  );
}

function Courtship({ game }) {
  const c = game.courtship;
  const woks = game.wokamons.map(describe);
  const adults = woks.filter((w) => w.status !== 'dead' && isAdult(w));
  const [parentId, setParentId] = useState(null);
  const [source, setSource] = useState(game.friendPartner ? 'friend' : 'wild');
  const [code, setCode] = useState('');
  const [cancelAsk, setCancelAsk] = useState(false);
  const parent = adults.find((w) => w.id === parentId) || adults[0];
  const partner = source === 'friend' ? game.friendPartner : game.wildPartner;

  const odds = useMemo(() => {
    if (!parent || !partner) return [];
    const loci = LOCUS_GROUPS.flatMap((g) => g.loci);
    return loci
      .map((locus) => ({ locus, options: punnett(parent.genotype, partner.genotype, locus) }))
      .filter((o) => o.options.length > 1)
      .slice(0, 6);
  }, [parent, partner]);

  if (c) {
    const parentNow = woks.find((w) => w.id === c.parentId);
    return (
      <section className="card stack">
        <h2>Paseo de cortejo</h2>
        <p className="muted">Cada paso que des cuenta para el paseo. Al llegar a la meta pondrán un huevo.</p>
        <div className="pair">
          {parentNow ? <CreatureOf wok={parentNow} /> : <Creature genotype={c.parent.genotype} seed={c.parent.name} />}
          <HeartIcon className="heart" />
          <div style={{ transform: 'scaleX(-1)' }}><Creature genotype={c.partner.genotype} seed={c.partner.name} /></div>
        </div>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <strong>{c.parent.name}</strong>
          <strong>{c.partner.name}</strong>
        </div>
        <Meter label="Paseo" value={c.walked} max={c.target} color="var(--berry)" text={`${fmt(c.walked)} / ${fmt(c.target)}`} />
        <p className="muted small">Faltan {fmt(c.target - c.walked)} pasos.</p>
        <button className="btn ghost" onClick={() => (cancelAsk ? dispatch('cancelCourtship') : setCancelAsk(true))}>
          {cancelAsk ? 'Sí, cancelar el paseo' : 'Cancelar paseo'}
        </button>
      </section>
    );
  }

  if (!adults.length) {
    const kids = woks.filter((w) => w.status !== 'dead');
    return (
      <section className="card empty">
        <h3>Aún no tienes adultos</h3>
        <p className="muted">Un Wokamon se hace adulto al llegar a nivel {RULES.adultLevel} o al cumplir {RULES.adultAge} días. Dale de comer para que crezca.</p>
        {kids.length > 0 && (
          <div className="stack" style={{ width: '100%', marginTop: 8 }}>
            {kids.map((k) => <Meter key={k.id} label={k.name} value={k.level - 1 + k.growth / 100} max={RULES.adultLevel - 1} color="var(--crystal)" text={`Nv ${k.level}`} />)}
          </div>
        )}
      </section>
    );
  }

  const useCode = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    const events = dispatch('redeem', { code });
    if (events.some((ev) => ev.type === 'partnerReady')) setCode('');
  };

  return (
    <>
      <section className="stack">
        <h3>Elige a tu Wokamon</h3>
        <div className="picker" role="listbox" aria-label="Tus adultos">
          {adults.map((w) => (
            <button key={w.id} role="option" aria-selected={w.id === parent.id} className={w.id === parent.id ? 'on' : ''} onClick={() => setParentId(w.id)}>
              <CreatureOf wok={w} motion="none" />
              <span>{w.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="stack">
        <h3>Elige pareja</h3>
        <Segmented label="Tipo de pareja" value={source} onChange={setSource} options={[{ value: 'wild', label: 'Salvaje' }, { value: 'friend', label: 'De un amigo' }]} />
        {source === 'wild' && game.wildPartner && (
          <div className="card stack">
            <div className="pair">
              <CreatureOf wok={parent} motion="calm" />
              <HeartIcon className="heart" />
              <div style={{ transform: 'scaleX(-1)' }}><Creature genotype={game.wildPartner.genotype} seed={game.wildPartner.name} motion="calm" /></div>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong>{parent.name}</strong>
              <strong>{game.wildPartner.name}</strong>
            </div>
            <button className="btn small" onClick={() => dispatch('rerollWild')}>Buscar otra pareja<Cost crystals={RULES.rerollCost} /></button>
            <p className="muted small">Cada mañana aparece una pareja salvaje nueva.</p>
          </div>
        )}
        {source === 'friend' && (
          <div className="card stack">
            {game.friendPartner && (
              <>
                <div className="pair">
                  <CreatureOf wok={parent} motion="calm" />
                  <HeartIcon className="heart" />
                  <div style={{ transform: 'scaleX(-1)' }}><Creature genotype={game.friendPartner.genotype} seed={game.friendPartner.name} motion="calm" /></div>
                </div>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <strong>{parent.name}</strong>
                  <strong>{game.friendPartner.name}{game.friendPartner.owner ? ` (de ${game.friendPartner.owner})` : ''}</strong>
                </div>
              </>
            )}
            <form className="stack" onSubmit={useCode}>
              <label className="field-label">
                {game.friendPartner ? 'Usar otro código' : 'Pega el código que te ha pasado tu amigo'}
                <textarea className="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="WOKA-…" />
              </label>
              <button className="btn small" type="submit"><GiftIcon width="20" />Usar código</button>
            </form>
            <p className="muted small">Tu amigo lo genera desde la ficha de su Wokamon, con “Compartir para cruzar”. Su Wokamon no sale de su criadero.</p>
          </div>
        )}
      </section>

      {partner && odds.length > 0 && (
        <section className="card">
          <h3 style={{ marginBottom: 8 }}>Así podrían salir las crías</h3>
          <div className="odds">
            {odds.map(({ locus, options }) => (
              <div className="line" key={locus}>
                <span className="muted">{LOCUS_LABELS[locus]}</span>
                <span>{options.map((o) => `${traitLabel(locus, o.name)} ${Math.round(o.chance * 100)} %`).join(', ')}</span>
              </div>
            ))}
          </div>
          <p className="muted small" style={{ marginTop: 8 }}>Probabilidades de Mendel. Los colores se mezclan y a veces hay mutaciones.</p>
        </section>
      )}

      <button
        className="btn big sun block"
        disabled={!partner}
        onClick={() => dispatch('startCourtship', { parentId: parent.id, partner: source })}
      >
        Empezar paseo de cortejo
        <span className="sub">{fmt(RULES.courtshipSteps)} pasos caminando</span>
      </button>
    </>
  );
}

function Incubator({ game, onLab, onHatch }) {
  const [askGift, setAskGift] = useState(null);
  const adults = game.wokamons.map(describe).filter((w) => w.status !== 'dead' && isAdult(w));
  if (!game.eggs.length) {
    return (
      <section className="card empty">
        <h3>La incubadora está vacía</h3>
        <p className="muted">Completa un paseo de cortejo y el huevo aparecerá aquí. Si un amigo te regala uno, canjea su código en el Criadero.</p>
      </section>
    );
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      <p className="muted">Los huevos se incuban mientras caminas: {fmt(RULES.eggPoints * RULES.stepsPerEggPoint)} pasos, o la mitad si un adulto les da calor.</p>
      {game.eggs.map((egg) => {
        const ready = egg.points >= egg.target;
        const caregiver = adults.find((w) => w.id === egg.caregiverId);
        const left = Math.ceil(((egg.target - egg.points) * RULES.stepsPerEggPoint) / (caregiver ? 2 : 1));
        return (
          <section key={egg.id} className="card stack">
            <div className="egg-card">
              <button className="egg-art" style={{ border: 'none', background: 'none', padding: 0 }} onClick={() => ready && onHatch(egg.id)} aria-label={ready ? 'Abrir huevo' : 'Huevo incubándose'}>
                <Egg genotype={egg.genotype} seed={egg.id} progress={egg.points / egg.target} state={ready ? 'ready' : 'idle'} />
              </button>
              <div className="stack" style={{ gap: 4 }}>
                <h3>Huevo de generación {egg.generation}</h3>
                {egg.parents?.a && <p className="muted small">De {egg.parents.a.name} y {egg.parents.b?.name}</p>}
                <Meter label="Calor" value={egg.points} max={egg.target} color="var(--sun)" text={`${Math.floor((egg.points / egg.target) * 100)} %`} />
                <p className="small" style={{ fontWeight: 700 }}>{ready ? '¡Se mueve! Ya puede abrirse.' : `Faltan unos ${fmt(left)} pasos.`}</p>
              </div>
            </div>
            {!ready && (
              <div className="stack" style={{ gap: 6 }}>
                <span className="small" style={{ fontWeight: 700 }}>Cuidador (incuba el doble de rápido)</span>
                <div className="caregivers">
                  <button className={`chip ${!egg.caregiverId ? 'sun' : ''}`} onClick={() => dispatch('assignCaregiver', { eggId: egg.id, wokId: null })}>Nadie</button>
                  {adults.map((w) => (
                    <button key={w.id} className={`chip ${egg.caregiverId === w.id ? 'sun' : ''}`} onClick={() => dispatch('assignCaregiver', { eggId: egg.id, wokId: w.id })}>{w.name}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="row">
              {ready ? (
                <button className="btn sun grow" onClick={() => onHatch(egg.id)}>Abrir huevo</button>
              ) : (
                <button className="btn grow" onClick={() => onLab(egg.id)}><FlaskIcon width="22" />Laboratorio</button>
              )}
              <button
                className={`btn ${askGift === egg.id ? 'berry' : ''}`}
                onClick={() => (askGift === egg.id ? dispatch('giftEgg', { eggId: egg.id }) : setAskGift(egg.id))}
              >
                <GiftIcon width="22" />{askGift === egg.id ? '¿Seguro?' : 'Regalar'}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
