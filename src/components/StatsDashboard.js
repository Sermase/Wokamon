import store from '../utils/state.js';

const HEALTH_GOAL = 5000;

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
}

function buildLastDays(history = [], daysToShow = 7) {
  const byDate = new Map(history.map(item => [item.date, item]));
  const today = new Date();

  return Array.from({ length: daysToShow }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (daysToShow - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const saved = byDate.get(key);

    return {
      date: key,
      label: daysToShow === 30 ? String(date.getDate()) : formatDayLabel(date),
      steps: saved?.steps || 0,
      used: saved?.used || 0
    };
  });
}

export class StatsDashboard {
  constructor() {
    this.container = null;
    this.activeTab = 'week'; // 'day', 'week', 'month'
  }

  init(containerElement) {
    this.container = containerElement;
    store.subscribe(() => this.render());
    this.render();
  }

  render() {
    if (!this.container) return;

    const active = store.loadState();
    const user = active.user;
    const living = active.wokamons.filter(w => w.status !== 'dead');
    const dailyNeed = living.reduce((sum, wokamon) => sum + (wokamon.dailyStepNeed || 5000), 0);

    const history7 = buildLastDays(user.stepHistory || [], 7);
    const history30 = buildLastDays(user.stepHistory || [], 30);

    // Make sure today's steps are correctly factored into the last day of the history
    const todayStr = new Date().toISOString().slice(0, 10);
    const setTodaySteps = (day) => {
      if (day.date === todayStr) {
        day.steps = Math.max(day.steps, user.stepsToday || 0);
      }
      return day;
    };
    history7.forEach(setTodaySteps);
    history30.forEach(setTodaySteps);

    this.container.innerHTML = `
      <section class="stats-screen glass-panel">
        <div class="stats-header-row">
          <div>
            <span class="section-kicker">Estadísticas</span>
            <h2>Pasos y cuidado</h2>
            <p class="subtitle" style="margin-bottom: 0;">Sincronización de actividad física y necesidades del criadero.</p>
          </div>
          <div class="stats-tab-bar">
            <button class="tab-btn ${this.activeTab === 'day' ? 'active' : ''}" data-tab="day">Día</button>
            <button class="tab-btn ${this.activeTab === 'week' ? 'active' : ''}" data-tab="week">Semana</button>
            <button class="tab-btn ${this.activeTab === 'month' ? 'active' : ''}" data-tab="month">Mes</button>
          </div>
        </div>

        ${this.renderActiveTabContent(user, history7, history30, dailyNeed)}
      </section>
    `;

    // Hook tab buttons click events
    this.container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });
  }

  renderActiveTabContent(user, history7, history30, dailyNeed) {
    if (this.activeTab === 'day') {
      return this.renderDayView(user, dailyNeed);
    } else if (this.activeTab === 'week') {
      return this.renderWeekView(history7, dailyNeed);
    } else {
      return this.renderMonthView(history30, dailyNeed);
    }
  }

  renderDayView(user, dailyNeed) {
    const steps = user.stepsToday || 0;
    const progressPercent = Math.min(100, Math.round((steps / HEALTH_GOAL) * 100));
    
    // Fitness calculations
    const km = (steps * 0.00075).toFixed(2);
    const kcal = Math.round(steps * 0.04);
    const mins = Math.round(steps * 0.008);

    return `
      <div class="stats-content-view animate-fade-in">
        <div class="stats-summary-cards">
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">PASOS HOY</span>
            <strong>${steps.toLocaleString()}</strong>
            <span class="card-sub">Meta saludable: ${HEALTH_GOAL.toLocaleString()}</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">PASOS DISPONIBLES</span>
            <strong style="color: var(--gold-accent);">${user.totalEnergy.toLocaleString()}</strong>
            <span class="card-sub">Para alimentar o cuidar</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">NECESIDAD WOKAMON</span>
            <strong style="color: var(--primary-accent);">${dailyNeed.toLocaleString()}</strong>
            <span class="card-sub">Pasos para el cuidado diario</span>
          </div>
        </div>

        <div class="day-progress-container glass-panel-inner">
          <div class="progress-gauge-wrapper">
            <svg viewBox="0 0 200 200" class="svg-progress-gauge">
              <circle cx="100" cy="100" r="85" class="gauge-circle-bg" />
              <circle cx="100" cy="100" r="85" class="gauge-circle-bar" style="stroke-dasharray: 534; stroke-dashoffset: ${534 - (534 * progressPercent) / 100}" />
            </svg>
            <div class="gauge-text-center">
              <span class="pct">${progressPercent}%</span>
              <span class="lbl">COMPLETADO</span>
            </div>
          </div>

          <div class="fitness-details-list">
            <div class="fitness-detail-item">
              <span class="icon">🔥</span>
              <div>
                <strong>${kcal} kcal</strong>
                <span>Calorías activas</span>
              </div>
            </div>
            <div class="fitness-detail-item">
              <span class="icon">📍</span>
              <div>
                <strong>${km} km</strong>
                <span>Distancia estimada</span>
              </div>
            </div>
            <div class="fitness-detail-item">
              <span class="icon">⏱️</span>
              <div>
                <strong>${mins} min</strong>
                <span>Tiempo de actividad</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderWeekView(history7, dailyNeed) {
    const totalSteps = history7.reduce((sum, day) => sum + day.steps, 0);
    const averageSteps = Math.round(totalSteps / 7);
    const maxSteps = Math.max(5000, ...history7.map(day => day.steps));

    const totalKcal = Math.round(totalSteps * 0.04);
    const totalKm = (totalSteps * 0.00075).toFixed(1);

    return `
      <div class="stats-content-view animate-fade-in">
        <div class="stats-summary-cards">
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">TOTAL SEMANA</span>
            <strong>${totalSteps.toLocaleString()}</strong>
            <span class="card-sub">${totalKm} km recorridos</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">PROMEDIO DIARIO</span>
            <strong>${averageSteps.toLocaleString()}</strong>
            <span class="card-sub">${totalKcal} kcal quemadas</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">CUIDADO DIARIO</span>
            <strong style="color: var(--primary-accent);">${dailyNeed.toLocaleString()}</strong>
            <span class="card-sub">Costo de mantención</span>
          </div>
        </div>

        <div class="week-chart-container glass-panel-inner">
          <div class="chart-header-row">
            <h4>Registro de los últimos 7 días</h4>
            <span class="goal-indicator-label">Línea de meta: ${HEALTH_GOAL.toLocaleString()} pasos</span>
          </div>
          
          <div class="bar-chart-wrapper week-chart">
            <!-- Healthy goal horizontal threshold line -->
            <div class="chart-threshold-line" style="bottom: ${(HEALTH_GOAL / maxSteps) * 80}%"></div>
            
            <div class="chart-bars-row">
              ${history7.map(day => {
                const height = Math.max(4, Math.round((day.steps / maxSteps) * 80));
                const metGoal = day.steps >= HEALTH_GOAL;
                
                return `
                  <div class="chart-day-column">
                    <div class="chart-bar-glow-wrap">
                      <span class="chart-bar-interactive ${metGoal ? 'goal-reached' : ''}" style="height: ${height}%" title="${day.steps.toLocaleString()} pasos"></span>
                    </div>
                    <span class="steps-val">${day.steps >= 1000 ? (day.steps / 1000).toFixed(1) + 'k' : day.steps}</span>
                    <span class="day-lbl">${day.label.toUpperCase()}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderMonthView(history30, dailyNeed) {
    const totalSteps = history30.reduce((sum, day) => sum + day.steps, 0);
    const averageSteps = Math.round(totalSteps / 30);
    const maxSteps = Math.max(5000, ...history30.map(day => day.steps));

    const totalKcal = Math.round(totalSteps * 0.04);
    const totalKm = (totalSteps * 0.00075).toFixed(1);

    return `
      <div class="stats-content-view animate-fade-in">
        <div class="stats-summary-cards">
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">TOTAL MES</span>
            <strong>${totalSteps.toLocaleString()}</strong>
            <span class="card-sub">${totalKm} km recorridos</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">PROMEDIO DIARIO</span>
            <strong>${averageSteps.toLocaleString()}</strong>
            <span class="card-sub">${totalKcal} kcal quemadas</span>
          </div>
          <div class="stats-metric-card glass-panel-inner">
            <span class="card-label">CUIDADO DIARIO</span>
            <strong style="color: var(--primary-accent);">${dailyNeed.toLocaleString()}</strong>
            <span class="card-sub">Costo de mantención</span>
          </div>
        </div>

        <div class="month-chart-container glass-panel-inner">
          <div class="chart-header-row">
            <h4>Registro de los últimos 30 días</h4>
            <span class="goal-indicator-label">Línea de meta: ${HEALTH_GOAL.toLocaleString()} pasos</span>
          </div>
          
          <div class="bar-chart-wrapper month-chart">
            <div class="chart-threshold-line" style="bottom: ${(HEALTH_GOAL / maxSteps) * 80}%"></div>
            
            <div class="chart-bars-row month-bars">
              ${history30.map(day => {
                const height = Math.max(3, Math.round((day.steps / maxSteps) * 80));
                const metGoal = day.steps >= HEALTH_GOAL;
                
                return `
                  <div class="chart-day-column month-column">
                    <div class="chart-bar-glow-wrap">
                      <span class="chart-bar-interactive month-bar ${metGoal ? 'goal-reached' : ''}" style="height: ${height}%" title="Día ${day.label}: ${day.steps.toLocaleString()} pasos"></span>
                    </div>
                    <span class="day-lbl month-lbl">${day.label}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
