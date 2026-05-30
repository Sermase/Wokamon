// Wokamon Evolucionado - NFC mating ritual

import store, { getTraitValueLabel } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

export class MatingRitual {
  constructor() {
    this.container = null;
    this.selectedWokamonId = null;
    this.selectedGoal = 5000;
    this.isBumping = false;
  }

  init(containerElement) {
    this.container = containerElement;
    store.subscribe(() => this.render());
    this.render();
  }

  performNfcBump(onComplete) {
    if (this.isBumping) return;
    this.isBumping = true;
    this.playBumpSound();

    const leftPhone = this.container.querySelector('.mock-phone-left');
    const rightPhone = this.container.querySelector('.mock-phone-right');
    const spark = this.container.querySelector('.nfc-spark-overlay');

    leftPhone?.classList.add('nfc-bump-left');
    rightPhone?.classList.add('nfc-bump-right');

    setTimeout(() => {
      spark?.classList.add('spark-active');
      if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
    }, 400);

    setTimeout(() => {
      leftPhone?.classList.remove('nfc-bump-left');
      rightPhone?.classList.remove('nfc-bump-right');
      spark?.classList.remove('spark-active');
      this.isBumping = false;
      onComplete?.();
    }, 1200);
  }

  playBumpSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (error) {
      console.warn('Audio no disponible', error);
    }
  }

  render() {
    if (!this.container) return;

    const livingWokamons = store.getWokamons().filter(w => w.status !== 'dead');
    const adults = livingWokamons; // Relax constraint: allow any living Wokamon (even children) to mate
    const mating = store.getMatingState();

    if (!this.selectedWokamonId && adults.length > 0) {
      this.selectedWokamonId = adults[0].id;
    }

    if (mating.stage === 'idle') this.renderIdle(livingWokamons, adults);
    if (mating.stage === 'paired') this.renderPaired(mating);
    if (mating.stage === 'walking') this.renderWalking(mating);
    if (mating.stage === 'completed') this.renderCompleted(mating);
  }

  renderIdle(livingWokamons, adults) {
    if (livingWokamons.length === 0) {
      this.container.innerHTML = `
        <div class="mating-ritual-card glass-panel empty-mating-state">
          <h2 class="section-title">Ritual NFC: La Chispa</h2>
          <p>No tienes Wokamons vivos para iniciar un cruce.</p>
          <p class="subtitle">Sincroniza pasos en la pantalla principal para atraer a tu primera criatura.</p>
        </div>
      `;
      return;
    }

    if (adults.length === 0) {
      this.container.innerHTML = `
        <div class="mating-ritual-card glass-panel empty-mating-state">
          <h2 class="section-title">Ritual NFC: La Chispa</h2>
          <h3>Tus Wokamons aún son jóvenes</h3>
          <p class="subtitle">Necesitas al menos un Wokamon adulto. Aliméntalo con pasos hasta llegar al nivel 3.</p>
        </div>
      `;
      return;
    }

    const selectedWok = adults.find(w => w.id === this.selectedWokamonId) || adults[0];

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel">
        <h2 class="section-title">Ritual NFC: La Chispa</h2>
        <p class="subtitle">Sincroniza tu Wokamon con el de un amigo y completad una caminata normal para crear un huevo híbrido.</p>

        <div class="mating-selection-grid">
          <div class="wokamon-selector-list flex-col">
            <h4>Elige tu Wokamon</h4>
            <div class="selector-scroll">
              ${adults.map(w => `
                <button class="selector-item ${w.id === selectedWok.id ? 'item-selected' : ''}" data-id="${w.id}">
                  <div class="mini-renderer">${renderWokamonSVG(w)}</div>
                  <div class="selector-item-info">
                    <span class="name">${w.name}</span>
                    <span class="details">Gen. ${w.generation} | Nivel ${w.level}</span>
                  </div>
                </button>
              `).join('')}
            </div>

            <div class="mating-goal-selector-panel">
              <h4>Caminata ritual normal</h4>
              <p class="lbl-info">Objetivo: <strong>${this.selectedGoal.toLocaleString()} pasos</strong>. Se completa con los pasos sincronizados del móvil.</p>
            </div>
          </div>

          <div class="mating-selection-preview glass-panel-inner">
            <div class="preview-svg-wrapper">${renderWokamonSVG(selectedWok)}</div>
            <div class="preview-text-block">
              <h3>${selectedWok.name}</h3>
              <p>Cuerpo: <strong>${getTraitValueLabel(selectedWok.genetics.bodyBase, 'bodyBase')}</strong> | Apéndice: <strong>${getTraitValueLabel(selectedWok.genetics.topAppendage, 'topAppendage')}</strong></p>
              <button class="btn btn-primary btn-spark-start" id="btn-initiate-mating">Buscar pareja NFC</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelectorAll('.selector-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectedWokamonId = item.dataset.id;
        this.render();
      });
    });

    this.container.querySelector('#btn-initiate-mating').addEventListener('click', () => {
      store.startNfcMating(this.selectedWokamonId, this.selectedGoal);
    });
  }

  renderPaired(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel nfc-bump-view">
        <h2 class="section-title">Señal NFC encontrada</h2>
        <p class="subtitle text-center">Choca tu móvil con el de <strong>${mating.partnerName}</strong> para enlazar la caminata.</p>

        ${this.renderPhones(parentA, mating.partnerWokamon, 'Tú', mating.partnerName, 'Sincronizado')}

        <div class="nfc-action-footer">
          <button class="btn btn-secondary" id="btn-cancel-mating">Cancelar</button>
          <button class="btn btn-primary" id="btn-bump-nfc">Chocar móviles</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-cancel-mating').addEventListener('click', () => store.cancelMating());
    this.container.querySelector('#btn-bump-nfc').addEventListener('click', () => {
      this.performNfcBump(() => store.advanceMatingToWalking());
    });
  }

  renderWalking(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    const progressPercent = Math.min(100, (mating.stepsWalked / mating.stepsTarget) * 100);

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel walking-quest-view">
        <h2 class="section-title">Caminata de apareamiento</h2>
        <p class="subtitle text-center">Completad la meta con pasos sincronizados para preparar el huevo híbrido.</p>

        <div class="coop-status-grid">
          <div class="coop-couple-svg">
            <div class="couple-member">${renderWokamonSVG(parentA)}</div>
            <div class="heart-pulse-node">+</div>
            <div class="couple-member">${renderWokamonSVG(mating.partnerWokamon)}</div>
          </div>

          <div class="coop-progress-panel glass-panel-inner">
            <div class="coop-headers">
              <span class="label">Objetivo conjunto</span>
              <span class="steps">${mating.stepsWalked.toLocaleString()} / ${mating.stepsTarget.toLocaleString()} pasos</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
            <div class="sub-alert">Sincroniza pasos desde la pantalla principal para completar la ruta.</div>
          </div>
        </div>

        <div class="nfc-action-footer flex-center">
          <button class="btn btn-danger-outline" id="btn-cancel-mating">Detener caminata</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-cancel-mating').addEventListener('click', () => store.cancelMating());
  }

  renderCompleted(mating) {
    const parentA = store.getWokamons().find(w => w.id === mating.parentAId);
    if (!parentA) return;

    this.container.innerHTML = `
      <div class="mating-ritual-card glass-panel nfc-bump-view">
        <h2 class="section-title">Caminata completada</h2>
        <p class="subtitle text-center">Choca los móviles de nuevo para transferir los genes y crear el huevo.</p>

        ${this.renderPhones(null, null, 'Tú', mating.partnerName, 'Enlace completado')}

        <div class="nfc-action-footer">
          <button class="btn btn-primary full-width" id="btn-final-bump">Fusionar genes</button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-final-bump').addEventListener('click', () => {
      this.performNfcBump(() => {
        const egg = store.addMatedEggToIncubator();
        window.dispatchEvent(new CustomEvent('mating-completed', {
          detail: {
            parentA,
            parentB: mating.partnerWokamon,
            egg
          }
        }));
      });
    });
  }

  renderPhones(leftWokamon, rightWokamon, leftLabel, rightLabel, sparkLabel) {
    return `
      <div class="nfc-simulator-container">
        <div class="nfc-spark-overlay">
          <div class="spark-burst"></div>
          <span class="spark-lbl">${sparkLabel}</span>
        </div>

        <div class="mock-phone mock-phone-left glass-panel-inner">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <span class="phone-lbl">${leftLabel}</span>
            <div class="phone-svg">${leftWokamon ? renderWokamonSVG(leftWokamon) : '<div class="pulse-egg-shadow animate-pulse">Huevo</div>'}</div>
            <span class="phone-wok-name">${leftWokamon?.name || 'Huevo listo'}</span>
          </div>
        </div>

        <div class="nfc-waves">
          <div class="wave wave-1"></div>
          <div class="wave wave-2"></div>
          <div class="wave wave-3"></div>
          <span class="nfc-logo-icon animate-pulse">NFC</span>
        </div>

        <div class="mock-phone mock-phone-right glass-panel-inner">
          <div class="phone-notch"></div>
          <div class="phone-screen">
            <span class="phone-lbl">${rightLabel}</span>
            <div class="phone-svg">${rightWokamon ? renderWokamonSVG(rightWokamon) : '<div class="pulse-egg-shadow animate-pulse">Huevo</div>'}</div>
            <span class="phone-wok-name">${rightWokamon?.name || 'Huevo listo'}</span>
          </div>
        </div>
      </div>
    `;
  }
}
