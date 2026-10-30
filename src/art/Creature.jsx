import { useEffect, useId, useMemo, useState } from 'react';
import { getColors, getPhenotype } from '../game/genetics.js';
import { BODY_SHAPES, PROPORTIONS } from './shapes.js';
import { creaturePalette, hsl, seeded } from './palette.js';
import './creature.css';

const BOTTOM = 177;
const GROUND = 183;
const EYE_DARK = 'hsl(245 32% 13%)';
const LEAF = { fill: 'hsl(128 52% 54%)', ink: 'hsl(140 45% 20%)', light: 'hsl(110 60% 70%)' };

/**
 * Dibuja un Wokamon a partir de su genotipo.
 * mood: happy | sad | starving | sick | dead · stage: Niño | Adulto | Anciano | Fantasma
 * motion: full (en escena) | calm (tarjetas) | none (miniaturas estáticas)
 * reaction: { type: 'pet' | 'eat' | 'play' | 'level', key } para animaciones puntuales
 */
export function Creature({
  genotype, mood = 'happy', stage = 'Adulto', seed = 'wk', sleeping = false,
  motion = 'full', reaction = null, label, className = '', onClick,
}) {
  const rawId = useId();
  const gid = (name) => `${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}-${name}`;
  const [activeReaction, setActiveReaction] = useState(null);

  useEffect(() => {
    if (!reaction) return undefined;
    setActiveReaction(reaction);
    const t = setTimeout(() => setActiveReaction(null), reaction.type === 'level' ? 1600 : 1300);
    return () => clearTimeout(t);
  }, [reaction?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const model = useMemo(() => buildModel(genotype, { mood, stage, seed, sleeping }), [genotype, mood, stage, seed, sleeping]);
  const { p, pal, ghost } = model;
  const r = activeReaction?.type;

  const classes = [
    'wk', `wk--${ghost ? 'ghost' : mood}`, `wk--motion-${motion}`,
    sleeping && !ghost ? 'wk--sleeping' : '', stage === 'Anciano' ? 'wk--elder' : '',
    p.surfaceType === 'jelly' ? 'wk--jelly' : '', r ? `wk--react-${r}` : '', className,
  ].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 200 200"
      className={classes}
      role="img"
      aria-label={label}
      onClick={onClick}
      style={{ '--wk-delay': `${model.delay}s`, '--wk-ink': pal.ink }}
    >
      <defs>
        <linearGradient id={gid('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={pal.bodyTop} />
          <stop offset="0.55" stopColor={pal.body} />
          <stop offset="1" stopColor={pal.bodyBottom} />
        </linearGradient>
        <radialGradient id={gid('shade')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.35" stopColor={pal.ink} stopOpacity={ghost ? 0.06 : 0.16} />
          <stop offset="1" stopColor={pal.ink} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gid('glossy')} cx="0.4" cy="0.35" r="0.75">
          <stop offset="0" stopColor={pal.accent} />
          <stop offset="0.55" stopColor={pal.accentInk} />
          <stop offset="1" stopColor={EYE_DARK} />
        </radialGradient>
        <clipPath id={gid('clip')} clipPathUnits="userSpaceOnUse">
          <path d={model.shape.d} />
        </clipPath>
        {model.head && (
          <clipPath id={gid('headclip')} clipPathUnits="userSpaceOnUse">
            <circle cx={model.head.cx} cy={model.head.cy} r={model.head.r} />
          </clipPath>
        )}
      </defs>

      <ellipse className="wk-shadow" cx="100" cy={GROUND} rx={44 * model.sx * model.stageScale} ry="6.5" fill={pal.ink} opacity={ghost ? 0.08 : 0.16} />

      <g className="wk-stage" transform={model.stageTf}>
        <g className="wk-hop">
          <g className="wk-breath">
            {!ghost && <Legs model={model} />}
            {ghost && <GhostSkirt model={model} />}
            {!ghost && p.tailType !== 'none' && <Tail model={model} />}
            <TopBack model={model} />
            <Body model={model} gid={gid} />
            {model.head && <Head model={model} gid={gid} />}
            {p.topAppendage === 'sprouts' && !ghost && <Sprout at={model.anchors.sprout} />}
            {!ghost && <Feet model={model} />}
            {!ghost && <Arms model={model} />}
            <Face model={model} gid={gid} reaction={r} />
            <StatusFx model={model} gid={gid} />
          </g>
        </g>
        {ghost && <Halo model={model} />}
        {r && <ReactionFx type={r} model={model} />}
      </g>
    </svg>
  );
}

// ---------- Modelo geométrico ----------

function buildModel(genotype, { mood, stage, seed, sleeping }) {
  const p = getPhenotype(genotype);
  const ghost = mood === 'dead' || stage === 'Fantasma';
  const pal = creaturePalette(getColors(genotype), { ghost, elder: stage === 'Anciano' });
  const shape = BODY_SHAPES[p.bodyBase] || BODY_SHAPES.round;
  const [psx, psy] = PROPORTIONS[p.bodyProportion] || [1, 1];
  const semi = p.headMerge === 'semi-separated';
  const sx = psx * (semi ? 0.94 : 1);
  const sy = psy * (semi ? 0.74 : 1);
  const lift = ghost ? 8 : p.limbType === 'long' ? 15 : p.limbType === 'springy' ? 12 : 0;
  const P = ([x, y]) => [100 + (x - 100) * sx, BOTTOM + (y - BOTTOM) * sy - lift];
  const bodyTf = `translate(${100 - 100 * sx} ${BOTTOM - BOTTOM * sy - lift}) scale(${sx} ${sy})`;
  const topY = P([100, shape.top])[1];

  let head = null;
  let face;
  let eyeDX;
  let anchors;
  if (semi) {
    const r = 41 * psx;
    head = { cx: 100, cy: topY + 2 - r * 0.45, r };
    face = [100, head.cy + 6];
    eyeDX = 17 * psx;
    anchors = {
      ears: [[100 - r * 0.62, head.cy - r * 0.72], [100 + r * 0.62, head.cy - r * 0.72]],
      horns: [[100 - r * 0.45, head.cy - r * 0.86], [100 + r * 0.45, head.cy - r * 0.86]],
      antennae: [[100 - r * 0.25, head.cy - r * 0.95], [100 + r * 0.25, head.cy - r * 0.95]],
      sprout: [100, head.cy - r + 1],
      topY: head.cy - r,
    };
  } else {
    face = P(shape.face);
    eyeDX = shape.eyeDX * sx;
    anchors = {
      ears: shape.ears.map(P),
      horns: shape.horns.map(P),
      antennae: shape.antennae.map(P),
      sprout: [P([100, shape.top])[0], topY + 1],
      topY,
    };
  }
  anchors.arms = shape.arms.map(P);
  anchors.tail = P(shape.tail);
  const [bcx, bcy, brx, bry] = shape.belly;
  const kid = stage === 'Niño';
  const rand = seeded(seed);
  return {
    p, pal, ghost, shape, semi, sx, sy, lift, P, bodyTf, head, face, eyeDX, anchors, mood, stage, sleeping,
    belly: { cx: bcx, cy: bcy, rx: brx, ry: bry },
    eyeScale: kid ? 1.16 : 1,
    stageScale: kid ? 0.8 : 1,
    stageTf: kid ? `translate(${100 - 100 * 0.8} ${GROUND - GROUND * 0.8}) scale(0.8)` : undefined,
    delay: -(rand() * 6).toFixed(2),
    spots: Array.from({ length: 5 }, () => [50 + rand() * 100, shape.top + 12 + rand() * (BOTTOM - shape.top - 30), 6 + rand() * 9]),
  };
}

// ---------- Partes ----------

function Body({ model, gid }) {
  const { shape, pal, p, ghost, bodyTf, belly } = model;
  const tufts = !ghost && (p.surfaceType === 'plush' || p.surfaceType === 'fuzzy');
  const fuzzy = p.surfaceType === 'fuzzy';
  const jelly = p.surfaceType === 'jelly' && !ghost;
  return (
    <g transform={bodyTf} className="wk-body">
      {tufts && (
        <>
          <path d={shape.d} fill="none" stroke={pal.ink} strokeWidth={fuzzy ? 16 : 12.5} strokeDasharray={fuzzy ? '0.01 7.5' : '0.01 8.5'} strokeLinecap="round" />
          <path d={shape.d} fill="none" stroke={pal.body} strokeWidth={fuzzy ? 10.5 : 7.5} strokeDasharray={fuzzy ? '0.01 7.5' : '0.01 8.5'} strokeLinecap="round" />
        </>
      )}
      <path
        d={shape.d}
        fill={`url(#${gid('body')})`}
        fillOpacity={jelly ? 0.86 : 1}
        stroke={tufts ? 'none' : pal.ink}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <g clipPath={`url(#${gid('clip')})`}>
        {pal.pattern >= 0.25 && !ghost && model.spots.map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr} fill={pal.accent} opacity={0.32} />
        ))}
        {!ghost && <Belly kind={p.bellyShape} {...belly} fill={pal.belly} />}
        <ellipse cx="100" cy={BOTTOM + 6} rx="92" ry="44" fill={`url(#${gid('shade')})`} />
        {p.surfaceType !== 'matte' && !tufts && (
          <ellipse cx="74" cy={shape.top + 26} rx={jelly ? 20 : 15} ry={jelly ? 11 : 8} transform={`rotate(-28 74 ${shape.top + 26})`} fill="#fff" opacity={jelly ? 0.6 : 0.42} />
        )}
        {p.surfaceType !== 'matte' && !tufts && <circle cx="92" cy={shape.top + 16} r="3.2" fill="#fff" opacity={jelly ? 0.75 : 0.5} />}
        {jelly && (
          <g fill="#fff" opacity="0.45" className="wk-bubbles">
            <circle cx="128" cy={BOTTOM - 34} r="4.5" />
            <circle cx="118" cy={BOTTOM - 22} r="2.6" />
            <circle cx="70" cy={BOTTOM - 26} r="3.2" />
          </g>
        )}
        {p.surfaceType === 'matte' && (
          <g fill={pal.ink} opacity="0.07">
            {model.spots.map(([x, y], i) => <circle key={i} cx={200 - x} cy={y + 6} r="1.6" />)}
          </g>
        )}
      </g>
    </g>
  );
}

function Belly({ kind, cx, cy, rx, ry, fill }) {
  if (kind === 'none') return null;
  if (kind === 'heart') {
    const s = rx / 30;
    return <path transform={`translate(${cx} ${cy - 4}) scale(${s})`} d="M0,-8 C-6,-22 -32,-20 -30,0 C-28,16 -10,26 0,32 C10,26 28,16 30,0 C32,-20 6,-22 0,-8 Z" fill={fill} />;
  }
  if (kind === 'teardrop') {
    return <path d={`M${cx},${cy - ry * 1.6} C${cx + rx * 0.5},${cy - ry * 0.6} ${cx + rx},${cy} ${cx + rx * 0.9},${cy + ry * 0.6} C${cx + rx * 0.7},${cy + ry * 1.3} ${cx - rx * 0.7},${cy + ry * 1.3} ${cx - rx * 0.9},${cy + ry * 0.6} C${cx - rx},${cy} ${cx - rx * 0.5},${cy - ry * 0.6} ${cx},${cy - ry * 1.6} Z`} fill={fill} />;
  }
  if (kind === 'cloud') {
    return (
      <g fill={fill}>
        <circle cx={cx - rx * 0.55} cy={cy + 2} r={ry * 0.85} />
        <circle cx={cx} cy={cy - ry * 0.35} r={ry * 1.05} />
        <circle cx={cx + rx * 0.55} cy={cy + 2} r={ry * 0.85} />
        <ellipse cx={cx} cy={cy + ry * 0.5} rx={rx * 0.9} ry={ry * 0.6} />
      </g>
    );
  }
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} />;
}

function Head({ model, gid }) {
  const { head, pal, p, ghost } = model;
  const jelly = p.surfaceType === 'jelly' && !ghost;
  const tufts = !ghost && (p.surfaceType === 'plush' || p.surfaceType === 'fuzzy');
  return (
    <g className="wk-head">
      {tufts && (
        <>
          <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={pal.ink} strokeWidth="13" strokeDasharray="0.01 8" strokeLinecap="round" />
          <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={pal.body} strokeWidth="8" strokeDasharray="0.01 8" strokeLinecap="round" />
        </>
      )}
      <circle cx={head.cx} cy={head.cy} r={head.r} fill={`url(#${gid('body')})`} fillOpacity={jelly ? 0.88 : 1} stroke={tufts ? 'none' : pal.ink} strokeWidth="4.5" />
      <g clipPath={`url(#${gid('headclip')})`}>
        <ellipse cx={head.cx} cy={head.cy + head.r * 0.95} rx={head.r * 1.4} ry={head.r * 0.7} fill={`url(#${gid('shade')})`} />
        {p.surfaceType !== 'matte' && !tufts && (
          <ellipse cx={head.cx - head.r * 0.45} cy={head.cy - head.r * 0.5} rx="11" ry="6" transform={`rotate(-30 ${head.cx - head.r * 0.45} ${head.cy - head.r * 0.5})`} fill="#fff" opacity={jelly ? 0.6 : 0.42} />
        )}
      </g>
    </g>
  );
}

function TopBack({ model }) {
  const { p, pal, anchors, mood, ghost, sleeping } = model;
  if (p.topAppendage === 'ears') {
    const droop = ghost || sleeping || mood === 'sad' || mood === 'starving' || mood === 'sick';
    return (
      <g className="wk-ears">
        {anchors.ears.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          const angle = side * (droop ? 58 : 22);
          return (
            <g key={i} className={`wk-ear wk-ear--${i}`} style={{ transformOrigin: `${x}px ${y + 6}px` }}>
              <g transform={`translate(${x} ${y}) rotate(${angle})`}>
                <path d="M-17,10 C-18,-10 -10,-30 0,-35 C10,-30 18,-10 17,10 Z" fill={pal.body} stroke={pal.ink} strokeWidth="4.5" strokeLinejoin="round" />
                <path d="M-8.5,6 C-9.5,-8 -5,-21 0,-25 C5,-21 9.5,-8 8.5,6 Z" fill={pal.inner} />
              </g>
            </g>
          );
        })}
      </g>
    );
  }
  if (p.topAppendage === 'horns') {
    return (
      <g className="wk-horns">
        {anchors.horns.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y + 6}) scale(${i === 0 ? 1 : -1} 1)`}>
            <path d="M-7,8 C-8,-6 -9,-17 -17,-27 C-21,-32 -16,-37 -11,-34 C1,-27 7,-12 7,8 Z" fill={pal.ivory} stroke={pal.ink} strokeWidth="4" strokeLinejoin="round" />
            <path d="M-7.5,-4 Q0,-7 6.5,-3 M-10,-15 Q-4,-18 2,-14" fill="none" stroke={pal.ink} strokeWidth="2.4" strokeLinecap="round" opacity="0.5" />
          </g>
        ))}
      </g>
    );
  }
  if (p.topAppendage === 'antennae') {
    return (
      <g className="wk-antennae">
        {anchors.antennae.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          const tip = [x + side * 15, y - 36];
          return (
            <g key={i} className={`wk-antenna wk-antenna--${i}`} style={{ transformOrigin: `${x}px ${y}px` }}>
              <path d={`M${x},${y + 6} Q${x + side * 2},${y - 18} ${tip[0]},${tip[1]}`} fill="none" stroke={pal.ink} strokeWidth="4" strokeLinecap="round" />
              {!ghost && <circle className="wk-glow" cx={tip[0]} cy={tip[1]} r="13" fill={pal.accent} opacity="0.3" />}
              <circle cx={tip[0]} cy={tip[1]} r="7" fill={ghost ? pal.body : pal.accent} stroke={pal.ink} strokeWidth="3.5" />
              <circle cx={tip[0] - 2.2} cy={tip[1] - 2.2} r="2" fill="#fff" opacity="0.8" />
            </g>
          );
        })}
      </g>
    );
  }
  return null;
}

function Sprout({ at: [x, y] }) {
  return (
    <g className="wk-sprout" style={{ transformOrigin: `${x}px ${y + 4}px` }}>
      <g transform={`translate(${x} ${y + 3})`}>
        <path d="M0,2 C0,-6 1,-12 0,-18" fill="none" stroke={LEAF.ink} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M0,-15 C-5,-27 -19,-30 -24,-22 C-17,-13 -7,-12 0,-15 Z" fill={LEAF.fill} stroke={LEAF.ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M0,-17 C6,-31 23,-34 28,-24 C20,-14 8,-13 0,-17 Z" fill={LEAF.fill} stroke={LEAF.ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M3,-19 Q12,-25 21,-24" fill="none" stroke={LEAF.light} strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Tail({ model }) {
  const { p, pal, anchors } = model;
  const [x, y] = anchors.tail;
  let art;
  if (p.tailType === 'pom') {
    art = (
      <>
        <circle cx="10" cy="-4" r="15" fill="none" stroke={pal.ink} strokeWidth="11" strokeDasharray="0.01 7" strokeLinecap="round" />
        <circle cx="10" cy="-4" r="15" fill={pal.belly} stroke={pal.belly} strokeWidth="6" strokeDasharray="0.01 7" strokeLinecap="round" />
        <circle cx="10" cy="-4" r="15" fill={pal.belly} />
        <circle cx="5" cy="-9" r="4" fill="#fff" opacity="0.6" />
      </>
    );
  } else if (p.tailType === 'spike') {
    art = (
      <>
        <path d="M-12,-14 C4,-18 22,-12 40,6 C24,10 4,10 -12,8 Z" fill={pal.body} stroke={pal.ink} strokeWidth="4" strokeLinejoin="round" />
        {[[6, -15], [18, -11], [29, -4]].map(([sx, sy], i) => (
          <path key={i} d={`M${sx - 5},${sy + 2} L${sx + 1},${sy - 9} L${sx + 6},${sy + 3} Z`} fill={pal.accent} stroke={pal.ink} strokeWidth="3" strokeLinejoin="round" />
        ))}
      </>
    );
  } else {
    art = (
      <>
        <path d="M-10,6 C10,10 34,0 38,-24 C41,-46 22,-58 10,-47 C22,-40 20,-24 6,-17 C-3,-12 -12,-8 -10,6 Z" fill={pal.body} stroke={pal.ink} strokeWidth="4" strokeLinejoin="round" />
        <path d="M20,-50 C30,-48 36,-38 35,-28 C30,-34 24,-38 16,-38 C21,-42 22,-46 20,-50 Z" fill={pal.belly} />
      </>
    );
  }
  return (
    <g className="wk-tail" style={{ transformOrigin: `${x - 6}px ${y}px` }}>
      <g transform={`translate(${x - 4} ${y})`}>{art}</g>
    </g>
  );
}

function GhostSkirt({ model }) {
  const { pal, sx, lift } = model;
  const top = BOTTOM - lift - 34;
  const bottom = BOTTOM - lift + 10;
  const w = 44 * sx;
  const seg = (2 * w) / 3;
  const d = `M${100 - w},${top} C${100 - w},${bottom - 14} ${100 - w - 3},${bottom - 6} ${100 - w - 2},${bottom}`
    + ` a${seg / 2 + 0.7},${seg / 2.4} 0 0 0 ${seg + 0.7},0 a${seg / 2},${seg / 2.4} 0 0 0 ${seg},0 a${seg / 2 + 0.7},${seg / 2.4} 0 0 0 ${seg + 0.6},0`
    + ` C${100 + w + 3},${bottom - 6} ${100 + w},${bottom - 14} ${100 + w},${top} Z`;
  return (
    <g className="wk-skirt">
      <path d={d} fill={pal.bodyBottom} stroke={pal.ink} strokeWidth="4.5" strokeLinejoin="round" />
    </g>
  );
}

function Legs({ model }) {
  const { p, pal, lift } = model;
  if (p.limbType !== 'long' && p.limbType !== 'springy') return null;
  const top = BOTTOM - lift - 10;
  return (
    <g className="wk-legs">
      {[78, 122].map((x) => (p.limbType === 'long' ? (
        <rect key={x} x={x - 6.5} y={top} width="13" height={GROUND - top - 3} rx="6.5" fill={pal.bodyBottom} stroke={pal.ink} strokeWidth="4" />
      ) : (
        <g key={x}>
          <path d={coil(x, top, GROUND - 4)} fill="none" stroke={pal.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
          <path d={coil(x, top, GROUND - 4)} fill="none" stroke={pal.bodyBottom} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )))}
    </g>
  );
}

function coil(x, y1, y2) {
  const n = 4;
  const h = (y2 - y1) / n;
  let d = `M${x},${y1}`;
  for (let i = 0; i < n; i += 1) d += ` Q${x + (i % 2 ? -9 : 9)},${y1 + h * (i + 0.5)} ${x},${y1 + h * (i + 1)}`;
  return d;
}

function Feet({ model }) {
  const { p, pal, sx } = model;
  const soft = p.limbType === 'soft';
  const long = p.limbType === 'long' || p.limbType === 'springy';
  const cy = long ? GROUND - 4 : BOTTOM - 1;
  const xs = long ? [78, 122] : [100 - 23 * sx, 100 + 23 * sx];
  return (
    <g className="wk-feet">
      {xs.map((x, i) => (
        <g key={i}>
          <ellipse cx={x} cy={cy} rx={soft ? 15 : long ? 11 : 13} ry={soft ? 9.5 : 7.5} fill={pal.bodyBottom} stroke={pal.ink} strokeWidth="4" />
          {soft && (
            <path d={`M${x - 5},${cy - 1} v5 M${x},${cy} v5 M${x + 5},${cy - 1} v5`} stroke={pal.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.6" />
          )}
        </g>
      ))}
    </g>
  );
}

function Arms({ model }) {
  const { p, pal, anchors, mood, sleeping } = model;
  const waving = mood === 'happy' && !sleeping;
  return (
    <g className="wk-arms">
      {anchors.arms.map(([x, y], i) => {
        const side = i === 0 ? -1 : 1;
        const shoulder = [x - side * 3, y - 8];
        let art;
        if (p.limbType === 'long') {
          art = <ellipse cx={x + side * 6} cy={y + 8} rx="7" ry="19" transform={`rotate(${side * -22} ${x + side * 6} ${y + 8})`} fill={pal.body} stroke={pal.ink} strokeWidth="4" />;
        } else if (p.limbType === 'springy') {
          const d = `M${x - side * 2},${y - 6} q${side * 10},-2 ${side * 9},6 q${side * -6},6 ${side * 2},10 q${side * 9},3 ${side * 6},10`;
          art = (
            <>
              <path d={d} fill="none" stroke={pal.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d={d} fill="none" stroke={pal.body} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          );
        } else if (p.limbType === 'soft') {
          art = <circle cx={x + side * 3} cy={y + 4} r="10.5" fill={pal.body} stroke={pal.ink} strokeWidth="4" />;
        } else {
          art = <ellipse cx={x + side * 3} cy={y + 4} rx="8" ry="12.5" transform={`rotate(${side * -38} ${x + side * 3} ${y + 4})`} fill={pal.body} stroke={pal.ink} strokeWidth="4" />;
        }
        return (
          <g key={i} className={i === 1 && waving ? 'wk-wave' : 'wk-arm'} style={{ transformOrigin: `${shoulder[0]}px ${shoulder[1]}px` }}>
            {art}
          </g>
        );
      })}
    </g>
  );
}

// ---------- Cara ----------

function Face({ model, gid, reaction }) {
  const { face: [fx, fy], eyeDX, eyeScale, pal, mood, ghost, sleeping, stage, p } = model;
  const mouthY = fy + 15 * eyeScale;
  const closed = sleeping && !ghost;
  return (
    <g className="wk-face">
      <g className="wk-look">
        {!ghost && (
          <g fill={pal.cheek}>
            <ellipse cx={fx - eyeDX - 9} cy={fy + 11} rx="7.5" ry="4.5" />
            <ellipse cx={fx + eyeDX + 9} cy={fy + 11} rx="7.5" ry="4.5" />
          </g>
        )}
        {[-1, 1].map((side) => (
          <Eye key={side} cx={fx + side * eyeDX} cy={fy} side={side} model={model} gid={gid} closed={closed} />
        ))}
        {stage === 'Anciano' && !ghost && [-1, 1].map((side) => (
          <path key={side} d={`M${fx + side * eyeDX - 10},${fy - 15} Q${fx + side * eyeDX},${fy - 22 - side} ${fx + side * eyeDX + 10},${fy - 15}`} fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 0.6px ${pal.ink})` }} />
        ))}
        <Mouth x={fx} y={mouthY} model={model} reaction={reaction} closed={closed} style={p.mouthStyle} />
      </g>
    </g>
  );
}

function Eye({ cx, cy, side, model, gid, closed }) {
  const { p, pal, mood, ghost, eyeScale } = model;
  const s = eyeScale;
  if (ghost) {
    return (
      <g stroke={pal.ink} strokeWidth="4" strokeLinecap="round">
        <path d={`M${cx - 6},${cy - 6} L${cx + 6},${cy + 6} M${cx + 6},${cy - 6} L${cx - 6},${cy + 6}`} />
      </g>
    );
  }
  if (closed) {
    return <path d={`M${cx - 9 * s},${cy + 1} Q${cx},${cy + 8 * s} ${cx + 9 * s},${cy + 1}`} fill="none" stroke={pal.ink} strokeWidth="4" strokeLinecap="round" />;
  }
  const shape = p.eyeShape;
  const dims = { round: [9.5, 11.5], wide: [12.5, 14], sparkle: [10, 12], sleepy: [9.5, 10.5], droopy: [9.5, 11] }[shape] || [9.5, 11.5];
  const rx = dims[0] * s * (mood === 'starving' ? 0.85 : 1);
  const ry = dims[1] * s * (mood === 'starving' ? 0.85 : 1);
  const wide = shape === 'wide';
  const irx = wide ? rx * 0.72 : rx;
  const iry = wide ? ry * 0.74 : ry;
  const icx = wide ? cx - side * 1.5 : cx;
  const icy = wide ? cy + 1.5 : cy;

  const pupil = p.pupilStyle;
  let iris;
  if (pupil === 'slit') {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={pal.accent} stroke={EYE_DARK} strokeWidth="2.5" />
        <ellipse cx={icx} cy={icy} rx={irx * 0.22} ry={iry * 0.78} fill={EYE_DARK} />
        <circle cx={icx + irx * 0.35} cy={icy - iry * 0.5} r={2 * s} fill="#fff" />
      </>
    );
  } else if (pupil === 'glossy') {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={`url(#${gid('glossy')})`} />
        <ellipse cx={icx + irx * 0.28} cy={icy - iry * 0.36} rx={irx * 0.42} ry={iry * 0.38} fill="#fff" />
        <circle cx={icx - irx * 0.38} cy={icy + iry * 0.45} r={1.8 * s} fill="#fff" />
      </>
    );
  } else if (pupil === 'star') {
    const st = (x, y, r) => `M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`;
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={EYE_DARK} />
        <path d={st(icx + irx * 0.25, icy - iry * 0.3, 5.5 * s)} fill="#fff" />
        <circle cx={icx - irx * 0.4} cy={icy + iry * 0.48} r={1.6 * s} fill="#fff" />
      </>
    );
  } else {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={EYE_DARK} />
        <circle cx={icx + irx * 0.3} cy={icy - iry * 0.35} r={3.7 * s} fill="#fff" />
        <circle cx={icx - irx * 0.35} cy={icy + iry * 0.42} r={1.7 * s} fill="#fff" />
      </>
    );
  }

  const sad = mood === 'sad' || mood === 'starving' || shape === 'droopy';
  const heavy = shape === 'sleepy' || mood === 'sick';
  const clipId = gid(`eye${side}`);
  const lidClip = `url(#${clipId})`;
  return (
    <g>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <ellipse cx={wide ? cx : icx} cy={wide ? cy : icy} rx={rx + 0.6} ry={ry + 0.6} />
      </clipPath>
      <g className="wk-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {wide && <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={EYE_DARK} strokeWidth="2.8" />}
        {iris}
        {shape === 'sparkle' && (
          <path d={`M${cx + side * (rx + 7)},${cy - ry - 2} l1.5,4 4,1.5 -4,1.5 -1.5,4 -1.5,-4 -4,-1.5 4,-1.5 Z`} fill={pal.accent} stroke={pal.ink} strokeWidth="1.2" />
        )}
      </g>
      {heavy && (
        <>
          <path clipPath={lidClip} d={`M${cx - rx - 3},${cy - ry - 4} L${cx + rx + 3},${cy - ry - 4} L${cx + rx + 3},${cy - ry * 0.12} Q${cx},${cy + ry * 0.24} ${cx - rx - 3},${cy - ry * 0.12} Z`} fill={pal.body} />
          <path d={`M${cx - rx - 1.5},${cy - ry * 0.16} Q${cx},${cy + ry * 0.2} ${cx + rx + 1.5},${cy - ry * 0.16}`} fill="none" stroke={pal.ink} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
      {sad && !heavy && (
        <>
          <path clipPath={lidClip} d={`M${cx + side * (rx + 4)},${cy - ry * 0.05} L${cx - side * (rx + 4)},${cy - ry - 5} L${cx + side * (rx + 4)},${cy - ry - 5} Z`} fill={pal.body} />
          <path d={`M${cx + side * (rx + 1.5)},${cy - ry * 0.08} L${cx - side * (rx * 0.75)},${cy - ry * 0.92}`} fill="none" stroke={pal.ink} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Mouth({ x, y, model, reaction, closed, style }) {
  const { pal, mood, ghost } = model;
  const ink = pal.ink;
  const common = { fill: 'none', stroke: ink, strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (reaction === 'eat') {
    return (
      <g className="wk-chomp" style={{ transformOrigin: `${x}px ${y - 2}px` }}>
        <ellipse cx={x} cy={y + 2} rx="7.5" ry="7" fill="hsl(350 55% 32%)" stroke={ink} strokeWidth="3.2" />
        <ellipse cx={x} cy={y + 5.5} rx="4" ry="2.4" fill="hsl(350 85% 70%)" />
      </g>
    );
  }
  if (ghost) return <path d={`M${x - 6},${y + 2} Q${x - 3},${y - 1} ${x},${y + 2} Q${x + 3},${y + 5} ${x + 6},${y + 2}`} {...common} />;
  if (closed) return <ellipse cx={x} cy={y + 1} rx="3" ry="3.6" fill="hsl(350 55% 32%)" stroke={ink} strokeWidth="2.6" className="wk-snore" />;
  if (mood === 'sad') return <path d={`M${x - 7},${y + 4} Q${x},${y - 3} ${x + 7},${y + 4}`} {...common} />;
  if (mood === 'starving') return <ellipse cx={x} cy={y + 2} rx="4.5" ry="5.5" fill="hsl(350 55% 32%)" stroke={ink} strokeWidth="3" />;
  if (mood === 'sick') {
    return (
      <g>
        <path d={`M${x - 7},${y + 2} Q${x - 3.5},${y - 1} ${x},${y + 2} Q${x + 3.5},${y + 5} ${x + 7},${y + 2}`} {...common} />
        <g transform={`translate(${x + 4} ${y + 2}) rotate(-24)`}>
          <path d="M0,0 L19,0" stroke={ink} strokeWidth="7.5" strokeLinecap="round" />
          <path d="M0,0 L19,0" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
          <circle cx="20" cy="0" r="4" fill="hsl(0 80% 60%)" stroke={ink} strokeWidth="2.5" />
        </g>
      </g>
    );
  }
  if (style === 'open-smile' || reaction === 'play' || reaction === 'level') {
    return (
      <g>
        <path d={`M${x - 8.5},${y - 2} Q${x},${y - 1} ${x + 8.5},${y - 2} Q${x + 8},${y + 10} ${x},${y + 10.5} Q${x - 8},${y + 10} ${x - 8.5},${y - 2} Z`} fill="hsl(350 55% 32%)" stroke={ink} strokeWidth="3.2" strokeLinejoin="round" />
        <ellipse cx={x} cy={y + 7} rx="4.5" ry="2.6" fill="hsl(350 85% 70%)" />
      </g>
    );
  }
  if (style === 'tiny-fang') {
    return (
      <g>
        <path d={`M${x - 8},${y - 1} Q${x},${y + 7} ${x + 8},${y - 1}`} {...common} />
        <path d={`M${x - 4.5},${y + 1.8} L${x - 2.5},${y + 7} L${x - 0.5},${y + 2.6} Z`} fill="#fff" stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
      </g>
    );
  }
  if (style === 'shy') return <path d={`M${x - 6},${y + 1} Q${x - 3},${y - 2} ${x},${y + 1} Q${x + 3},${y + 4} ${x + 6},${y + 1}`} {...common} />;
  return <path d={`M${x - 8},${y - 1} Q${x - 4},${y + 5} ${x},${y} Q${x + 4},${y + 5} ${x + 8},${y - 1}`} {...common} />;
}

// ---------- Efectos ----------

function StatusFx({ model }) {
  const { face: [fx, fy], eyeDX, mood, pal, ghost, sleeping, anchors } = model;
  if (ghost) return null;
  if (sleeping) {
    return (
      <g className="wk-zzz" fill={pal.ink} fontWeight="800" fontFamily="inherit">
        <text x={fx + eyeDX + 18} y={anchors.topY + 6} fontSize="16">z</text>
        <text x={fx + eyeDX + 30} y={anchors.topY - 8} fontSize="20">z</text>
        <text x={fx + eyeDX + 44} y={anchors.topY - 24} fontSize="25">Z</text>
      </g>
    );
  }
  if (mood === 'sad') {
    return <path className="wk-tear" d={`M${fx - eyeDX - 5},${fy + 8} q-5,8 0,11 q5,-3 0,-11 Z`} fill="hsl(200 90% 72%)" stroke={pal.ink} strokeWidth="2" />;
  }
  if (mood === 'starving') {
    return <path className="wk-sweat" d={`M${fx + eyeDX + 20},${fy - 24} q-6,10 0,13 q6,-3 0,-13 Z`} fill="hsl(200 90% 78%)" stroke={pal.ink} strokeWidth="2" />;
  }
  if (mood === 'sick') {
    return <ellipse cx={fx} cy={fy - 2} rx={eyeDX + 14} ry="17" fill="hsl(105 65% 42% / 0.14)" />;
  }
  return null;
}

function Halo({ model }) {
  return <ellipse className="wk-halo" cx="100" cy={model.anchors.topY - 16} rx="20" ry="5.5" fill="none" stroke="hsl(48 96% 58%)" strokeWidth="4.5" />;
}

const HEART = 'M0,3 C-2,-1 -8,-1 -8,4 C-8,8 -3,11 0,14 C3,11 8,8 8,4 C8,-1 2,-1 0,3 Z';
const SPARK = 'M0,-9 Q0,0 9,0 Q0,0 0,9 Q0,0 -9,0 Q0,0 0,-9 Z';

function ReactionFx({ type, model }) {
  const top = model.anchors.topY;
  if (type === 'pet') {
    return (
      <g className="wk-fx">
        {[[70, top - 4, 0], [128, top - 10, 0.15], [100, top - 22, 0.3]].map(([x, y, d], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(1.4)`}>
            <path className="wk-heart" style={{ animationDelay: `${d}s` }} d={HEART} fill="hsl(350 90% 66%)" stroke="hsl(350 60% 30%)" strokeWidth="1.6" />
          </g>
        ))}
      </g>
    );
  }
  if (type === 'eat') {
    const [fx, fy] = model.face;
    return (
      <g className="wk-fx">
        {[[-10, 0], [6, 0.12], [14, 0.24], [-3, 0.36]].map(([dx, d], i) => (
          <circle key={i} className="wk-crumb" style={{ animationDelay: `${d}s` }} cx={fx + dx} cy={fy + 24} r="3.2" fill="hsl(38 85% 60%)" stroke="hsl(30 50% 30%)" strokeWidth="1.5" />
        ))}
      </g>
    );
  }
  return (
    <g className="wk-fx">
      {[[52, top + 10, 0], [150, top + 4, 0.1], [40, top + 60, 0.2], [162, top + 54, 0.3], [100, top - 18, 0.15]].map(([x, y, d], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path className="wk-spark" style={{ animationDelay: `${d}s` }} d={SPARK} fill={i % 2 ? 'hsl(48 96% 60%)' : model.pal.accent} stroke={model.pal.ink} strokeWidth="1.5" />
        </g>
      ))}
    </g>
  );
}

// Atajo para un Wokamon ya descrito por describe().
export function CreatureOf({ wok, ...rest }) {
  return (
    <Creature
      genotype={wok.genotype}
      mood={wok.status}
      stage={wok.stage}
      seed={wok.id}
      label={`${wok.name}, ${wok.stage?.toLowerCase()}`}
      {...rest}
    />
  );
}
