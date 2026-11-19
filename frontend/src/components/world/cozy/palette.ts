// Cozy hand-drawn palette for the 3D world (sampled from docs reference image).
// Every colour used by the world lives here.
export const C = {
  // scene
  sky: '#cfe8d8',
  cloud: '#f4fbf6',
  outline: '#5c3d2e',

  // ground
  grass: '#c3d67b',
  grassDark: '#a6c264',
  soil: '#c9a47a',
  soilDark: '#a47b55',
  sidewalk: '#eedfbe',
  curb: '#d8c39b',
  path: '#e8d4a8',
  pathEdge: '#cdb283',

  // buildings
  wallPeach: '#f5c99d',
  wallCream: '#f7e8cb',
  wallSage: '#a8cdb5',
  wallTan: '#dcb68d',
  wallAdobe: '#e9b98a',
  wood: '#a06f48',
  woodDark: '#70492f',
  roofCoral: '#ea7650',
  roofBrown: '#a9724b',
  roofTeal: '#7db7a6',
  roofTan: '#c9a26c',
  roofSnow: '#f6f3ec',
  roofRed: '#d9573f',
  window: '#bfe2e6',
  frame: '#fbf3df',
  door: '#8a5a3a',

  // nature
  treeOrange: '#f2a33a',
  treeYellow: '#f5c44c',
  treeGreen: '#8bb64c',
  treeDeep: '#4f8a4b',
  pine: '#3f7a52',
  trunk: '#8a5a3a',
  bush: '#7fae4a',
  flowerRed: '#e8624a',
  flowerPink: '#f3a7a0',
  flowerYellow: '#f7d05a',
  water: '#8fd0d8',
  waterDeep: '#6cbccb',
  foam: '#eaf8f7',
  snow: '#f7f4ee',
  rock: '#b9b0a4',
  rockDark: '#988e82',
  sand: '#f1d59c',
  sandDark: '#e2bd7a',
  wheat: '#f0c95a',
  reed: '#7e9d4a',
  cactus: '#76a85a',

  // misc
  metal: '#8c8c86',
  lampGlow: '#ffe9a8',
  pole: '#9b7552',
  wire: '#6b5444',
  produce: '#f08a3c',
  produceGreen: '#9cc45a',
  coin: '#f5c542',
} as const

/** Ground tint around each town, by terrain. Unknown terrains fall back to PLAINS. */
export const TERRAIN_GROUND: Record<string, string> = {
  PLAINS: '#d9d886',
  RIVER: '#bfd47a',
  FOREST: '#9fc062',
  HILLS: '#b6cf73',
  MOUNTAINS: '#e6e2d6',
  DESERT: '#f0d69c',
  COAST: '#ead9ad',
  MARSH: '#a9c78c',
}

/** Accent used for road edging and labels, by terrain. */
export const TERRAIN_ACCENT: Record<string, string> = {
  PLAINS: '#e2b64a',
  RIVER: '#6cbccb',
  FOREST: '#4f8a4b',
  HILLS: '#8bb64c',
  MOUNTAINS: '#9aa7b5',
  DESERT: '#e39a4a',
  COAST: '#5aa9c9',
  MARSH: '#6d9c7a',
}

export const TERRAIN_ICON: Record<string, string> = {
  PLAINS: '🌾', RIVER: '🌊', FOREST: '🌲', HILLS: '⛰️',
  MOUNTAINS: '🏔️', DESERT: '🌵', COAST: '⚓', MARSH: '🪷',
}

export const ROLE_STYLE: Record<string, { color: string; ink: string; icon: string }> = {
  Farmer: { color: '#d9ecb4', ink: '#4f6b25', icon: '🌾' },
  Trader: { color: '#fbd99a', ink: '#8a4f12', icon: '🪙' },
  Diplomat: { color: '#c7e5ec', ink: '#2f6475', icon: '🕊️' },
}
export const roleStyle = (role: string) => ROLE_STYLE[role] ?? { color: '#efe2c8', ink: '#6b4a32', icon: '⭐' }
