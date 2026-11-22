import { describe, STATUS_LABELS } from '../game/creatures.js';
import { CreatureOf } from '../art/Creature.jsx';
import { Backdrop } from '../art/Habitat.jsx';
import { StarIcon, GiftIcon } from '../ui/Icons.jsx';
import { Wallet } from './Home.jsx';

const DOT = { happy: 'var(--meadow)', sad: 'var(--sky)', starving: 'var(--sun)', sick: 'var(--berry)', dead: '#c9c9d9' };

export default function Stable({ game, onOpen, onRedeem }) {
  const woks = game.wokamons.map(describe);
  const alive = woks.filter((w) => w.status !== 'dead');
  const order = [...woks].sort((a, b) => Number(b.favorite) - Number(a.favorite) || Number(a.dead) - Number(b.dead) || b.level - a.level);

  return (
    <div className="screen">
      <div className="topbar">
        <h1>Criadero</h1>
        <Wallet game={game} />
      </div>
      <div className="screen-head">
        <p className="muted" style={{ fontWeight: 600 }}>
          {woks.length === 0 ? 'Todavía no vive nadie aquí.' : `${alive.length} ${alive.length === 1 ? 'Wokamon vivo' : 'Wokamon vivos'}${woks.length > alive.length ? ` y ${woks.length - alive.length} ${woks.length - alive.length === 1 ? 'fantasma' : 'fantasmas'}` : ''}.`}
        </p>
        <button className="btn small" onClick={onRedeem}><GiftIcon width="20" />Canjear código</button>
      </div>

      {woks.length === 0 ? (
        <div className="card empty">
          <h3>Tu criadero está vacío</h3>
          <p className="muted">Camina un poco: los primeros pasos siempre atraen a alguien.</p>
        </div>
      ) : (
        <div className="grid2">
          {order.map((w) => (
            <button key={w.id} className={`wok-card ${w.status === 'dead' ? 'is-dead' : ''}`} onClick={() => onOpen(w.id)} aria-label={`${w.name}, nivel ${w.level}, ${STATUS_LABELS[w.status]}`}>
              <div className="art">
                <Backdrop hue={w.colors.primary.h} dim={w.status === 'dead'} />
                <CreatureOf wok={w} motion="calm" />
                {w.favorite && <StarIcon filled className="fav" />}
              </div>
              <div className="meta">
                <strong>{w.name}</strong>
                <span className="row small" style={{ gap: 6, fontWeight: 700, paddingRight: 10 }}>
                  <span className="dot" style={{ background: DOT[w.status] }} />
                  {STATUS_LABELS[w.status]}
                  <span className="muted" style={{ marginLeft: 'auto', paddingRight: 2 }}>Nv {w.level}</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {game.memorial.length > 0 && (
        <section className="card stack">
          <h3>Recuerdos</h3>
          <p className="muted small">Los Wokamon de los que te has despedido.</p>
          <div className="stack" style={{ gap: 4 }}>
            {game.memorial.slice(0, 12).map((m) => (
              <div key={m.id} className="row small" style={{ justifyContent: 'space-between' }}>
                <strong>{m.name}</strong>
                <span className="muted">Generación {m.generation}, vivió {m.age} días</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
