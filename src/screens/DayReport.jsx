import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { describe, RULES } from '../game/creatures.js';
import { CreatureOf } from '../art/Creature.jsx';
import { fmt } from '../ui/kit.jsx';

export default function DayReport({ game, report, onClose }) {
  const empty = !report.entries.length && !report.steps;
  useEffect(() => { if (empty) onClose(); }, [empty, onClose]);
  if (empty) return null;

  const counted = Math.min(report.days, RULES.maxSettleDays);
  const anyHungry = report.entries.some((e) => e.hungryDays > 0 && !e.died);

  return createPortal(
    <div className="moment" role="dialog" aria-modal="true" aria-label="Resumen del día">
      <div className="moment-card" style={{ textAlign: 'left' }}>
        <h2>{report.days === 1 ? 'Nuevo día en el criadero' : `Han pasado ${report.days} días`}</h2>
        <p className="muted">{report.days === 1 ? 'Ayer' : 'El último día que jugaste'} caminaste <strong className="num">{fmt(report.steps)}</strong> pasos.</p>
        <div className="stack" style={{ gap: 8 }}>
          {report.entries.map((e) => {
            const raw = game.wokamons.find((w) => w.id === e.id);
            const wok = raw ? describe(raw) : null;
            const grew = (e.levelAfter || e.levelBefore) > e.levelBefore;
            let text;
            if (e.died) text = 'Se ha convertido en fantasma.';
            else if (e.hungryDays === 0) text = `Comió toda su ración.${grew ? ` Ha subido a nivel ${e.levelAfter}.` : ''}`;
            else if (counted === 1) text = e.cover > 0 ? `Se quedó con hambre: comió el ${Math.round(e.cover * 100)} % de su ración.` : 'No comió nada en todo el día.';
            else text = `Pasó hambre ${e.hungryDays} de ${counted} días.`;
            return (
              <div key={e.id} className="row card tight flat">
                <div style={{ width: 56, height: 56, flex: 'none' }}>{wok && <CreatureOf wok={wok} motion="none" />}</div>
                <div className="grow">
                  <strong>{e.name}</strong>
                  <p className="small" style={{ fontWeight: 600 }}>{text}</p>
                </div>
              </div>
            );
          })}
        </div>
        {report.streak > 0 && (
          <p style={{ fontWeight: 700 }}>
            Racha de {report.streak} {report.streak === 1 ? 'día' : 'días'} con todos bien comidos.
            {report.streakReward ? ` Premio: +${report.streakReward} cristales.` : ''}
          </p>
        )}
        {report.eggsReady.length > 0 && <p style={{ fontWeight: 700 }}>Un cuidador ha terminado de incubar un huevo: ya puedes abrirlo.</p>}
        {anyHungry && <p className="muted small">La comida que no les des tú se reparte sola a las 5:00 con la energía que te sobre. Camina un poco más hoy.</p>}
        <button className="btn sun block" onClick={onClose}>Vamos allá</button>
      </div>
    </div>,
    document.body,
  );
}
