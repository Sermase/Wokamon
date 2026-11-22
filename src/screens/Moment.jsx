import { createPortal } from 'react-dom';
import { describe } from '../game/creatures.js';
import { getColors } from '../game/genetics.js';
import { CreatureOf } from '../art/Creature.jsx';
import { Egg } from '../art/Egg.jsx';
import { Backdrop } from '../art/Habitat.jsx';

// Celebraciones: un Wokamon nuevo, un paso a adulto o un huevo recién puesto.
export default function Moment({ game, moment, onClose, onAction }) {
  const raw = moment.id ? game.wokamons.find((w) => w.id === moment.id) : null;
  const wok = raw ? describe(raw) : null;
  const egg = moment.eggId ? game.eggs.find((e) => e.id === moment.eggId) : null;
  const hue = wok ? wok.colors.primary.h : egg ? getColors(egg.genotype).primary.h : 220;
  return createPortal(
    <div className="moment" role="dialog" aria-modal="true" aria-label={moment.title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="moment-card">
        <div className="moment-art">
          <Backdrop hue={hue} />
          {wok && <CreatureOf wok={wok} reaction={{ type: 'level', key: moment.title }} />}
          {egg && <Egg genotype={egg.genotype} seed={egg.id} state="ready" />}
        </div>
        <h2>{moment.title}</h2>
        <p className="muted" style={{ fontWeight: 600 }}>{moment.text}</p>
        {onAction ? (
          <div className="row">
            <button className="btn grow" onClick={onClose}>Luego</button>
            <button className="btn sun grow" onClick={onAction}>{moment.kind === 'egg' ? 'Ver incubadora' : 'Ir a Cría'}</button>
          </div>
        ) : (
          <button className="btn sun block" onClick={onClose}>¡Genial!</button>
        )}
      </div>
    </div>,
    document.body,
  );
}
