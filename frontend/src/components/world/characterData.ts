/**
 * Character assignment map — links each in-game agent name to their
 * sprite file, role, and character sheet position.
 * 
 * The character sheet is a 5×5 grid. We assign characters by role:
 * - Farmers (rows 0-1 left side): earthy greens/browns
 * - Traders (rows 1-2 right side): bright oranges/reds  
 * - Diplomats (row 2-3): cool blues/purples
 */

export type AgentRole = 'Farmer' | 'Trader' | 'Diplomat'

export interface CharacterDef {
  name: string
  role: AgentRole
  /** Sprite file in /public/characters/ (svg or png) */
  sprite: string
  /** CSS hue-rotate for tinting (subtle per-character variation) */
  hue: number
  /** Character sheet atlas position for reference */
  row: number
  col: number
  /** Accent color for the role badge and glow */
  color: string
}

export const ROLE_COLORS: Record<AgentRole, string> = {
  Farmer:   '#4CAF50',
  Trader:   '#FF6B2C',
  Diplomat: '#7C9CB5',
}

export const ROLE_ICONS: Record<AgentRole, string> = {
  Farmer:   '🌾',
  Trader:   '💰',
  Diplomat: '🕊',
}

/** Canonical assignment of the 16 agents → character sheet positions */
export const CHARACTER_MAP: CharacterDef[] = [
  // Farmers — earthy, natural outfits (rows 0-1 left cols)
  { name: 'Meena',   role: 'Farmer',   sprite: 'meena.svg',   hue: 0,   row: 0, col: 0, color: '#4CAF50' },
  { name: 'Kumar',   role: 'Farmer',   sprite: 'kumar.svg',   hue: 20,  row: 0, col: 1, color: '#66BB6A' },
  { name: 'Selvi',  role: 'Farmer',   sprite: 'selvi.svg',  hue: -20, row: 0, col: 2, color: '#43A047' },
  { name: 'Ganesh', role: 'Farmer',   sprite: 'ganesh.svg', hue: 30,  row: 0, col: 3, color: '#388E3C' },
  { name: 'Lakshmi',role: 'Farmer',   sprite: 'lakshmi.svg',hue: -10, row: 0, col: 4, color: '#81C784' },
  { name: 'Anita',  role: 'Farmer',   sprite: 'anita.svg',  hue: 15,  row: 1, col: 0, color: '#558B2F' },
  // Traders — bright, colorful outfits (rows 1 right + row 2 right)
  { name: 'Murugan',role: 'Trader',   sprite: 'murugan.svg',hue: 0,   row: 1, col: 1, color: '#FF6B2C' },
  { name: 'Devi',   role: 'Trader',   sprite: 'devi.svg',   hue: -15, row: 1, col: 2, color: '#FF8F00' },
  { name: 'Ravi',   role: 'Trader',   sprite: 'ravi.svg',   hue: 20,  row: 1, col: 3, color: '#E53935' },
  { name: 'Arun',   role: 'Trader',   sprite: 'arun.svg',   hue: 40,  row: 1, col: 4, color: '#FB8C00' },
  { name: 'Priya',  role: 'Trader',   sprite: 'priya.svg',  hue: -30, row: 2, col: 3, color: '#F4511E' },
  { name: 'Vikram', role: 'Trader',   sprite: 'vikram.svg', hue: 10,  row: 2, col: 4, color: '#E65100' },
  // Diplomats — cool, refined (row 2-3 left)
  { name: 'Joseph', role: 'Diplomat', sprite: 'joseph.svg', hue: 0,   row: 2, col: 0, color: '#7C9CB5' },
  { name: 'Kavya',  role: 'Diplomat', sprite: 'kavya.svg',  hue: -20, row: 2, col: 1, color: '#5C87A6' },
  { name: 'Farah',  role: 'Diplomat', sprite: 'farah.svg',  hue: 30,  row: 2, col: 2, color: '#8E9CC2' },
  { name: 'Nisha',  role: 'Diplomat', sprite: 'nisha.svg',  hue: -40, row: 3, col: 0, color: '#7986CB' },
]

export const CHARACTER_BY_NAME: Record<string, CharacterDef> =
  Object.fromEntries(CHARACTER_MAP.map(c => [c.name, c]))

/** Returns the character def for an agent (case-insensitive fallback) */
export function getCharacter(agentName: string): CharacterDef {
  return (
    CHARACTER_BY_NAME[agentName] ??
    CHARACTER_MAP.find(c => c.name.toLowerCase() === agentName.toLowerCase()) ??
    CHARACTER_MAP[0]
  )
}
