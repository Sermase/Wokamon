// Genera el arte de los iconos: ?mode=full | fg | splash (capturado con Playwright).
import { createRoot } from 'react-dom/client';
import { Creature } from '../src/art/Creature.jsx';
import { babyGenotype } from '../src/game/genetics.js';

const mode = new URLSearchParams(location.search).get('mode') || 'full';
const geno = babyGenotype();

function Rays() {
  return (
    <g opacity="0.55">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M512,512 L470,-80 L554,-80 Z" fill="#ffe27a" transform={`rotate(${i * 30} 512 512)`} />
      ))}
    </g>
  );
}

function Icon() {
  const bg = mode !== 'fg';
  const size = { splash: 560, fg: 600, mask: 640 }[mode] || 860;
  const top = { splash: 190, fg: 200, mask: 230 }[mode] ?? 110;
  return (
    <div style={{ position: 'relative', width: 1024, height: 1024 }}>
      {bg && (
        <svg width="1024" height="1024" viewBox="0 0 1024 1024" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <radialGradient id="g" cx="0.5" cy="0.42" r="0.7">
              <stop offset="0" stopColor={mode === 'splash' ? '#ffffff' : '#fff6c9'} />
              <stop offset="1" stopColor={mode === 'splash' ? '#eef1ff' : '#ffc845'} />
            </radialGradient>
          </defs>
          <rect width="1024" height="1024" fill="url(#g)" />
          {(mode === 'full' || mode === 'mask') && <Rays />}
          {(mode === 'full' || mode === 'mask') && <ellipse cx="512" cy="1010" rx="560" ry="190" fill="#57d394" stroke="#23224a" strokeWidth="22" />}
        </svg>
      )}
      <div style={{ position: 'absolute', left: (1024 - size) / 2, top, width: size, height: size }}>
        <Creature genotype={geno} seed="icono" motion="none" stage="Adulto" />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<Icon />);
