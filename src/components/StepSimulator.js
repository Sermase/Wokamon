// Wokamon Evolucionado - Home screen, step sync and day controls

import store from '../utils/state.js';
import { renderWokamonSVG } from './WokamonRenderer.js';

const DAILY_FREE_LIMIT = 10000;
const DAILY_HEALTH_GOAL = 5000;
const NORMAL_STEP_GRANT = 100;
const FEED_COST = 150;
const TRAIN_COST = 300;
const STEP_SYNC_STORAGE_KEY = 'wokamon.mobileStepSync';

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

function getStatusIcon(status) {
  const icons = {
    happy: ':)',
    depressed: ':(',
    starving: '!',
    sick: '+',
    dead: 'x'
  };
  return icons[status] || ':)';
}

function getFeaturedWokamon(wokamons) {
  const living = wokamons.filter(w => w.status !== 'dead');
  const pool = living.length ? living : wokamons;
  if (!pool.length) return null;

  return [...pool].sort((a, b) => {
    const favoriteScore = Number(Boolean(b.isFavorite || b.favorite)) - Number(Boolean(a.isFavorite || a.favorite));
    if (favoriteScore !== 0) return favoriteScore;
    return (b.level || 0) - (a.level || 0);
  })[0];
}

export class StepSimulator {
  constructor() {
    this.container = null;
    this.isMobileSyncing = false;
    this.syncStatus = 'Pulsa para sincronizar pasos automáticamente.';
    this.lastDetectedStepAt = 0;
    this.lastMotionMagnitude = null;
    this.boundMotionHandler = (event) => this.handleMotion(event);
  }

  init(containerElement) {
    this.container = containerElement;
    store.subscribe(() => this.render());
    this.render();

    this.resumeAutoSyncIfEnabled();
  }

  resumeAutoSyncIfEnabled() {
    if (localStorage.getItem(STEP_SYNC_STORAGE_KEY) === 'enabled') {
      setTimeout(() => this.startMobileStepSync(false), 300);
    }
  }

  async startMobileStepSync(userInitiated = true) {
    if (this.isMobileSyncing) return;

    if (!('DeviceMotionEvent' in window)) {
      this.syncStatus = 'Este dispositivo no expone el sensor de movimiento.';
      this.render();
      return;
    }

    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        if (!userInitiated) {
          this.syncStatus = 'Pulsa sincronizar para dar permiso al sensor.';
          this.render();
          return;
        }

        const permission = await DeviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          this.syncStatus = 'Permiso de movimiento denegado.';
          this.render();
          return;
        }
      }

      window.addEventListener('devicemotion', this.boundMotionHandler);
      this.isMobileSyncing = true;
      this.syncStatus = 'Sincronizando pasos del móvil automáticamente.';
      localStorage.setItem(STEP_SYNC_STORAGE_KEY, 'enabled');
      this.render();
    } catch (error) {
      console.error(error);
      this.syncStatus = 'No se pudo activar el sensor de movimiento.';
      this.render();
    }
  }

  stopMobileStepSync() {
    window.removeEventListener('devicemotion', this.boundMotionHandler);
    this.isMobileSyncing = false;
    this.syncStatus = 'Sincronización automática desactivada.';
    localStorage.removeItem(STEP_SYNC_STORAGE_KEY);
    this.render();
  }

  handleMotion(event) {
    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);
    const delta = this.lastMotionMagnitude === null ? 0 : Math.abs(magnitude - this.lastMotionMagnitude);
    this.lastMotionMagnitude = magnitude;

    const now = Date.now();
    if (delta > 2.2 && now - this.lastDetectedStepAt > 430) {
      this.lastDetectedStepAt = now;
      this.handleStepResult(store.addSteps(1, 'mobile'), false);
    }
  }

  showStepsBubble(amount) {
    const target = this.container?.querySelector('.home-gauge');
    if (!target) return;

    const bubble = document.createElement('div');
    bubble.className = 'steps-bubble animate-float-fade';
    bubble.textContent = `+${amount} pasos`;

    const rect = target.getBoundingClientRect();
    bubble.style.left = `${rect.left + rect.width / 2 + (Math.random() * 40 - 20)}px`;
    bubble.style.top = `${rect.top + rect.height / 3}px`;

    document.body.appendChild(bubble);
    setTimeout(() => bubble.remove(), 1000);
  }

  handleStepResult(result, showBubble = true) {
    if (result.actualAdded > 0 && showBubble) {
      this.showStepsBubble(result.actualAdded);
    }

    if (result.firstChildTriggered) {
      window.dispatchEvent(new CustomEvent('first-child-spawned'));
    }
  }

  render() {
    if (!this.container) return;

    const user = store.getUser();
    const wokamons = store.getWokamons();
    const activeWokamon = getFeaturedWokamon(wokamons);
    const progressPercent = Math.min(100, (user.stepsToday / DAILY_HEALTH_GOAL) * 100);
    const isLimitReached = !user.isPremium && user.stepsToday >= DAILY_FREE_LIMIT;
    const canFeed = activeWokamon && activeWokamon.status !== 'dead' && activeWokamon.hunger < 100 && user.totalEnergy >= FEED_COST;
    const canTrain = activeWokamon && activeWokamon.status !== 'dead' && activeWokamon.hunger < 100 && user.totalEnergy >= TRAIN_COST;
    const hunger = activeWokamon ? Math.round(activeWokamon.hunger ?? 100) : 0;
    const dailyNeed = activeWokamon?.dailyStepNeed || DAILY_HEALTH_GOAL;

    this.container.innerHTML = `
      <section class="home-screen glass-panel">
        <div class="home-resource-pill">
          <div class="resource-item">
            <span class="resource-label">Hoy</span>
            <strong>${user.stepsToday.toLocaleString()}</strong>
            <span class="resource-bar blue-bar"><span style="width: ${progressPercent}%"></span></span>
          </div>
          <div class="resource-item">
            <span class="resource-label">Disponibles</span>
            <strong>${user.totalEnergy.toLocaleString()}</strong>
            <span class="resource-bar orange-bar"><span style="width: ${Math.min(100, (user.totalEnergy / 10000) * 100)}%"></span></span>
          </div>
          <div class="resource-item">
            <span class="resource-label">Cristales</span>
            <strong>${user.crystals.toLocaleString()}</strong>
            <span class="resource-bar purple-bar"><span style="width: ${Math.min(100, (user.crystals / 1000) * 100)}%"></span></span>
          </div>
        </div>

        ${activeWokamon ? `
          <div class="home-wokamon-title">
            <h2>${activeWokamon.name}</h2>
            <span class="home-level-badge">${activeWokamon.level}</span>
          </div>

          <div class="home-stage">
            <div class="home-wokamon-art">${renderWokamonSVG(activeWokamon)}</div>
            <div class="home-mood">
              <span class="mood-face">${getStatusIcon(activeWokamon.status)}</span>
              <strong>${getStatusLabel(activeWokamon.status)}</strong>
            </div>
          </div>
          <div class="home-health-panel">
            <div>
              <span>Hambre</span>
              <strong>${hunger}%</strong>
            </div>
            <span class="health-bar"><span style="width: ${Math.max(0, Math.min(100, hunger))}%"></span></span>
            <small>Necesita ${dailyNeed.toLocaleString()} pasos al día</small>
          </div>
        ` : `
          <div class="home-empty">
            <h2>Tu criadero está vacío</h2>
            <p>Sincroniza o suma tus primeros pasos para atraer a tu primer Wokamon.</p>
          </div>
        `}

        <div class="home-actions-row">
          <button class="btn home-action-btn" id="btn-home-feed" ${!canFeed ? 'disabled' : ''}>
            <strong>${activeWokamon ? `Alimentar a ${activeWokamon.name}` : 'Alimentar'}</strong>
            <span>⚡ ${FEED_COST} pasos</span>
          </button>
          <button class="btn home-action-btn" id="btn-home-train" ${!canTrain ? 'disabled' : ''}>
            <strong>Entrenar</strong>
            <span>⚡ ${TRAIN_COST} pasos</span>
          </button>
        </div>

        <button class="btn btn-primary home-sync-btn" id="btn-mobile-sync">
          ${this.isMobileSyncing ? 'DETENER SINCRONIZACIÓN' : 'SINCRONIZAR PASOS'}
        </button>

        <div class="home-secondary-actions">
          <button class="btn btn-secondary btn-xs" id="btn-step-normal" ${isLimitReached ? 'disabled' : ''}>+${NORMAL_STEP_GRANT} pasos</button>
          <button class="btn btn-secondary btn-xs" id="btn-pass-day">Pasar 1 día</button>
        </div>

        <p class="home-sync-status">${this.syncStatus}</p>
      </section>
    `;

    this.container.querySelector('#btn-mobile-sync').addEventListener('click', () => {
      if (this.isMobileSyncing) {
        this.stopMobileStepSync();
      } else {
        this.startMobileStepSync(true);
      }
    });

    this.container.querySelector('#btn-step-normal').addEventListener('click', () => {
      this.handleStepResult(store.addSteps(NORMAL_STEP_GRANT));
    });

    this.container.querySelector('#btn-pass-day').addEventListener('click', () => {
      if (store.advanceOneDay()) {
        window.dispatchEvent(new CustomEvent('day-passed'));
      }
    });

    const feedBtn = this.container.querySelector('#btn-home-feed');
    if (feedBtn) {
      feedBtn.addEventListener('click', () => {
        if (activeWokamon && store.feedWokamon(activeWokamon.id, FEED_COST)) {
          this.showStepsBubble(-FEED_COST);
        }
      });
    }

    const trainBtn = this.container.querySelector('#btn-home-train');
    if (trainBtn) {
      trainBtn.addEventListener('click', () => {
        if (activeWokamon && store.feedWokamon(activeWokamon.id, TRAIN_COST)) {
          this.showStepsBubble(-TRAIN_COST);
        }
      });
    }
  }

  destroy() {
    this.stopMobileStepSync();
  }
}

