// Wokamon Evolucionado - NFC Mating Ritual ("La Chispa") Simulator Component

import store from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class MatingRitual {
  constructor() {
    this.container = null;
    this.selectedWokamonId = null;
    this.selectedGoal = 5000; // default 5,000 steps
    this.isBumping = false;
  }

  init(containerElement) {
    this.container = containerElement;
    
    // Subscribe to state changes
    store.subscribe(() => this.render());
    this.render();
  }

  // NFC Bump collision animation and sound effect
  performNfcBump(onComplete) {
    if (this.isBumping) return;
    this.isBumping = true;

    // Trigger audio tick
    this.playBumpSound();

    const deviceL = this.container.querySelector('.mock-phone-left');
    const deviceR = this.container.querySelector('.mock-phone-right');
    const spark = this.container.querySelector('.nfc-spark-overlay');

    // Add shaking / translation styles to simulate bumping
    deviceL.classList.add('nfc-bump-left');
    deviceR.classList.add('nfc-bump-right');
    
    setTimeout(() => {
      spark.classList.add('spark-active');
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // Biometric double shake
      }
    }, 400);

    setTimeout(() => {
      deviceL.classList.remove('nfc-bump-left');
      deviceR.classList.remove('nfc-bump-right');
      spark.classList.remove('spark-active');
      this.isBumping = false;
      
      if (onComplete) onComplete();
    }, 1200);
  }

  playBumpSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Synthesize a retro futuristic game sound ("Chispa!")
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Audio synthesis blocked by browser security or not supported', e);
    }
  }

  render() {
    if (!this.container) return;

    const wokamons = store.getWokamons();
    const livingWokamons = wokamons.filter(w => w.status !== 'dead');
    const adults = livingWokamons.filter(w => w.stage === 'Adulto' || w.stage === 'Anciano');
    const mating = store.getMatingState();
    
    // Select first Adult Wokamon by default if none selected
    if (!this.selectedWokamonId && adults.length > 0) {
      this.selectedWokamonId = adults[0].id;
    }

    // Determine layout depending on Mating Stage
    if (mating.stage === 'idle') {
      this.renderIdle(livingWokamons, adults);
    } else if (mating.stage === 'paired') {
      this.renderPaired(mating);
    } else if (mating.stage === 'walking') {
      this.renderWalking(mating);
    } else if (mating.stage === 'completed') {
      this.renderCompleted(mating);
    }
  }

  // 1. IDLE STAGE: Select Parent Wokamon to Mate
  renderIdle(livingWokamons, adults) {
    if (livingWokamons.length === 0) {
      this.container.innerHTML = `
        <div class="mating-ritual-card glass-panel">
          <h2 class="section-title">Ritual NFC ("La Chispa")</h2>
          <div class="empty-mating-state text-center pad-lg flex-center flex-col" style="gap: 0.5rem;">
            <div style="font-size: 3rem;">🐾</div>
            <p>Necesitas tener al menos un Wokamon vivo para cruzarlo.</p>
            <p class="lbl-info">¡Simula dar tus primeros pasos en la pestaña "Actividad Física" para atraer a tu primer Wokamon Niño!</p>
          </div>
        </div>
      `;
      return;
    }

    if (adults.length === 0) {
      this.container.innerHTML = `
        <div class="mating-ritual-card glass-panel">
          <h2 class="section-title">Ritual NFC ("La Chispa")</h2>
          <div class="empty-mating-state text-center pad-lg flex-center flex-col" style="gap: 1rem;">
            <div style="font-size: 3rem;">👶</div>
            <h3>¡Tus Wokamons son muy jóvenes!</h3>
            <p class="subtitle" style="margin-bottom: 0;">Se requieren **dos Wokamons Adultos** para engendrar un huevo viable (uno tuyo y otro de tu amigo).</p>
            <div class="sub-alert" style="max-width: 440px; text-align: left;">
              <span>💡 <strong>Cómo crecer:</strong> Ve al criadero y alimenta a tus <strong>Wokamons Niños</strong> con Energía de Pasos (EP) para subirlos de nivel. Al llegar al <strong>Nivel 3</strong>, ¡evolucionarán en Adultos y podrán aparearse!</span>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const selectedWok = adults.find(w => w.id === this.selectedWokamonId) || adults[0];

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel">
        <h2 class="section-title">Ritual NFC ("La Chispa")</h2>
        <p class="subtitle">Aparea tu criatura con la de un amigo en el mundo real. Chocad los móviles para iniciar una caminata y obtener un huevo híbrido.</p>
        
        <div class="mating-selection-grid">
          <!-- Wokamon selector list -->
          <div class="wokamon-selector-list flex-col" style="gap: 1rem;">
            <div>
              <h4>Selecciona tu Wokamon</h4>
              <div class="selector-scroll">
                ${adults.map(w => `
                  <div class="selector-item ${w.id === this.selectedWokamonId ? 'item-selected' : ''}" data-id="${w.id}">
                    <div class="mini-renderer">${renderWokamonSVG(w)}</div>
                    <div class="selector-item-info">
                      <span class="name">${w.name}</span>
                      <span class="details">Gen. ${w.generation} | Nivel ${w.level}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Route distance goal selector -->
            <div class="mating-goal-selector-panel">
              <h4>Elige la meta de la caminata ritual:</h4>
              <p class="lbl-info" style="margin-top: 0; margin-bottom: 0.5rem;">Caminar más tiempo aumenta las posibilidades de apareamiento exitoso.</p>
              <div class="goal-buttons-flex">
                <button class="btn btn-secondary btn-goal-option ${this.selectedGoal === 2000 ? 'btn-active-goal' : ''}" data-goal="2000">
                  <span class="meters">2k pasos</span>
                  <span class="chance">20% viabilidad</span>
                </button>
                <button class="btn btn-secondary btn-goal-option ${this.selectedGoal === 5000 ? 'btn-active-goal' : ''}" data-goal="5000">
                  <span class="meters">5k pasos</span>
                  <span class="chance">50% viabilidad</span>
                </button>
                <button class="btn btn-secondary btn-goal-option ${this.selectedGoal === 8000 ? 'btn-active-goal' : ''}" data-goal="8000">
                  <span class="meters">8k pasos</span>
                  <span class="chance">80% viabilidad</span>
                </button>
                <button class="btn btn-secondary btn-goal-option ${this.selectedGoal === 10000 ? 'btn-active-goal' : ''}" data-goal="10000">
                  <span class="meters">10k pasos</span>
                  <span class="chance">100% éxito 🔥</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Preview & Start Card -->
          <div class="mating-selection-preview glass-panel-inner">
            <div class="preview-svg-wrapper">
              ${renderWokamonSVG(selectedWok)}
            </div>
            <div class="preview-text-block">
              <h3>${selectedWok.name}</h3>
              <p>Cuerpo: <strong>${selectedWok.genetics.bodyType}</strong> | Orejas: <strong>${selectedWok.genetics.ears}</strong></p>
              <button class="btn btn-primary btn-spark-start" id="btn-initiate-mating">
                <svg viewBox="0 0 24 24" class="sparkle-icon"><path fill="currentColor" d="M12,2A10,10,0,0,0,2,12a10,10,0,0,0,10,10a10,10,0,0,0,10-10A10,10,0,0,0,12,2M12,19A7,7,0,0,1,5,12A7,7,0,0,1,12,5a7,7,0,0,1,7,7A7,7,0,0,1,12,19M12,7l-1.5,4L7,12.5l3.5,1.5l1.5,4l1.5-4L17,12.5L13.5,11L12,7Z"/></svg>
                Buscar Pareja NFC
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook listeners for selector list
    this.container.querySelectorAll('.selector-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedWokamonId = item.dataset.id;
        this.render();
      });
    });

    // Hook listeners for goal options
    this.container.querySelectorAll('.btn-goal-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedGoal = parseInt(btn.dataset.goal);
        this.render();
      });
    });

    this.container.querySelector('#btn-initiate-mating').addEventListener('click', () => {
      store.startNfcMating(this.selectedWokamonId, this.selectedGoal);
    });
  }

  // 2. PAIRED STAGE: Bump devices to initialize walk
  renderPaired(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel nfc-bump-view">
        <h2 class="section-title">Encontrando Señal NFC...</h2>
        <p class="subtitle text-center">¡Señal detectada! Choca tu teléfono con el de <strong>${mating.partnerName}</strong> para sincronizar vuestras caminatas.</p>
        
        <div class="nfc-simulator-container">
          <!-- Spark Overlay -->
          <div class="nfc-spark-overlay">
            <div class="spark-burst"></div>
            <span class="spark-lbl">¡CHISPA! Sincronizado</span>
          </div>

          <!-- Phone Outline Left (You) -->
          <div class="mock-phone mock-phone-left glass-panel-inner">
            <div class="phone-notch"></div>
            <div class="phone-screen">
              <span class="phone-lbl">TÚ</span>
              <div class="phone-svg">${renderWokamonSVG(parentA)}</div>
              <span class="phone-wok-name">${parentA.name}</span>
            </div>
          </div>

          <!-- NFC Wave Rings -->
          <div class="nfc-waves">
            <div class="wave wave-1"></div>
            <div class="wave wave-2"></div>
            <div class="wave wave-3"></div>
            <svg viewBox="0 0 24 24" class="nfc-logo-icon animate-pulse">
              <path fill="currentColor" d="M12,2A10,10,0,0,0,2,12a10,10,0,0,0,10,10a10,10,0,0,0,10-10A10,10,0,0,0,12,2M12,4A8,8,0,0,1,20,12a7.94,7.94,0,0,1-3.66,6.66l-1.42-1.42A5.94,5.94,0,0,0,18,12a6,6,0,0,0-9.66-4.66l-1.42-1.42A7.94,7.94,0,0,1,12,4M12,8A4,4,0,0,1,16,12a3.91,3.91,0,0,1-1.68,3.22l-1.42-1.42A1.91,1.91,0,0,0,14,12a2,2,0,0,0-3.22-1.58L9.36,9A3.91,3.91,0,0,1,12,8M7.94,15.76A5.94,5.94,0,0,0,8,12a6,6,0,0,0-1.66-4.66L4.92,8.76A7.94,7.94,0,0,1,6,12a8,8,0,0,1-1.66,4.66Z" />
            </svg>
          </div>

          <!-- Phone Outline Right (Friend) -->
          <div class="mock-phone mock-phone-right glass-panel-inner">
            <div class="phone-notch"></div>
            <div class="phone-screen">
              <span class="phone-lbl">${mating.partnerName}</span>
              <div class="phone-svg">${renderWokamonSVG(mating.partnerWokamon)}</div>
              <span class="phone-wok-name">${mating.partnerWokamon.name}</span>
            </div>
          </div>
        </div>

        <div class="nfc-action-footer">
          <button class="btn btn-secondary" id="btn-cancel-mating">Cancelar</button>
          <button class="btn btn-primary" id="btn-bump-nfc">¡CHOCAR MÓVILES!</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-cancel-mating').addEventListener('click', () => {
      store.cancelMating();
    });

    this.container.querySelector('#btn-bump-nfc').addEventListener('click', () => {
      this.performNfcBump(() => {
        store.advanceMatingToWalking();
      });
    });
  }

  // 3. WALKING STAGE: Cooperative walk progress tracking
  renderWalking(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    const progressPercent = Math.min(100, (mating.stepsWalked / mating.stepsTarget) * 100);

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel walking-quest-view">
        <h2 class="section-title">Caminata de Apareamiento</h2>
        <p class="subtitle text-center">¡El ritual está en marcha! Caminad juntos en el mundo real para incubar el huevo híbrido.</p>
        
        <div class="coop-status-grid">
          <!-- Couple Render -->
          <div class="coop-couple-svg">
            <div class="couple-member L animate-bounce-slow">${renderWokamonSVG(parentA)}</div>
            <div class="heart-pulse-node">❤️</div>
            <div class="couple-member R animate-bounce-slow" style="animation-delay: 0.5s">${renderWokamonSVG(mating.partnerWokamon)}</div>
          </div>

          <!-- Progress Dashboard -->
          <div class="coop-progress-panel glass-panel-inner">
            <div class="coop-headers">
              <span class="label">OBJETIVO CONJUNTO</span>
              <span class="steps">${mating.stepsWalked.toLocaleString()} / ${mating.stepsTarget.toLocaleString()} pasos</span>
            </div>
            
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            
            <div class="sub-alert">
              <svg viewBox="0 0 24 24" class="info-icon animate-pulse"><path fill="currentColor" d="M11,9H13V7H11V9M12,2A10,10,0,0,0,2,12a10,10,0,0,0,10,10a10,10,0,0,0,10-10A10,10,0,0,0,12,2M12,20a8,8,0,0,1-8-8a8,8,0,0,1,8-8a8,8,0,0,1,8,8a8,8,0,0,1-8,8M11,17H13V11H11V17Z"/></svg>
              <span>¡Simula caminar en la pestaña "Actividad Física" arriba para completar la ruta!</span>
            </div>
          </div>
        </div>

        <div class="nfc-action-footer flex-center">
          <button class="btn btn-danger-outline" id="btn-cancel-mating">Detener Caminata</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-cancel-mating').addEventListener('click', () => {
      store.cancelMating();
    });
  }

  // 4. COMPLETED STAGE: Walking finished, final bump to get egg
  renderCompleted(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel nfc-bump-view">
        <h2 class="section-title">¡Caminata Completada!</h2>
        <p class="subtitle text-center">¡Habéis alcanzado la meta! Chocad los móviles de nuevo por NFC para transferir y consolidar los genes del Huevo.</p>
        
        <div class="nfc-simulator-container">
          <!-- Spark Overlay -->
          <div class="nfc-spark-overlay">
            <div class="spark-burst"></div>
            <span class="spark-lbl">¡ENLACE COMPLETADO!</span>
          </div>

          <!-- Phone Outline Left (You) -->
          <div class="mock-phone mock-phone-left glass-panel-inner">
            <div class="phone-notch"></div>
            <div class="phone-screen flex-center flex-col">
              <span class="phone-lbl">TÚ</span>
              <div class="pulse-egg-shadow animate-pulse">🥚</div>
              <span class="phone-wok-name">¡Huevo Listo!</span>
            </div>
          </div>

          <!-- Sparkle link -->
          <div class="nfc-waves">
            <div class="wave wave-1 gold-wave"></div>
            <div class="wave wave-2 gold-wave"></div>
            <svg viewBox="0 0 24 24" class="nfc-logo-icon gold-wave animate-pulse">
              <path fill="currentColor" d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>

          <!-- Phone Outline Right (Friend) -->
          <div class="mock-phone mock-phone-right glass-panel-inner">
            <div class="phone-notch"></div>
            <div class="phone-screen flex-center flex-col">
              <span class="phone-lbl">${mating.partnerName}</span>
              <div class="pulse-egg-shadow animate-pulse">🥚</div>
              <span class="phone-wok-name">¡Huevo Listo!</span>
            </div>
          </div>
        </div>

        <div class="nfc-action-footer">
          <button class="btn btn-primary full-width" id="btn-final-bump">¡CHOCAR MÓVILES Y FUSIONAR GENES!</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-final-bump').addEventListener('click', () => {
      this.performNfcBump(() => {
        // Trigger event in parent application to show the painting lab!
        const event = new CustomEvent('mating-completed', {
          detail: {
            parentA: parentA,
            parentB: mating.partnerWokamon
          }
        });
        window.dispatchEvent(event);
      });
    });
  }
}
