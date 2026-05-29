import store from '../utils/state.js';

const DAYS_TO_SHOW = 7;

function formatDayLabel(date) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(date).replace('.', '');
}

function buildLastDays(history = []) {
  const byDate = new Map(history.map(item => [item.date, item]));
  const today = new Date();

  return Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAYS_TO_SHOW - 1 - index));
    const key = date.toISOString().slice(0, 10);
    const saved = byDate.get(key);

    return {
      date: key,
      label: formatDayLabel(date),
      steps: saved?.steps || 0,
      used: saved?.used || 0
    };
  });
}

export class StatsDashboard {
  constructor() {
    this.container = null;
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
    const history = buildLastDays(user.stepHistory || []);
    const maxSteps = Math.max(5000, ...history.map(day => day.steps), user.stepsToday || 0);
    const totalWeek = history.reduce((sum, day) => sum + day.steps, 0) + (user.stepsToday || 0);
    const average = Math.round(totalWeek / (DAYS_TO_SHOW + 1));
    const dailyNeed = living.reduce((sum, wokamon) => sum + (wokamon.dailyStepNeed || 5000), 0);

    this.container.innerHTML = `
      <section class="stats-screen glass-panel">
        <div class="stats-header">
          <div>
            <span class="section-kicker">Estadísticas</span>
            <h2>Pasos y cuidado</h2>
          </div>
          <div class="stats-today">
            <strong>${user.stepsToday.toLocaleString()}</strong>
            <span>pasos hoy</span>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stats-card">
            <span>Pasos disponibles</span>
            <strong>${user.totalEnergy.toLocaleString()}</strong>
          </div>
          <div class="stats-card">
            <span>Necesidad diaria</span>
            <strong>${dailyNeed.toLocaleString()}</strong>
          </div>
          <div class="stats-card">
            <span>Media reciente</span>
            <strong>${average.toLocaleString()}</strong>
          </div>
          <div class="stats-card">
            <span>Wokamon activos</span>
            <strong>${living.length}</strong>
          </div>
        </div>

        <div class="steps-chart">
          ${history.map(day => {
            const height = Math.max(4, Math.round((day.steps / maxSteps) * 100));
            return `
              <div class="chart-day">
                <div class="chart-bar-wrap">
                  <span class="chart-bar" style="height: ${height}%"></span>
                </div>
                <strong>${day.steps.toLocaleString()}</strong>
                <span>${day.label}</span>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }
}
