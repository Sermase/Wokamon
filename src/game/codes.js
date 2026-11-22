// Códigos para regalar Wokamon/huevos o compartir un Wokamon para cruzar.
// Formato: WOKA-<base64url(JSON)>. Se aceptan también los códigos base64 de la versión 1.

const PREFIX = 'WOKA-';

function toBase64(text) {
  if (typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  return Buffer.from(text, 'utf8').toString('base64');
}

function fromBase64(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function encodeCode(payload) {
  const b64 = toBase64(JSON.stringify({ v: 2, ...payload }));
  return PREFIX + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeCode(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim().replace(/\s+/g, '');
  if (text.toUpperCase().startsWith(PREFIX)) text = text.slice(PREFIX.length);
  text = text.replace(/-/g, '+').replace(/_/g, '/');
  while (text.length % 4) text += '=';
  try {
    const data = JSON.parse(fromBase64(text));
    if (!data || typeof data !== 'object') return null;
    // Códigos v1: { type: 'wokamon', wokamon } | { type: 'egg', egg }
    if (data.type === 'wokamon' && data.wokamon) return { type: 'creature', creature: data.wokamon };
    if (data.type === 'egg' && data.egg) return { type: 'egg', egg: data.egg };
    if (['creature', 'egg', 'partner'].includes(data.type)) return data;
    return null;
  } catch {
    return null;
  }
}

// Huella corta para no canjear dos veces el mismo regalo.
export function codeFingerprint(raw) {
  let h = 2166136261;
  const text = String(raw).trim();
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
