import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { dispatch } from '../data/store.js';
import { randomName } from '../game/creatures.js';
import { getColors } from '../game/genetics.js';
import { Creature } from '../art/Creature.jsx';
import { Egg } from '../art/Egg.jsx';
import { Backdrop } from '../art/Habitat.jsx';
import { buzz, sfx } from '../ui/sfx.js';

const TAPS = 3;

export default function Hatch({ game, eggId, onDone }) {
  const egg = game.eggs.find((e) => e.id === eggId);
  const [taps, setTaps] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [born, setBorn] = useState(false);
  const [name, setName] = useState(() => randomName());
  const confetti = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    color: ['var(--sun)', 'var(--berry)', 'var(--meadow)', 'var(--crystal)', 'var(--sky)'][i % 5],
    rot: Math.random() * 360,
  })), []);

  if (!egg) return null;

  const tap = () => {
    if (taps >= TAPS) return;
    const next = taps + 1;
    sfx.crack();
    buzz(next === TAPS ? [60, 40, 120] : 40);
    if (next === TAPS) setTimeout(() => sfx.hatch(), 450);
    setTaps(next);
    setShakeKey((k) => k + 1);
    if (next === TAPS) setTimeout(() => setBorn(true), 450);
  };

  const welcome = (e) => {
    e.preventDefault();
    const events = dispatch('hatch', { eggId: egg.id, name });
    const hatched = events.find((ev) => ev.type === 'hatched');
    onDone(hatched?.id || null);
  };

  return createPortal(
    <div className="moment moment--dark" role="dialog" aria-modal="true" aria-label="Abrir huevo">
      {!born ? (
        <>
          <p className="hatch-hint">{taps === 0 ? 'Toca el huevo para abrirlo' : taps === 1 ? '¡Se está rompiendo!' : '¡Un poco más!'}</p>
          <button className="hatch-egg" onClick={tap} aria-label="Golpear el huevo">
            <Egg key={shakeKey} genotype={egg.genotype} seed={egg.id} cracks={1 + taps} state={taps ? 'shake' : 'ready'} />
          </button>
          {taps === 0 && <button className="btn" onClick={() => onDone(null)}>Ahora no</button>}
        </>
      ) : (
        <>
          <div className="burst" />
          <div className="confetti" aria-hidden="true">
            {confetti.map((c, i) => <i key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, background: c.color, transform: `rotate(${c.rot}deg)` }} />)}
          </div>
          <form className="moment-card" onSubmit={welcome}>
            <div className="moment-art">
              <Backdrop hue={getColors(egg.genotype).primary.h} />
              <Creature genotype={egg.genotype} seed={egg.id} stage="Niño" reaction={{ type: 'level', key: 1 }} />
            </div>
            <h2>¡Ha nacido!</h2>
            <p className="muted">Generación {egg.generation}{egg.parents?.a ? `, hijo de ${egg.parents.a.name} y ${egg.parents.b?.name}` : ''}.</p>
            <label className="field-label" style={{ textAlign: 'left' }}>
              ¿Cómo se va a llamar?
              <input className="field" value={name} maxLength={16} onChange={(e) => setName(e.target.value)} />
            </label>
            <button className="btn sun block" type="submit">Darle la bienvenida</button>
          </form>
        </>
      )}
    </div>,
    document.body,
  );
}
