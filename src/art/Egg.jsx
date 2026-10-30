import { useId, useMemo } from 'react';
import { getColors, getPhenotype, sanitizeGenotype } from '../game/genetics.js';
import { eggPalette, seeded } from './palette.js';
import './creature.css';

const SHELL = 'M100,50 C135,50 155,103 155,136 C155,163 131,179 100,179 C69,179 45,163 45,136 C45,103 65,50 100,50 Z';

const CRACKS = [
  'M100,52 L96,66 L104,74 L98,86',
  'M60,120 L72,116 L78,126 L90,120',
  'M140,112 L130,120 L134,130 L124,136',
  'M74,158 L84,150 L92,158 L102,150 L110,158 L120,150 L128,158',
];

/**
 * Huevo con los colores de su genotipo. El dibujo de la cáscara da una pista de la piel de la cría.
 * progress: 0..1 · cracks: número de grietas visibles · state: idle | ready
 */
export function Egg({ genotype, seed = 'egg', progress = 0, cracks, state = 'idle', motion = 'full', label = 'Huevo', className = '', onClick }) {
  const raw = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (n) => `${raw}-${n}`;
  const { pal, surface, spots } = useMemo(() => {
    const rand = seeded(seed);
    return {
      pal: eggPalette(getColors(sanitizeGenotype(genotype))),
      surface: getPhenotype(sanitizeGenotype(genotype)).surfaceType,
      spots: Array.from({ length: 7 }, () => [60 + rand() * 80, 66 + rand() * 100, 4 + rand() * 8]),
    };
  }, [genotype, seed]);
  const visibleCracks = cracks ?? (progress >= 1 ? 2 : progress >= 0.66 ? 1 : 0);

  return (
    <svg viewBox="0 0 200 200" className={`egg egg--${state} wk--motion-${motion} ${className}`} role="img" aria-label={label} onClick={onClick}>
      <defs>
        <clipPath id={id('clip')} clipPathUnits="userSpaceOnUse"><path d={SHELL} /></clipPath>
        <radialGradient id={id('shade')} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor={pal.shell} />
          <stop offset="0.7" stopColor={pal.shell} />
          <stop offset="1" stopColor={pal.shellShade} />
        </radialGradient>
      </defs>
      <ellipse className="egg-shadow" cx="100" cy="183" rx="42" ry="6.5" fill={pal.ink} opacity="0.16" />
      <g className="egg-body">
        <path d={SHELL} fill={`url(#${id('shade')})`} fillOpacity={surface === 'jelly' ? 0.85 : 1} />
        <g clipPath={`url(#${id('clip')})`}>
          {surface === 'smooth' && spots.slice(0, 5).map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r + 2} fill={pal.spot} opacity="0.8" />)}
          {surface === 'plush' && (
            <path d="M30,118 L46,104 L62,118 L78,104 L94,118 L110,104 L126,118 L142,104 L158,118 L174,104 L174,132 L158,146 L142,132 L126,146 L110,132 L94,146 L78,132 L62,146 L46,132 L30,146 Z" fill={pal.band} />
          )}
          {surface === 'fuzzy' && spots.concat(spots.map(([x, y, r]) => [200 - x, y + 10, r])).map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={pal.spot} />)}
          {surface === 'matte' && (
            <>
              <rect x="0" y="100" width="200" height="18" fill={pal.band} />
              <rect x="0" y="128" width="200" height="8" fill={pal.spot} opacity="0.85" />
            </>
          )}
          {surface === 'jelly' && (
            <>
              <circle cx="122" cy="140" r="9" fill="#fff" opacity="0.35" />
              <circle cx="110" cy="158" r="5" fill="#fff" opacity="0.35" />
              <circle cx="80" cy="150" r="6" fill={pal.spot} opacity="0.5" />
            </>
          )}
          <ellipse cx="100" cy="186" rx="80" ry="30" fill={pal.ink} opacity="0.08" />
          <ellipse cx="78" cy="86" rx="11" ry="20" transform="rotate(24 78 86)" fill="#fff" opacity="0.5" />
        </g>
        <path d={SHELL} fill="none" stroke={pal.ink} strokeWidth="4.5" />
        {CRACKS.slice(0, visibleCracks).map((d, i) => (
          <path key={i} className="egg-crack" d={d} fill="none" stroke={pal.ink} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </g>
    </svg>
  );
}
