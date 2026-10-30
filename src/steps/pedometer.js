// Podómetro para navegador con el acelerómetro (solo cuenta con la app abierta).
// Filtra la gravedad, suaviza la señal y busca picos con un ritmo de paso plausible.
// Para evitar contar sacudidas, exige una racha de 4 pasos seguidos antes de empezar a sumar.

const MIN_INTERVAL = 260; // ms entre pasos (≈3,8 pasos/s como máximo)
const MAX_INTERVAL = 2000; // más de 2 s sin pasos rompe la racha
const STREAK = 4;

export class Pedometer {
  constructor(onSteps) {
    this.onSteps = onSteps;
    this.gravity = null;
    this.smooth = 0;
    this.prev = 0;
    this.rising = false;
    this.peakAvg = 1.6;
    this.lastStep = 0;
    this.streak = 0;
    this.handle = this.handle.bind(this);
  }

  handle(event) {
    const a = event.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    const t = event.timeStamp || performance.now();
    const mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    this.gravity = this.gravity == null ? mag : this.gravity + 0.05 * (mag - this.gravity);
    const linear = mag - this.gravity;
    this.smooth += 0.3 * (linear - this.smooth);

    const value = this.smooth;
    const threshold = Math.max(0.9, this.peakAvg * 0.55);
    if (value < this.prev && this.rising && this.prev > threshold) {
      this.peakAvg += 0.15 * (this.prev - this.peakAvg);
      this.registerPeak(t);
    }
    this.rising = value > this.prev;
    this.prev = value;
  }

  registerPeak(t) {
    const dt = t - this.lastStep;
    if (dt < MIN_INTERVAL) return;
    this.streak = dt > MAX_INTERVAL ? 1 : this.streak + 1;
    this.lastStep = t;
    if (this.streak === STREAK) this.onSteps(STREAK);
    else if (this.streak > STREAK) this.onSteps(1);
  }
}
