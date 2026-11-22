import { useEffect, useId, useMemo, useState } from 'react';
import { getColors, getPhenotype, sanitizeGenotype } from '../game/genetics.js';
import { BODY_SHAPES, PROPORTIONS } from './shapes.js';
import { creaturePalette, eggPalette, seeded } from './palette.js';
import { HeadAccessory, ScarfBand, ScarfTail, Sunglasses } from './Accessory.jsx';
import './creature.css';

const BOTTOM = 177;
const GROUND = 183;
const OUT = 5; // contorno de la silueta
const MID = 4.2; // extremidades y apéndices
const FINE = 2.6; // detalles interiores
const EYE_DARK = 'hsl(245 34% 12%)';
const MOUTH_IN = 'hsl(350 55% 30%)';
const TONGUE = 'hsl(350 85% 70%)';
const LEAF = { fill: 'hsl(128 52% 54%)', ink: 'hsl(140 45% 20%)', light: 'hsl(110 60% 72%)' };
const GOLD = 'hsl(46 95% 66%)';

// Gestos espontáneos según el ánimo (solo en escena, con movimiento completo).
const IDLE = { happy: ['bounce', 'spin', 'wiggle', 'yawn', 'bounce'], sad: ['sigh'], sick: ['sigh'] };
const DURATION = { pet: 1300, eat: 1500, play: 1100, level: 1600, bounce: 1000, spin: 950, wiggle: 1200, yawn: 1900, sigh: 1900 };

/**
 * Dibuja un Wokamon a partir de su genotipo.
 * mood: happy | sad | starving | sick | dead · stage: Niño | Adulto | Anciano | Fantasma
 * motion: full (en escena) | calm (tarjetas) | none (miniaturas estáticas)
 * reaction: { type, key } para animaciones puntuales · idle: gestos espontáneos
 * outfit: { head, face, neck } accesorios puestos · age: días de vida (los recién nacidos llevan cáscara)
 */
export function Creature({
  genotype, mood = 'happy', stage = 'Adulto', seed = 'wk', sleeping = false, motion = 'full',
  reaction = null, idle = false, outfit = null, age = null, label, className = '', onClick,
}) {
  const rawId = useId();
  const gid = (name) => `${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}-${name}`;
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (reaction) setActive(reaction);
  }, [reaction?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!active) return undefined;
    const t = setTimeout(() => setActive(null), DURATION[active.type] || 1300);
    return () => clearTimeout(t);
  }, [active?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const pool = IDLE[mood];
    if (!idle || motion !== 'full' || sleeping || !pool) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let timer;
    const next = () => {
      timer = setTimeout(() => {
        if (!document.hidden) {
          const type = pool[Math.floor(Math.random() * pool.length)];
          setActive((cur) => cur || { type, key: `idle${Date.now()}` });
        }
        next();
      }, 5500 + Math.random() * 6500);
    };
    next();
    return () => clearTimeout(timer);
  }, [idle, motion, sleeping, mood]);

  const model = useMemo(
    () => buildModel(genotype, { mood, stage, seed, sleeping, outfit, age }),
    [genotype, mood, stage, seed, sleeping, outfit?.head, outfit?.face, outfit?.neck, age], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const { p, pal, ghost } = model;
  const r = active?.type;

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
      style={{ '--wk-delay': `${model.delay}s` }}
    >
      <Defs model={model} gid={gid} />
      <ellipse className="wk-shadow" cx="100" cy={GROUND} rx={44 * model.sx * model.stageScale} ry="6.5" fill={pal.ink} opacity={ghost ? 0.08 : 0.16} />

      <g className="wk-stage" transform={model.stageTf}>
        <g className="wk-hop">
          <g className="wk-breath">
            {!ghost && p.wings !== 'none' && <Wings model={model} />}
            {!ghost && <Legs model={model} />}
            {ghost && <GhostSkirt model={model} />}
            {!ghost && p.tailType !== 'none' && <Tail model={model} />}
            <TopBack model={model} />
            <Body model={model} gid={gid} />
            {model.head && <Head model={model} gid={gid} />}
            {model.shell && <ShellHat model={model} />}
            {p.topAppendage === 'sprouts' && !ghost && !model.outfit.head && <Sprout at={model.anchors.crown} k={model.appScale} />}
            {!ghost && <Feet model={model} />}
            {!ghost && <Arms model={model} reaction={r} />}
            <Face model={model} gid={gid} reaction={r} />
            {model.outfit.head && <HeadAccessory id={model.outfit.head} x={model.anchors.crown[0]} y={model.anchors.topY} k={model.accScale} ink={pal.ink} pal={pal} />}
            {model.outfit.neck && <ScarfTail x={model.scarfTail[0]} y={model.scarfTail[1]} pal={pal} ink={pal.ink} />}
            <StatusFx model={model} />
          </g>
        </g>
        {ghost && <Halo model={model} />}
        {r && <ReactionFx type={r} model={model} />}
      </g>
    </svg>
  );
}

// ---------- Modelo geométrico ----------

function buildModel(rawGenotype, { mood, stage, seed, sleeping, outfit, age }) {
  // Acepta genotipos incompletos (partidas antiguas, códigos, constantes) sin romper el dibujo.
  const genotype = sanitizeGenotype(rawGenotype);
  const p = getPhenotype(genotype);
  const colors = getColors(genotype);
  const ghost = mood === 'dead' || stage === 'Fantasma';
  const pal = creaturePalette(colors, { ghost, elder: stage === 'Anciano' });
  const shape = BODY_SHAPES[p.bodyBase] || BODY_SHAPES.round;
  const [psx, psy] = PROPORTIONS[p.bodyProportion] || [1, 1];
  const semi = p.headMerge === 'semi-separated';
  const sx = psx * (semi ? 0.94 : 1);
  const sy = psy * (semi ? 0.74 : 1);
  const lift = ghost ? 8 : p.limbType === 'long' ? 15 : p.limbType === 'springy' ? 12 : 0;
  const P = ([x, y]) => [100 + (x - 100) * sx, BOTTOM + (y - BOTTOM) * sy - lift];
  const toLocalY = (y) => BOTTOM + (y + lift - BOTTOM) / sy;
  const bodyTf = `translate(${100 - 100 * sx} ${BOTTOM - BOTTOM * sy - lift}) scale(${sx} ${sy})`;
  const topY = P([100, shape.top])[1];
  const kid = stage === 'Niño';

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
      crown: [100, head.cy - r + 1],
      topY: head.cy - r,
    };
  } else {
    face = P(shape.face);
    eyeDX = shape.eyeDX * sx;
    anchors = {
      ears: shape.ears.map(P),
      horns: shape.horns.map(P),
      antennae: shape.antennae.map(P),
      crown: [P([100, shape.top])[0], topY + 1],
      topY,
    };
  }
  const H = BOTTOM - shape.top;
  anchors.arms = shape.arms.map(P);
  anchors.tail = P(shape.tail);
  const wingY = P([100, shape.top + H * (semi ? 0.3 : 0.4)])[1];
  anchors.wings = [[100 - 36 * sx, wingY], [100 + 36 * sx, wingY]];
  const [bcx, bcy, brx, bry] = shape.belly;
  const rand = seeded(seed);

  // Manchas: huecos repartidos por los lados y la espalda para no tapar la cara.
  const slots = [[54, 0.32], [146, 0.38], [48, 0.66], [152, 0.72], [114, 0.07], [80, 0.95], [126, 0.93]];
  const spots = slots.map(([x, f]) => [x + (rand() - 0.5) * 12, shape.top + H * f + (rand() - 0.5) * 10, 7 + rand() * 6]);
  const fur = Array.from({ length: 7 }, () => [60 + rand() * 80, shape.top + 16 + rand() * (H - 40)]);

  const cleanOutfit = ghost ? {} : (outfit || {});
  const scarfGlobalY = semi ? topY + 12 : face[1] + 30;
  const scarfLocalY = toLocalY(scarfGlobalY);

  return {
    p, pal, colors, ghost, shape, semi, sx, sy, lift, P, bodyTf, head, face, eyeDX, anchors, mood, stage, sleeping, kid,
    belly: { cx: bcx, cy: bcy, rx: brx, ry: bry },
    eyeScale: kid ? 1.18 : 1,
    appScale: kid ? 0.76 : 1,
    accScale: (semi ? psx : sx) * 1,
    stageScale: kid ? 0.8 : 1,
    stageTf: kid ? `translate(${100 - 100 * 0.8} ${GROUND - GROUND * 0.8}) scale(0.8)` : undefined,
    delay: -(rand() * 6).toFixed(2),
    spots,
    fur,
    outfit: cleanOutfit,
    scarfLocalY,
    scarfTail: [100 + 30 * sx, scarfGlobalY + 2],
    shell: !ghost && kid && age != null && age < 2 && !cleanOutfit.head,
  };
}

// ---------- Definiciones (degradados, recortes y máscaras de sombreado) ----------

function Defs({ model, gid }) {
  const { pal, shape, head } = model;
  const box = { x: -60, y: -60, width: 320, height: 320 };
  return (
    <defs>
      <linearGradient id={gid('body')} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={pal.bodyTop} />
        <stop offset="1" stopColor={pal.body} />
      </linearGradient>
      <radialGradient id={gid('glossy')} cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor={pal.accent} />
        <stop offset="0.55" stopColor={pal.accentInk} />
        <stop offset="1" stopColor={EYE_DARK} />
      </radialGradient>
      <clipPath id={gid('clip')} clipPathUnits="userSpaceOnUse"><path d={shape.d} /></clipPath>
      {/* Sombra: todo lo que queda fuera de la silueta desplazada hacia arriba a la izquierda. */}
      <mask id={gid('shade')} maskUnits="userSpaceOnUse" {...box}>
        <rect {...box} fill="#fff" />
        <path d={shape.d} transform="translate(-8 -10)" fill="#000" />
      </mask>
      {/* Luz de borde: lo que queda fuera de la silueta desplazada hacia abajo a la derecha. */}
      <mask id={gid('rim')} maskUnits="userSpaceOnUse" {...box}>
        <rect {...box} fill="#fff" />
        <path d={shape.d} transform="translate(4 5)" fill="#000" />
      </mask>
      {head && (
        <>
          <clipPath id={gid('hclip')} clipPathUnits="userSpaceOnUse"><circle cx={head.cx} cy={head.cy} r={head.r} /></clipPath>
          <mask id={gid('hshade')} maskUnits="userSpaceOnUse" {...box}>
            <rect {...box} fill="#fff" />
            <circle cx={head.cx - 6} cy={head.cy - 8} r={head.r} fill="#000" />
          </mask>
          <mask id={gid('hrim')} maskUnits="userSpaceOnUse" {...box}>
            <rect {...box} fill="#fff" />
            <circle cx={head.cx + 3} cy={head.cy + 4} r={head.r} fill="#000" />
          </mask>
        </>
      )}
    </defs>
  );
}

// Sombra fría abajo a la derecha y luz cálida arriba a la izquierda, sobre todo lo que haya dentro.
function Shading({ gid, prefix = '', model }) {
  const { pal, ghost, p } = model;
  const jelly = p.surfaceType === 'jelly';
  return (
    <>
      <rect x="-60" y="-60" width="320" height="320" fill={pal.shadeTint} opacity={ghost ? 0.1 : jelly ? 0.2 : 0.3} mask={`url(#${gid(`${prefix}shade`)})`} />
      <rect x="-60" y="-60" width="320" height="320" fill={pal.light} opacity={ghost ? 0.6 : 0.7} mask={`url(#${gid(`${prefix}rim`)})`} />
    </>
  );
}

// ---------- Cuerpo ----------

function Body({ model, gid }) {
  const { shape, pal, p, ghost, bodyTf, belly, outfit } = model;
  const tufts = !ghost && (p.surfaceType === 'plush' || p.surfaceType === 'fuzzy');
  const fuzzy = p.surfaceType === 'fuzzy';
  const jelly = p.surfaceType === 'jelly' && !ghost;
  const marks = ghost ? 'none' : p.markings;
  return (
    <g transform={bodyTf} className="wk-body">
      {tufts && (
        <>
          <path d={shape.d} fill="none" stroke={pal.ink} strokeWidth={fuzzy ? 17 : 13} strokeDasharray={fuzzy ? '0.01 7.5' : '0.01 9'} strokeLinecap="round" />
          <path d={shape.d} fill="none" stroke={pal.body} strokeWidth={fuzzy ? 11 : 7.5} strokeDasharray={fuzzy ? '0.01 7.5' : '0.01 9'} strokeLinecap="round" />
        </>
      )}
      <path d={shape.d} fill={`url(#${gid('body')})`} fillOpacity={jelly ? 0.84 : 1} />
      <g clipPath={`url(#${gid('clip')})`}>
        {marks === 'spots' && model.spots.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={pal.mark} />)}
        {marks === 'stripes' && <Stripes cx={100} top={shape.top} h={BOTTOM - shape.top} color={pal.mark} forehead={!model.semi} />}
        {!ghost && <Belly kind={p.bellyShape} {...belly} fill={pal.belly} stitch={p.surfaceType === 'plush' ? pal.ink : null} />}
        {fuzzy && <Fur points={model.fur} ink={pal.ink} />}
        {p.surfaceType === 'matte' && (
          <g fill={pal.ink} opacity="0.08">
            {model.spots.map(([x, y], i) => <circle key={i} cx={200 - x} cy={y + 8} r="1.7" />)}
            {model.fur.map(([x, y], i) => <circle key={`f${i}`} cx={x} cy={y} r="1.3" />)}
          </g>
        )}
        {outfit.neck === 'scarf' && <ScarfBand y={model.scarfLocalY} pal={pal} ink={pal.ink} />}
        <Shading gid={gid} model={model} />
        {(p.surfaceType === 'smooth' || jelly || ghost) && <Gloss top={shape.top} jelly={jelly} />}
        {jelly && (
          <g fill="#fff" opacity="0.5" className="wk-bubbles">
            <circle cx="130" cy={BOTTOM - 36} r="5" fill="none" stroke="#fff" strokeWidth="2" />
            <circle cx="118" cy={BOTTOM - 22} r="2.6" />
            <circle cx="70" cy={BOTTOM - 28} r="3.4" fill="none" stroke="#fff" strokeWidth="1.8" />
          </g>
        )}
      </g>
      <path d={shape.d} fill="none" stroke={tufts ? 'none' : pal.ink} strokeWidth={OUT} strokeLinejoin="round" />
    </g>
  );
}

function Gloss({ top, jelly, cx = 74 }) {
  return (
    <g fill="#fff">
      <ellipse cx={cx} cy={top + 25} rx={jelly ? 20 : 14} ry={jelly ? 10 : 7} transform={`rotate(-30 ${cx} ${top + 25})`} opacity={jelly ? 0.7 : 0.55} />
      <circle cx={cx + 19} cy={top + 14} r="3.4" opacity={jelly ? 0.85 : 0.6} />
    </g>
  );
}

function Stripes({ cx, top, h, color, forehead }) {
  const wedge = (x0, y, len, dir) => `M${x0},${y - 8} Q${x0 + dir * len * 0.7},${y - 3} ${x0 + dir * len},${y} Q${x0 + dir * len * 0.7},${y + 3} ${x0},${y + 8} Z`;
  const ys = [0.3, 0.5, 0.7].map((f) => top + h * f);
  return (
    <g fill={color}>
      {ys.map((y, i) => <path key={`l${i}`} d={wedge(cx - 72, y, 44 - i * 4, 1)} />)}
      {ys.map((y, i) => <path key={`r${i}`} d={wedge(cx + 72, y + 5, 44 - i * 4, -1)} />)}
      {forehead && [-11, 0, 11].map((dx) => (
        <path key={dx} d={`M${cx + dx - 4},${top - 2} Q${cx + dx},${top + (dx ? 10 : 15)} ${cx + dx},${top + (dx ? 13 : 18)} Q${cx + dx},${top + (dx ? 10 : 15)} ${cx + dx + 4},${top - 2} Z`} />
      ))}
    </g>
  );
}

function Fur({ points, ink }) {
  return (
    <g fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.3">
      {points.map(([x, y], i) => <path key={i} d={`M${x - 4},${y + 3} q1,-5 4,-7 M${x + 1},${y + 4} q1,-5 4,-7`} />)}
    </g>
  );
}

function Belly({ kind, cx, cy, rx, ry, fill, stitch }) {
  if (kind === 'none') return null;
  const stitchProps = stitch ? { stroke: stitch, strokeOpacity: 0.5, strokeWidth: 1.8, strokeDasharray: '3.5 4', strokeLinecap: 'round' } : {};
  if (kind === 'heart') {
    const s = rx / 30;
    return <path transform={`translate(${cx} ${cy - 4}) scale(${s})`} d="M0,-8 C-6,-22 -32,-20 -30,0 C-28,16 -10,26 0,32 C10,26 28,16 30,0 C32,-20 6,-22 0,-8 Z" fill={fill} {...stitchProps} strokeWidth={stitch ? 1.8 / s : undefined} />;
  }
  if (kind === 'teardrop') {
    return <path d={`M${cx},${cy - ry * 1.6} C${cx + rx * 0.5},${cy - ry * 0.6} ${cx + rx},${cy} ${cx + rx * 0.9},${cy + ry * 0.6} C${cx + rx * 0.7},${cy + ry * 1.3} ${cx - rx * 0.7},${cy + ry * 1.3} ${cx - rx * 0.9},${cy + ry * 0.6} C${cx - rx},${cy} ${cx - rx * 0.5},${cy - ry * 0.6} ${cx},${cy - ry * 1.6} Z`} fill={fill} {...stitchProps} />;
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
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} {...stitchProps} />;
}

function Head({ model, gid }) {
  const { head, pal, p, ghost } = model;
  const jelly = p.surfaceType === 'jelly' && !ghost;
  const tufts = !ghost && (p.surfaceType === 'plush' || p.surfaceType === 'fuzzy');
  const marks = ghost ? 'none' : p.markings;
  return (
    <g className="wk-head">
      {tufts && (
        <>
          <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={pal.ink} strokeWidth="13" strokeDasharray="0.01 8" strokeLinecap="round" />
          <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={pal.body} strokeWidth="8" strokeDasharray="0.01 8" strokeLinecap="round" />
        </>
      )}
      <circle cx={head.cx} cy={head.cy} r={head.r} fill={`url(#${gid('body')})`} fillOpacity={jelly ? 0.86 : 1} />
      <g clipPath={`url(#${gid('hclip')})`}>
        {marks === 'stripes' && <Stripes cx={head.cx} top={head.cy - head.r + 1} h={head.r * 2} color={pal.mark} forehead />}
        {marks === 'spots' && <circle cx={head.cx + head.r * 0.7} cy={head.cy - head.r * 0.6} r={head.r * 0.32} fill={pal.mark} />}
        <Shading gid={gid} prefix="h" model={model} />
        {(p.surfaceType === 'smooth' || jelly) && <Gloss top={head.cy - head.r} jelly={jelly} cx={head.cx - head.r * 0.5} />}
      </g>
      <circle cx={head.cx} cy={head.cy} r={head.r} fill="none" stroke={tufts ? 'none' : pal.ink} strokeWidth={OUT} />
    </g>
  );
}

// ---------- Apéndices de la cabeza ----------

const scaleAt = (x, y, k) => (k === 1 ? undefined : `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`);

function TopBack({ model }) {
  const { p, pal, anchors, mood, ghost, sleeping, appScale: k, outfit } = model;
  const droop = ghost || sleeping || mood === 'sad' || mood === 'starving' || mood === 'sick';
  const socks = p.markings === 'socks' && !ghost;
  const kind = p.topAppendage;

  if (kind === 'ears') {
    return (
      <g className="wk-ears">
        {anchors.ears.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          return (
            <g key={i} className={`wk-ear wk-ear--${i}`} style={{ transformOrigin: `${x}px ${y + 6}px` }}>
              <g transform={`translate(${x} ${y}) rotate(${side * (droop ? 58 : 22)}) scale(${k})`}>
                <path d="M-17,10 C-18,-10 -10,-30 0,-35 C10,-30 18,-10 17,10 Z" fill={pal.body} />
                <path d="M-8.5,6 C-9.5,-8 -5,-21 0,-25 C5,-21 9.5,-8 8.5,6 Z" fill={pal.inner} />
                {socks && <path d="M-9,-22 C-6,-29 -3,-33 0,-35 C3,-33 6,-29 9,-22 Q0,-18 -9,-22 Z" fill={pal.sock} />}
                <path d="M3,8 C14,4 16,-8 12,-18" fill="none" stroke={pal.shadeTint} strokeWidth="5" opacity="0.25" strokeLinecap="round" />
                <path d="M-17,10 C-18,-10 -10,-30 0,-35 C10,-30 18,-10 17,10" fill="none" stroke={pal.ink} strokeWidth={MID + 0.4} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            </g>
          );
        })}
      </g>
    );
  }
  if (kind === 'bunny') {
    return (
      <g className="wk-ears">
        {anchors.antennae.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          const flop = droop ? side * 75 : side * (i === 1 && mood === 'happy' ? 18 : 9);
          return (
            <g key={i} className={`wk-ear wk-ear--${i}`} style={{ transformOrigin: `${x}px ${y + 8}px` }}>
              <g transform={`translate(${x} ${y + 6}) rotate(${flop}) scale(${k})`}>
                <path d="M-11,8 C-15,-20 -13,-50 0,-57 C13,-50 15,-20 11,8 Z" fill={pal.body} />
                <path d="M-5,2 C-7,-20 -6,-42 0,-47 C6,-42 7,-20 5,2 Z" fill={pal.inner} />
                {socks && <path d="M-9,-40 C-6,-50 -3,-55 0,-57 C3,-55 6,-50 9,-40 Q0,-35 -9,-40 Z" fill={pal.sock} />}
                <path d="M-11,8 C-15,-20 -13,-50 0,-57 C13,-50 15,-20 11,8" fill="none" stroke={pal.ink} strokeWidth={MID + 0.4} strokeLinejoin="round" strokeLinecap="round" />
              </g>
            </g>
          );
        })}
      </g>
    );
  }
  if (kind === 'bear') {
    return (
      <g className="wk-ears">
        {anchors.ears.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          const cx = x + side * 3;
          const cy = y - 2;
          return (
            <g key={i} className={`wk-ear wk-ear--${i}`} style={{ transformOrigin: `${cx}px ${cy + 8}px` }}>
              <g transform={scaleAt(cx, cy + 8, k)}>
                <circle cx={cx} cy={cy} r="14" fill={socks ? pal.sock : pal.body} stroke={pal.ink} strokeWidth={MID + 0.4} />
                <circle cx={cx + side * 1} cy={cy + 1.5} r="7.5" fill={pal.inner} />
              </g>
            </g>
          );
        })}
      </g>
    );
  }
  if (kind === 'horns') {
    return (
      <g className="wk-horns">
        {anchors.horns.map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y + 6}) scale(${(i === 0 ? 1 : -1) * k} ${k})`}>
            <path d="M-7,8 C-8,-6 -9,-17 -17,-27 C-21,-32 -16,-37 -11,-34 C1,-27 7,-12 7,8 Z" fill={pal.ivory} stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
            <path d="M-7.5,-4 Q0,-7 6.5,-3 M-10,-15 Q-4,-18 2,-14" fill="none" stroke={pal.ink} strokeWidth={FINE} strokeLinecap="round" opacity="0.5" />
          </g>
        ))}
      </g>
    );
  }
  if (kind === 'antennae') {
    return (
      <g className="wk-antennae">
        {anchors.antennae.map(([x, y], i) => {
          const side = i === 0 ? -1 : 1;
          const tip = [x + side * 15 * k, y - 36 * k];
          return (
            <g key={i} className={`wk-antenna wk-antenna--${i}`} style={{ transformOrigin: `${x}px ${y}px` }}>
              <path d={`M${x},${y + 6} Q${x + side * 2},${y - 18 * k} ${tip[0]},${tip[1]}`} fill="none" stroke={pal.ink} strokeWidth={MID} strokeLinecap="round" />
              {!ghost && <circle className="wk-glow" cx={tip[0]} cy={tip[1]} r="13" fill={pal.accent} opacity="0.3" />}
              <circle cx={tip[0]} cy={tip[1]} r="7" fill={ghost ? pal.body : pal.accent} stroke={pal.ink} strokeWidth="3.5" />
              <circle cx={tip[0] - 2.2} cy={tip[1] - 2.2} r="2" fill="#fff" opacity="0.85" />
            </g>
          );
        })}
      </g>
    );
  }
  if (outfit.head) return null;
  if (kind === 'unicorn') {
    const [x] = anchors.crown;
    const y = anchors.topY + 9;
    return (
      <g className="wk-unicorn" transform={`translate(${x} ${y}) rotate(8) scale(${k})`}>
        <path d="M-9,4 L-1,-40 Q0,-43 1,-40 L9,4 Z" fill={ghost ? pal.body : GOLD} stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
        <path d="M-7,-7 L6,-12 M-5,-18 L4.5,-22 M-3,-29 L3,-31.5" stroke={pal.ink} strokeWidth={FINE} strokeLinecap="round" opacity="0.6" />
        <path d="M-4,-2 L-1,-30" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.6" />
        {!ghost && <path className="wk-twinkle" d="M14,-38 l1.6,4.4 4.4,1.6 -4.4,1.6 -1.6,4.4 -1.6,-4.4 -4.4,-1.6 4.4,-1.6 Z" fill="#fff" stroke={pal.ink} strokeWidth="1.4" />}
      </g>
    );
  }
  if (kind === 'crest') {
    const [x] = anchors.crown;
    const y = anchors.topY + 10;
    const feather = 'M0,4 C-8,-6 -7,-24 0,-33 C7,-24 8,-6 0,4 Z';
    return (
      <g className="wk-crest" style={{ transformOrigin: `${x}px ${y}px` }}>
        <g transform={`translate(${x} ${y}) scale(${k})`}>
          {[[-28, 0.92, -7], [28, 0.92, 7], [0, 1.18, 0]].map(([rot, sc, dx], i) => (
            <g key={i} transform={`translate(${dx} 0) rotate(${rot}) scale(${sc})`}>
              <path d={feather} fill={i === 2 ? pal.accent : pal.accentDeep} stroke={pal.ink} strokeWidth={MID / sc} strokeLinejoin="round" />
              <path d="M0,0 L0,-24" stroke="#fff" strokeWidth={2.2 / sc} strokeLinecap="round" opacity="0.5" />
            </g>
          ))}
        </g>
      </g>
    );
  }
  return null;
}

function Sprout({ at: [x, y], k }) {
  return (
    <g className="wk-sprout" style={{ transformOrigin: `${x}px ${y + 4}px` }}>
      <g transform={`translate(${x} ${y + 3}) scale(${k})`}>
        <path d="M0,2 C0,-6 1,-12 0,-18" fill="none" stroke={LEAF.ink} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M0,-15 C-5,-27 -19,-30 -24,-22 C-17,-13 -7,-12 0,-15 Z" fill={LEAF.fill} stroke={LEAF.ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M0,-17 C6,-31 23,-34 28,-24 C20,-14 8,-13 0,-17 Z" fill={LEAF.fill} stroke={LEAF.ink} strokeWidth="3" strokeLinejoin="round" />
        <path d="M3,-19 Q12,-25 21,-24" fill="none" stroke={LEAF.light} strokeWidth="2" strokeLinecap="round" />
      </g>
    </g>
  );
}

// Trocito de cáscara en la cabeza de los recién nacidos.
function ShellHat({ model }) {
  const egg = eggPalette(model.colors);
  const [x] = model.anchors.crown;
  const y = model.anchors.topY + 10;
  return (
    <g transform={`translate(${x - 4} ${y}) rotate(-10)`}>
      <path d="M-24,6 L-21,-6 C-17,-21 -8,-28 0,-28 C8,-28 17,-21 21,-6 L24,6 L17,0 L11,7 L5,0 L-1,7 L-8,0 L-15,7 Z" fill={egg.shell} stroke={model.pal.ink} strokeWidth={MID} strokeLinejoin="round" />
      <circle cx="-8" cy="-16" r="3.2" fill={egg.spot} />
      <circle cx="9" cy="-10" r="2.4" fill={egg.spot} />
      <path d="M-13,-17 Q-10,-23 -4,-25" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

// ---------- Alas ----------

function Wings({ model }) {
  const { p, pal, anchors, appScale: k } = model;
  const kind = p.wings;
  return (
    <g className={`wk-wings wk-wings--${kind}`}>
      {anchors.wings.map(([x, y], i) => {
        const side = i === 0 ? -1 : 1;
        let art;
        if (kind === 'angel') {
          art = (
            <>
              <path d="M0,4 C-6,-14 -22,-34 -46,-36 C-50,-30 -48,-24 -42,-21 C-50,-17 -50,-9 -42,-6 C-48,-1 -45,7 -36,7 C-36,12 -28,15 -20,12 C-12,14 -4,11 0,4 Z" fill="#fff" stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
              <path d="M-38,-22 C-30,-20 -22,-17 -14,-11 M-38,-7 C-30,-6 -22,-4 -14,-1 M-28,8 C-22,5 -16,3 -10,2" fill="none" stroke={pal.ink} strokeWidth={FINE} strokeLinecap="round" opacity="0.4" />
            </>
          );
        } else if (kind === 'dragon') {
          art = (
            <>
              <path d="M0,4 L-10,-30 Q-28,-42 -50,-34 Q-44,-26 -46,-16 Q-38,-18 -34,-8 Q-26,-12 -20,0 Q-10,-2 0,4 Z" fill={pal.accentDeep} stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
              <path d="M-10,-30 Q-24,-24 -46,-16 M-10,-30 Q-22,-18 -34,-8 M-10,-30 Q-16,-14 -20,0" fill="none" stroke={pal.ink} strokeWidth={FINE} strokeLinecap="round" opacity="0.55" />
              <path d="M-10,-30 L-13,-38 L-6,-33" fill={pal.ivory} stroke={pal.ink} strokeWidth="2.4" strokeLinejoin="round" />
            </>
          );
        } else {
          art = (
            <>
              <path d="M0,2 C-10,-20 -26,-40 -44,-36 C-56,-32 -48,-10 -30,-4 C-20,-1 -8,0 0,2 Z" fill={pal.accent} fillOpacity="0.55" stroke={pal.ink} strokeWidth={FINE + 0.6} strokeLinejoin="round" />
              <path d="M0,4 C-12,6 -28,10 -32,20 C-35,28 -22,30 -14,22 C-8,16 -3,10 0,4 Z" fill={pal.accent} fillOpacity="0.45" stroke={pal.ink} strokeWidth={FINE + 0.6} strokeLinejoin="round" />
              <circle cx="-36" cy="-26" r="4" fill="#fff" opacity="0.8" />
              <circle cx="-22" cy="18" r="2.6" fill="#fff" opacity="0.8" />
            </>
          );
        }
        return (
          <g key={i} className={`wk-wing wk-wing--${i}`} style={{ transformOrigin: `${x}px ${y}px` }}>
            <g transform={`translate(${x} ${y}) scale(${side === 1 ? -k : k} ${k})`}>{art}</g>
          </g>
        );
      })}
    </g>
  );
}

// ---------- Cola ----------

function Tail({ model }) {
  const { p, pal, anchors, appScale: k } = model;
  const [x, y] = anchors.tail;
  const socks = p.markings === 'socks';
  const tipColor = socks ? pal.sock : pal.belly;
  let art;
  if (p.tailType === 'pom') {
    art = (
      <>
        <circle cx="10" cy="-4" r="15" fill="none" stroke={pal.ink} strokeWidth="11" strokeDasharray="0.01 7" strokeLinecap="round" />
        <circle cx="10" cy="-4" r="15" fill={tipColor} stroke={tipColor} strokeWidth="6" strokeDasharray="0.01 7" strokeLinecap="round" />
        <circle cx="10" cy="-4" r="15" fill={tipColor} />
        <circle cx="5" cy="-9" r="4" fill="#fff" opacity="0.6" />
      </>
    );
  } else if (p.tailType === 'spike') {
    art = (
      <>
        <path d="M-12,-14 C4,-18 22,-12 40,6 C24,10 4,10 -12,8 Z" fill={pal.body} stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
        {[[6, -15], [18, -11], [29, -4]].map(([sx, sy], i) => (
          <path key={i} d={`M${sx - 5},${sy + 2} L${sx + 1},${sy - 9} L${sx + 6},${sy + 3} Z`} fill={pal.accent} stroke={pal.ink} strokeWidth="3" strokeLinejoin="round" />
        ))}
      </>
    );
  } else if (p.tailType === 'devil') {
    const d = 'M-8,0 C12,8 30,0 32,-16 C33,-26 28,-32 32,-40';
    art = (
      <>
        <path d={d} fill="none" stroke={pal.ink} strokeWidth="10" strokeLinecap="round" />
        <path d={d} fill="none" stroke={pal.body} strokeWidth="4.8" strokeLinecap="round" />
        <path d="M32,-58 C40,-48 44,-40 32,-36 C20,-40 24,-48 32,-58 Z" fill={pal.accentDeep} stroke={pal.ink} strokeWidth="3.6" strokeLinejoin="round" />
      </>
    );
  } else if (p.tailType === 'curly') {
    const d = 'M-8,0 C10,6 24,0 24,-12 C24,-22 12,-24 10,-15 C8,-7 18,-5 19,-11';
    art = (
      <>
        <path d={d} fill="none" stroke={pal.ink} strokeWidth="10.5" strokeLinecap="round" />
        <path d={d} fill="none" stroke={socks ? pal.sock : pal.body} strokeWidth="5.2" strokeLinecap="round" />
      </>
    );
  } else {
    art = (
      <>
        <path d="M-10,6 C10,10 34,0 38,-24 C41,-46 22,-58 10,-47 C22,-40 20,-24 6,-17 C-3,-12 -12,-8 -10,6 Z" fill={pal.body} stroke={pal.ink} strokeWidth={MID} strokeLinejoin="round" />
        <path d="M20,-50 C30,-48 36,-38 35,-28 C30,-34 24,-38 16,-38 C21,-42 22,-46 20,-50 Z" fill={tipColor} />
      </>
    );
  }
  return (
    <g className="wk-tail" style={{ transformOrigin: `${x - 6}px ${y}px` }}>
      <g transform={`translate(${x - 4} ${y}) scale(${k})`}>{art}</g>
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
      <path d={d} fill={pal.bodyBottom} stroke={pal.ink} strokeWidth={OUT} strokeLinejoin="round" />
    </g>
  );
}

// ---------- Patas y brazos ----------

function Legs({ model }) {
  const { p, pal, lift } = model;
  if (p.limbType !== 'long' && p.limbType !== 'springy') return null;
  const top = BOTTOM - lift - 10;
  return (
    <g className="wk-legs">
      {[78, 122].map((x) => (p.limbType === 'long' ? (
        <rect key={x} x={x - 6.5} y={top} width="13" height={GROUND - top - 3} rx="6.5" fill={pal.bodyBottom} stroke={pal.ink} strokeWidth={MID} />
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
  const fill = p.markings === 'socks' ? pal.sock : pal.bodyBottom;
  return (
    <g className="wk-feet">
      {xs.map((x, i) => {
        const rx = soft ? 15 : long ? 11.5 : 13.5;
        const ry = soft ? 9.5 : 7.8;
        return (
          <g key={i}>
            <ellipse cx={x} cy={cy} rx={rx} ry={ry} fill={fill} stroke={pal.ink} strokeWidth={MID} />
            <ellipse cx={x - 3} cy={cy - 3} rx={rx * 0.45} ry="2" fill="#fff" opacity="0.35" />
            <path d={`M${x - rx * 0.35},${cy + ry - 1} v-4 M${x + rx * 0.35},${cy + ry - 1} v-4`} stroke={pal.ink} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
          </g>
        );
      })}
    </g>
  );
}

function Arms({ model, reaction }) {
  const { p, pal, anchors, mood, sleeping } = model;
  const waving = mood === 'happy' && !sleeping;
  const cheer = reaction === 'level' || reaction === 'play';
  const fill = p.markings === 'socks' ? pal.sock : pal.body;
  return (
    <g className={`wk-arms ${cheer ? 'wk-arms--up' : ''}`}>
      {anchors.arms.map(([x, y], i) => {
        const side = i === 0 ? -1 : 1;
        const shoulder = [x - side * 3, y - 8];
        let art;
        if (p.limbType === 'long') {
          art = <ellipse cx={x + side * 6} cy={y + 8} rx="7.5" ry="19" transform={`rotate(${side * -22} ${x + side * 6} ${y + 8})`} fill={fill} stroke={pal.ink} strokeWidth={MID} />;
        } else if (p.limbType === 'springy') {
          const d = `M${x - side * 2},${y - 6} q${side * 10},-2 ${side * 9},6 q${side * -6},6 ${side * 2},10 q${side * 9},3 ${side * 6},10`;
          art = (
            <>
              <path d={d} fill="none" stroke={pal.ink} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
              <path d={d} fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          );
        } else if (p.limbType === 'soft') {
          art = (
            <>
              <circle cx={x + side * 3} cy={y + 4} r="11" fill={fill} stroke={pal.ink} strokeWidth={MID} />
              <circle cx={x + side * 3} cy={y + 7} r="4" fill={pal.inner} />
            </>
          );
        } else {
          art = <ellipse cx={x + side * 3} cy={y + 4} rx="8.5" ry="13" transform={`rotate(${side * -38} ${x + side * 3} ${y + 4})`} fill={fill} stroke={pal.ink} strokeWidth={MID} />;
        }
        return (
          <g key={i} className={`wk-arm wk-arm--${i} ${i === 1 && waving ? 'wk-wave' : ''}`} style={{ transformOrigin: `${shoulder[0]}px ${shoulder[1]}px` }}>
            {art}
          </g>
        );
      })}
    </g>
  );
}

// ---------- Cara ----------

function Face({ model, gid, reaction }) {
  const { face: [fx, fy], eyeDX, eyeScale, pal, ghost, sleeping, stage, p, outfit } = model;
  const mouthY = fy + 15 * eyeScale;
  const closed = (sleeping || reaction === 'yawn' || reaction === 'sigh') && !ghost;
  const marks = ghost ? 'none' : p.markings;
  const ringed = marks === 'mask' && pal.markDark;
  return (
    <g className="wk-face">
      <g className="wk-look">
        {marks === 'mask' && (
          <path
            d={`M${fx - eyeDX - 19},${fy - 3} C${fx - eyeDX - 16},${fy - 15} ${fx - 8},${fy - 14} ${fx},${fy - 8} C${fx + 8},${fy - 14} ${fx + eyeDX + 16},${fy - 15} ${fx + eyeDX + 19},${fy - 3} C${fx + eyeDX + 18},${fy + 11} ${fx + 6},${fy + 12} ${fx},${fy + 6} C${fx - 6},${fy + 12} ${fx - eyeDX - 18},${fy + 11} ${fx - eyeDX - 19},${fy - 3} Z`}
            fill={pal.mark}
          />
        )}
        {marks === 'patch' && (
          <path d={`M${fx - eyeDX - 20},${fy - 1} C${fx - eyeDX - 21},${fy - 21} ${fx - eyeDX + 16},${fy - 24} ${fx - eyeDX + 19},${fy - 5} C${fx - eyeDX + 22},${fy + 15} ${fx - eyeDX - 17},${fy + 19} ${fx - eyeDX - 20},${fy - 1} Z`} fill={pal.patch} />
        )}
        {!ghost && (
          <g>
            <ellipse cx={fx - eyeDX - 9} cy={fy + 11} rx="7.5" ry="4.5" fill={pal.cheek} />
            <ellipse cx={fx + eyeDX + 9} cy={fy + 11} rx="7.5" ry="4.5" fill={pal.cheek} />
            <circle cx={fx - eyeDX - 7} cy={fy + 9.5} r="1.4" fill="#fff" opacity="0.8" />
            <circle cx={fx + eyeDX + 11} cy={fy + 9.5} r="1.4" fill="#fff" opacity="0.8" />
          </g>
        )}
        {[-1, 1].map((side) => (
          <Eye key={side} cx={fx + side * eyeDX} cy={fy} side={side} model={model} gid={gid} closed={closed} ring={ringed} />
        ))}
        {stage === 'Anciano' && !ghost && !outfit.face && (
          <g>
            {[-1, 1].map((side) => (
              <path key={side} d={`M${fx + side * eyeDX - 10},${fy - 17} Q${fx + side * eyeDX},${fy - 24 - side} ${fx + side * eyeDX + 10},${fy - 17}`} fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 0.7px ${pal.ink})` }} />
            ))}
            <g fill="#fff" fillOpacity="0.16" stroke={pal.ink} strokeWidth="3">
              <circle cx={fx - eyeDX} cy={fy} r="14.5" />
              <circle cx={fx + eyeDX} cy={fy} r="14.5" />
            </g>
            <path d={`M${fx - eyeDX + 14},${fy - 2} Q${fx},${fy - 8} ${fx + eyeDX - 14},${fy - 2}`} fill="none" stroke={pal.ink} strokeWidth="3" strokeLinecap="round" />
            <path d={`M${fx - eyeDX - 8},${fy - 8} l5,-3 M${fx + eyeDX - 8},${fy - 8} l5,-3`} stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        )}
        {outfit.face === 'sunglasses' && <Sunglasses fx={fx} fy={fy} eyeDX={eyeDX} ink={pal.ink} />}
        <Mouth x={fx} y={mouthY} model={model} reaction={reaction} closed={closed} style={p.mouthStyle} />
      </g>
    </g>
  );
}

function Eye({ cx, cy, side, model, gid, closed, ring }) {
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
    return (
      <g>
        {ring && <ellipse cx={cx} cy={cy + 2} rx={12 * s} ry={8 * s} fill="#fff" opacity="0.9" />}
        <path d={`M${cx - 9 * s},${cy + 1} Q${cx},${cy + 8 * s} ${cx + 9 * s},${cy + 1}`} fill="none" stroke={ring ? EYE_DARK : pal.ink} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
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
  const clipId = gid(`eye${side}`);
  const clip = `url(#${clipId})`;

  const pupil = p.pupilStyle;
  // Reflejo de color en la parte baja del ojo: es lo que les da vida.
  const glow = <ellipse clipPath={clip} cx={icx} cy={icy + iry * 0.62} rx={irx * 0.78} ry={iry * 0.42} fill={pal.accent} opacity={pupil === 'slit' ? 0 : 0.6} />;
  let iris;
  if (pupil === 'slit') {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={pal.accent} />
        <ellipse clipPath={clip} cx={icx} cy={icy - iry * 0.55} rx={irx} ry={iry * 0.55} fill={pal.accentDeep} opacity="0.5" />
        <ellipse cx={icx} cy={icy} rx={irx * 0.22} ry={iry * 0.78} fill={EYE_DARK} />
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill="none" stroke={EYE_DARK} strokeWidth="2.6" />
        <circle cx={icx + irx * 0.38} cy={icy - iry * 0.48} r={2.4 * s} fill="#fff" />
      </>
    );
  } else if (pupil === 'glossy') {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={`url(#${gid('glossy')})`} />
        {glow}
        <ellipse cx={icx + irx * 0.28} cy={icy - iry * 0.36} rx={irx * 0.42} ry={iry * 0.38} fill="#fff" />
        <circle cx={icx - irx * 0.38} cy={icy + iry * 0.42} r={1.8 * s} fill="#fff" />
      </>
    );
  } else if (pupil === 'star') {
    const st = (x, y, r) => `M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`;
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={EYE_DARK} />
        {glow}
        <path d={st(icx + irx * 0.25, icy - iry * 0.3, 5.8 * s)} fill="#fff" />
        <circle cx={icx - irx * 0.4} cy={icy + iry * 0.3} r={1.6 * s} fill="#fff" />
      </>
    );
  } else {
    iris = (
      <>
        <ellipse cx={icx} cy={icy} rx={irx} ry={iry} fill={EYE_DARK} />
        {glow}
        <circle cx={icx + irx * 0.3} cy={icy - iry * 0.36} r={3.9 * s} fill="#fff" />
        <circle cx={icx - irx * 0.36} cy={icy + iry * 0.18} r={1.7 * s} fill="#fff" />
      </>
    );
  }

  const sad = mood === 'sad' || mood === 'starving' || shape === 'droopy';
  const heavy = shape === 'sleepy' || mood === 'sick';
  const lidFill = ring ? '#fff' : pal.body;
  return (
    <g>
      <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
        <ellipse cx={wide ? cx : icx} cy={wide ? cy : icy} rx={rx + 0.6} ry={ry + 0.6} />
      </clipPath>
      {ring && <ellipse cx={cx} cy={cy} rx={rx + 4.5} ry={ry + 4} fill="#fff" />}
      <g className="wk-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {wide && <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={EYE_DARK} strokeWidth="2.8" />}
        {iris}
        {shape === 'sparkle' && (
          <path d={`M${cx + side * (rx + 7)},${cy - ry - 2} l1.5,4 4,1.5 -4,1.5 -1.5,4 -1.5,-4 -4,-1.5 4,-1.5 Z`} fill={pal.accent} stroke={pal.ink} strokeWidth="1.2" />
        )}
      </g>
      {heavy && (
        <>
          <path clipPath={clip} d={`M${cx - rx - 3},${cy - ry - 4} L${cx + rx + 3},${cy - ry - 4} L${cx + rx + 3},${cy - ry * 0.12} Q${cx},${cy + ry * 0.24} ${cx - rx - 3},${cy - ry * 0.12} Z`} fill={lidFill} />
          <path d={`M${cx - rx - 1.5},${cy - ry * 0.16} Q${cx},${cy + ry * 0.2} ${cx + rx + 1.5},${cy - ry * 0.16}`} fill="none" stroke={pal.ink} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
      {sad && !heavy && (
        <>
          <path clipPath={clip} d={`M${cx + side * (rx + 4)},${cy - ry * 0.05} L${cx - side * (rx + 4)},${cy - ry - 5} L${cx + side * (rx + 4)},${cy - ry - 5} Z`} fill={lidFill} />
          <path d={`M${cx + side * (rx + 1.5)},${cy - ry * 0.08} L${cx - side * (rx * 0.75)},${cy - ry * 0.92}`} fill="none" stroke={pal.ink} strokeWidth="3.2" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Mouth({ x, y, model, reaction, closed, style }) {
  const { pal, mood, ghost, sleeping } = model;
  const ink = pal.ink;
  const common = { fill: 'none', stroke: ink, strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (reaction === 'eat') {
    return (
      <g className="wk-chomp" style={{ transformOrigin: `${x}px ${y - 2}px` }}>
        <ellipse cx={x} cy={y + 2} rx="8" ry="7.5" fill={MOUTH_IN} stroke={ink} strokeWidth="3.2" />
        <ellipse cx={x} cy={y + 6} rx="4.5" ry="2.6" fill={TONGUE} />
      </g>
    );
  }
  if (reaction === 'yawn') {
    return (
      <g className="wk-yawn" style={{ transformOrigin: `${x}px ${y}px` }}>
        <ellipse cx={x} cy={y + 4} rx="7" ry="10" fill={MOUTH_IN} stroke={ink} strokeWidth="3.2" />
        <ellipse cx={x} cy={y + 9} rx="4" ry="3" fill={TONGUE} />
      </g>
    );
  }
  if (ghost) return <path d={`M${x - 6},${y + 2} Q${x - 3},${y - 1} ${x},${y + 2} Q${x + 3},${y + 5} ${x + 6},${y + 2}`} {...common} />;
  if (reaction === 'sigh') return <ellipse cx={x} cy={y + 2} rx="3" ry="3.4" fill={MOUTH_IN} stroke={ink} strokeWidth="2.6" />;
  if (closed && sleeping) return <ellipse cx={x} cy={y + 1} rx="3" ry="3.6" fill={MOUTH_IN} stroke={ink} strokeWidth="2.6" className="wk-snore" />;
  if (mood === 'sad') return <path d={`M${x - 7},${y + 4} Q${x},${y - 3} ${x + 7},${y + 4}`} {...common} />;
  if (mood === 'starving') return <ellipse cx={x} cy={y + 2} rx="4.5" ry="5.5" fill={MOUTH_IN} stroke={ink} strokeWidth="3" />;
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
  if (style === 'open-smile' || ['play', 'level', 'bounce', 'spin', 'wiggle', 'pet'].includes(reaction)) {
    return (
      <g>
        <path d={`M${x - 9},${y - 2} Q${x},${y - 1} ${x + 9},${y - 2} Q${x + 8.5},${y + 10.5} ${x},${y + 11} Q${x - 8.5},${y + 10.5} ${x - 9},${y - 2} Z`} fill={MOUTH_IN} stroke={ink} strokeWidth="3.2" strokeLinejoin="round" />
        <path d={`M${x - 5},${y + 9.6} Q${x},${y + 4} ${x + 5},${y + 9.6}`} fill={TONGUE} />
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
  const [fx, fy] = model.face;
  const ink = model.pal.ink;
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
    const mouthY = fy + 15 * model.eyeScale;
    return (
      <g className="wk-fx">
        <g transform={`translate(${fx} ${mouthY})`}>
          <g className="wk-food">
            <circle cx="0" cy="0" r="9" fill="hsl(352 80% 60%)" stroke={ink} strokeWidth="3" />
            <path d="M0,-8 C1,-13 6,-15 9,-13 C7,-9 3,-8 0,-8 Z" fill={LEAF.fill} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
            <circle cx="-3" cy="-3" r="2.4" fill="#fff" opacity="0.8" />
          </g>
        </g>
        {[[-10, 0.75], [7, 0.85], [14, 0.95], [-3, 1.05]].map(([dx, d], i) => (
          <circle key={i} className="wk-crumb" style={{ animationDelay: `${d}s` }} cx={fx + dx} cy={mouthY + 10} r="2.8" fill="hsl(352 80% 66%)" stroke={ink} strokeWidth="1.4" />
        ))}
      </g>
    );
  }
  if (type === 'sigh') {
    return (
      <g className="wk-fx">
        <g transform={`translate(${fx + 16} ${fy + 22})`}>
          <path className="wk-puff" d="M0,0 a6,6 0 0 1 10,-4 a7,7 0 0 1 12,4 a5,5 0 0 1 -2,9 h-18 a5,5 0 0 1 -2,-9 z" fill="#fff" stroke={ink} strokeWidth="2.2" />
        </g>
      </g>
    );
  }
  if (type !== 'level' && type !== 'play') return null;
  return (
    <g className="wk-fx">
      {[[52, top + 10, 0], [150, top + 4, 0.1], [40, top + 60, 0.2], [162, top + 54, 0.3], [100, top - 18, 0.15]].map(([x, y, d], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path className="wk-spark" style={{ animationDelay: `${d}s` }} d={SPARK} fill={i % 2 ? 'hsl(48 96% 60%)' : model.pal.accent} stroke={ink} strokeWidth="1.5" />
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
      outfit={wok.outfit}
      age={wok.age}
      label={`${wok.name}, ${wok.stage?.toLowerCase()}`}
      {...rest}
    />
  );
}
