// Wokamon Evolucionado - Egg Painter & Genetics Laboratory Component

import store, { calculatePunnettSquare } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class GeneticsLab {
  constructor() {
    this.container = null;
    this.parentA = null;
    this.parentB = null;
    this.activeSubTab = 'lab'; // lab or dex
    
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
      this.parentA = e.detail.parentA;
      this.parentB = e.detail.parentB;
      this.activeSubTab = 'lab';
      this.render();
    });

    store.subscribe(() => {
      this.render();
    });

    this.render();
  }

  setupCanvas() {
    this.canvas = this.container.querySelector('#egg-paint-canvas');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    
    if (this.canvasBackup) {
      this.ctx.drawImage(this.canvasBackup, 0, 0);
    } else {
      // Set base egg outline shape
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Add default speckled egg pattern
      this.ctx.fillStyle = '#fce4ec';
      for (let i = 0; i < 6; i++) {
        this.ctx.beginPath();
        this.ctx.arc(40 + Math.random() * 70, 40 + Math.random() * 80, 5 + Math.random() * 5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Set drawing hooks
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: ((clientX - rect.left) / rect.width) * this.canvas.width,
        y: ((clientY - rect.top) / rect.height) * this.canvas.height
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const pos = getPos(e);
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      
      this.ctx.lineWidth = this.currentBrushSize;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';

      if (this.isPremiumBrush) {
        // Dynamic Neon Rainbow brush effect
        const hue = (Date.now() / 6) % 360;
        this.ctx.strokeStyle = `hsla(${hue}, 100%, 65%, 0.95)`;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.8)`;
      } else {
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.shadowBlur = 0;
      }

      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    this.canvas.addEventListener('mousedown', startDraw);
    this.canvas.addEventListener('mousemove', draw);
    this.canvas.addEventListener('mouseup', stopDraw);
    this.canvas.addEventListener('mouseleave', stopDraw);

    this.canvas.addEventListener('touchstart', startDraw);
    this.canvas.addEventListener('touchmove', draw);
    this.canvas.addEventListener('touchend', stopDraw);
  }

  // Punnett genetic hybridization mixing formula
  mixGenetics() {
    const parentA = this.parentA;
    const parentB = this.parentB;
    
    // Calls reactive Mendelian Segregation cross
    const childGenetics = {};
    const traits = ['bodyType', 'ears', 'eyes', 'horns', 'wings'];
    const user = store.getUser();

    // Genetic Expressivity from Punnett
    const parentAGen = parentA.genotype || { bodyType: ['R','R'], ears: ['T','T'], eyes: ['n','n'], horns: ['h','h'], wings: ['w','w'] };
    const parentBGen = parentB.genotype || { bodyType: ['b','b'], ears: ['p','p'], eyes: ['F','n'], horns: ['M','h'], wings: ['D','w'] };
    
    // Inherit base colors painted by user on the canvas!
    const drawnColors = this.extractCanvasColors();
    childGenetics.primaryColor = drawnColors.primary;
    childGenetics.bellyColor = drawnColors.bellyColor;
    childGenetics.paintedPattern = 'M 35,65 Q 50,75 65,65';

    return childGenetics;
  }

  extractCanvasColors() {
    if (!this.canvas) return { primary: '#ffe082', bellyColor: '#ffecb3' };
    
    // Sample canvas centers
    try {
      const imgData1 = this.ctx.getImageData(30, 40, 1, 1).data;
      const imgData2 = this.ctx.getImageData(80, 80, 1, 1).data;
      
      const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');

      return {
        primary: rgbToHex(imgData1[0], imgData1[1], imgData1[2]),
        bellyColor: rgbToHex(imgData2[0], imgData2[1], imgData2[2])
      };
    } catch(e) {
      return { primary: '#e57373', bellyColor: '#ff8a80' };
    }
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
            <span>🥚</span> Incubadora y Laboratorio (${eggs.length})
          </button>
          <button class="btn btn-secondary btn-xs flex-center" id="btn-subtab-dex" style="flex: 1; padding: 0.6rem; gap: 0.35rem; font-weight: 700; border-radius: 8px;">
            <span>📖</span> Wokadex y Bitácora
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
      } else if (this.parentA && this.parentB) {
        this.renderPaintMode(subContent);
      } else {
        this.renderIncubatorMode(subContent);
      }
    } else {
      this.renderDexAndLogsMode(subContent);
    }
  }

  // 1. PAINT MODE: Allows painting egg shell
  renderPaintMode(subContentContainer) {
    const user = store.getUser();
    
    subContentContainer.innerHTML = `
      <div class="genetics-lab-card glass-panel animate-slide-in">
        <h2 class="section-title">Laboratorio Genético y Pintado</h2>
        <p class="subtitle">Personaliza la cáscara del huevo acoplado mediante pintura. El color de la cáscara influirá en el color del pelaje del bebé.</p>
        
        <div class="lab-workspace">
          <!-- Paint Canvas side -->
          <div class="canvas-panel">
            <div class="canvas-bounding-box">
              <div class="canvas-mask-egg">
                <canvas id="egg-paint-canvas" width="150" height="200"></canvas>
              </div>
            </div>
            
            <p class="lbl-canvas-hint">¡Desliza tu dedo o arrastra sobre el huevo!</p>
          </div>

          <!-- Color Tool palette -->
          <div class="controls-panel flex-col" style="gap: 1.25rem;">
            <!-- Segmented Selector for simulated walk zone -->
            <div>
              <h3>🚶 Zona de la Caminata (Huella Digital)</h3>
              <div class="walk-zone-selector" style="display: flex; gap: 0.4rem; margin-top: 0.5rem;">
                <button class="btn btn-secondary btn-xs walk-zone-btn ${this.currentWalkZone === 'urbana' ? 'btn-active-goal' : ''}" data-zone="urbana" style="flex: 1; padding: 0.4rem; font-size: 0.7rem; font-weight: 700;">🏙️ Urbana</button>
                <button class="btn btn-secondary btn-xs walk-zone-btn ${this.currentWalkZone === 'parque' ? 'btn-active-goal' : ''}" data-zone="parque" style="flex: 1; padding: 0.4rem; font-size: 0.7rem; font-weight: 700;">🌲 Parque</button>
                <button class="btn btn-secondary btn-xs walk-zone-btn ${this.currentWalkZone === 'costa' ? 'btn-active-goal' : ''}" data-zone="costa" style="flex: 1; padding: 0.4rem; font-size: 0.7rem; font-weight: 700;">🌊 Costa</button>
              </div>
            </div>

            <div>
              <h3>🎨 Selección de Pincel</h3>
              <div class="palette-swatches-grid" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem;">
                <button class="color-swatch swatch-active" data-color="#ffcc00" style="background: #ffcc00;"></button>
                <button class="color-swatch" data-color="#e53935" style="background: #e53935;"></button>
                <button class="color-swatch" data-color="#29b6f6" style="background: #29b6f6;"></button>
                <button class="color-swatch" data-color="#ab47bc" style="background: #ab47bc;"></button>
                <button class="color-swatch" data-color="#3f51b5" style="background: #3f51b5;"></button>
                <button class="color-swatch" data-color="#66bb6a" style="background: #66bb6a;"></button>
                
                ${this.currentWalkZone === 'parque' ? `
                  <button class="color-swatch premium-zone-swatch" data-color="#2e7d32" style="background: #2e7d32; border: 2.5px solid var(--primary-accent);" title="Verde Clorofila 🌲 (Desbloqueo Parque)">🌲</button>
                ` : ''}
                ${this.currentWalkZone === 'costa' ? `
                  <button class="color-swatch premium-zone-swatch" data-color="#00838f" style="background: #00838f; border: 2.5px solid var(--primary-accent);" title="Azul Océano 🌊 (Desbloqueo Costa)">🌊</button>
                ` : ''}

                <!-- Premium Cosmic rainbow brush swatch -->
                <button class="color-swatch ${!user.isPremium ? 'swatch-locked' : ''}" data-color="#neon-rainbow" title="Pincel Cósmico Neón (Premium)">
                  🌈
                </button>
              </div>
            </div>

            <!-- Brush settings -->
            <div>
              <h3>📏 Tamaño de Pincel</h3>
              <input type="range" id="brush-size-slider" min="6" max="30" value="12" style="width:100%; margin-top:0.4rem;">
            </div>

            <div class="parents-breeding-row flex-center" style="gap: 1.5rem; margin-top: 0.25rem;">
              <div class="parent-card text-center" style="flex: 1;">
                <span class="lbl" style="font-size: 0.55rem; color: var(--text-grey); font-weight: 700;">PROCESO EP (TÚ)</span>
                <div class="mini-svg" style="height:45px; display:flex; justify-content:center; align-items:center;">
                  <div style="width:36px; height:36px;">${renderWokamonSVG(this.parentA)}</div>
                </div>
                <h4 style="font-size: 0.72rem; margin: 0.15rem 0;">${this.parentA.name}</h4>
              </div>

              <div class="parent-card text-center" style="flex: 1;">
                <span class="lbl" style="font-size: 0.55rem; color: var(--text-grey); font-weight: 700;">AMIGO</span>
                <div class="mini-svg" style="height:45px; display:flex; justify-content:center; align-items:center;">
                  <div style="width:36px; height:36px;">${renderWokamonSVG(this.parentB)}</div>
                </div>
                <h4 style="font-size: 0.72rem; margin: 0.15rem 0;">${this.parentB.name}</h4>
              </div>
            </div>

            <!-- Punnett Mendelian Probabilities Table -->
            <div class="punnett-probability-box glass-panel-inner pad-md" style="text-align: left; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.03); margin-top: 0.25rem;">
              <h4 style="font-size: 0.75rem; font-weight: 800; color: #fff; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.35rem;">
                🧬 Cruzamiento y Genética Mendeliana
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.65rem;">
                ${(() => {
                  const parentAGen = this.parentA.genotype || { bodyType: ['R','R'], ears: ['T','T'], eyes: ['n','n'], horns: ['h','h'], wings: ['w','w'] };
                  const parentBGen = this.parentB.genotype || { bodyType: ['b','b'], ears: ['p','p'], eyes: ['F','n'], horns: ['M','h'], wings: ['D','w'] };
                  const punnett = calculatePunnettSquare(parentAGen, parentBGen);
                  
                  return Object.keys(punnett).map(trait => {
                    const traitName = trait === 'bodyType' ? 'Cuerpo' : (trait === 'ears' ? 'Orejas' : (trait === 'eyes' ? 'Ojos' : (trait === 'horns' ? 'Cuernos' : 'Alas')));
                    const optionsList = punnett[trait].map(opt => {
                      const percentage = Math.round(opt.chance * 100);
                      return `<span style="font-weight: 700; color: var(--primary-accent);">${opt.name} (${percentage}%)</span>`;
                    }).join(', ');
                    
                    return `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 0.15rem;">
                      <span style="color: var(--text-grey); font-weight: 600;">${traitName}:</span>
                      <span>${optionsList}</span>
                    </div>`;
                  }).join('');
                })()}
              </div>
            </div>

            <div class="probability-box">
              <h4>Meta: <strong class="sparkle-gold">${store.getMatingState().stepsTarget.toLocaleString()} pasos</strong></h4>
              <p>Viabilidad genética del embrión: <strong>${Math.round(store.getMatingState().successChance * 100)}%</strong>.</p>
            </div>

            <button class="btn btn-primary btn-hatch full-width" id="btn-save-painted-egg">
              Colocar en la Incubadora 🥚
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize Canvas drawing tools
    this.setupCanvas();

    // Hook walk zone selector buttons
    this.container.querySelectorAll('.walk-zone-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const zone = btn.dataset.zone;
        if (zone === this.currentWalkZone) return;

        // Save canvas state
        if (this.canvas) {
          this.canvasBackup = document.createElement('canvas');
          this.canvasBackup.width = this.canvas.width;
          this.canvasBackup.height = this.canvas.height;
          const backupCtx = this.canvasBackup.getContext('2d');
          backupCtx.drawImage(this.canvas, 0, 0);
        }

        // Change zone
        this.currentWalkZone = zone;

        // Re-render subContent to update selectors and unlocked palettes
        this.render();
      });
    });

    this.container.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        if (swatch.classList.contains('swatch-locked')) {
          alert("¡Suscripción Premium requerida para desbloquear el pincel cósmico Arcoiris!");
          return;
        }

        this.container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('swatch-active'));
        swatch.classList.add('swatch-active');

        const color = swatch.dataset.color;
        if (color === '#neon-rainbow') {
          this.isPremiumBrush = true;
        } else {
          this.isPremiumBrush = false;
          this.currentColor = color;
        }
      });
    });

    this.container.querySelector('#brush-size-slider').addEventListener('input', (e) => {
      this.currentBrushSize = parseInt(e.target.value);
    });

    this.container.querySelector('#btn-save-painted-egg').addEventListener('click', () => {
      const childGenetics = this.mixGenetics();
      
      // Store completed Egg in incubator!
      store.addMatedEggToIncubator(childGenetics);
      
      // Reset paint variables
      this.parentA = null;
      this.parentB = null;
      this.canvasBackup = null; // Clear backup canvas
      
      this.render();

      alert("¡Huevo acoplado colocado con éxito! Ahora descansa en tu Incubadora. Asigna un cuidador para mantenerlo caliente y eclosionarlo.");
    });
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
          <div class="dna-double-helix animate-pulse">🧬</div>
          <h2 class="section-title">Establo de Incubación (Incubadora)</h2>
          <p class="subtitle max-width-md">No tienes huevos incubando. Completa un <strong>Ritual NFC ("La Chispa")</strong> con un amigo en el criadero, pinta el huevo y mándalo aquí para iniciar su gestación de 15 días.</p>
        </div>
      `;
      return;
    }

    subContentContainer.innerHTML = `
      <div class="genetics-lab-card glass-panel flex-col" style="gap: 1.5rem;">
        <div>
          <h2 class="section-title">Establo de Incubación (Incubadora)</h2>
          <p class="subtitle">Cuidar un huevo es un proceso lento (15 días de gestación). Para incubar un huevo: inyecta pasos directamente (si no tienes criaturas), o <strong>asigna un Wokamon Adulto</strong> como cuidador (¡Alimentar al cuidador le dará calor instantáneo al huevo!).</p>
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
                      <span>Período de Gestación:</span>
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
                            🐢 ${w.name} (Nivel ${w.level})
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
                      ¡ECLOSIONAR HUEVO! 🐣
                    </button>
                  ` : `
                    <div style="display: flex; gap: 0.4rem; width: 100%;">
                      <button class="btn btn-secondary btn-gift-egg-action" data-id="${egg.id}" style="flex: 1;" title="Regalar Huevo a Amigo">Regalar Huevo 🎁</button>
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
                <div class="gift-giftbox animate-bounce-slow">🎁</div>
                <h3>Huevo Genético Listo</h3>
                <p class="subtitle">Se ha empaquetado el Huevo Gen ${egg.generation} en un código de regalo. Se ha retirado de tu incubadora y has ganado <strong class="sparkle-gold">+8 Cristales</strong>.</p>
                
                <p class="lbl-info">Copia este código y envíaselo a tu amigo para que lo adopte en su incubadora:</p>
                
                <div class="gift-code-box">
                  <textarea readonly id="gift-code-text">${base64Code}</textarea>
                </div>

                <div class="gift-actions-row flex-center">
                  <button class="btn btn-primary" id="btn-copy-code">Copiar Código</button>
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
              copyBtn.textContent = '¡Copiado!';
              copyBtn.classList.add('btn-active-glow');
              setTimeout(() => {
                copyBtn.textContent = 'Copiar Código';
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
          <div style="font-size: 3.5rem; margin-bottom: 0.5rem; filter: grayscale(1);">💔</div>
          <h2 style="color: #ff5252; font-weight: 800;">¡El Cascarón se Rompió Vacío!</h2>
          
          <p class="subtitle max-width-md" style="margin: 0.5rem 0 1.25rem 0; line-height: 1.4;">
            La caminata gestacional elegida era demasiado corta, lo que redujo la viabilidad biológica del embrión. El cascarón se ha roto vacío y no ha nacido ninguna criatura.
          </p>
          
          <p style="font-size: 0.75rem; color: var(--text-grey); margin-bottom: 1.25rem;">
            ¡No te preocupes! Tus Wokamons cuidadores están a salvo. Te otorgamos cristales de consolación:
          </p>

          <div class="consolation-prize-badge glass-panel-inner text-center animate-bounce-slow" style="display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem 1.5rem; border-radius: 12px; border: 1.5px solid #ffd54f;">
            <span style="font-size: 1.5rem;">💎</span>
            <span style="font-weight: 800; font-size: 1.1rem; color: #ffd54f;">+15 Cristales</span>
          </div>

          <button class="btn btn-secondary full-width" id="btn-close-failed-reveal" style="margin-top: 1.5rem; padding: 0.75rem;">
            Limpiar el Nido y Reintentar 🍃
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
        <div class="confetti-effect">🎉 ✨ 🎈</div>
        
        <div class="baby-svg" style="height: 110px; width: 110px; margin-bottom: 0.75rem; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); border-radius: 50%; padding: 0.5rem; border: 1px solid rgba(255,255,255,0.05);">
          <div style="width: 80px; height: 80px;">${renderWokamonSVG(this.hatchedBaby)}</div>
        </div>
        
        <h2>¡Tu Wokamon ha nacido!</h2>
        <p class="subtitle text-center" style="max-width: 350px; font-size: 0.75rem; line-height: 1.4; margin: 0.5rem 0 1rem 0;">
          ¡Precioso! Ha nacido un Wokamon en la etapa de <strong>Niño</strong>. Ha heredado tu diseño de color y una mezcla de genes única.
        </p>

        <!-- Phenotypic genetics indicators -->
        <div class="hatched-traits flex-col glass-panel-inner" style="width: 100%; gap: 0.25rem; font-size: 0.68rem; text-align: left; padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 1.25rem; background: rgba(0,0,0,0.15);">
          <span style="font-size: 0.6rem; color: var(--primary-accent); font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 0.2rem;">🧬 CARACTERÍSTICAS EXPRESADAS (FENOTIPO)</span>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem;">
            <span>• Cuerpo: <strong>${this.hatchedBaby.genetics.bodyType}</strong></span>
            <span>• Orejas: <strong>${this.hatchedBaby.genetics.ears}</strong></span>
            <span>• Ojos: <strong>${this.hatchedBaby.genetics.eyes}</strong></span>
            <span>• Cuernos: <strong>${this.hatchedBaby.genetics.horns}</strong></span>
            <span>• Alas: <strong>${this.hatchedBaby.genetics.wings}</strong></span>
            <span>• Variabilidad: <strong style="color: var(--primary-accent);">${this.hatchedBaby.heterozygosity}%</strong></span>
          </div>
        </div>

        <div class="name-entry-form flex-col" style="width: 100%; gap: 0.4rem; text-align: left;">
          <label for="baby-name-input" style="font-size: 0.65rem; font-weight: 700; color: var(--text-grey); letter-spacing: 0.5px;">NOMBRA A TU NUEVO WOKAMON:</label>
          <input type="text" id="baby-name-input" placeholder="Ej: Chispitas" value="${this.hatchedBaby.name}" style="width: 100%; background: rgba(0,0,0,0.3); border: 1.5px solid rgba(255,255,255,0.06); border-radius: 8px; color: #fff; padding: 0.6rem; font-size: 0.8rem;">
        </div>

        <button class="btn btn-primary full-width" id="btn-save-baby" style="margin-top: 1.25rem; padding: 0.75rem; font-weight: 700;">
          Llevar al Criadero ❤️
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
                📖 Colección de Rasgos Wokadex
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
              const locusLabel = locus === 'bodyType' ? '🧬 TIPO DE CUERPO' : (locus === 'ears' ? '🐰 OREJAS' : (locus === 'eyes' ? '👀 OJOS' : (locus === 'horns' ? '⚡ CUERNOS' : '👼 ALAS')));
              
              return `
                <div class="dex-locus-block">
                  <h4 style="font-size: 0.65rem; color: var(--primary-accent); font-weight: 800; margin-bottom: 0.5rem; letter-spacing: 0.5px;">${locusLabel}</h4>
                  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem;">
                    ${allTraits[locus].map(name => {
                      const unlocked = isTraitUnlocked(locus, name);
                      const isPremium = name === 'fire' || name === 'neon' || name === 'dragon';
                      
                      let label = name.toUpperCase();
                      if (name === 'none') label = 'NINGUNO';
                      
                      return `
                        <div style="padding: 0.6rem; border-radius: 8px; border: 1px solid ${unlocked ? (isPremium ? 'rgba(230,81,0,0.3)' : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.02)'}; background: ${unlocked ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)'}; text-align: center; position: relative; transition: all 0.2s;">
                          ${!unlocked ? `
                            <span style="font-size: 1.2rem; display: block; opacity: 0.25; filter: blur(1px);">🔒</span>
                            <span style="font-size: 0.55rem; font-weight: 700; color: rgba(255,255,255,0.15); display: block;">POR DESCUBRIR</span>
                          ` : `
                            <span style="font-size: 1.2rem; display: block;">${isPremium ? '💎' : '🧬'}</span>
                            <span style="font-size: 0.65rem; font-weight: 800; color: ${isPremium ? '#ffb74d' : '#fff'}; display: block;">${label}</span>
                            <span style="font-size: 0.5rem; color: var(--text-grey); display: block; text-transform: capitalize;">${isPremium ? 'Rasgo Premium' : 'Rasgo Común'}</span>
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

        <!-- Bitácora de Actividades (Activity Logs) -->
        <div class="glass-panel" style="padding: 1.5rem;">
          <h3 style="font-weight: 800; color: #fff; font-size: 1.1rem; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.25rem;">
            📜 Bitácora de Actividades del Criadero
          </h3>
          <p class="subtitle" style="font-size: 0.72rem; color: var(--text-grey); margin-bottom: 1rem;">Registro histórico de tus caminatas, apareamientos, eclosiones y cuidados de salud.</p>
          
          <div class="logs-timeline" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; padding-right: 0.5rem; background: rgba(0,0,0,0.15); padding: 0.75rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.03);">
            ${logs.length === 0 ? `
              <div style="text-align: center; color: var(--text-grey); padding: 1.5rem 0; font-size: 0.75rem;">
                No hay registros aún. ¡Simula caminar, alimenta a tu criatura o haz un cruce!
              </div>
            ` : logs.map(log => {
              let icon = '📢';
              if (log.type === 'WALK') icon = '🔋';
              else if (log.type === 'FEED') icon = '🍖';
              else if (log.type === 'BREED') icon = '🧬';
              else if (log.type === 'HATCH') icon = '🐣';
              else if (log.type === 'GIFT') icon = '🎁';
              else if (log.type === 'CLAIM') icon = '✨';
              else if (log.type === 'SHOP_BUY') icon = '💎';
              
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
