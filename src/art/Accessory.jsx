// Dibujo de los accesorios. Los de cabeza se colocan con el origen en lo alto de la cabeza.
const GOLD = 'hsl(45 95% 62%)';
const GOLD_DEEP = 'hsl(36 85% 45%)';
const BERRY = 'hsl(345 85% 66%)';
const BERRY_DEEP = 'hsl(345 60% 45%)';

export function HeadAccessory({ id, x, y, k = 1, ink, pal }) {
  const line = { stroke: ink, strokeWidth: 3.6, strokeLinejoin: 'round', strokeLinecap: 'round' };
  let art = null;
  if (id === 'beanie') {
    art = (
      <g transform="translate(0 14)">
        <path d="M-35,4 C-35,-22 -19,-38 0,-38 C19,-38 35,-22 35,4 Z" fill={pal.accent} {...line} />
        <path d="M-20,-30 C-14,-20 -12,-8 -12,2 M0,-38 L0,2 M20,-30 C14,-20 12,-8 12,2" fill="none" stroke={pal.accentDeep} strokeWidth="2.6" strokeLinecap="round" />
        <rect x="-39" y="-2" width="78" height="15" rx="7.5" fill={pal.accentDeep} {...line} />
        <path d="M-28,1 v9 M-17,1 v9 M-6,1 v9 M5,1 v9 M16,1 v9 M27,1 v9" stroke={pal.accent} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="0" cy="-42" r="11" fill="none" stroke={ink} strokeWidth="9" strokeDasharray="0.01 6" strokeLinecap="round" />
        <circle cx="0" cy="-42" r="11" fill="#fff" stroke="#fff" strokeWidth="4" strokeDasharray="0.01 6" strokeLinecap="round" />
        <circle cx="0" cy="-42" r="11" fill="#fff" />
      </g>
    );
  } else if (id === 'party') {
    art = (
      <g transform="translate(12 6) rotate(14)">
        <path d="M-17,4 L0,-44 L17,4 Z" fill={pal.accent} {...line} />
        <path d="M-11,-12 L9,-2 M-5,-28 L5,-22" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" opacity="0.85" />
        <ellipse cx="0" cy="4" rx="19" ry="5" fill={pal.accentDeep} {...line} />
        <circle cx="0" cy="-46" r="7" fill={GOLD} {...line} strokeWidth="3" />
      </g>
    );
  } else if (id === 'crown') {
    art = (
      <g transform="translate(0 8)">
        <path d="M-24,4 L-27,-22 L-13,-10 L0,-28 L13,-10 L27,-22 L24,4 Z" fill={GOLD} {...line} />
        <path d="M-24,-3 L24,-3" stroke={GOLD_DEEP} strokeWidth="3" />
        <circle cx="0" cy="-8" r="4.2" fill={BERRY} stroke={ink} strokeWidth="2" />
        <circle cx="-14" cy="-3" r="2.6" fill={pal.accent} stroke={ink} strokeWidth="1.6" />
        <circle cx="14" cy="-3" r="2.6" fill={pal.accent} stroke={ink} strokeWidth="1.6" />
        <circle cx="-27" cy="-23" r="3" fill={GOLD} stroke={ink} strokeWidth="2" />
        <circle cx="27" cy="-23" r="3" fill={GOLD} stroke={ink} strokeWidth="2" />
        <circle cx="0" cy="-29" r="3.4" fill={GOLD} stroke={ink} strokeWidth="2" />
        <path d="M-17,-16 l3,6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8" />
      </g>
    );
  } else if (id === 'tophat') {
    art = (
      <g transform="translate(4 8) rotate(-8)">
        <ellipse cx="0" cy="2" rx="30" ry="7.5" fill="hsl(250 25% 22%)" {...line} />
        <path d="M-17,1 L-19,-36 Q0,-41 19,-36 L17,1 Q0,6 -17,1 Z" fill="hsl(250 25% 22%)" {...line} />
        <path d="M-18,-8 Q0,-3 18,-8 L18,-1 Q0,4 -18,-1 Z" fill={pal.accent} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M-12,-32 L-12,-16" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" />
      </g>
    );
  } else if (id === 'bow') {
    art = (
      <g transform="translate(24 14) rotate(18)">
        <path d="M0,0 C-8,-14 -24,-14 -24,-2 C-24,10 -8,8 0,0 Z" fill={BERRY} {...line} strokeWidth="3.2" />
        <path d="M0,0 C8,-14 24,-14 24,-2 C24,10 8,8 0,0 Z" fill={BERRY} {...line} strokeWidth="3.2" />
        <path d="M-17,-4 C-13,-8 -9,-7 -6,-3 M17,-4 C13,-8 9,-7 6,-3" fill="none" stroke={BERRY_DEEP} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="0" cy="0" r="5.5" fill={BERRY_DEEP} stroke={ink} strokeWidth="3" />
      </g>
    );
  } else if (id === 'flower') {
    art = (
      <g transform="translate(-24 16) rotate(-12)">
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="0" cy="-9" rx="6.5" ry="9" transform={`rotate(${a})`} fill="#fff" stroke={ink} strokeWidth="2.8" />
        ))}
        <circle cx="0" cy="0" r="6" fill={GOLD} stroke={ink} strokeWidth="2.8" />
      </g>
    );
  }
  if (!art) return null;
  return <g className="wk-acc" transform={`translate(${x} ${y}) scale(${k})`}>{art}</g>;
}

export function Sunglasses({ fx, fy, eyeDX, ink }) {
  const lens = (cx) => <rect x={cx - 15} y={fy - 11} width="30" height="21" rx="9" fill="hsl(250 30% 16%)" stroke={ink} strokeWidth="3.4" />;
  return (
    <g className="wk-acc">
      <path d={`M${fx - eyeDX + 13},${fy - 4} Q${fx},${fy - 10} ${fx + eyeDX - 13},${fy - 4}`} fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
      {lens(fx - eyeDX)}
      {lens(fx + eyeDX)}
      <path d={`M${fx - eyeDX - 8},${fy - 5} l6,-3 M${fx + eyeDX - 8},${fy - 5} l6,-3`} stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
    </g>
  );
}

// Bufanda: banda envuelta (recortada por la silueta) y una punta que cuelga.
export function ScarfBand({ y, pal, ink }) {
  return (
    <g>
      <rect x="-10" y={y - 9} width="220" height="18" fill={pal.accent} />
      <path d={`M-10,${y - 9} H210 M-10,${y + 9} H210`} stroke={ink} strokeWidth="3" />
      <path d={`M-10,${y - 2} H210`} stroke={pal.accentDeep} strokeWidth="3" strokeDasharray="7 7" />
    </g>
  );
}

export function ScarfTail({ x, y, pal, ink }) {
  return (
    <g className="wk-scarf-tail" style={{ transformOrigin: `${x}px ${y}px` }}>
      <path d={`M${x - 6},${y - 4} L${x + 8},${y - 6} L${x + 14},${y + 26} L${x - 2},${y + 28} Z`} fill={pal.accent} stroke={ink} strokeWidth="3.4" strokeLinejoin="round" />
      <path d={`M${x + 2},${y + 2} L${x + 6},${y + 20}`} stroke={pal.accentDeep} strokeWidth="2.6" strokeDasharray="6 6" />
      <path d={`M${x - 1},${y + 28} l-1,5 M${x + 4},${y + 27.5} l0,6 M${x + 9},${y + 27} l1,5 M${x + 13},${y + 26.5} l2,5`} stroke={ink} strokeWidth="2.6" strokeLinecap="round" />
    </g>
  );
}

// Desplazamiento para centrar cada accesorio de cabeza en su miniatura.
const ICON_OFFSET = { bow: [-22, -16], flower: [24, -16], beanie: [0, -12] };

// Miniatura de un accesorio para la tienda.
export function AccessoryIcon({ id, pal, ink }) {
  if (id === 'sunglasses') {
    return (
      <svg viewBox="0 0 80 50" aria-hidden="true">
        <Sunglasses fx={40} fy={25} eyeDX={19} ink={ink} />
      </svg>
    );
  }
  if (id === 'scarf') {
    return (
      <svg viewBox="0 0 80 60" aria-hidden="true">
        <rect x="8" y="12" width="64" height="18" rx="9" fill={pal.accent} stroke={ink} strokeWidth="3.4" />
        <path d="M12,21 H68" stroke={pal.accentDeep} strokeWidth="3" strokeDasharray="7 7" />
        <ScarfTail x={50} y={26} pal={pal} ink={ink} />
      </svg>
    );
  }
  return (
    <svg viewBox="-45 -62 90 80" aria-hidden="true">
      <HeadAccessory id={id} x={ICON_OFFSET[id]?.[0] ?? 0} y={ICON_OFFSET[id]?.[1] ?? 0} k={1} ink={ink} pal={pal} />
    </svg>
  );
}
