// Wokamon Evolucionado - Main Entry Point and Orchestrator

import store from './utils/state.js';
import { StepSimulator } from './components/StepSimulator.js';
import { StableManager } from './components/StableManager.js';
import { MatingRitual } from './components/MatingRitual.js';
import { GeneticsLab } from './components/GeneticsLab.js';
import { StatsDashboard } from './components/StatsDashboard.js';
import { Capacitor } from '@capacitor/core';

// Import CSS (Vite automatically bundles this)
import './style.css';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Components
  const stepSim = new StepSimulator();
  const stableMgr = new StableManager();
  const matingRitual = new MatingRitual();
  const incubator = new GeneticsLab({ mode: 'incubator' });
  const wokadex = new GeneticsLab({ mode: 'dex' });
  const statsDashboard = new StatsDashboard();

  stepSim.init(document.getElementById('step-simulator-container'));
  stableMgr.init(document.getElementById('stable-manager-container'));
  matingRitual.init(document.getElementById('mating-ritual-container'));
  incubator.init(document.getElementById('incubator-container'));
  wokadex.init(document.getElementById('wokadex-container'));
  statsDashboard.init(document.getElementById('stats-dashboard-container'));

  let dailyCareCheckRunning = false;
  const runDailyCareCheck = () => {
    if (dailyCareCheckRunning || !store.currentUser || store.loadState().isLoading) return;
    dailyCareCheckRunning = true;
    const result = store.settleDailyCareIfNeeded();
    if (result.settled) {
      showToastNotification(`Reparto diario aplicado: ${result.daysAdvanced} día${result.daysAdvanced === 1 ? '' : 's'}.`);
    }
    dailyCareCheckRunning = false;
  };

  const resumeStepSyncAndCare = () => {
    stepSim.resumeAutoSyncIfEnabled();
    runDailyCareCheck();
  };

  // 2. Global Header Stat Subscriptions & Authentication Monitor
  const checkAuthAndRender = () => {
    const currentUser = store.currentUser;
    const authOverlay = document.getElementById('auth-overlay-modal');
    
    if (!currentUser) {
      if (!authOverlay) {
        createAuthOverlayDOM();
      }
    } else {
      if (authOverlay) {
        authOverlay.remove();
      }
    }
  };

  store.subscribe((state) => {
    updateHeaderStats(state);
    checkAuthAndRender();
    setTimeout(runDailyCareCheck, 0);
  });
  
  // Initial check and draw
  checkAuthAndRender();
  updateHeaderStats(store.loadState());
  runDailyCareCheck();
  setInterval(runDailyCareCheck, 60000);
  window.addEventListener('focus', resumeStepSyncAndCare);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeStepSyncAndCare();
  });

  // 3. Tab Navigation Controller
  const navTabs = document.querySelectorAll('.nav-tab');
  const panels = document.querySelectorAll('.panel-section');

  const switchTab = (targetPanelId, activeTabButton) => {
    // Progressive enhancement: View Transitions API for gorgeous smooth shifts
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        applyTabChangeDOM(targetPanelId, activeTabButton);
      });
    } else {
      applyTabChangeDOM(targetPanelId, activeTabButton);
    }
  };

  const applyTabChangeDOM = (targetPanelId, activeTabButton) => {
    // Toggle Tab Buttons
    navTabs.forEach(t => t.classList.remove('active-tab'));
    activeTabButton.classList.add('active-tab');

    // Toggle Panels
    panels.forEach(p => {
      if (p.id === targetPanelId) {
        p.classList.add('active-panel');
      } else {
        p.classList.remove('active-panel');
      }
    });
  };

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetPanel = tab.dataset.target;
      switchTab(targetPanel, tab);
    });
  });

  // 4. Custom Mating Completion Redirect Hook
  // When NFC completes, we automatically direct the player to the Genetic Incubator Canvas panel!
  window.addEventListener('mating-completed', (e) => {
    const labTab = document.getElementById('nav-tab-incubator');
    const labPanelId = 'panel-incubator';
    
    // Switch view automatically
    switchTab(labPanelId, labTab);

    // Prompt user with a floating notification
    showToastNotification(`Huevo creado: genética de ${e.detail.parentA.name} y ${e.detail.parentB.name} enviada a la incubadora.`);
  });

  // 4.5. First Walk Wokamon Spawn Celebration Modal
  window.addEventListener('first-child-spawned', () => {
    showToastNotification("Milagro: un Wokamon Niño ('Woki Bebé') ha aparecido atraído por tus pasos. Aliméntalo en el criadero.");
    
    // Celebratory Modal Popup
    const overlay = document.createElement('div');
    overlay.className = 'payment-overlay';
    overlay.innerHTML = `
      <div class="gift-modal glass-panel pad-lg text-center flex-center flex-col animate-bounce-slow" style="border: 2px solid var(--primary-accent); max-width: 340px;">
        <div style="font-size: 3.5rem; margin-bottom: 0.5rem; filter: drop-shadow(0 0 10px rgba(0,172,193,0.5));">W</div>
        <h2 style="font-weight: 800; color: #fff; margin-bottom: 0.5rem;">¡Un Wokamon ha llegado!</h2>
        <p class="subtitle" style="max-width: 320px; line-height: 1.4; margin-bottom: 1.25rem; font-size: 0.8rem;">
          Tus primeros pasos han atraído a una criatura recién nacida en la etapa de <strong>Niño</strong>: <strong style="color: var(--primary-accent);">Woki Bebé</strong>.
        </p>
        <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 0.75rem; font-size: 0.72rem; border: 1.5px solid rgba(255,255,255,0.05); margin-bottom: 1.25rem; text-align: left; line-height: 1.4;">
          Alimentarlo le da energía, cristales y le permite crecer hasta ser Adulto para poder aparearse.
        </div>
        <button class="btn btn-primary" id="btn-close-first-spawn" style="width: 100%; padding: 0.75rem;">¡A cuidarlo!</button>
      </div>
    `;
    document.body.appendChild(overlay);

    // Chime Sound!
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(330, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}

    overlay.querySelector('#btn-close-first-spawn').addEventListener('click', () => {
      overlay.remove();
    });
  });

  window.addEventListener('day-passed', () => {
    showToastNotification('Ha pasado 1 día completo en el criadero.');
  });

  // 5. Lifecycle
  // El tiempo ya no avanza en segundo plano. Se controla desde el botón "Pasar 1 día".

  // 6. Debug & Reset Actions
  const resetBtn = document.getElementById('btn-debug-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const confirmReset = confirm('¿Quieres borrar todos tus Wokamon, la suscripción premium y reiniciar el criadero?');
      if (confirmReset) {
        store.resetAll();
        showToastNotification('Prototipo restablecido a valores de fábrica.');
      }
    });
  }
});

// Helper: Real-time Header Statistics updates
function updateHeaderStats(state) {
  const user = state.user;
  
  const stepsNode = document.querySelector('#header-stat-steps .val');
  const energyNode = document.querySelector('#header-stat-energy .val');
  const crystalsNode = document.querySelector('#header-stat-crystals .val');
  const premiumIndicator = document.getElementById('header-premium-indicator');
  const usernameDisplay = document.getElementById('header-username-display');

  if (stepsNode) {
    stepsNode.textContent = user.isPremium
      ? user.stepsToday.toLocaleString() + ' (sin límite)'
      : user.stepsToday.toLocaleString() + ' / 10.000';
  }
  
  if (energyNode) {
    energyNode.textContent = user.totalEnergy.toLocaleString();
  }

  if (crystalsNode) {
    crystalsNode.textContent = user.crystals.toLocaleString();
  }

  if (premiumIndicator) {
    if (user.isPremium) {
      premiumIndicator.textContent = 'PREMIUM';
      premiumIndicator.className = 'header-premium-indicator premium';
    } else {
      premiumIndicator.textContent = 'FREE';
      premiumIndicator.className = 'header-premium-indicator free';
    }
  }

  if (usernameDisplay) {
    if (store.currentUser) {
      const avatar = store.currentUserPhoto
        ? `<img src="${store.currentUserPhoto}" alt="" style="width: 18px; height: 18px; border-radius: 999px; vertical-align: middle; margin-right: 0.35rem;">`
        : '';
      usernameDisplay.innerHTML = `${avatar}Cuenta: <strong>${store.currentUser}</strong> <span id="btn-header-signout" style="color: #ff5252; cursor: pointer; margin-left: 0.75rem; text-decoration: underline; font-weight: 400;">[Salir]</span>`;
      usernameDisplay.style.display = 'block';
      
      const signOutBtn = usernameDisplay.querySelector('#btn-header-signout');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
          store.signOut();
        });
      }
    } else {
      usernameDisplay.style.display = 'none';
    }
  }
}

// Helper: Custom glassmorphic authentication overlay creator
function createAuthOverlayDOM() {
  if (document.getElementById('auth-overlay-modal')) return;

  const overlay = document.createElement('div');
  overlay.id = 'auth-overlay-modal';
  overlay.className = 'payment-overlay';
  overlay.style.zIndex = '3000';
  
  const isAndroidNative = Capacitor.getPlatform() === 'android';

  overlay.innerHTML = `
    <div class="auth-panel glass-panel pad-lg text-center flex-center flex-col animate-slide-in" style="max-width: 380px; width: 90%; gap: 1.25rem; background: rgba(255, 255, 255, 0.95); border: 2px solid var(--primary-accent); box-shadow: 0 10px 40px rgba(0, 77, 64, 0.15);">
      <div class="header-logo" style="font-size: 3rem; margin-bottom: -0.25rem;">W</div>
      <h2 style="font-weight: 800; color: var(--text-white);">Wokamon Evolved</h2>
      <p class="subtitle" style="font-size: 0.75rem; margin-bottom: 0.5rem; color: var(--text-grey);">Crea o ingresa a tu criadero sincronizado en Firebase.</p>

      <button class="btn btn-secondary" id="btn-auth-google" style="width: 100%; padding: 0.72rem; font-weight: 800; background: #fff; color: #243447; border: 1.5px solid rgba(27,42,74,0.15); box-shadow: 0 8px 18px rgba(27,42,74,0.08);">G Continuar con Google</button>
      ${isAndroidNative ? `<button class="btn btn-secondary" id="btn-auth-playgames" style="width: 100%; padding: 0.62rem; font-weight: 700; background: rgba(76,175,80,0.12); color: #1b5e20; border: 1.5px solid rgba(76,175,80,0.25);">Continuar con Google Play Games</button>` : ''}

      <div style="width: 100%; display: flex; align-items: center; gap: 0.6rem; color: var(--text-grey); font-size: 0.68rem; font-weight: 700;">
        <span style="height: 1px; flex: 1; background: rgba(0, 131, 143, 0.18);"></span>
        <span>o usa email</span>
        <span style="height: 1px; flex: 1; background: rgba(0, 131, 143, 0.18);"></span>
      </div>
      
      <div class="auth-tabs" style="display: flex; width: 100%; gap: 0.5rem; background: rgba(0, 131, 143, 0.05); padding: 0.25rem; border-radius: 8px; border: 1px solid rgba(0, 131, 143, 0.15);">
        <button class="btn btn-secondary btn-xs" id="auth-tab-signin" style="flex: 1; padding: 0.4rem; font-size: 0.75rem;">Iniciar sesión</button>
        <button class="btn btn-secondary btn-xs" id="auth-tab-signup" style="flex: 1; padding: 0.4rem; font-size: 0.75rem;">Registrar Cuenta</button>
      </div>

      <div class="auth-form flex-col" style="width: 100%; gap: 0.75rem; text-align: left;">
        <div class="input-group">
          <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-grey); display: block; margin-bottom: 0.25rem; letter-spacing: 0.5px;">EMAIL O USUARIO</label>
          <input type="text" id="auth-username" placeholder="tu@email.com o Juan_Gamer" autocomplete="email" style="width: 100%; background: rgba(255, 255, 255, 0.75); border: 1.5px solid rgba(0, 131, 143, 0.2); border-radius: 8px; color: var(--text-white); padding: 0.6rem; font-size: 0.8rem; outline: none; transition: all 0.25s;">
        </div>
        
        <div class="input-group">
          <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-grey); display: block; margin-bottom: 0.25rem; letter-spacing: 0.5px;">CONTRASEÑA</label>
          <input type="password" id="auth-password" placeholder="Contraseña" autocomplete="current-password" style="width: 100%; background: rgba(255, 255, 255, 0.75); border: 1.5px solid rgba(0, 131, 143, 0.2); border-radius: 8px; color: var(--text-white); padding: 0.6rem; font-size: 0.8rem; outline: none; transition: all 0.25s;">
        </div>
        
        <div class="error-msg" id="auth-error-msg" style="color: #ff5252; font-size: 0.7rem; font-weight: 600; display: none;"></div>
      </div>

      <button class="btn btn-primary" id="btn-auth-submit" style="width: 100%; padding: 0.75rem; font-weight: 700;">Entrar al criadero</button>
    </div>
  `;
  
  document.body.appendChild(overlay);

  const signinTab = overlay.querySelector('#auth-tab-signin');
  const signupTab = overlay.querySelector('#auth-tab-signup');
  const submitBtn = overlay.querySelector('#btn-auth-submit');
  const googleBtn = overlay.querySelector('#btn-auth-google');
  const playGamesBtn = overlay.querySelector('#btn-auth-playgames');
  const errorMsg = overlay.querySelector('#auth-error-msg');
  
  let mode = 'signin';

  const updateTabStyles = () => {
    if (mode === 'signin') {
      signinTab.style.background = 'var(--primary-accent)';
      signinTab.style.color = '#fff';
      signinTab.style.fontWeight = '700';
      signinTab.style.borderColor = 'var(--primary-accent)';

      signupTab.style.background = 'transparent';
      signupTab.style.color = 'var(--text-grey)';
      signupTab.style.fontWeight = '400';
      signupTab.style.borderColor = 'rgba(255,255,255,0.05)';
    } else {
      signupTab.style.background = 'var(--primary-accent)';
      signupTab.style.color = '#fff';
      signupTab.style.fontWeight = '700';
      signupTab.style.borderColor = 'var(--primary-accent)';

      signinTab.style.background = 'transparent';
      signinTab.style.color = 'var(--text-grey)';
      signinTab.style.fontWeight = '400';
      signinTab.style.borderColor = 'rgba(255,255,255,0.05)';
    }
  };

  const switchMode = (newMode) => {
    mode = newMode;
    errorMsg.style.display = 'none';
    if (mode === 'signin') {
      submitBtn.textContent = 'Entrar al criadero';
    } else {
      submitBtn.textContent = 'Crear cuenta y entrar';
    }
    updateTabStyles();
  };

  signinTab.addEventListener('click', () => switchMode('signin'));
  signupTab.addEventListener('click', () => switchMode('signup'));

  // Initial styles
  updateTabStyles();

  const runProviderSignIn = async (button, action, successLabel) => {
    if (!button) return;
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Conectando con Firebase...';
    submitBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      const res = await action();
      if (res.success) {
        overlay.remove();
        showToastNotification(successLabel);
      } else {
        errorMsg.textContent = res.message;
        errorMsg.style.display = 'block';
        button.disabled = false;
        submitBtn.disabled = false;
        button.textContent = originalText;
      }
    } catch (err) {
      console.error(err);
      errorMsg.textContent = 'No se pudo conectar con el proveedor.';
      errorMsg.style.display = 'block';
      button.disabled = false;
      submitBtn.disabled = false;
      button.textContent = originalText;
    }
  };

  googleBtn.addEventListener('click', () => {
    runProviderSignIn(googleBtn, () => store.signInWithGoogle(), 'Criadero cargado con Google.');
  });

  if (playGamesBtn) {
    playGamesBtn.addEventListener('click', () => {
      runProviderSignIn(playGamesBtn, () => store.signInWithPlayGames(), 'Criadero cargado con Google Play Games.');
    });
  }

  submitBtn.addEventListener('click', async () => {
    const username = overlay.querySelector('#auth-username').value.trim();
    const password = overlay.querySelector('#auth-password').value.trim();
    
    if (!username || !password) {
      errorMsg.textContent = 'Por favor ingresa usuario y contraseña.';
      errorMsg.style.display = 'block';
      return;
    }

    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Conectando con la nube...';
    errorMsg.style.display = 'none';

    try {
      let res;
      if (mode === 'signin') {
        res = await store.signIn(username, password);
      } else {
        res = await store.signUp(username, password);
      }

      if (res.success) {
        overlay.remove();
        showToastNotification(`¡Criadero de ${username} cargado con éxito!`);
        
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch(e) {}
      } else {
        errorMsg.textContent = res.message;
        errorMsg.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    } catch(err) {
      console.error(err);
      errorMsg.textContent = 'Error de red o conexión con el servidor. Reintenta.';
      errorMsg.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// Add supplementary CSS variables/styles for toast bubbles dynamically
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  #toast-notification-root {
    position: fixed;
    bottom: 24px;
    right: 24px;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    z-index: 2000;
    max-width: 320px;
    pointer-events: none;
  }
  .toast-bubble {
    pointer-events: auto;
    padding: 0.85rem 1.25rem;
    background: rgba(13, 15, 23, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    animation: toast-slide-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
  .toast-content-wrapper {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }
  .toast-icon {
    font-size: 1.1rem;
    flex-shrink: 0;
  }
  .toast-message {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
  }
  .toast-fade-out {
    animation: toast-fade-out-key 0.35s cubic-bezier(0.4, 0, 1, 1) forwards;
  }
  @keyframes toast-slide-in {
    0% { transform: translateY(30px) scale(0.85); opacity: 0; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }
  @keyframes toast-fade-out-key {
    0% { transform: translateX(0) scale(1); opacity: 1; }
    100% { transform: translateX(50px) scale(0.9); opacity: 0; }
  }
`;
document.head.appendChild(styleSheet);


