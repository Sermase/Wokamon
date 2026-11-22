import { useId } from 'react';
import { hsl } from './palette.js';

const SKIES = {
  dawn: { top: '#ffcfb8', bottom: '#e9d9ff', hill: '#8fd9a8', hillBack: '#b6e6c1', ink: '#23224a', sun: '#ffd27a' },
  day: { top: '#9cc8ff', bottom: '#e6f1ff', hill: '#79d79e', hillBack: '#aee6be', ink: '#23224a', sun: '#ffe066' },
  dusk: { top: '#ff9e80', bottom: '#c9a4ff', hill: '#6fc495', hillBack: '#9ccfae', ink: '#23224a', sun: '#ffb35c' },
  night: { top: '#2b2e6b', bottom: '#5a4f9e', hill: '#3d8f78', hillBack: '#4c7d8c', ink: '#23224a', sun: '#fff4c4' },
};

// Escenario del hogar: cielo según la hora local, colinas, hierba y nubes.
export function HabitatScene({ part = 'day' }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const s = SKIES[part] || SKIES.day;
  const night = part === 'night';
  return (
    <svg className="habitat-scene" viewBox="0 0 400 320" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={s.top} />
          <stop offset="1" stopColor={s.bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="320" fill={`url(#${id}-sky)`} />
      {night ? (
        <g fill="#fff">
          {[[40, 40, 0], [90, 80, 0.6], [150, 30, 1.2], [230, 60, 0.3], [300, 30, 1.8], [350, 90, 0.9], [270, 110, 2.1], [60, 120, 1.5]].map(([x, y, d], i) => (
            <circle key={i} className="twinkle" style={{ animationDelay: `${d}s` }} cx={x} cy={y} r={i % 3 ? 1.8 : 2.6} />
          ))}
          <path d="M330,34 A24,24 0 0 0 330,82 A30,30 0 0 1 330,34 Z" fill={s.sun} stroke={s.ink} strokeWidth="3" strokeLinejoin="round" />
        </g>
      ) : (
        <>
          <circle cx={part === 'dusk' ? 70 : 330} cy={part === 'day' ? 56 : 92} r="26" fill={s.sun} stroke={s.ink} strokeWidth="3" />
          <g className="cloud-drift" fill="#fff" stroke={s.ink} strokeWidth="3">
            <path d="M20,74 a14,14 0 0 1 22,-12 a18,18 0 0 1 32,4 a12,12 0 0 1 4,22 h-56 a10,10 0 0 1 -2,-14z" />
          </g>
          <g className="cloud-drift slow" style={{ animationDelay: '-40s' }} fill="#fff" stroke={s.ink} strokeWidth="3">
            <path d="M120,124 a10,10 0 0 1 16,-8 a13,13 0 0 1 24,3 a9,9 0 0 1 2,16 h-40 a8,8 0 0 1 -2,-11z" />
          </g>
        </>
      )}
      <path d="M-10,250 C60,200 140,206 210,232 C270,212 340,196 410,224 V330 H-10Z" fill={s.hillBack} stroke={s.ink} strokeWidth="3" />
      <path d="M-10,276 C70,246 150,244 200,250 C260,244 330,248 410,270 V330 H-10Z" fill={s.hill} stroke={s.ink} strokeWidth="3" />
      <g stroke={s.ink} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity={night ? 0.5 : 0.8}>
        <path d="M44,292 l-4,-10 M48,292 l2,-12 M52,292 l5,-9" />
        <path d="M340,286 l-4,-10 M344,286 l2,-12 M348,286 l5,-9" />
        <path d="M120,300 l-3,-8 M124,300 l3,-9" />
      </g>
      {!night && (
        <g stroke={s.ink} strokeWidth="2">
          <circle cx="78" cy="268" r="5" fill="#ff8fb1" />
          <circle cx="78" cy="268" r="2" fill="#ffe066" />
          <circle cx="306" cy="262" r="5" fill="#fff" />
          <circle cx="306" cy="262" r="2" fill="#ffe066" />
        </g>
      )}
    </svg>
  );
}

// Fondo sencillo para tarjetas: pastel del color de la criatura con un montículo.
export function Backdrop({ hue = 220, dim = false }) {
  const bg = dim ? '#ececf4' : hsl(hue, 70, 93);
  const mound = dim ? '#dcdce8' : hsl(hue, 45, 84);
  return (
    <svg viewBox="0 0 200 140" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'none' }} aria-hidden="true">
      <rect width="200" height="140" fill={bg} />
      <ellipse cx="100" cy="150" rx="140" ry="42" fill={mound} />
    </svg>
  );
}
