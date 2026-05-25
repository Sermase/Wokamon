// Wokamon Evolucionado - Step & Energy Simulator Component

import store from '../utils/state.js';

export class StepSimulator {
  constructor() {
    this.container = null;
    this.autoWalkInterval = null;
    this.isAutoWalking = false;
    this.isPaying = false; // For premium mock checkout modal
  }

  init(containerElement) {
    this.container = containerElement;
    
    // Subscribe to state updates
    store.subscribe(() => this.render());
    this.render();
  }

  // Inject a biometric modal simulation for payment
  showMockPaymentModal() {
    if (this.isPaying) return;
    this.isPaying = true;
    
    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.innerHTML = `
      <div class="payment-modal glass-panel">
        <div class="payment-header">
          <div class="payment-app-logo">W</div>
          <h3>Wokamon Premium</h3>
          <p class="payment-price">2,00 € / mes</p>
        </div>
        
        <div class="payment-body">
          <div class="biometric-fingerprint" id="fingerprint-btn">
            <svg viewBox="0 0 24 24" class="fp-icon animate-pulse">
              <path fill="currentColor" d="M12,2A10,10,0,0,0,2,12a9.89,9.89,0,0,0,2.19,6.13l1.42-1.42A7.93,7.93,0,0,1,4,12a8,8,0,0,1,13.66-5.66l1.42-1.42A9.92,9.92,0,0,0,12,2Zm0,4a6,6,0,0,0-6,6,5.92,5.92,0,0,0,.76,2.89l1.47-1.47A3.91,3.91,0,0,1,8,12a4,4,0,0,1,6.83-2.83l1.42-1.42A5.94,5.94,0,0,0,12,6Zm0,4a2,2,0,0,0-2,2,1.93,1.93,0,0,0,.19.83l1.58-1.58A.48.48,0,0,1,12,11a1,1,0,0,1,1,1,.48.48,0,0,1-.08.19l1.58-1.58A1.93,1.93,0,0,0,14,12a2,2,0,0,0-2-2Zm0,4a4,4,0,0,0,.68-.06L14,12.59A2,2,0,0,1,12,13a1,1,0,0,1-.66-.27l-1.42,1.42A3.89,3.89,0,0,0,12,14Zm6.39.29L17,15.71a9.92,9.92,0,0,0,2.19-6.13l-1.42,1.42A7.93,7.93,0,0,1,16,15.71ZM12,18a6,6,0,0,0,2.89-.76l1.47-1.47A3.91,3.91,0,0,1,12,16a4,4,0,0,1-2.83-6.83l-1.42-1.42A5.94,5.94,0,0,0,12,18Zm0,4a10,10,0,0,0,6.13-2.19l-1.42-1.42A7.93,7.93,0,0,1,12,20a8,8,0,0,1-5.66-13.66L4.92,4.92A9.92,9.92,0,0,0,12,22Z" />
            </svg>
            <span class="fp-text">Mantén pulsado para confirmar</span>
          </div>
          
          <div class="payment-success-tick hidden">
            <svg viewBox="0 0 24 24" class="tick-icon">
              <path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M20 6L9 17l-5-5"/>
            </svg>
            <p>¡Suscripción Activada!</p>
          </div>
        </div>
        
        <div class="payment-footer">
          <button class="btn btn-secondary" id="payment-cancel-btn">Cancelar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);

    // Cancel Button Click
    overlay.querySelector('#payment-cancel-btn').addEventListener('click', () => {
      this.isPaying = false;
      overlay.remove();
    });

    // Touch/Hold Fingerprint Simulation
    const fpBtn = overlay.querySelector('#fingerprint-btn');
    const successTick = overlay.querySelector('.payment-success-tick');
    const paymentHeader = overlay.querySelector('.payment-header');
    const footer = overlay.querySelector('.payment-footer');
    
    let touchTimeout;

    const startPaymentAction = () => {
      fpBtn.classList.add('biometric-active');
      touchTimeout = setTimeout(() => {
        // Successful payment simulated!
        fpBtn.classList.add('hidden');
        paymentHeader.classList.add('hidden');
        footer.classList.add('hidden');
        successTick.classList.remove('hidden');
        
        setTimeout(() => {
          store.togglePremium();
          this.isPaying = false;
          overlay.remove();
        }, 1200);
      }, 1500); // 1.5 seconds hold
    };

    const stopPaymentAction = () => {
      fpBtn.classList.remove('biometric-active');
      clearTimeout(touchTimeout);
    };

    // Support both mouse and touch events
    fpBtn.addEventListener('mousedown', startPaymentAction);
    fpBtn.addEventListener('mouseup', stopPaymentAction);
    fpBtn.addEventListener('mouseleave', stopPaymentAction);
    
    fpBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startPaymentAction();
    });
    fpBtn.addEventListener('touchend', stopPaymentAction);
  }

  // Toggle Auto-Walking loop
  toggleAutoWalk() {
    this.isAutoWalking = !this.isAutoWalking;
    
    if (this.isAutoWalking) {
      this.autoWalkInterval = setInterval(() => {
        // Inject 35 steps every 300ms
        const result = store.addSteps(35);
        
        // Show glowing steps float indicator
        if (result.actualAdded > 0) {
          this.showStepsBubble(result.actualAdded);
        }
        if (result.firstChildTriggered) {
          window.dispatchEvent(new CustomEvent('first-child-spawned'));
        }
      }, 300);
    } else {
      clearInterval(this.autoWalkInterval);
    }
    
    this.render();
  }

  // Floating floating number indicator
  showStepsBubble(amount) {
    const bubble = document.createElement('div');
    bubble.className = 'steps-bubble animate-float-fade';
    bubble.textContent = `+${amount} pasos`;
    
    const containerRect = this.container.querySelector('.circular-progress-wrapper').getBoundingClientRect();
    bubble.style.left = `${containerRect.left + containerRect.width / 2 + (Math.random() * 40 - 20)}px`;
    bubble.style.top = `${containerRect.top + containerRect.height / 3}px`;
    
    document.body.appendChild(bubble);
    
    setTimeout(() => {
      bubble.remove();
    }, 1000);
  }

  render() {
    if (!this.container) return;

    const user = store.getUser();
    const limit = user.isPremium ? Infinity : 1500;
    const progressPercent = user.isPremium ? 100 : Math.min(100, (user.stepsToday / limit) * 100);
    
    // Circular Progress SVG stroke values
    // Circumference = 2 * PI * r = 2 * 3.14159 * 40 = 251.2
    const radius = 40;
    const strokeDasharray = 251.2;
    const strokeDashoffset = strokeDasharray - (progressPercent / 100) * strokeDasharray;

    const isLimitReached = !user.isPremium && user.stepsToday >= 1500;

    this.container.innerHTML = `
      <div class="step-dashboard glass-panel">
        <h2 class="section-title">Actividad Física</h2>
        
        <div class="dashboard-grid">
          <!-- Circular Progress Ring -->
          <div class="progress-col">
            <div class="circular-progress-wrapper">
              <svg class="progress-ring" viewBox="0 0 100 100">
                <circle class="progress-ring-bg" cx="50" cy="50" r="${radius}" />
                <circle class="progress-ring-bar ${user.isPremium ? 'premium-glow' : ''}" cx="50" cy="50" r="${radius}" 
                  stroke-dasharray="${strokeDasharray}" 
                  stroke-dashoffset="${strokeDashoffset}" />
              </svg>
              
              <div class="progress-center">
                ${user.isPremium ? `
                  <div class="premium-infinity animate-pulse">
                    <svg viewBox="0 0 24 24" class="infinity-icon">
                      <path fill="currentColor" d="M18.6,8.23a4.7,4.7,0,0,0-5.88.75l-.72.82-.72-.82a4.7,4.7,0,0,0-5.88-.75A4.83,4.83,0,0,0,3.5,12a4.83,4.83,0,0,0,1.9,3.77,4.7,4.7,0,0,0,5.88-.75l.72-.82.72.82a4.7,4.7,0,0,0,5.88.75A4.83,4.83,0,0,0,20.5,12,4.83,4.83,0,0,0,18.6,8.23ZM9.07,13.62a2.62,2.62,0,0,1-3.32.42A2.78,2.78,0,0,1,4.7,12a2.78,2.78,0,0,1,1.05-2,2.62,2.62,0,0,1,3.32.42l1,1.15ZM19.3,12a2.78,2.78,0,0,1-1.05,2A2.62,2.62,0,0,1,14.93,13.62l-1.05-1.2,1-1.15a2.62,2.62,0,0,1,3.32-.42A2.78,2.78,0,0,1,19.3,12Z" />
                    </svg>
                  </div>
                  <span class="step-lbl">Ilimitado</span>
                ` : `
                  <span class="step-count">${user.stepsToday.toLocaleString()}</span>
                  <span class="step-lbl">/ ${limit} pasos</span>
                `}
              </div>
            </div>
            
            <div class="metrics-row">
              <div class="metric">
                <span class="metric-val">${user.totalEnergy}</span>
                <span class="metric-lbl">Energía (EP)</span>
              </div>
              <div class="metric-divider"></div>
              <div class="metric">
                <span class="metric-val">${user.crystals}</span>
                <span class="metric-lbl">Cristales</span>
              </div>
            </div>
          </div>

          <!-- Walking Injection Panel -->
          <div class="controls-col">
            <div class="control-header">
              <h3>Simular Caminata</h3>
              <p class="subtitle">Con vierte tus pasos de la vida real en energía para tus criaturas.</p>
            </div>
            
            <div class="walk-buttons-grid">
              <button class="btn btn-step" id="btn-step-10">
                <span class="btn-primary-text">+10</span>
                <span class="btn-sub-text">Paseo Corto</span>
              </button>
              
              <button class="btn btn-step" id="btn-step-200">
                <span class="btn-primary-text">+200</span>
                <span class="btn-sub-text">Trote Ligero</span>
              </button>
              
              <button class="btn btn-step" id="btn-step-1000" ${isLimitReached ? 'disabled' : ''}>
                <span class="btn-primary-text">+1000</span>
                <span class="btn-sub-text">Entrenamiento</span>
              </button>

              <button class="btn btn-step ${this.isAutoWalking ? 'btn-active-glow' : ''}" id="btn-autowalk">
                <span class="btn-primary-text">${this.isAutoWalking ? 'DETENER' : 'AUTO-CAMINO'}</span>
                <span class="btn-sub-text">${this.isAutoWalking ? 'Caminando...' : 'Piloto Automático'}</span>
              </button>
            </div>

            ${isLimitReached ? `
              <div class="limit-alert">
                <svg viewBox="0 0 24 24" class="alert-icon">
                  <path fill="currentColor" d="M12,2L1,21H23L12,2M12,18A1.5,1.5,0,1,1,13.5,16.5A1.5,1.5,0,0,1,12,18M13,10H11V15H13V10Z"/>
                </svg>
                <span>Has alcanzado el límite diario (1.500 pasos). ¡Hazte Premium para acumular pasos ilimitados!</span>
              </div>
            ` : ''}

            <!-- Subscription Upgrade Card -->
            <div class="subscription-banner glass-panel-inner ${user.isPremium ? 'premium-active-card' : ''}">
              <div class="sub-banner-content">
                <div class="badge-row">
                  ${user.isPremium ? '<span class="premium-badge">PREMIUM ACTIVADO</span>' : '<span class="free-badge">PLAN GRATUITO</span>'}
                </div>
                <h4>${user.isPremium ? 'Acceso Ilimitado' : 'Mejora a Premium (2€/mes)'}</h4>
                <p>${user.isPremium ? 'Tu sudor alimenta a todo tu criadero sin límites.' : 'Sincroniza pasos infinitos y cría un ejército gigante de Wokamons.'}</p>
              </div>
              
              <button class="btn ${user.isPremium ? 'btn-danger-outline' : 'btn-premium'}" id="btn-premium-toggle">
                ${user.isPremium ? 'Desactivar Premium' : 'Activar Premium'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook up Button Listeners
    const handleStepResult = (res) => {
      if (res.actualAdded > 0) {
        this.showStepsBubble(res.actualAdded);
      }
      if (res.firstChildTriggered) {
        window.dispatchEvent(new CustomEvent('first-child-spawned'));
      }
    };

    this.container.querySelector('#btn-step-10').addEventListener('click', () => {
      const res = store.addSteps(10);
      handleStepResult(res);
    });

    this.container.querySelector('#btn-step-200').addEventListener('click', () => {
      const res = store.addSteps(200);
      handleStepResult(res);
    });

    const step1000Btn = this.container.querySelector('#btn-step-1000');
    if (step1000Btn) {
      step1000Btn.addEventListener('click', () => {
        const res = store.addSteps(1000);
        handleStepResult(res);
      });
    }

    this.container.querySelector('#btn-autowalk').addEventListener('click', () => {
      this.toggleAutoWalk();
    });

    this.container.querySelector('#btn-premium-toggle').addEventListener('click', () => {
      if (user.isPremium) {
        // Easily demote back to free
        store.togglePremium();
      } else {
        // Show fingerprint approval
        this.showMockPaymentModal();
      }
    });
  }

  // Cleanup on unmount (safety)
  destroy() {
    if (this.autoWalkInterval) {
      clearInterval(this.autoWalkInterval);
    }
  }
}
