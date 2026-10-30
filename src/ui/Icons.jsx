// Iconos propios con el mismo trazo de tinta que las criaturas.
const INK = 'var(--ink)';
const base = { fill: 'none', stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function EnergyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="10.5" fill="var(--sun)" stroke={INK} strokeWidth="2" />
      <path d="M13.2 4.8 7.8 13h4l-1.2 6.2 5.6-8.4h-4.1z" fill="#fff" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function CrystalIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M7 3.5h10l4 5.3-9 11.7-9-11.7z" fill="var(--crystal)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M3 8.8h18M9.5 3.5 8 8.8l4 11.7 4-11.7-1.5-5.3" fill="none" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.6 6.2 9 8" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function FootIcon({ filled = true, flip = false, ...props }) {
  return (
    <svg viewBox="0 0 24 30" aria-hidden="true" {...props}>
      <g transform={flip ? 'translate(24 0) scale(-1 1)' : undefined}>
        <path d="M7 12c0-4 2.6-6.5 5.6-6.5S18 8 17.6 12.6c-.3 3.8-1.6 6.6-1.4 9.4.2 3-1.6 5-4.1 5s-4-1.8-3.8-4.4C8.6 19.8 7 16.5 7 12z" fill={filled ? 'var(--meadow)' : '#fff'} stroke={INK} strokeWidth="2" />
        <circle cx="6.3" cy="5.6" r="1.8" fill={filled ? 'var(--meadow)' : '#fff'} stroke={INK} strokeWidth="1.6" />
        <circle cx="10.4" cy="2.9" r="1.7" fill={filled ? 'var(--meadow)' : '#fff'} stroke={INK} strokeWidth="1.6" />
        <circle cx="15" cy="2.7" r="1.5" fill={filled ? 'var(--meadow)' : '#fff'} stroke={INK} strokeWidth="1.6" />
      </g>
    </svg>
  );
}

export function HomeIcon({ on, ...props }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" {...props}>
      <path d="M4 12.5 13 4.5l9 8V21a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 21z" fill={on ? '#fff' : 'none'} {...base} />
      <path d="M10.5 22.5v-5.5a2.5 2.5 0 0 1 5 0v5.5" {...base} />
    </svg>
  );
}

export function StableIcon({ on, ...props }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" {...props}>
      <path d="M4.5 19c0-6 3.8-11 8.5-11s8.5 5 8.5 11c0 2.2-3.8 3.5-8.5 3.5S4.5 21.2 4.5 19z" fill={on ? '#fff' : 'none'} {...base} />
      <circle cx="10" cy="14.5" r="1.3" fill={INK} />
      <circle cx="16" cy="14.5" r="1.3" fill={INK} />
      <path d="M8.5 9.5 7 4.5l4.5 3.6M17.5 9.5 19 4.5l-4.5 3.6" {...base} />
    </svg>
  );
}

export function BreedIcon({ on, ...props }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" {...props}>
      <path d="M13 3.5c4.2 0 7.5 6.2 7.5 10.8 0 4.6-3.4 8.2-7.5 8.2s-7.5-3.6-7.5-8.2C5.5 9.7 8.8 3.5 13 3.5z" fill={on ? '#fff' : 'none'} {...base} />
      <path d="M13 17.5s-3.3-2-3.3-4.1c0-1.3 1-2.1 2-2.1.7 0 1.1.4 1.3.8.2-.4.6-.8 1.3-.8 1 0 2 .8 2 2.1 0 2.1-3.3 4.1-3.3 4.1z" fill="var(--berry)" stroke={INK} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function JournalIcon({ on, ...props }) {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true" {...props}>
      <path d="M5.5 5A1.5 1.5 0 0 1 7 3.5h12.5v17H7a1.5 1.5 0 0 0-1.5 1.5z" fill={on ? '#fff' : 'none'} {...base} />
      <path d="M5.5 22a1.5 1.5 0 0 1 1.5-1.5h12.5V22.5H7A1.5 1.5 0 0 1 5.5 22zM10 8.5h6M10 12h4" {...base} />
    </svg>
  );
}

export function StarIcon({ filled, ...props }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" fill={filled ? 'var(--sun)' : '#fff'} stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 20.5S3.5 15.4 3.5 9.4A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.6c0 6-8.5 11.1-8.5 11.1z" fill="var(--berry)" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Chevron({ dir = 'right', ...props }) {
  const d = dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7';
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d={d} {...base} strokeWidth="3" /></svg>;
}

export function CloseIcon(props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M6 6l12 12M18 6 6 18" {...base} strokeWidth="3" /></svg>;
}

export function PencilIcon(props) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...props}><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5zM13.5 7l3 3" {...base} /></svg>;
}

export function GearIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="3.2" {...base} />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" {...base} />
    </svg>
  );
}

export function LeafIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z" fill="var(--meadow)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M5 19 13 11" {...base} strokeWidth="1.8" />
    </svg>
  );
}

export function EggIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.8c3.8 0 6.6 6.4 6.6 10.6 0 4.2-3 7.8-6.6 7.8s-6.6-3.6-6.6-7.8C5.4 9.2 8.2 2.8 12 2.8z" fill="#fff4c9" stroke={INK} strokeWidth="2" />
      <path d="M8 13l2-2 2 2 2-2 2 2" fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function GiftIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3.5" y="9" width="17" height="11.5" rx="2" fill="var(--sky)" stroke={INK} strokeWidth="2" />
      <path d="M2.5 9h19M12 9v11.5M12 9c-2-4-6-4.5-6-2s6 2 6 2zm0 0c2-4 6-4.5 6-2s-6 2-6 2z" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export function GhostIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.3 20 12 18.4 9.7 20l-2.4-1.6z" fill="#eef0ff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="9.5" cy="11" r="1.2" fill={INK} /><circle cx="14.5" cy="11" r="1.2" fill={INK} />
    </svg>
  );
}

export function FlaskIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M9 3h6M10 3v6l-5.2 9a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9V3" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M6.6 15h10.8l1.4 2.6a1 1 0 0 1-.9 1.4H6.1a1 1 0 0 1-.9-1.4z" fill="var(--crystal)" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export function FlameIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 2.5c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.3-4.3 2.6-5.6.3 1.6 1.1 2.6 2.1 3.1C10.6 8 11 5 12 2.5z" fill="hsl(22 95% 58%)" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 12.5c.8 1.6 2.6 2.3 2.6 4.4a2.6 2.6 0 0 1-5.2 0c0-1.5.9-2.5 1.8-3.2.2.6.5 1 .8 1.2z" fill="var(--sun)" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function HangerIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12 8.5V7.4a2.2 2.2 0 1 0-2.2-2.2M12 8.5 3 15.2a1.4 1.4 0 0 0 .8 2.5h16.4a1.4 1.4 0 0 0 .8-2.5z" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
