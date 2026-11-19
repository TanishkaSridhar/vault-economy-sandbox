import { hashString } from './toon'

export type Species =
  | 'dog' | 'bear' | 'rabbit' | 'frog' | 'duck' | 'koala' | 'sheep' | 'raccoon'
  | 'fox' | 'cat' | 'pug' | 'deer' | 'ferret' | 'panda' | 'wolf' | 'mouse'

export type Outfit = 'shirt' | 'overalls' | 'apron' | 'dress' | 'vest'
export type Hat = 'none' | 'straw' | 'beanie' | 'bandana' | 'beret' | 'flower' | 'cap' | 'leaf'

export interface Look {
  species: Species
  fur: string      // main fur / skin
  accent: string   // ears tips, patches, mask, beak…
  muzzle: string
  shirt: string
  lower: string    // trousers / overalls / dress / apron / vest colour
  outfit: Outfit
  hat: Hat
  hatColor: string
  scarf?: string
}

// One original villager per default agent. Roles are NOT stored here: they always come from the run data.
const LOOKS: Record<string, Look> = {
  Meena:   { species: 'sheep',   fur: '#fbf6ec', accent: '#e3d6c3', muzzle: '#f4d7bb', shirt: '#f3a7a0', lower: '#7fb2c9', outfit: 'overalls', hat: 'straw',   hatColor: '#f0cf7a' },
  Kumar:   { species: 'bear',    fur: '#b97a4b', accent: '#8a5634', muzzle: '#ecc89c', shirt: '#8bb64c', lower: '#8a6a52', outfit: 'apron',    hat: 'cap',     hatColor: '#3f7a52' },
  Selvi:   { species: 'rabbit',  fur: '#f4e5cc', accent: '#f3b7ae', muzzle: '#fff8ee', shirt: '#f6c64c', lower: '#e8744f', outfit: 'dress',    hat: 'flower',  hatColor: '#f3a7a0' },
  Ganesh:  { species: 'frog',    fur: '#9ccc6a', accent: '#7aab4e', muzzle: '#eaf3c4', shirt: '#f7e8cb', lower: '#5d8fb8', outfit: 'overalls', hat: 'none',    hatColor: '#000000' },
  Lakshmi: { species: 'duck',    fur: '#ffffff', accent: '#f2a33a', muzzle: '#f2a33a', shirt: '#7db7a6', lower: '#f5c99d', outfit: 'apron',    hat: 'bandana', hatColor: '#e8624a' },
  Anita:   { species: 'koala',   fur: '#a9b6c4', accent: '#e6ebf0', muzzle: '#e6ebf0', shirt: '#f5c99d', lower: '#c98a5a', outfit: 'vest',     hat: 'none',    hatColor: '#000000' },
  Murugan: { species: 'dog',     fur: '#e9b15a', accent: '#c98a3a', muzzle: '#f7e2bd', shirt: '#9fc7b0', lower: '#7a6048', outfit: 'shirt',    hat: 'straw',   hatColor: '#f0cf7a' },
  Devi:    { species: 'raccoon', fur: '#8f8a86', accent: '#4d4642', muzzle: '#efe7dc', shirt: '#c79a6a', lower: '#7e9d4a', outfit: 'overalls', hat: 'leaf',    hatColor: '#5e9a4a' },
  Ravi:    { species: 'fox',     fur: '#f0913a', accent: '#fff3e2', muzzle: '#fff3e2', shirt: '#5d8fb8', lower: '#f1e4c8', outfit: 'shirt',    hat: 'none',    hatColor: '#000000', scarf: '#e8624a' },
  Arun:    { species: 'cat',     fur: '#fbf1e1', accent: '#f0a34a', muzzle: '#ffffff', shirt: '#f7d05a', lower: '#8a6a52', outfit: 'apron',    hat: 'beret',   hatColor: '#d9573f' },
  Joseph:  { species: 'pug',     fur: '#dcb68d', accent: '#5c3d2e', muzzle: '#6e4a32', shirt: '#e8744f', lower: '#6e4a32', outfit: 'vest',     hat: 'none',    hatColor: '#000000' },
  Kavya:   { species: 'deer',    fur: '#c98a5a', accent: '#8a5a3a', muzzle: '#f6e6cc', shirt: '#a8cdb5', lower: '#f3a7a0', outfit: 'dress',    hat: 'flower',  hatColor: '#f7d05a' },
  Farah:   { species: 'ferret',  fur: '#ebdfca', accent: '#8a6a52', muzzle: '#fffaf0', shirt: '#79b5a5', lower: '#c9a26c', outfit: 'shirt',    hat: 'beanie',  hatColor: '#e8744f', scarf: '#f5c44c' },
  Priya:   { species: 'panda',   fur: '#fdfbf6', accent: '#3a3330', muzzle: '#fdfbf6', shirt: '#c7e5ec', lower: '#7db7a6', outfit: 'vest',     hat: 'none',    hatColor: '#000000', scarf: '#f3a7a0' },
  Vikram:  { species: 'wolf',    fur: '#9aa3ad', accent: '#6f7882', muzzle: '#eef0f2', shirt: '#5c87a6', lower: '#3d5a70', outfit: 'vest',     hat: 'beanie',  hatColor: '#3f7a52' },
  Nisha:   { species: 'mouse',   fur: '#cdbcb0', accent: '#f3b7ae', muzzle: '#f8eee8', shirt: '#b9a3d8', lower: '#7fb2c9', outfit: 'dress',    hat: 'bandana', hatColor: '#7db7a6' },
}

const POOL = Object.values(LOOKS)

/**
 * Looks for every agent in a run. Known names keep their villager; unknown names get an
 * unused villager chosen by name hash (then a recoloured variant once all 16 are taken).
 */
export function assignLooks(names: string[]): Map<string, Look> {
  const out = new Map<string, Look>()
  const used = new Set<Look>()
  for (const n of names) if (LOOKS[n]) { out.set(n, LOOKS[n]); used.add(LOOKS[n]) }
  const unknown = names.filter(n => !LOOKS[n]).sort((a, b) => hashString(a) - hashString(b))
  for (const n of unknown) {
    const free = POOL.filter(l => !used.has(l))
    const h = hashString(n)
    if (free.length) {
      const l = free[h % free.length]
      used.add(l); out.set(n, l)
    } else {
      const base = POOL[h % POOL.length]
      const shirts = ['#f3a7a0', '#8bb64c', '#f6c64c', '#7db7a6', '#e8744f', '#b9a3d8', '#5d8fb8']
      out.set(n, { ...base, shirt: shirts[(h >>> 5) % shirts.length], lower: shirts[(h >>> 9) % shirts.length] })
    }
  }
  return out
}
