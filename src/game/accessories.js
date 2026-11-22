// Accesorios que se compran con cristales. Cada Wokamon lleva como mucho uno por hueco.
export const ACCESSORIES = [
  { id: 'flower', name: 'Flor', price: 10, slot: 'head' },
  { id: 'bow', name: 'Lazo', price: 15, slot: 'head' },
  { id: 'party', name: 'Gorro de fiesta', price: 20, slot: 'head' },
  { id: 'beanie', name: 'Gorro de lana', price: 25, slot: 'head' },
  { id: 'scarf', name: 'Bufanda', price: 25, slot: 'neck' },
  { id: 'sunglasses', name: 'Gafas de sol', price: 30, slot: 'face' },
  { id: 'tophat', name: 'Chistera', price: 40, slot: 'head' },
  { id: 'crown', name: 'Corona', price: 60, slot: 'head' },
];

export const SLOTS = ['head', 'face', 'neck'];

export function accessoryById(id) {
  return ACCESSORIES.find((a) => a.id === id) || null;
}

// Limpia el equipo guardado: solo accesorios que existen y en su hueco.
export function sanitizeOutfit(outfit) {
  const clean = {};
  if (!outfit || typeof outfit !== 'object') return clean;
  for (const slot of SLOTS) {
    const item = accessoryById(outfit[slot]);
    if (item && item.slot === slot) clean[slot] = item.id;
  }
  return clean;
}
