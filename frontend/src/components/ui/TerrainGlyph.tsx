import { TERRAIN_ACCENT } from '../world/cozy/palette'

/** A small drawn badge for each terrain (waves, wheat, pines, peaks...), in the terrain's colour. */
export function TerrainGlyph({ terrain, size = 34 }: { terrain: string; size?: number }) {
  const c = TERRAIN_ACCENT[terrain] ?? '#8a5f3c'
  const ink = '#f8f5ea'
  let art: React.ReactNode
  switch (terrain) {
    case 'RIVER':
      art = <>{[11, 17, 23].map(y => <path key={y} d={`M7 ${y} q4 -3 8 0 t8 0 t8 0`} fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />)}</>
      break
    case 'COAST':
      art = <><path d="M17 8v15M11 12h12M10 19c2 4 12 4 14 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="7" r="1.8" fill={ink} /></>
      break
    case 'FOREST':
      art = <>{[[12, 0.9], [21, 1.1]].map(([x, s]) => <path key={x} d={`M${x} ${8 / s + 3}l${-6 * s} ${13 * s}h${12 * s}z`} fill={ink} />)}<rect x="20" y="24" width="2" height="4" fill={ink} /><rect x="11" y="23" width="2" height="4" fill={ink} /></>
      break
    case 'HILLS':
      art = <path d="M5 25c4-8 9-8 13 0M14 25c4-11 11-11 15 0" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      break
    case 'MOUNTAINS':
      art = <><path d="M5 26l9-15 5 8 3-4 7 11z" fill={ink} /><path d="M14 11l2.6 4.3-2.6 1.4-2.4-1.5z" fill={c} /></>
      break
    case 'DESERT':
      art = <><path d="M17 27V10m0 7h-4v-4m4 8h4v-5" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 28h24" stroke={ink} strokeWidth="1.5" /></>
      break
    case 'MARSH':
      art = <><path d="M6 24c3-2 6-2 9 0s6 2 9 0" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />{[12, 17, 22].map(x => <path key={x} d={`M${x} 21V${11 + (x % 3)}`} stroke={ink} strokeWidth="1.8" strokeLinecap="round" />)}</>
      break
    default: // PLAINS
      art = <>{[11, 17, 23].map(x => <g key={x}><path d={`M${x} 27V12`} stroke={ink} strokeWidth="1.6" /><ellipse cx={x} cy="12" rx="2" ry="4" fill={ink} /></g>)}</>
  }
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden style={{ flex: 'none', display: 'block' }}>
      <rect x="1" y="1" width="32" height="32" rx="9" fill={c} />
      <rect x="1" y="1" width="32" height="32" rx="9" fill="none" stroke="rgba(0,0,0,0.12)" />
      {art}
    </svg>
  )
}
