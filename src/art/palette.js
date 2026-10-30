// Paleta de cada criatura a partir de sus genes de color, ajustada para que siempre se vea bien.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const hsl = (h, s, l, a) => (a === undefined ? `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)` : `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`);

export function creaturePalette(colors, { ghost = false, elder = false } = {}) {
  if (ghost) {
    return {
      body: hsl(225, 40, 94), bodyTop: hsl(225, 50, 98), bodyBottom: hsl(225, 30, 84),
      belly: hsl(225, 30, 98), ink: hsl(228, 28, 42), accent: hsl(200, 60, 80), accentInk: hsl(228, 28, 42),
      cheek: hsl(220, 60, 85), inner: hsl(225, 40, 86), ivory: hsl(225, 30, 95), shade: hsl(228, 28, 42, 0.08), pattern: 0,
    };
  }
  const { primary, secondary, accentHue, pattern } = colors;
  const s = clamp(primary.s - (elder ? 18 : 0), 28, 92);
  const l = clamp(primary.l + (elder ? 4 : 0), 30, 82);
  const ink = hsl(primary.h, clamp(s * 0.7, 25, 60), clamp(l - 46, 9, 22));
  const bs = clamp(secondary.s, 25, 90);
  const bl = clamp(secondary.l, 62, 93);
  return {
    body: hsl(primary.h, s, l),
    bodyTop: hsl(primary.h, s, clamp(l + 9, 0, 92)),
    bodyBottom: hsl(primary.h, clamp(s + 4, 0, 100), clamp(l - 9, 18, 80)),
    belly: hsl(secondary.h, bs, bl),
    inner: hsl(secondary.h, clamp(bs + 10, 0, 95), clamp(bl - 8, 55, 88)),
    ink,
    accent: hsl(accentHue, 82, 60),
    accentInk: hsl(accentHue, 60, 28),
    ivory: hsl(accentHue, 35, 92),
    cheek: hsl(350, 90, 72, 0.55),
    shade: hsl(primary.h, 40, 15, 0.12),
    pattern,
  };
}

export function eggPalette(colors) {
  const { primary, secondary, accentHue } = colors;
  return {
    shell: hsl(primary.h, clamp(primary.s, 30, 85), clamp(primary.l + 14, 70, 90)),
    shellShade: hsl(primary.h, clamp(primary.s, 30, 85), clamp(primary.l, 52, 78)),
    band: hsl(secondary.h, clamp(secondary.s, 35, 85), clamp(secondary.l - 10, 55, 80)),
    spot: hsl(accentHue, 70, 62),
    ink: hsl(primary.h, 40, 20),
  };
}

// Pseudoaleatorio estable a partir de un texto (para colocar manchas siempre igual).
export function seeded(text = '') {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}
