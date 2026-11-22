// Paleta de cada criatura a partir de sus genes de color, ajustada para que siempre se vea bien.
// Las sombras tiran a frío (violeta) y las luces a cálido (amarillo), como en una ilustración pintada.
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export const hsl = (h, s, l, a) => (a === undefined ? `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)` : `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`);

// Gira un tono hacia otro por el camino corto, como mucho `amount` grados.
export function towards(h, target, amount) {
  const diff = ((target - h + 540) % 360) - 180;
  const step = Math.sign(diff) * Math.min(Math.abs(diff), amount);
  return (h + step + 360) % 360;
}

export function creaturePalette(colors, { ghost = false, elder = false } = {}) {
  if (ghost) {
    const g = { h: 228, s: 45, l: 94 };
    return {
      body: hsl(g.h, g.s, g.l), bodyTop: hsl(g.h, 50, 98), bodyBottom: hsl(g.h, 30, 84), light: '#fff',
      shadeTint: hsl(240, 50, 40), belly: hsl(225, 30, 98), inner: hsl(225, 40, 86), ink: hsl(228, 28, 42),
      accent: hsl(200, 60, 80), accentInk: hsl(228, 28, 42), ivory: hsl(225, 30, 95), cheek: hsl(220, 60, 85),
      mark: hsl(228, 30, 86), markDark: false, patch: hsl(228, 30, 86), sock: hsl(225, 30, 98), pattern: 0, h: g.h,
    };
  }
  const { primary, secondary, accentHue, pattern } = colors;
  const h = primary.h;
  const s = clamp(primary.s - (elder ? 18 : 0), 30, 90);
  const l = clamp(primary.l + (elder ? 4 : 0), 34, 80);
  const ink = hsl(towards(h, 250, 25), clamp(s * 0.65, 28, 55), clamp(l - 48, 10, 20));
  const bs = clamp(secondary.s, 25, 90);
  const bl = clamp(secondary.l, 66, 93);
  const markDark = l > 42;
  return {
    h,
    body: hsl(h, s, l),
    bodyTop: hsl(towards(h, 55, 10), s, clamp(l + 6, 0, 90)),
    bodyBottom: hsl(towards(h, 255, 14), clamp(s + 6, 0, 100), clamp(l - 12, 20, 76)),
    light: hsl(towards(h, 55, 20), clamp(s + 10, 0, 100), clamp(l + 22, 0, 96)),
    shadeTint: hsl(towards(h, 255, 40), 55, clamp(l - 30, 14, 40)),
    belly: hsl(secondary.h, bs, bl),
    inner: hsl(secondary.h, clamp(bs + 10, 0, 95), clamp(bl - 10, 55, 86)),
    ink,
    accent: hsl(accentHue, 82, 62),
    accentDeep: hsl(accentHue, 70, 42),
    accentInk: hsl(accentHue, 60, 28),
    ivory: hsl(towards(accentHue, 50, 40), 40, 93),
    cheek: hsl(350, 92, 72, 0.55),
    mark: markDark ? hsl(towards(h, accentHue, 20), clamp(s + 10, 25, 95), clamp(l - 28, 16, 52)) : hsl(towards(h, accentHue, 20), clamp(s - 10, 15, 80), clamp(l + 34, 60, 94)),
    markDark,
    // Parche de un ojo: claro (como un perrito) salvo en cuerpos muy claros, donde va en tono tostado.
    patch: l > 70 ? hsl(towards(h, 30, 40), 45, l - 26) : hsl(towards(secondary.h, h, 20), 30, 95),
    sock: hsl(secondary.h, clamp(bs - 15, 10, 70), clamp(bl + 4, 80, 97)),
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
