import { describe, it, expect } from 'vitest';
import { Pedometer } from './pedometer.js';

function feed(ped, seconds, fn, hz = 50) {
  for (let i = 0; i < seconds * hz; i += 1) {
    const t = (i / hz) * 1000;
    const v = fn(t / 1000);
    ped.handle({ timeStamp: t, accelerationIncludingGravity: { x: 0.3, y: 9.81 + v, z: 0.5 } });
  }
}

describe('podómetro web', () => {
  it('cuenta pasos al caminar (~2 pasos/s)', () => {
    let count = 0;
    const ped = new Pedometer((n) => { count += n; });
    feed(ped, 30, (s) => 3 * Math.sin(2 * Math.PI * 1.9 * s) + (Math.sin(s * 37) * 0.3));
    expect(count).toBeGreaterThan(50);
    expect(count).toBeLessThan(62);
  });

  it('no cuenta una sacudida suelta ni el móvil quieto', () => {
    let count = 0;
    const ped = new Pedometer((n) => { count += n; });
    feed(ped, 5, () => 0.05);
    feed(ped, 1, (s) => (s < 0.3 ? 8 * Math.sin(2 * Math.PI * 5 * s) : 0));
    feed(ped, 5, () => 0.02);
    expect(count).toBe(0);
  });
});
