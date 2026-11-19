// Town world-map 3D positions matching the game topology
export const TOWN_POSITIONS: Record<string, [number, number, number]> = {
  Riverton:  [-6, 0, -3],
  Woodhaven: [ 0, 0, -3],
  Hill:      [ 6, 0, -3],
  Highpeak:  [ 9, 0, -3],
  Valley:    [ 0, 0,  3],
  Port:      [-6, 0,  3],
  Saltmarsh: [ 0, 0,  6],
  Sandreach: [ 6, 0,  6],
}

// Roads between towns with terrain type
export const ROAD_DATA = [
  { from: 'Valley',    to: 'Riverton',  terrain: 'RIVER' },
  { from: 'Valley',    to: 'Port',      terrain: 'PLAINS' },
  { from: 'Valley',    to: 'Hill',      terrain: 'HILLS' },
  { from: 'Riverton',  to: 'Port',      terrain: 'RIVER' },
  { from: 'Riverton',  to: 'Woodhaven', terrain: 'FOREST' },
  { from: 'Woodhaven', to: 'Hill',      terrain: 'FOREST' },
  { from: 'Port',      to: 'Saltmarsh', terrain: 'COAST' },
  { from: 'Saltmarsh', to: 'Sandreach', terrain: 'DESERT' },
  { from: 'Sandreach', to: 'Highpeak',  terrain: 'MOUNTAINS' },
  { from: 'Hill',      to: 'Highpeak',  terrain: 'MOUNTAINS' },
]

export const TERRAIN_COLOURS: Record<string, string> = {
  RIVER:     '#4FC3F7',
  PLAINS:    '#81C784',
  COAST:     '#64B5F6',
  FOREST:    '#388E3C',
  HILLS:     '#A5D6A7',
  DESERT:    '#FFB74D',
  MOUNTAINS: '#B0BEC5',
  MARSH:     '#80CBC4',
}

export const TERRAIN_EMISSIVE: Record<string, string> = {
  RIVER:     '#1a8fb5',
  PLAINS:    '#3d8c3f',
  COAST:     '#2066b0',
  FOREST:    '#1a4d1a',
  HILLS:     '#4a8c4a',
  DESERT:    '#c47a0a',
  MOUNTAINS: '#6b7a8c',
  MARSH:     '#3a7a74',
}

// Role colours for agent dots on roads
export const ROLE_COLOURS: Record<string, string> = {
  Farmer:   '#4CAF50',
  Trader:   '#FF6B2C',
  Diplomat: '#7C9CB5',
}
