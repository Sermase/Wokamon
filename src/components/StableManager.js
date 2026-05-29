// Wokamon Evolucionado - Simple nursery list with detail view

import store, { getTraitValueLabel, getWokamonScale } from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

const FEED_COST = 150;

function getStatusLabel(status) {
  const labels = {
    happy: 'Feliz',
    depressed: 'Triste',
    starving: 'Hambriento',
    sick: 'Enfermo',
    dead: 'Fantasma'
  };
  return labels[status] || 'Normal';
}

function getStageClass(stage = '') {
  return stage.toLowerCase().replace('ñ', 'n');
}

function getCareHint(wokamon) {
  if (wokamon.status === 'dead') return 'Este Wokamon vive ahora como recuerdo en el criadero.';
  if (wokamon.status === 'sick') return 'Necesita medicina para recuperarse.';
  if (wokamon.status === 'starving') return 'Necesita pasos para comer cuanto antes.';
  if (wokamon.status === 'depressed') return 'Un paseo y algo de comida le vendrían bien.';
  return 'Está estable y con buena energía.';
}

export class StableManager {
  constructor() {
    this.container = null;
  }

  init(containerElement) {
    this.container = containerElement;
    store.subscribe(() => this.render());
    this.render();
  }

  showDetailModal(wokamon) {
    const user = store.getUser();
    const scale = getWokamonScale(wokamon.genotype);
    const sizeName = scale === 1.25 ? 'Grande' : (scale === 0.85 ? 'Pequeño' : 'Mediano');
    const canFeed = wokamon.status !== 'dead' && user.totalEnergy >= FEED_COST;
    const canCure = wokamon.status !== 'dead' && user.crystals >= 10;

    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.innerHTML = `
      <div class="wokamon-detail-modal glass-panel">
        <button class="detail-close" id="btn-close-detail" aria-label="Cerrar">×</button>

        <div class="detail-hero">
          <div class="detail-art">${renderWokamonSVG(wokamon)}</div>
          <div>
            <span class="eyebrow-label">Detalle Wokamon</span>
            <h2>${wokamon.name}</h2>
            <div class="detail-tags">
              <span class="status-tag tag-${wokamon.status}">${getStatusLabel(wokamon.status)}</span>
              <span class="stage-tag stage-${getStageClass(wokamon.stage)}">${wokamon.stage}</span>
              <span class="level-badge">Nivel ${wokamon.level}</span>
            </div>
            <p class="detail-hint">${getCareHint(wokamon)}</p>
          </div>
        </div>

        <div class="detail-stat-grid">
          <div><span>Edad</span><strong>${Math.floor(wokamon.age)} días</strong></div>
          <div><span>Tamaño</span><strong>${sizeName}</strong></div>
          <div><span>Heterocigosis</span><strong>${wokamon.heterozygosity}%</strong></div>
          <div><span>Generación</span><strong>${wokamon.generation}</strong></div>
        </div>

        <div class="detail-bars">
          ${this.renderBar('Hambre', wokamon.hunger, 'bar-orange')}
          ${this.renderBar('Alegría', wokamon.joy ?? 100, 'bar-pink')}
          ${this.renderBar('Vitalidad', wokamon.vitality ?? 100, 'bar-vitality')}
          ${this.renderBar('Enfermedad', wokamon.disease ?? 0, 'bar-disease')}
          ${this.renderBar('Crecimiento', wokamon.growth, 'bar-blue')}
        </div>

        <div class="detail-traits glass-panel-inner">
          <strong>Rasgos visibles</strong>
          <div>
            <span>Cuerpo: ${getTraitValueLabel(wokamon.genetics.bodyType, 'bodyType')}</span>
            <span>Orejas: ${getTraitValueLabel(wokamon.genetics.ears, 'ears')}</span>
            <span>Ojos: ${getTraitValueLabel(wokamon.genetics.eyes, 'eyes')}</span>
            <span>Cuernos: ${getTraitValueLabel(wokamon.genetics.horns, 'horns')}</span>
            <span>Alas: ${getTraitValueLabel(wokamon.genetics.wings, 'wings')}</span>
          </div>
        </div>

        <div class="detail-actions">
          ${wokamon.status === 'dead' ? `
            <button class="btn btn-danger-outline" id="btn-release-detail">Memorializar</button>
          ` : `
            <button class="btn btn-primary" id="btn-feed-detail" ${!canFeed ? 'disabled' : ''}>Alimentar (-${FEED_COST} pasos)</button>
            <button class="btn btn-secondary" id="btn-cure-detail" ${!canCure ? 'disabled' : ''}>Medicina (-10 cristales)</button>
            <button class="btn btn-danger-outline" id="btn-release-detail">Soltar</button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-close-detail').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
    });

    const feedBtn = overlay.querySelector('#btn-feed-detail');
    if (feedBtn) {
      feedBtn.addEventListener('click', () => {
        store.feedWokamon(wokamon.id, FEED_COST);
        overlay.remove();
      });
    }

    const cureBtn = overlay.querySelector('#btn-cure-detail');
    if (cureBtn) {
      cureBtn.addEventListener('click', () => {
        store.cureWokamon(wokamon.id);
        overlay.remove();
      });
    }

    const releaseBtn = overlay.querySelector('#btn-release-detail');
    if (releaseBtn) {
      releaseBtn.addEventListener('click', () => {
        const label = wokamon.status === 'dead' ? 'memorializar' : 'soltar';
        if (confirm(`¿Quieres ${label} a ${wokamon.name}?`)) {
          store.releaseWokamon(wokamon.id);
          overlay.remove();
        }
      });
    }
  }

  renderBar(label, value, className) {
    const normalized = Math.max(0, Math.min(100, Math.round(value)));
    return `
      <div class="progress-indicator">
        <div class="lbl-row">
          <span>${label}</span>
          <strong>${normalized}%</strong>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill ${className}" style="width: ${normalized}%"></div>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.container) return;

    const wokamons = store.getWokamons();
    const livingCount = wokamons.filter(w => w.status !== 'dead').length;

    this.container.innerHTML = `
      <section class="stable-manager glass-panel" id="stable-view">
        <div class="stable-header-row simple-stable-header">
          <div>
            <h2 class="section-title">Mis Wokamons</h2>
            <p class="subtitle">Pulsa una criatura para ver sus detalles, cuidarla o revisar sus rasgos.</p>
          </div>
          <div class="nursery-badge glass-panel-inner">
            <span class="count">${wokamons.length} en total</span>
            <span class="mult">${livingCount} activos</span>
          </div>
        </div>

        ${wokamons.length === 0 ? `
          <div class="empty-stable-card glass-panel-inner">
            <h3>Tu criadero está vacío</h3>
            <p>Sincroniza pasos en la pantalla principal para atraer a tu primer Wokamon.</p>
          </div>
        ` : `
          <div class="simple-wokamon-list">
            ${wokamons.map((w, index) => {
              const isLarge = index === 0;
              return `
                <button class="simple-wokamon-card ${isLarge ? 'featured' : ''} ${w.status === 'dead' ? 'is-dead' : ''}" data-id="${w.id}">
                  <div class="simple-card-art">${renderWokamonSVG(w)}</div>
                  <div class="simple-card-info">
                    <strong>${w.name}</strong>
                    <span>Nivel ${w.level}</span>
                    <span>${getStatusLabel(w.status)}</span>
                  </div>
                  <span class="simple-level-dot">${w.level}</span>
                </button>
              `;
            }).join('')}
          </div>
        `}
      </section>
    `;

    this.container.querySelectorAll('.simple-wokamon-card').forEach(card => {
      card.addEventListener('click', () => {
        const target = wokamons.find(w => w.id === card.dataset.id);
        if (target) this.showDetailModal(target);
      });
    });
  }
}
