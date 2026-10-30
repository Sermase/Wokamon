import { useState } from 'react';
import { dispatch } from '../data/store.js';
import { RULES } from '../game/creatures.js';
import { ALLELES, LOCUS_GROUPS, getPhenotype, traitLabel } from '../game/genetics.js';
import { Creature } from '../art/Creature.jsx';
import { Backdrop } from '../art/Habitat.jsx';
import { getColors } from '../game/genetics.js';
import { Cost, Sheet } from '../ui/kit.jsx';
import { GeneRow } from './CreatureSheet.jsx';

export default function LabSheet({ game, eggId, onClose }) {
  const egg = game.eggs.find((e) => e.id === eggId);
  const [slot, setSlot] = useState(null); // { locus, index }
  if (!egg) return null;
  const phenotype = getPhenotype(egg.genotype);
  const hue = getColors(egg.genotype).primary.h;

  const options = slot
    ? Object.entries(ALLELES[slot.locus]).filter(([, info]) => (game.dex[slot.locus] || []).includes(info.name))
    : [];

  return (
    <Sheet open onClose={() => { setSlot(null); onClose(); }} title="Laboratorio">
      <p className="muted">Edita los genes del huevo antes de que nazca. Cada cambio cuesta {RULES.labEditCost} cristales y solo puedes insertar rasgos que ya hayas descubierto.</p>
      <div className="sheet-hero">
        <Backdrop hue={hue} />
        <Creature genotype={egg.genotype} seed={egg.id} stage="Niño" motion="calm" label="Así será la cría" />
      </div>
      <button className="btn block" onClick={() => dispatch('labRecolor', { eggId: egg.id })}>Probar otros colores<Cost crystals={RULES.recolorCost} /></button>

      {LOCUS_GROUPS.map((group) => (
        <section key={group.id} className="card">
          <h3 style={{ marginBottom: 4 }}>{group.label}</h3>
          <div className="genes">
            {group.loci.map((locus) => (
              <div key={locus}>
                <GeneRow locus={locus} pair={egg.genotype[locus]} value={phenotype[locus]}>
                  {[0, 1].map((index) => {
                    const allele = egg.genotype[locus][index];
                    const active = slot?.locus === locus && slot.index === index;
                    return (
                      <button
                        key={index}
                        className={`allele ${active ? 'dom' : ''}`}
                        style={{ cursor: 'pointer', boxShadow: active ? 'none' : '0 2px 0 var(--ink)' }}
                        onClick={() => setSlot(active ? null : { locus, index })}
                        aria-label={`Cambiar alelo ${index + 1} de ${locus}`}
                        aria-pressed={active}
                      >
                        {allele}
                      </button>
                    );
                  })}
                </GeneRow>
                {slot?.locus === locus && (
                  <div className="caregivers" style={{ padding: '4px 0 10px' }}>
                    {options.length === 0 && <span className="muted small">Aún no has descubierto variantes de este rasgo.</span>}
                    {options.map(([code, info]) => (
                      <button
                        key={code}
                        className={`chip ${egg.genotype[locus][slot.index] === code ? 'sun' : ''}`}
                        onClick={() => { dispatch('labEdit', { eggId: egg.id, locus, index: slot.index, allele: code }); setSlot(null); }}
                      >
                        {code}: {traitLabel(locus, info.name)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </Sheet>
  );
}
