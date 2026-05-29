// Wokamon Evolucionado - Egg Painter & Genetics Laboratory Component

import store, { calculatePunnettSquare, getTraitValueLabel } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class GeneticsLab {
  constructor(options = {}) {
    this.container = null;
    this.parentA = null;
    this.parentB = null;
    this.lockedMode = options.mode || null;
    this.activeSubTab = this.lockedMode === 'dex' ? 'dex' : 'lab';
    
    // Canvas Paint Variables
    this.currentColor = '#ffcc00';
    this.currentBrushSize = 12;
    this.isPremiumBrush = false;
    this.isDrawing = false;
    this.canvas = null;
    this.ctx = null;
    this.currentWalkZone = 'urbana'; // Route simulated zone (Footprint Unlocks)
    
    // Hatch Animation State
    this.isHatching = false;
    this.hatchingEggId = null;
    this.shakeClass = '';
    this.hatchedBaby = null;
  }

  init(containerElement) {
    this.container = containerElement;
    
    // Switch automatic mating completed redirect listener
    window.addEventListener('mating-completed', (e) => {
      this.parentA = null;
      this.parentB = null;
      this.activeSubTab = 'lab';
      this.render();
    });

    store.subscribe(() => {
      this.render();
    });

    this.render();
  }

  // Shaking and eclosion loop sequence for a completed Egg
  hatchEggSequence(egg) {
    if (this.isHatching) return;
    
    this.hatchingEggId = egg.id;
    this.isHatching = true;

    this.playHatchTick(100);
    this.shakeClass = 'egg-shake-minor';
    this.render();

    // 1st shake
    setTimeout(() => {
      this.playHatchTick(100);
      this.shakeClass = 'egg-shake-major';
      this.render();
    }, 1000);

    // 2nd shake & crack
    setTimeout(() => {
      this.playHatchTick(250);
      this.shakeClass = 'egg-crack-burst';
      this.render();
    }, 2000);

    // Eclosion roll
    setTimeout(() => {
      if (egg.isViable) {
        // Safe baby hatch
        const baby = store.hatchCompletedEgg(egg.id, '');
        this.playHatchSuccessSound();
        this.hatchedBaby = baby;
        this.isHatching = false;
        this.hatchingEggId = null;
        this.shakeClass = '';
      } else {
        // Egg broke empty
        store.cancelFailedEgg(egg.id);
        this.playHatchFailSound();
        this.hatchedBaby = 'failed';
        this.isHatching = false;
        this.hatchingEggId = null;
        this.shakeClass = '';
      }
      this.render();
    }, 3500);
  }

  render() {
    if (!this.container) return;

    if (this.lockedMode) {
      this.activeSubTab = this.lockedMode === 'dex' ? 'dex' : 'lab';
      this.container.innerHTML = `
        <div class="genetics-lab-panel">
          <div id="lab-subpanel-content"></div>
        </div>
      `;

      const subContent = this.container.querySelector('#lab-subpanel-content');
      if (this.activeSubTab === 'lab') {
        if (this.hatchedBaby) {
          this.renderHatchRevealMode(subContent);
        } else {
          this.renderIncubatorMode(subContent);
        }
      } else {
        this.renderDexAndLogsMode(subContent);
      }
      return;
    }

    // Set default subtab
    if (!this.activeSubTab) {
      this.activeSubTab = 'lab';
    }

    const eggs = store.getEggs();

    this.container.innerHTML = `
      <div class="genetics-lab-panel">
        
        <!-- Lab Inner Tabs navigation -->
        <div class="lab-inner-nav glass-panel" style="display: flex; gap: 0.5rem; padding: 0.5rem; border-radius: 12px; margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.02);">
          <button class="btn btn-secondary btn-xs flex-center" id="btn-subtab-lab" style="flex: 1; padding: 0.6rem; gap: 0.35rem; font-weight: 700; border-radius: 8px;">
            <span>Huevos</span> Incubadora (${eggs.length})
          </button>
          <button class="btn btn-secondary btn-xs flex-center" id="btn-subtab-dex" style="flex: 1; padding: 0.6rem; gap: 0.35rem; font-weight: 700; border-radius: 8px;">
            <span>Dex</span> Wokadex y Bitácora
          </button>
        </div>

        <div id="lab-subpanel-content"></div>
      </div>
    `;

    // Hook tab click events
    const labBtn = this.container.querySelector('#btn-subtab-lab');
    const dexBtn = this.container.querySelector('#btn-subtab-dex');
    
    const updateSubTabStyles = () => {
      if (this.activeSubTab === 'lab') {
        labBtn.style.background = 'var(--primary-accent)';
        labBtn.style.color = '#fff';
        labBtn.style.borderColor = 'var(--primary-accent)';

        dexBtn.style.background = 'transparent';
        dexBtn.style.color = 'var(--text-grey)';
        dexBtn.style.borderColor = 'rgba(255,255,255,0.05)';
      } else {
        dexBtn.style.background = 'var(--primary-accent)';
        dexBtn.style.color = '#fff';
        dexBtn.style.borderColor = 'var(--primary-accent)';

        labBtn.style.background = 'transparent';
        labBtn.style.color = 'var(--text-grey)';
        labBtn.style.borderColor = 'rgba(255,255,255,0.05)';
      }
    };

    labBtn.addEventListener('click', () => {
      this.activeSubTab = 'lab';
      this.render();
    });

    dexBtn.addEventListener('click', () => {
      this.activeSubTab = 'dex';
      this.render();
    });

    updateSubTabStyles();

    const subContent = this.container.querySelector('#lab-subpanel-content');

    if (this.activeSubTab === 'lab') {
      if (this.hatchedBaby) {
        this.renderHatchRevealMode(subContent);
      } else {
        this.renderIncubatorMode(subContent);
      }
    } else {
      this.renderDexAndLogsMode(subContent);
    }
  }

  // 2. INCUBATOR MODE: Lists eggs currently incubating
  renderIncubatorMode(subContentContainer) {
    const eggs = store.getEggs();
    const wokamons = store.getWokamons();
    const livingWoks = wokamons.filter(w => w.status !== 'dead');
    const adults = livingWoks.filter(w => w.stage === 'Adulto' || w.stage === 'Anciano');

    if (eggs.length === 0) {
      subContentContainer.innerHTML = `
        <div class="genetics-lab-card glass-panel flex-center flex-col text-center pad-lg">
          <div class="dna-double-helix animate-pulse">Huevo</div>
          <h2 class="section-title">Incubadora</h2>
          <p class="subtitle max-width-md">No tienes huevos incubando. Completa un <strong>Ritual NFC ("La Chispa")</strong> y el huevo pasará automáticamente a la incubadora.</p>
        </div>
      `;
      return;
    }

    subContentContainer.innerHTML = `
      <div class="genetics-lab-card glass-panel flex-col" style="gap: 1.5rem;">
        <div>
          <h2 class="section-title">Incubadora</h2>
          <p class="subtitle">Cuidar un huevo es un proceso lento de 15 días. Asigna un Wokamon adulto como cuidador o usa pasos directamente si no tienes criaturas activas.</p>
        </div>

        <div class="eggs-incubation-grid">
          ${eggs.map(egg => {
            // Look up assigned parent caregiver Wokamon
            const parentCare = wokamons.find(w => w.id === egg.incubatingParentId);
            const isEggHatching = this.hatchingEggId === egg.id;
            
            return `
              <div class="egg-incubator-card glass-panel-inner ${isEggHatching ? this.shakeClass : ''}" data-id="${egg.id}">
                <div class="egg-hatchery-header">
                  <h4>${egg.name}</h4>
                  <span class="gen-tag">Gen ${egg.generation}</span>
                </div>

                <div class="egg-render-wrapper flex-center flex-col">
                  <!-- procedural CSS styled egg reflecting colors drawn in Canvas -->
                  <div class="custom-egg-sprite ${isEggHatching ? 'animate-shiver' : ''}" style="background: ${egg.genetics.primaryColor}; box-shadow: inset -10px -15px 20px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.15); border: 2px solid ${egg.genetics.bellyColor || '#fff'}">
                    <div class="egg-dots" style="background: ${egg.genetics.bellyColor};"></div>
                  </div>
                  
                  <span class="egg-mating-label">De: ${egg.parentAName} y ${egg.parentBName}</span>
                </div>

                <div class="egg-incubation-stats">
                  <div class="progress-indicator">
                    <div class="lbl-row">
                      <span>Periodo de gestación:</span>
                      <strong>${Math.floor(egg.incubationProgress)} / 15 días</strong>
                    </div>
                    <div class="progress-bar-container">
                      <div class="progress-bar-fill bar-orange" style="width: ${(egg.pointsCurrent / egg.pointsTarget) * 100}%"></div>
                    </div>
                  </div>

                  <!-- Assign sitting parent Wokamon -->
                  <div class="parent-caregiver-dropdown" style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-size: 0.65rem; color: var(--text-grey); font-weight: 700;">WOKAMON CUIDADOR (DA CALOR):</span>
                    
                    ${this.isHatching ? `
                      <select class="glass-select" disabled>
                        <option>${parentCare ? parentCare.name : 'Ninguno asignado'}</option>
                      </select>
                    ` : `
                      <select class="glass-select select-caregiver" data-egg-id="${egg.id}">
                        <option value="none">-- Dejar al aire (Sin Cuidador) --</option>
                        ${adults.map(w => `
                          <option value="${w.id}" ${egg.incubatingParentId === w.id ? 'selected' : ''}>
                            ${w.name} (Nivel ${w.level})
                          </option>
                        `).join('')}
                      </select>
                    `}
                  </div>
                </div>

                <div class="egg-actions">
                  ${this.isHatching && isEggHatching ? `
                    <button class="btn btn-primary full-width btn-disabled" disabled>Eclosionando...</button>
                  ` : (egg.pointsCurrent >= egg.pointsTarget) ? `
                    <button class="btn btn-primary full-width btn-hatch-egg btn-active-glow" data-id="${egg.id}">
                      Eclosionar huevo
                    </button>
                  ` : `
                    <div style="display: flex; gap: 0.4rem; width: 100%;">
                      <button class="btn btn-secondary btn-gift-egg-action" data-id="${egg.id}" style="flex: 1;" title="Regalar huevo a un amigo">Regalar huevo</button>
                      <button class="btn btn-action-card btn-disabled" style="flex: 1.2;" disabled>Incubando (${Math.round((egg.pointsCurrent / egg.pointsTarget) * 100)}%)</button>
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Hook caregiver assignments
    subContentContainer.querySelectorAll('.select-caregiver').forEach(select => {
      select.addEventListener('change', (e) => {
        const eggId = select.dataset.eggId;
        const parentId = e.target.value;
        store.assignParentToEgg(eggId, parentId);
      });
    });

    // Hook Gifting active egg
    subContentContainer.querySelectorAll('.btn-gift-egg-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const egg = eggs.find(e => e.id === id);
        if (egg) {
          const base64Code = store.giftEgg(egg.id);
          if (base64Code) {
            // Display visual gift code box
            const overlay = document.createElement('div');
            overlay.className = 'payment-overlay';
            overlay.innerHTML = `
              <div class="gift-modal glass-panel pad-lg text-center flex-center flex-col animate-bounce-slow">
                <div class="gift-giftbox animate-bounce-slow">Regalo</div>
                <h3>Huevo genético listo</h3>
                <p class="subtitle">Se ha empaquetado el Huevo Gen ${egg.generation} en un código de regalo. Se ha retirado de tu incubadora y has ganado <strong class="sparkle-gold">+8 cristales</strong>.</p>
                
                <p class="lbl-info">Copia este código y envíaselo a tu amigo para que lo adopte en su incubadora:</p>
                
                <div class="gift-code-box">
                  <textarea readonly id="gift-code-text">${base64Code}</textarea>
                </div>

                <div class="gift-actions-row flex-center">
                  <button class="btn btn-primary" id="btn-copy-code">Copiar código</button>
                  <button class="btn btn-secondary" id="btn-close-gift">Cerrar</button>
                </div>
              </div>
            `;
            document.body.appendChild(overlay);

            overlay.querySelector('#btn-copy-code').addEventListener('click', () => {
              const txt = overlay.querySelector('#gift-code-text');
              txt.select();
              document.execCommand('copy');
              
              const copyBtn = overlay.querySelector('#btn-copy-code');
              copyBtn.textContent = 'Copiado';
              copyBtn.classList.add('btn-active-glow');
              setTimeout(() => {
                copyBtn.textContent = 'Copiar código';
                copyBtn.classList.remove('btn-active-glow');
              }, 1500);
            });

            overlay.querySelector('#btn-close-gift').addEventListener('click', () => {
              overlay.remove();
            });
          }
        }
      });
    });

    // Hook hatching action
    subContentContainer.querySelectorAll('.btn-hatch-egg').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const egg = eggs.find(e => e.id === id);
        if (egg) {
          this.hatchEggSequence(egg);
        }
      });
    });
  }

  // 3. REVEAL MODE: Celebrate successfully hatched baby Wokamon or failed roll
  renderHatchRevealMode(subContentContainer) {
    if (this.hatchedBaby === 'failed') {
      // Crack failure display
      subContentContainer.innerHTML = `
        <div class="genetics-lab-card glass-panel flex-center flex-col text-center pad-lg animate-slide-in" style="border: 2px dashed #ff5252;">
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem; filter: grayscale(1);">Huevo</div>
          <h2 style="color: #ff5252; font-weight: 800;">El cascarón se rompió vacío</h2>
          
          <p class="subtitle max-width-md" style="margin: 0.5rem 0 1.25rem 0; line-height: 1.4;">
            La caminata gestacional no fue suficiente para mantener la viabilidad del embrión. El cascarón se ha roto vacío y no ha nacido ninguna criatura.
          </p>
          
          <p style="font-size: 0.75rem; color: var(--text-grey); margin-bottom: 1.25rem;">
            Tus Wokamons cuidadores están a salvo. Recibes cristales de compensación:
          </p>

          <div class="consolation-prize-badge glass-panel-inner text-center animate-bounce-slow" style="display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem 1.5rem; border-radius: 12px; border: 1.5px solid #ffd54f;">
            <span style="font-size: 1.5rem;">Cristales</span>
            <span style="font-weight: 800; font-size: 1.1rem; color: #ffd54f;">+15 Cristales</span>
          </div>

          <button class="btn btn-secondary full-width" id="btn-close-failed-reveal" style="margin-top: 1.5rem; padding: 0.75rem;">
            Limpiar el nido y reintentar
          </button>
        </div>
      `;

      subContentContainer.querySelector('#btn-close-failed-reveal').addEventListener('click', () => {
        this.hatchedBaby = null;
        this.render();
      });
      return;
    }

    // Success Reveal display
    subContentContainer.innerHTML = `
      <div class="genetics-lab-card glass-panel flex-center flex-col text-center pad-lg animate-slide-in" style="border: 2px solid var(--primary-accent);">
        <div class="confetti-effect">Nuevo Wokamon</div>
        
        <div class="baby-svg" style="height: 110px; width: 110px; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 50%; padding: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
          <div style="width: 80px; height: 80px;">${renderWokamonSVG(this.hatchedBaby)}</div>
        </div>
        
        <h2>Tu Wokamon ha nacido</h2>
        <p class="subtitle text-center" style="max-width: 350px; font-size: 0.75rem; line-height: 1.4; margin: 0.5rem 0 1rem 0;">
          Ha nacido un Wokamon en la etapa de <strong>Niño</strong>. Ha heredado una mezcla genética única.
        </p>

        <!-- Phenotypic genetics indicators -->
        <div class="hatched-traits flex-col glass-panel-inner" style="width: 100%; gap: 0.25rem; font-size: 0.68rem; text-align: left; padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; background: rgba(0,0,0,0.15);">
          <span style="font-size: 0.6rem; color: var(--primary-accent); font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 0.2rem;">CARACTERÍSTICAS EXPRESADAS (FENOTIPO)</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem;">
            <span>Cuerpo: <strong>${getTraitValueLabel(this.hatchedBaby.genetics.bodyType, 'bodyType')}</strong></span>
            <span>Orejas: <strong>${getTraitValueLabel(this.hatchedBaby.genetics.ears, 'ears')}</strong></span>
            <span>Ojos: <strong>${getTraitValueLabel(this.hatchedBaby.genetics.eyes, 'eyes')}</strong></span>
            <span>Cuernos: <strong>${getTraitValueLabel(this.hatchedBaby.genetics.horns, 'horns')}</strong></span>
            <span>Alas: <strong>${getTraitValueLabel(this.hatchedBaby.genetics.wings, 'wings')}</strong></span>
            <span>Variabilidad: <strong style="color: var(--primary-accent);">${this.hatchedBaby.heterozygosity}%</strong></span>
          </div>
        </div>

        <div class="name-entry-form flex-col" style="width: 100%; gap: 0.4rem; text-align: left;">
          <label for="baby-name-input" style="font-size: 0.65rem; font-weight: 700; color: var(--text-grey); letter-spacing: 0.5px;">NOMBRA A TU NUEVO WOKAMON:</label>
          <input type="text" id="baby-name-input" placeholder="Ej: Chispitas" value="${this.hatchedBaby.name}" style="width: 100%; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(255,255,255,0.06); border-radius: 8px; color: #fff; padding: 0.6rem; font-size: 0.8rem;">
        </div>

        <button class="btn btn-primary full-width" id="btn-save-baby" style="margin-top: 1.25rem; padding: 0.75rem; font-weight: 700;">
          Llevar al criadero
        </button>
      </div>
    `;

    // Hook saving newborn name
    subContentContainer.querySelector('#btn-save-baby').addEventListener('click', () => {
      const input = subContentContainer.querySelector('#baby-name-input');
      const finalName = input.value.trim() || this.hatchedBaby.name;
      
      const wList = store.getWokamons();
      const refBaby = wList.find(w => w.id === this.hatchedBaby.id);
      if (refBaby) {
        refBaby.name = finalName;
        store.saveAll();
      }

      this.hatchedBaby = null;
      this.render();
    });
  }

  // 4. WOKADEX & ACTIVITY LOGS MODE
  renderDexAndLogsMode(subContentContainer) {
    const active = store.loadState();
    const collection = active.collection || [];
    const logs = active.history || [];

    const allTraits = {
      bodyType: ['round', 'oval', 'squarish', 'cloud', 'blob'],
      ears: ['pointy', 'floppy', 'long', 'teddy'],
      eyes: ['normal', 'sparkle', 'sleepy', 'fire'],
      horns: ['none', 'small', 'ram', 'neon'],
      wings: ['none', 'angel', 'dragon']
    };

    const isTraitUnlocked = (locus, name) => {
      return collection.some(sig => sig.includes(`${locus}:${name}`));
    };

    let totalDiscovered = 0;
    let totalPossible = 0;

    for (const locus in allTraits) {
      allTraits[locus].forEach(() => totalPossible++);
      allTraits[locus].forEach(name => {
        if (isTraitUnlocked(locus, name)) totalDiscovered++;
      });
    }

    subContentContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;" class="animate-slide-in">
        
        <!-- Wokadex Section -->
        <div class="glass-panel" style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="font-weight: 800; color: #fff; font-size: 1.1rem; display: flex; align-items: center; gap: 0.35rem;">
                Colección de rasgos Wokadex
              </h3>
              <p class="subtitle" style="font-size: 0.72rem; color: var(--text-grey);">Descubre genes y cruces raros para completar el catálogo biológico.</p>
            </div>
            <div class="nursery-badge glass-panel-inner" style="background: rgba(0, 172, 193, 0.05); border-color: rgba(0, 172, 193, 0.15); padding: 0.3rem 0.6rem; border-radius: 6px;">
              <span class="count" style="color: var(--primary-accent); font-weight: 800; font-size: 0.75rem;">${totalDiscovered} / ${totalPossible} Genes</span>
              <span class="mult" style="font-size: 0.52rem; color: var(--text-grey);">Descubiertos</span>
            </div>
          </div>

          <!-- Loci display -->
          <div class="dex-loci-sections" style="display: flex; flex-direction: column; gap: 1.25rem;">
            ${Object.keys(allTraits).map(locus => {
              const locusLabel = locus === 'bodyType' ? 'TIPO DE CUERPO' : (locus === 'ears' ? 'OREJAS' : (locus === 'eyes' ? 'OJOS' : (locus === 'horns' ? 'CUERNOS' : 'ALAS')));
              
              return `
                <div class="dex-locus-block">
                  <h4 style="font-size: 0.65rem; color: var(--primary-accent); font-weight: 800; margin-bottom: 0.5rem; letter-spacing: 0.5px;">${locusLabel}</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem;">
                    ${allTraits[locus].map(name => {
                      const unlocked = isTraitUnlocked(locus, name);
                      const isPremium = name === 'fire' || name === 'neon' || name === 'dragon';
                      
                      const label = getTraitValueLabel(name, locus).toUpperCase();
                      
                      return `
                        <div style="padding: 0.6rem; border-radius: 8px; border: 1px solid ${unlocked ? (isPremium ? 'rgba(230,81,0,0.3)' : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.02)'}; background: ${unlocked ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)'}; text-align: center; position: relative; transition: all 0.2s;">
                          ${!unlocked ? `
                            <span style="font-size: 1.2rem; display: block; opacity: 0.25; filter: blur(1px);">?</span>
                            <span style="font-size: 0.55rem; font-weight: 700; color: rgba(255,255,255,0.15); display: block;">POR DESCUBRIR</span>
                          ` : `
                            <span style="font-size: 1.2rem; display: block;">${isPremium ? 'Raro' : 'Gen'}</span>
                            <span style="font-size: 0.65rem; font-weight: 800; color: ${isPremium ? '#ffb74d' : '#fff'}; display: block;">${label}</span>
                            <span style="font-size: 0.5rem; color: var(--text-grey); display: block; text-transform: capitalize;">${isPremium ? 'Rasgo premium' : 'Rasgo común'}</span>
                          `}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Bitácora de actividades -->
        <div class="glass-panel" style="padding: 1.5rem;">
          <h3 style="font-weight: 800; color: #fff; font-size: 1.1rem; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
            Bitácora de actividades del criadero
          </h3>
          <p class="subtitle" style="font-size: 0.72rem; color: var(--text-grey); margin-bottom: 1rem;">Registro histórico de tus caminatas, apareamientos, eclosiones y cuidados de salud.</p>
          
          <div class="logs-timeline" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; padding-right: 0.5rem; background: rgba(0,0,0,0.15); padding: 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03);">
            ${logs.length === 0 ? `
              <div style="text-align: center; color: var(--text-grey); padding: 1.5rem 0; font-size: 0.75rem;">
                No hay registros aún. Simula caminar, alimenta a tu criatura o haz un cruce.
              </div>
            ` : logs.map(log => {
              let icon = '•';
              if (log.type === 'WALK') icon = 'Pasos';
              else if (log.type === 'FEED') icon = 'Comida';
              else if (log.type === 'BREED') icon = 'Cruce';
              else if (log.type === 'HATCH') icon = 'Huevo';
              else if (log.type === 'GIFT') icon = 'Regalo';
              else if (log.type === 'CLAIM') icon = 'Recibido';
              else if (log.type === 'SHOP_BUY') icon = 'Tienda';
              
              return `
                <div style="display: flex; gap: 0.5rem; font-size: 0.7rem; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 0.35rem; align-items: flex-start;">
                  <span style="font-size: 0.9rem; flex-shrink: 0; margin-top: -0.1rem;">${icon}</span>
                  <div style="display: flex; flex-direction: column; gap: 0.05rem; width: 100%;">
                    <span style="color: #fff; font-weight: 500; line-height: 1.3;">${log.text}</span>
                    <span style="font-size: 0.55rem; color: var(--text-grey);">${log.timestamp}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }

  // Synthesis chimes for sound ticks
  playHatchTick(freq) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch(e) {}
  }

  playHatchSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.setValueAtTime(523, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5
      osc1.frequency.setValueAtTime(784, ctx.currentTime + 0.3); // G5
      osc1.frequency.setValueAtTime(1046, ctx.currentTime + 0.45); // C6
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      
      osc1.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.85);
    } catch(e) {}
  }

  playHatchFailSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(165, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(110, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch(e) {}
  }
}

