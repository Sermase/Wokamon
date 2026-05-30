// Wokamon Evolucionado - Egg Painter & Genetics Laboratory Component

import store, { calculatePunnettSquare, getTraitValueLabel, ALLELES_DOMINANCE } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class GeneticsLab {
  constructor(options = {}) {
    this.container = null;
    this.parentA = null;
    this.parentB = null;
    this.lockedMode = options.mode || null;
    this.activeSubTab = this.lockedMode === 'dex' ? 'dex' : 'lab';
    
    // Persistent Collapsible Genetics Folders (Collapsed by default!)
    this.expandedGroups = {
      morphology: false,
      physiognomy: false,
      physiology: false
    };
    
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

    // Custom switch to CRISPR event
    window.addEventListener('switch-to-crispr-lab', () => {
      this.activeSubTab = 'crispr';
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

    if (this.lockedMode === 'dex') {
      this.container.innerHTML = `
        <div class="genetics-lab-panel">
          <div id="lab-subpanel-content"></div>
        </div>
      `;

      const subContent = this.container.querySelector('#lab-subpanel-content');
      this.renderDexAndLogsMode(subContent);
      return;
    }

    // Set default subtab for incubator panel
    if (this.activeSubTab !== 'crispr') {
      this.activeSubTab = 'lab';
    }

    const eggs = store.getEggs();

    this.container.innerHTML = `
      <div class="genetics-lab-panel">
        
        <!-- Lab Inner Tabs navigation -->
        <div class="lab-inner-nav glass-panel" style="display: flex; gap: 0.5rem; padding: 0.5rem; border-radius: 12px; margin-bottom: 1.5rem; background: rgba(255, 255, 255, 0.02);">
          <button class="btn btn-secondary btn-xs flex-center" id="btn-subtab-lab" style="flex: 1; padding: 0.6rem; gap: 0.35rem; font-weight: 700; border-radius: 8px;">
            <span>🥚 Huevos</span> Incubadora (${eggs.length})
          </button>
          <button class="btn btn-secondary btn-xs flex-center" id="btn-subtab-crispr" style="flex: 1; padding: 0.6rem; gap: 0.35rem; font-weight: 700; border-radius: 8px;">
            <span>🧬 CRISPR</span> Lab Genético
          </button>
        </div>

        <div id="lab-subpanel-content"></div>
      </div>
    `;

    // Hook tab click events
    const labBtn = this.container.querySelector('#btn-subtab-lab');
    const crisprBtn = this.container.querySelector('#btn-subtab-crispr');
    
    const updateSubTabStyles = () => {
      if (this.activeSubTab === 'lab') {
        labBtn.style.background = 'var(--primary-accent)';
        labBtn.style.color = '#fff';
        labBtn.style.borderColor = 'var(--primary-accent)';

        crisprBtn.style.background = 'transparent';
        crisprBtn.style.color = 'var(--text-grey)';
        crisprBtn.style.borderColor = 'rgba(255,255,255,0.05)';
      } else {
        crisprBtn.style.background = 'var(--primary-accent)';
        crisprBtn.style.color = '#fff';
        crisprBtn.style.borderColor = 'var(--primary-accent)';

        labBtn.style.background = 'transparent';
        labBtn.style.color = 'var(--text-grey)';
        labBtn.style.borderColor = 'rgba(255,255,255,0.05)';
      }
    };

    labBtn.addEventListener('click', () => {
      this.activeSubTab = 'lab';
      this.render();
    });

    crisprBtn.addEventListener('click', () => {
      this.activeSubTab = 'crispr';
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
      this.renderCrisprMode(subContent);
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
                  <div class="parent-caregiver-slot" style="display: flex; flex-direction: column; gap: 0.25rem;">
                    <span style="font-size: 0.65rem; color: var(--text-grey); font-weight: 700;">WOKAMON CUIDADOR (DA CALOR):</span>
                    
                    ${this.isHatching ? `
                      <button class="btn btn-secondary btn-xs flex-center btn-disabled" disabled style="width: 100%; padding: 0.5rem; justify-content: space-between; align-items: center; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <div style="width: 28px; height: 28px; background: rgba(0,0,0,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.06);">
                            <div style="width: 22px; height: 22px;">${parentCare ? renderWokamonSVG(parentCare) : ''}</div>
                          </div>
                          <span style="font-weight: 700; font-size: 0.72rem; color: #fff;">${parentCare ? parentCare.name : 'Ninguno asignado'}</span>
                        </div>
                      </button>
                    ` : parentCare ? `
                      <button class="btn btn-secondary btn-xs flex-center btn-open-caregiver-modal" data-egg-id="${egg.id}" style="width: 100%; padding: 0.5rem; justify-content: space-between; align-items: center; border-radius: 8px; border: 1.2px solid rgba(0, 131, 143, 0.2);">
                        <div style="display: flex; align-items: center; gap: 0.4rem;">
                          <div style="width: 28px; height: 28px; background: rgba(0,0,0,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.06);">
                            <div style="width: 22px; height: 22px;">${renderWokamonSVG(parentCare)}</div>
                          </div>
                          <span style="font-weight: 700; font-size: 0.72rem; color: #fff;">${parentCare.name} (Lvl ${parentCare.level})</span>
                        </div>
                        <span style="font-size: 0.6rem; color: var(--primary-accent); font-weight: 800;">[ CAMBIAR ]</span>
                      </button>
                    ` : `
                      <button class="btn btn-secondary btn-xs flex-center btn-open-caregiver-modal" data-egg-id="${egg.id}" style="width: 100%; padding: 0.6rem; justify-content: center; align-items: center; border-radius: 8px; border: 1.5px dashed rgba(0, 131, 143, 0.25); background: rgba(0, 131, 143, 0.02); color: var(--primary-accent); font-weight: 800; transition: all 0.2s;">
                        ➕ ASIGNAR CUIDADOR ADULTO
                      </button>
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

    // Hook caregiver assignments modal trigger
    subContentContainer.querySelectorAll('.btn-open-caregiver-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        const eggId = btn.dataset.eggId;
        const egg = eggs.find(e => e.id === eggId);
        if (!egg) return;

        const adults = store.getWokamons().filter(w => w.status !== 'dead' && (w.stage === 'Adulto' || w.stage === 'Anciano'));

        // Show a custom, gorgeous modal with thumbnails!
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'payment-overlay animate-fade-in';
        modalOverlay.innerHTML = `
          <div class="gift-modal glass-panel pad-lg text-center flex-center flex-col animate-bounce-slow" style="max-width: 380px; width: 90%; gap: 1rem; border: 2.5px solid var(--primary-accent); padding: 1.5rem; background: rgba(255,255,255,0.98); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25);">
            <div style="font-size: 2.5rem; filter: drop-shadow(0 0 8px rgba(0, 131, 143, 0.4));">🧬</div>
            <div>
              <h3 style="font-weight: 800; color: var(--primary-accent); margin-bottom: 0.25rem;">Asignar Wokamon Cuidador</h3>
              <p style="font-size: 0.72rem; color: #263238; line-height: 1.4; margin-top: 0.2rem; text-align: left;">
                Los Wokamons adultos y ancianos dan calor al huevo con sus pasos para acelerar su gestación. Solo pueden cuidar de un huevo a la vez.
              </p>
            </div>

            <!-- List caretakers -->
            <div style="width: 100%; display: flex; flex-direction: column; gap: 0.5rem; max-height: 250px; overflow-y: auto; padding-right: 0.25rem;">
              ${adults.length === 0 ? `
                <div style="padding: 1rem; border-radius: 8px; border: 1.5px dashed rgba(0,131,143,0.15); background: rgba(0,0,0,0.05); font-size: 0.72rem; color: var(--text-grey); text-align: center;">
                  No tienes Wokamons adultos o ancianos disponibles en tu criadero. ¡Sigue cuidando a tus Wokamons niños hasta que crezcan!
                </div>
              ` : adults.map(w => {
                const isBusy = eggs.some(e => e.id !== egg.id && e.incubatingParentId === w.id);
                const isCurrent = egg.incubatingParentId === w.id;
                
                return `
                  <button class="btn btn-secondary flex-center select-wokamon-card" 
                          data-wok-id="${w.id}" 
                          ${isBusy ? 'disabled' : ''} 
                          style="width: 100%; padding: 0.65rem; border-radius: 10px; border: 1.5px solid ${isCurrent ? 'var(--primary-accent)' : (isBusy ? 'rgba(0,0,0,0.02)' : 'rgba(0,131,143,0.12)')}; background: ${isCurrent ? 'rgba(0, 131, 143, 0.08)' : (isBusy ? 'rgba(0,0,0,0.05)' : '#fff')}; display: flex; align-items: center; justify-content: space-between; text-align: left; transition: all 0.2s; cursor: ${isBusy ? 'not-allowed' : 'pointer'};">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                      <!-- Visual Thumbnail -->
                      <div style="width: 36px; height: 36px; background: rgba(0,0,0,0.05); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,131,143,0.1); flex-shrink: 0;">
                        <div style="width: 28px; height: 28px;">${renderWokamonSVG(w)}</div>
                      </div>
                      <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 0.78rem; color: ${isBusy ? '#777' : 'var(--text-white)'};">${w.name}</strong>
                        <span style="font-size: 0.58rem; color: var(--text-grey); font-weight: 700; text-transform: uppercase;">
                          ${w.stage} • Nivel ${w.level}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      ${isCurrent ? `
                        <span class="zygo-badge badge-homo" style="font-size: 0.52rem; padding: 0.2rem 0.4rem;">Cuidando</span>
                      ` : isBusy ? `
                        <span style="font-size: 0.52rem; color: rgba(0,0,0,0.25); font-weight: 800; text-transform: uppercase;">Ocupado</span>
                      ` : `
                        <span style="font-size: 0.52rem; color: var(--primary-accent); font-weight: 800; text-transform: uppercase;">Asignar</span>
                      `}
                    </div>
                  </button>
                `;
              }).join('')}
            </div>

            <!-- Remove Caretaker Button -->
            <button class="btn btn-secondary-outline btn-remove-caretaker" style="width: 100%; padding: 0.6rem; border-radius: 8px; font-size: 0.72rem; font-weight: 700; border-color: var(--danger-accent); color: var(--danger-accent);">
              Dejar al aire (Sin Cuidador)
            </button>

            <!-- Cancel Button -->
            <button class="btn btn-secondary full-width btn-close-caretakers" style="padding: 0.6rem; border-radius: 8px; font-size: 0.72rem; font-weight: 700; background: rgba(0,0,0,0.05); color: var(--text-white); border-color: rgba(0,0,0,0.05);">
              Cancelar
            </button>
          </div>
        `;

        document.body.appendChild(modalOverlay);

        // Cancel
        modalOverlay.querySelector('.btn-close-caretakers').addEventListener('click', () => {
          modalOverlay.remove();
        });

        // Set to none
        modalOverlay.querySelector('.btn-remove-caretaker').addEventListener('click', () => {
          store.assignParentToEgg(eggId, 'none');
          modalOverlay.remove();
          this.render();
        });

        // Select Wokamon
        modalOverlay.querySelectorAll('.select-wokamon-card').forEach(card => {
          card.addEventListener('click', () => {
            const wokId = card.dataset.wokId;
            store.assignParentToEgg(eggId, wokId);
            this.playHatchTick(330);
            modalOverlay.remove();
            this.render();
          });
        });
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

    // Define the three official groups of loci
    const groups = [
      {
        id: 'morfologia',
        title: '📐 Morfología (Genes de Forma)',
        loci: ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape']
      },
      {
        id: 'fisonomia',
        title: '👁️ Fisonomía y Piel (Aspecto y Expresión)',
        loci: ['eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType']
      },
      {
        id: 'fisiologia',
        title: '🧬 Fisiología (Funcionamiento y Gameplay)',
        loci: ['metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage']
      }
    ];

    const locusTitles = {
      bodyBase: 'Silueta del Cuerpo',
      bodyProportion: 'Proporción Corporal',
      limbType: 'Tipo de Extremidades',
      headMerge: 'Unión de Cabeza',
      topAppendage: 'Apéndice Superior',
      tailType: 'Tipo de Cola',
      bellyShape: 'Silueta de Barriga',
      eyeShape: 'Forma de Ojos',
      pupilStyle: 'Estilo de Pupila',
      mouthStyle: 'Estilo de Boca',
      surfaceType: 'Textura de Piel',
      metabolism: 'Metabolismo',
      longevity: 'Esperanza de Vida',
      diseaseResilience: 'Inmunidad / Salud',
      vitalityStorage: 'Reserva Energética'
    };

    let totalDiscovered = 0;
    let totalPossible = 0;

    for (const locus in ALLELES_DOMINANCE) {
      const alleles = Object.values(ALLELES_DOMINANCE[locus]);
      alleles.forEach(allele => {
        totalPossible++;
        if (collection.includes(`${locus}:${allele.name}`)) {
          totalDiscovered++;
        }
      });
    }

    subContentContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.5rem;" class="animate-slide-in">
        
        <!-- Wokadex Section -->
        <div class="glass-panel" style="padding: 1.5rem; background: rgba(18, 28, 26, 0.85); border: 1px solid rgba(255,255,255,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 style="font-weight: 800; color: #fff; font-size: 1.25rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 0.35rem;">
                Colección de rasgos Wokadex
              </h3>
              <p class="subtitle" style="font-size: 0.72rem; color: #a3c2ba;">Descubre genes y cruces raros para completar el catálogo biológico de 15 loci.</p>
            </div>
            <div class="nursery-badge glass-panel-inner" style="background: rgba(0, 172, 193, 0.12); border: 1px solid rgba(0, 172, 193, 0.35); padding: 0.4rem 0.8rem; border-radius: 8px;">
              <span class="count" style="color: #00e5ff; font-weight: 900; font-size: 0.95rem; text-shadow: 0 1px 3px rgba(0,0,0,0.6); display: block;">${totalDiscovered} / ${totalPossible}</span>
              <span class="mult" style="font-size: 0.55rem; color: #a3c2ba; font-weight: 700; display: block; text-transform: uppercase;">Descubiertos</span>
            </div>
          </div>

          <!-- Loci display grouped by category -->
          <div class="dex-loci-sections" style="display: flex; flex-direction: column; gap: 1.5rem;">
            ${groups.map(group => {
              return `
                <div class="dex-group-block glass-panel-inner" style="padding: 1.25rem; border-radius: 12px; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255,255,255,0.04);">
                  <h4 style="font-size: 0.9rem; font-weight: 900; margin-bottom: 1.25rem; text-shadow: 0 1px 3px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 0.35rem; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 0.5rem; color: #00e5ff;">
                    ${group.title}
                  </h4>
                  
                  <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                    ${group.loci.map(locus => {
                      const locusTitle = locusTitles[locus] || locus;
                      const alleles = Object.keys(ALLELES_DOMINANCE[locus] || {}).map(key => {
                        const alleleInfo = ALLELES_DOMINANCE[locus][key];
                        const unlocked = collection.includes(`${locus}:${alleleInfo.name}`);
                        return { key, ...alleleInfo, unlocked };
                      });
                      
                      const discoveredInLocus = alleles.filter(a => a.unlocked).length;
                      
                      return `
                        <div class="dex-locus-item" style="display: flex; flex-direction: column; gap: 0.5rem;">
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.75rem; color: #ffeb3b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">
                              ${locusTitle}
                            </span>
                            <span style="font-size: 0.65rem; color: #a3c2ba; font-weight: 700;">
                              ${discoveredInLocus} / ${alleles.length} Descubiertos
                            </span>
                          </div>
                          
                          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem;">
                            ${alleles.map(allele => {
                              const isPremium = allele.key === 'H' || allele.key === 'N' || allele.key === 'f' || allele.key === 'j' || allele.key === 'E' || allele.key === 'L' || allele.key === 'I';
                              
                              if (allele.unlocked) {
                                return `
                                  <div class="unlocked-allele-card" style="padding: 0.6rem; border-radius: 8px; text-align: center; position: relative; transition: all 0.2s; 
                                    background: ${isPremium ? 'linear-gradient(135deg, rgba(255, 145, 0, 0.15) 0%, rgba(230, 81, 0, 0.06) 100%)' : 'rgba(255, 255, 255, 0.04)'}; 
                                    border: 1px solid ${isPremium ? 'rgba(255, 145, 0, 0.4)' : 'rgba(255, 255, 255, 0.12)'};
                                    box-shadow: ${isPremium ? '0 0 8px rgba(255, 145, 0, 0.08)' : 'none'};">
                                    <div style="font-size: 0.78rem; font-weight: 900; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; gap: 0.25rem; margin-bottom: 0.15rem;">
                                      <span style="display: inline-block; background: ${isPremium ? '#ff9100' : '#00e5ff'}; color: #000; border-radius: 4px; padding: 0.05rem 0.25rem; font-size: 0.6rem; font-weight: 900; line-height: 1.1; box-shadow: 0 1px 2px rgba(0,0,0,0.3);">
                                        ${allele.key}
                                      </span>
                                      <span style="color: ${isPremium ? '#ffb74d' : '#fff'};">${allele.name.toUpperCase()}</span>
                                    </div>
                                    <div style="font-size: 0.52rem; color: #a3c2ba; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-weight: 600;" title="${allele.label}">
                                      ${allele.label.split('(')[0].trim()}
                                    </div>
                                  </div>
                                `;
                              } else {
                                return `
                                  <div class="locked-allele-card" style="padding: 0.6rem; border-radius: 8px; text-align: center; position: relative; 
                                    background: rgba(0, 0, 0, 0.35); border: 1px dashed rgba(255, 255, 255, 0.05);">
                                    <div style="font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; gap: 0.2rem; margin-bottom: 0.15rem;">
                                      <span style="display: inline-block; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.2); border-radius: 4px; padding: 0.05rem 0.25rem; font-size: 0.58rem; font-weight: 900; line-height: 1.1;">
                                        ?
                                      </span>
                                      <span>POR DESCUBRIR</span>
                                    </div>
                                    <div style="font-size: 0.52rem; color: rgba(255,255,255,0.06); font-weight: 500;">
                                      Incógnita genética
                                    </div>
                                  </div>
                                `;
                              }
                            }).join('')}
                          </div>
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
        <div class="glass-panel" style="padding: 1.5rem; background: rgba(18, 28, 26, 0.85); border: 1px solid rgba(255,255,255,0.08);">
          <h3 style="font-weight: 800; color: #fff; font-size: 1.25rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
            Bitácora de actividades del criadero
          </h3>
          <p class="subtitle" style="font-size: 0.72rem; color: #a3c2ba; margin-bottom: 1rem;">Registro histórico de tus caminatas, apareamientos, eclosiones y cuidados de salud.</p>
          
          <div class="logs-timeline" style="display: flex; flex-direction: column; gap: 0.6rem; max-height: 300px; overflow-y: auto; padding-right: 0.5rem; background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.04);">
            ${logs.length === 0 ? `
              <div style="text-align: center; color: #a3c2ba; padding: 1.5rem 0; font-size: 0.75rem;">
                No hay registros aún. Simula caminar, alimenta a tu criatura o haz un cruce.
              </div>
            ` : logs.map(log => {
              let icon = '•';
              if (log.type === 'WALK') icon = '👣';
              else if (log.type === 'FEED') icon = '🍪';
              else if (log.type === 'BREED') icon = '💖';
              else if (log.type === 'HATCH') icon = '🥚';
              else if (log.type === 'GIFT') icon = '🎁';
              else if (log.type === 'CLAIM') icon = '📥';
              else if (log.type === 'SHOP_BUY') icon = '💎';
              
              return `
                <div style="display: flex; gap: 0.6rem; font-size: 0.72rem; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 0.4rem; align-items: flex-start;">
                  <span style="font-size: 0.95rem; flex-shrink: 0; margin-top: -0.1rem;">${icon}</span>
                  <div style="display: flex; flex-direction: column; gap: 0.05rem; width: 100%;">
                    <span style="color: #fff; font-weight: 600; line-height: 1.35; text-shadow: 0 1px 2px rgba(0,0,0,0.4);">${log.text}</span>
                    <span style="font-size: 0.58rem; color: #a3c2ba; font-weight: 500;">${log.timestamp}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;
  }

  renderCrisprMode(subContentContainer) {
    const eggs = store.getEggs();
    const allTargets = eggs.map(e => ({ id: e.id, name: `🥚 ${e.name} [Huevo Gen ${e.generation}]`, type: 'egg', obj: e }));

    if (allTargets.length === 0) {
      subContentContainer.innerHTML = `
        <div class="genetics-lab-card glass-panel flex-center flex-col text-center pad-lg">
          <div class="dna-double-helix animate-pulse" style="font-size: 3rem; margin-bottom: 1rem;">🧬</div>
          <h2 class="section-title">Laboratorio CRISPR-Cas9</h2>
          <p class="subtitle max-width-md">No tienes huevos activos en la incubadora para realizar ingeniería genética. Completa un apareamiento en el Ritual NFC para conseguir un huevo gestacional y editar su ADN antes de que eclosione.</p>
        </div>
      `;
      return;
    }

    // Set or validate selected target
    let activeTarget = allTargets.find(t => t.id === this.selectedTargetId && t.type === this.selectedTargetType);
    if (!activeTarget) {
      activeTarget = allTargets[0];
      this.selectedTargetId = activeTarget.id;
      this.selectedTargetType = activeTarget.type;
    }

    const targetObj = activeTarget.obj;
    const genotype = targetObj.genotype;

    if (!this.selectedLocus || this.selectedLocus === 'bodyType') {
      this.selectedLocus = 'bodyBase';
    }
    if (this.selectedAlleleIndex === undefined) {
      this.selectedAlleleIndex = 0;
    }

    const locusLabels = {
      bodyBase: 'Silueta Cuerpo',
      bodyProportion: 'Proporciones',
      limbType: 'Extremidades',
      headMerge: 'Unión Cabeza',
      topAppendage: 'Apéndice Sup.',
      tailType: 'Cola',
      bellyShape: 'Barriga',
      eyeShape: 'Forma Ojos',
      pupilStyle: 'Pupilas',
      mouthStyle: 'Boca',
      surfaceType: 'Piel/Textura',
      metabolism: 'Metabolismo',
      longevity: 'Longevidad',
      diseaseResilience: 'Inmunidad',
      vitalityStorage: 'Reserva Vital'
    };

    const locusHelps = {
      bodyBase: 'Silueta base y contorno del cuerpo (redondo, alubia, pera, nube, etc.).',
      bodyProportion: 'Escala y proporción corporal (equilibrada, regordeta, alta, diminuta).',
      limbType: 'Longitud y diseño de extremidades (cortas, suaves, largas, elásticas).',
      headMerge: 'Nivel de fusión/unión de la cabeza respecto al tronco.',
      topAppendage: 'Apéndice de la cabeza (cuernos, antenas, orejas de animal, brotes o sin apéndice).',
      tailType: 'Forma y tipo de cola (sin cola, pompón, espinas, peluda).',
      bellyShape: 'Forma del patrón del vientre (oval, corazón, gota, nube, o sin barriga).',
      eyeShape: 'Diseño y expresión Kawaii de los ojos (redondos, dormilones, brillantes, abiertos, caídos).',
      pupilStyle: 'Reflejos y tipo de pupilas (punto, brillante, estrella, felina).',
      mouthStyle: 'Forma y expresión de la boca (sonrisa, abierta, colmillo, tímida).',
      surfaceType: 'Volumen 3D y textura de la piel (suave, peluche, gelatina, peluda, mate).',
      metabolism: 'Tasa metabólica: eficiente (-15% pasos), rápido (+20% crecimiento y +10% pasos), o normal.',
      longevity: 'Esperanza de vida máxima: larga (+6 días de vida útil), corta (-3 días), o normal.',
      diseaseResilience: 'Inmunidad al enfermar: fuerte (cura 40% más rápido), delicada (+30% susceptibilidad), o normal.',
      vitalityStorage: 'Reserva de vitalidad máxima: elevada (+20 de capacidad vital, total 140) o normal.'
    };

    const crystals = store.loadState().user.crystals || 0;
    const unlockedGenes = store.loadState().shop.unlockedGenes || [];

    // Visual Render of the target (strictly Eggs)
    const targetVisualHTML = `
      <div class="custom-egg-sprite" style="width: 60px; height: 75px; margin: 0 auto; background: ${targetObj.genetics.primaryColor}; box-shadow: inset -5px -10px 15px rgba(0,0,0,0.15), 0 5px 10px rgba(0,0,0,0.15); border: 2px solid ${targetObj.genetics.bellyColor || '#fff'}; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%;">
        <div class="egg-dots" style="background: ${targetObj.genetics.bellyColor};"></div>
      </div>
      <h3 style="font-weight: 800; color: #fff; margin-top: 0.5rem; font-size: 1rem;">${targetObj.name}</h3>
      <span class="stage-badge" style="font-size: 0.6rem; padding: 0.2rem 0.6rem; border-radius: 20px; font-weight: 800; text-transform: uppercase; background: var(--gold-accent); color: #fff;">
        HUEVO EN CUNA
      </span>
    `;

    subContentContainer.innerHTML = `
      <div class="genetics-lab-card glass-panel flex-col animate-slide-in" style="gap: 1.5rem;">
        
        <!-- Target Selector & Visual -->
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <div class="glass-panel-inner" style="padding: 1rem; border-radius: 12px; display: flex; flex-direction: column; gap: 0.5rem;">
            <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-grey); letter-spacing: 0.5px;">🧬 EDITAR GENOMA CRISPR-Cas9:</label>
            <select class="glass-select" id="crispr-target-select" style="width: 100%; font-size: 0.8rem; font-weight: 700; padding: 0.6rem;">
              ${allTargets.map(t => `
                <option value="${t.id}:${t.type}" ${t.id === this.selectedTargetId ? 'selected' : ''}>${t.name}</option>
              `).join('')}
            </select>
            <p style="font-size: 0.65rem; color: var(--text-grey); line-height: 1.3; margin-top: 0.2rem;">
              La edición genética CRISPR-Cas9 te permite cortar un alelo y sustituirlo por otro gen conocido de tu catálogo. ¡Las mutaciones actualizan su fenotipo en tiempo real!
            </p>
          </div>
          <div class="glass-panel-inner text-center flex-center flex-col" style="padding: 0.75rem; border-radius: 12px; min-height: 140px; background: rgba(0,0,0,0.1);">
            ${targetVisualHTML}
          </div>
        </div>

        <!-- CONSOLA DE RADIACIÓN CROMÁTICA -->
        <div class="chromatic-radiation-console glass-panel-inner" style="padding: 1rem; border-radius: 12px; border: 1.5px solid #ff007f; background: rgba(255, 0, 127, 0.04); display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 0 15px rgba(255, 0, 127, 0.15);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 0, 127, 0.2); padding-bottom: 0.4rem;">
            <strong style="color: #fff; font-size: 0.82rem; display: flex; align-items: center; gap: 0.35rem;">
              🎨 Radiación Cromática (Mutación de Color)
            </strong>
            <span style="font-size: 0.65rem; color: #ff007f; font-weight: 800; letter-spacing: 0.5px;">CRISPR-HSL SHUFFLE</span>
          </div>
          <p style="font-size: 0.68rem; color: var(--text-grey); line-height: 1.4; margin: 0.2rem 0;">
            Aplica una ráfaga controlada de radiación gamma sobre el embrión para alterar sus genes HSL cromáticos. ¡Generará colores de base, vientre y contraste totalmente impredecibles y únicos!
          </p>
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.2rem;">
            <div style="display: flex; flex-direction: column; gap: 0.1rem;">
              <span style="font-size: 0.6rem; color: var(--text-grey);">Colores actuales del Huevo:</span>
              <div style="display: flex; align-items: center; gap: 0.4rem; margin-top: 0.15rem;">
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${targetObj.genetics.primaryColor}; border: 1px solid rgba(255,255,255,0.2);"></span>
                <span style="font-size: 0.65rem; font-family: monospace; color: #fff;">P: ${targetObj.genetics.primaryColor}</span>
                <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${targetObj.genetics.bellyColor}; border: 1px solid rgba(255,255,255,0.2); margin-left: 0.4rem;"></span>
                <span style="font-size: 0.65rem; font-family: monospace; color: #fff;">V: ${targetObj.genetics.bellyColor}</span>
              </div>
            </div>
            <button class="btn" id="btn-chromatic-mutate" ${crystals < 3 ? 'disabled' : ''} style="background: linear-gradient(135deg, #ff007f, #7f00ff); color: #fff; font-weight: 800; font-size: 0.72rem; padding: 0.55rem 1rem; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 0 10px rgba(255, 0, 127, 0.4); display: flex; align-items: center; gap: 0.35rem; transition: transform 0.2s;">
              <span>💥 Mutar Colores</span> <strong>(3 💎)</strong>
            </button>
          </div>
        </div>

        <!-- DNA Loci Inspector Table -->
        <div class="glass-panel-inner" style="padding: 1.15rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <strong style="font-size: 0.82rem; color: #fff; display: flex; justify-content: space-between; align-items: center;">
            <span>🔬 Secuenciación de ADN e Inspector de Loci</span>
            <span style="font-size: 0.62rem; color: var(--primary-accent); font-weight: 800; letter-spacing: 0.5px;">SELECCIONA UN LOCUS A EDITAR</span>
          </strong>

          <div class="mendelian-table border-glow">
            <div class="table-header">
              <span>Locus <span class="help-btn" data-help="El lugar exacto en el cromosoma donde se localiza el gen.">?</span></span>
              <span>Alelo 1 <span class="help-btn" data-help="Alelo 1: Primer gen heredado (materno o paterno). Haz clic para editarlo.">?</span></span>
              <span>Alelo 2 <span class="help-btn" data-help="Alelo 2: Segundo gen heredado (materno o paterno). Haz clic para editarlo.">?</span></span>
              <span>Expresión (Fenotipo) <span class="help-btn" data-help="Fenotipo: El rasgo físico visible resultante de la dominancia entre los alelos.">?</span></span>
              <span>Estado <span class="help-btn" data-help="Cigosidad: Homocigoto si ambos alelos son idénticos; Heterocigoto si son distintos.">?</span></span>
            </div>

            <div class="table-body">
              ${(() => {
                const groups = [
                  {
                    id: 'morphology',
                    label: '📐 Morfología (Cuerpo y Forma)',
                    loci: ['bodyBase', 'bodyProportion', 'limbType', 'headMerge', 'topAppendage', 'tailType', 'bellyShape']
                  },
                  {
                    id: 'physiognomy',
                    label: '👁️ Fisonomía y Piel (Aspecto)',
                    loci: ['eyeShape', 'pupilStyle', 'mouthStyle', 'surfaceType']
                  },
                  {
                    id: 'physiology',
                    label: '⚡ Fisiología (Gameplay)',
                    loci: ['metabolism', 'longevity', 'diseaseResilience', 'vitalityStorage']
                  }
                ];

                return groups.map(grp => {
                  const isExpanded = this.expandedGroups[grp.id] !== false;
                  return `
                    <div class="genetics-group-folder">
                      <button type="button" class="group-folder-header-lab" data-toggle-group="${grp.id}" style="width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; margin-top: 0.4rem; color: #fff; font-weight: 700; cursor: pointer; text-align: left; transition: background 0.2s; font-size: 0.72rem; border-left: 3px solid ${grp.id === 'morphology' ? '#4caf50' : grp.id === 'physiognomy' ? '#2196f3' : '#ff9800'};">
                        <span>${grp.label}</span>
                        <span style="font-size: 0.55rem; color: var(--text-grey);">${isExpanded ? '▼' : '▶'}</span>
                      </button>
                      
                      <div class="group-folder-content" style="display: ${isExpanded ? 'block' : 'none'};">
                        ${grp.loci.map(locus => {
                          const genotypeLocus = genotype[locus];
                          const alleleA = genotypeLocus ? genotypeLocus[0] : (Object.keys(ALLELES_DOMINANCE[locus])[0]);
                          const alleleB = genotypeLocus ? genotypeLocus[1] : (Object.keys(ALLELES_DOMINANCE[locus])[0]);

                          let infoA = ALLELES_DOMINANCE[locus][alleleA];
                          let infoB = ALLELES_DOMINANCE[locus][alleleB];

                          if (!infoA || !infoB) {
                            const defaultAllele = Object.keys(ALLELES_DOMINANCE[locus])[0];
                            if (!infoA) infoA = ALLELES_DOMINANCE[locus][defaultAllele];
                            if (!infoB) infoB = ALLELES_DOMINANCE[locus][defaultAllele];
                          }

                          const isA_Dominant = infoA.dominance >= infoB.dominance;
                          const domAllele = isA_Dominant ? alleleA : alleleB;
                          const recAllele = isA_Dominant ? alleleB : alleleA;

                          const isHomozygous = alleleA === alleleB;
                          const resolvedDom = ALLELES_DOMINANCE[locus][domAllele] || infoA;
                          const domLabel = getTraitValueLabel(resolvedDom.name, locus);

                          const isLocusSelected = this.selectedLocus === locus;

                          return `
                            <div class="table-row table-row-selectable ${isLocusSelected ? 'row-active' : ''}" data-locus="${locus}">
                              <strong class="locus-lbl" style="color: ${isLocusSelected ? 'var(--primary-accent)' : '#fff'}; display: flex; align-items: center; gap: 0.25rem;">
                                ${locusLabels[locus]}
                                <span class="help-btn" data-help="${locusHelps[locus]}">?</span>
                              </strong>
                              
                              <span class="allele-cell-btn ${isLocusSelected && this.selectedAlleleIndex === 0 ? 'allele-cell-active' : ''}" data-allele-idx="0">
                                [ ${alleleA} ]
                              </span>
                              <span class="allele-cell-btn ${isLocusSelected && this.selectedAlleleIndex === 1 ? 'allele-cell-active' : ''}" data-allele-idx="1">
                                [ ${alleleB} ]
                              </span>

                              <span class="pheno-val" style="font-weight: 700; color: #fff;">${domLabel}</span>
                              
                              <span class="hidden-val">
                                <span class="zygo-badge ${isHomozygous ? 'badge-homo' : 'badge-hetero'}">
                                  ${isHomozygous ? 'Homocigoto' : 'Heterocigoto'}
                                </span>
                              </span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>
        </div>

        <!-- CRISPR-Cas9 Engineering Console -->
        <div class="crispr-cas9-console glass-panel-inner" style="padding: 1.25rem; border-radius: 12px; border: 1.5px solid var(--primary-accent); background: rgba(0, 131, 143, 0.04); display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 131, 143, 0.15); padding-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <strong style="color: #fff; font-size: 0.85rem; display: flex; align-items: center; gap: 0.35rem;">
                🧬 Consola CRISPR-Cas9
              </strong>
              <p style="font-size: 0.65rem; color: var(--text-grey); margin-top: 0.1rem;">
                Cortando locus <strong>${locusLabels[this.selectedLocus] || this.selectedLocus}</strong> > <strong>Alelo ${this.selectedAlleleIndex + 1}</strong> (Actual: <strong style="color: var(--primary-accent);">${genotype[this.selectedLocus] ? genotype[this.selectedLocus][this.selectedAlleleIndex] : ''}</strong>).
              </p>
            </div>
            <div class="crispr-crystals-badge glass-panel-inner" style="padding: 0.25rem 0.6rem; border-radius: 8px; font-weight: 800; font-size: 0.72rem; color: #ffb300; display: flex; align-items: center; gap: 0.25rem; border: 1px solid rgba(255, 179, 0, 0.2); background: rgba(0,0,0,0.15);">
              <span>Cristales:</span> <strong>${crystals} 💎</strong>
            </div>
          </div>

          <!-- Gene Shop and Mutate Catalogue Grid -->
          <div style="display: flex; flex-direction: column; gap: 0.85rem;">
            
            <!-- Unlocked Genes Catalog (10 crystals) -->
            <div>
              <span style="font-size: 0.65rem; color: var(--primary-accent); font-weight: 800; letter-spacing: 0.5px; display: block; margin-bottom: 0.4rem;">
                MUTAR ALELO CON GENES CONOCIDOS (Coste: 10 Cristales 💎)
              </span>
              
              <div class="crispr-gene-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 0.5rem;">
                ${Object.keys(ALLELES_DOMINANCE[this.selectedLocus] || {}).map(alleleLetter => {
                  const alleleInfo = ALLELES_DOMINANCE[this.selectedLocus][alleleLetter];
                  const isUnlocked = unlockedGenes.includes(alleleInfo.name);
                  const isCurrent = genotype[this.selectedLocus] && genotype[this.selectedLocus][this.selectedAlleleIndex] === alleleLetter;
                  const canMutate = isUnlocked && !isCurrent && crystals >= 10;
                  
                  if (!isUnlocked) return ''; // Render locked genes below

                  return `
                    <button class="btn btn-crispr-gene-slot ${isCurrent ? 'gene-slot-current' : 'gene-slot-mutate'}" 
                            data-mutate-allele="${alleleLetter}" 
                            ${!canMutate ? 'disabled' : ''} 
                            style="padding: 0.5rem; text-align: left; border-radius: 8px; display: flex; flex-direction: column; gap: 0.15rem; transition: all 0.2s;">
                      <span style="font-size: 0.55rem; font-weight: 800; color: var(--text-grey);">[ Dominancia: ${alleleInfo.dominance} ]</span>
                      <strong style="font-size: 0.72rem; color: #fff;">${alleleLetter} : ${getTraitValueLabel(alleleInfo.name, this.selectedLocus)}</strong>
                      
                      ${isCurrent ? `
                        <span style="font-size: 0.52rem; color: var(--primary-accent); font-weight: 800; text-transform: uppercase; margin-top: 0.1rem;">Activo en ADN</span>
                      ` : `
                        <span style="font-size: 0.52rem; color: #ffb300; font-weight: 800; margin-top: 0.1rem;">Mutar (10 💎)</span>
                      `}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Locked Genes to Unlock (25 crystals) -->
            <div>
              <span style="font-size: 0.65rem; color: var(--gold-accent); font-weight: 800; letter-spacing: 0.5px; display: block; margin-bottom: 0.4rem; border-top: 1px dashed rgba(0, 131, 143, 0.15); padding-top: 0.6rem;">
                DESBLOQUEAR NUEVOS RASGOS EN EL LABORATORIO (Coste: 25 Cristales 💎)
              </span>

              <div class="crispr-gene-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(135px, 1fr)); gap: 0.5rem;">
                ${Object.keys(ALLELES_DOMINANCE[this.selectedLocus] || {}).map(alleleLetter => {
                  const alleleInfo = ALLELES_DOMINANCE[this.selectedLocus][alleleLetter];
                  const isUnlocked = unlockedGenes.includes(alleleInfo.name);
                  const canUnlock = !isUnlocked && crystals >= 25;
                  
                  if (isUnlocked) return ''; // Rendered above

                  const isPremium = alleleInfo.name === 'fire' || alleleInfo.name === 'neon' || alleleInfo.name === 'dragon';

                  return `
                    <button class="btn btn-crispr-gene-slot gene-slot-locked" 
                            data-unlock-gene="${alleleInfo.name}" 
                            ${!canUnlock ? 'disabled' : ''} 
                            style="padding: 0.5rem; text-align: left; border-radius: 8px; display: flex; flex-direction: column; gap: 0.15rem; background: rgba(0,0,0,0.15); border: 1px dashed rgba(255,255,255,0.05);">
                      <span style="font-size: 0.52rem; font-weight: 800; color: ${isPremium ? '#ffb300' : 'var(--text-grey)'};">🔒 ${isPremium ? 'PREMIUM (Raro)' : 'COMÚN'}</span>
                      <strong style="font-size: 0.72rem; color: rgba(255,255,255,0.4);">${alleleLetter} : ${getTraitValueLabel(alleleInfo.name, this.selectedLocus)}</strong>
                      <span style="font-size: 0.52rem; color: var(--gold-accent); font-weight: 800; margin-top: 0.1rem;">Desbloquear (25 💎)</span>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

          </div>
        </div>

      </div>
    `;

    // Hook target selector change
    const targetSelect = subContentContainer.querySelector('#crispr-target-select');
    targetSelect.addEventListener('change', (e) => {
      const [id, type] = e.target.value.split(':');
      this.selectedTargetId = id;
      this.selectedTargetType = type;
      this.render();
    });

    // Hook Collapsible group toggles in Lab
    subContentContainer.querySelectorAll('[data-toggle-group]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const grpId = btn.dataset.toggleGroup;
        this.expandedGroups[grpId] = !this.expandedGroups[grpId];
        this.render();
      });
    });

    // Hook Chromatic Mutation button
    const chromaticBtn = subContentContainer.querySelector('#btn-chromatic-mutate');
    if (chromaticBtn) {
      chromaticBtn.addEventListener('click', () => {
        const success = store.mutateChromaticRadiation(this.selectedTargetId);
        if (success) {
          this.playHatchSuccessSound();
          const toast = document.getElementById('toast-notification-root');
          if (toast) {
            toast.className = 'toast-show';
            toast.textContent = `🎨 Cromática: ¡Genes de color re-secuenciados con éxito!`;
            setTimeout(() => toast.className = '', 2500);
          }
          this.render();
        }
      });
    }

    // Hook Locus selecting rows & cells
    subContentContainer.querySelectorAll('.table-row-selectable').forEach(row => {
      row.addEventListener('click', (e) => {
        const locus = row.dataset.locus;
        this.selectedLocus = locus;
        
        // If they clicked specifically on a chromosome cell button
        const cell = e.target.closest('.allele-cell-btn');
        if (cell) {
          this.selectedAlleleIndex = parseInt(cell.dataset.alleleIdx, 10);
        }
        
        this.render();
      });
    });

    // Hook CRISPR mutation actions
    subContentContainer.querySelectorAll('[data-mutate-allele]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const allele = btn.dataset.mutateAllele;
        
        const success = store.modifyGenotype(
          this.selectedTargetId,
          this.selectedTargetType,
          this.selectedLocus,
          this.selectedAlleleIndex,
          allele,
          10
        );

        if (success) {
          this.playHatchSuccessSound();
          // Show visual notification
          const toast = document.getElementById('toast-notification-root');
          if (toast) {
            toast.className = 'toast-show';
            toast.textContent = `🧬 CRISPR: Genoma modificado con éxito a ${allele}.`;
            setTimeout(() => toast.className = '', 2500);
          }
          this.render();
        }
      });
    });

    // Hook Gene shop unlock actions
    subContentContainer.querySelectorAll('[data-unlock-gene]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const geneName = btn.dataset.unlockGene;
        
        const success = store.buyShopGene(geneName, 25);
        if (success) {
          this.playHatchSuccessSound();
          const toast = document.getElementById('toast-notification-root');
          if (toast) {
            toast.className = 'toast-show';
            toast.textContent = `🔑 Tienda: Rasgo genético "${geneName}" desbloqueado en el catálogo.`;
            setTimeout(() => toast.className = '', 2500);
          }
          this.render();
        }
      });
    });

    // Hook help tooltips
    subContentContainer.querySelectorAll('.help-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.dataset.help;
        const helpOverlay = document.createElement('div');
        helpOverlay.className = 'genetic-help-popup animate-fade-in';
        helpOverlay.innerHTML = `
          <div class="help-popup-content glass-panel-inner pad-md text-center flex-center flex-col" style="max-width: 280px; gap: 0.5rem; background: rgba(255, 255, 255, 0.98); border: 2px solid var(--primary-accent); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
            <h4 style="font-weight: 800; color: var(--primary-accent); margin-bottom: 0.15rem;">Genética de Wokamon</h4>
            <p style="font-size: 0.72rem; line-height: 1.4; color: #37474f; font-weight: 600; text-align: left; margin: 0.25rem 0;">${text}</p>
            <button class="btn btn-secondary btn-xs" id="btn-close-help" style="width: 100%; padding: 0.4rem; font-weight: 700; margin-top: 0.25rem;">Cerrar</button>
          </div>
        `;
        document.body.appendChild(helpOverlay);
        helpOverlay.querySelector('#btn-close-help').addEventListener('click', () => helpOverlay.remove());
        helpOverlay.addEventListener('click', () => helpOverlay.remove());
      });
    });
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

