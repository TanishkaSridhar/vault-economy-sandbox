import { memo, useMemo } from 'react'

/**
 * The page background: faint topographic contour lines, like a surveyor's map of the valley,
 * with a light grid and a couple of dotted trails. Drawn once (deterministic), fixed behind every page.
 */
const W = 1600, H = 1000, STEP = 20

// smooth, repeatable "terrain height" made of a few overlapping waves
const WAVES = [
  { a: 1.0, kx: 0.0042, ky: 0.0031, p: 0.3 },
  { a: 0.7, kx: -0.0027, ky: 0.0058, p: 1.7 },
  { a: 0.45, kx: 0.0091, ky: -0.0044, p: 4.1 },
  { a: 0.3, kx: 0.0035, ky: 0.0112, p: 2.6 },
  { a: 0.22, kx: -0.0128, ky: -0.0071, p: 5.3 },
]
const height = (x: number, y: number) => WAVES.reduce((s, w) => s + w.a * Math.sin(w.kx * x * 1.3 + w.ky * y * 1.3 + w.p) * Math.cos(w.ky * x - w.kx * y * 0.7 + w.p * 0.5), 0)

/** Marching squares: line segments where the height crosses `level`. */
function contour(field: number[][], level: number): string {
  const out: string[] = []
  const lerp = (a: number, b: number) => (level - a) / (b - a)
  for (let j = 0; j < field.length - 1; j++) {
    for (let i = 0; i < field[0].length - 1; i++) {
      const a = field[j][i], b = field[j][i + 1], c = field[j + 1][i + 1], d = field[j + 1][i]
      const x = i * STEP, y = j * STEP
      const pts: [number, number][] = []
      if ((a < level) !== (b < level)) pts.push([x + lerp(a, b) * STEP, y])
      if ((b < level) !== (c < level)) pts.push([x + STEP, y + lerp(b, c) * STEP])
      if ((d < level) !== (c < level)) pts.push([x + lerp(d, c) * STEP, y + STEP])
      if ((a < level) !== (d < level)) pts.push([x, y + lerp(a, d) * STEP])
      for (let k = 0; k + 1 < pts.length; k += 2) {
        out.push(`M${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}L${pts[k + 1][0].toFixed(1)} ${pts[k + 1][1].toFixed(1)}`)
      }
    }
  }
  return out.join('')
}

function BackdropImpl() {
  const { minor, major } = useMemo(() => {
    const field: number[][] = []
    for (let y = 0; y <= H; y += STEP) {
      const row: number[] = []
      for (let x = 0; x <= W; x += STEP) row.push(height(x, y))
      field.push(row)
    }
    const minor: string[] = [], major: string[] = []
    for (let n = -9; n <= 9; n++) (n % 3 === 0 ? major : minor).push(contour(field, n * 0.22))
    return { minor: minor.join(''), major: major.join('') }
  }, [])

  return (
    <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}>
      <defs>
        <pattern id="bd-grid" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M40 36v8M36 40h8" stroke="#b9a582" strokeWidth="1" opacity="0.5" />
        </pattern>
        <radialGradient id="bd-vignette" cx="50%" cy="40%" r="75%">
          <stop offset="60%" stopColor="#ece3cf" stopOpacity="0" />
          <stop offset="100%" stopColor="#d9cba9" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="#ece3cf" />
      <rect width={W} height={H} fill="url(#bd-grid)" />
      <path d={minor} fill="none" stroke="#c4b18c" strokeWidth="0.8" opacity="0.55" />
      <path d={major} fill="none" stroke="#a99067" strokeWidth="1.2" opacity="0.5" />
      {/* two dotted trails across the valley */}
      <path d="M-20 820 C 260 760, 380 600, 640 610 S 1060 700, 1240 560 S 1500 380, 1640 400" fill="none" stroke="#9c7f57" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity="0.45" />
      <path d="M300 -20 C 340 160, 520 260, 560 420 S 520 760, 700 1020" fill="none" stroke="#9c7f57" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" opacity="0.35" />
      <rect width={W} height={H} fill="url(#bd-vignette)" />
    </svg>
  )
}
export const Backdrop = memo(BackdropImpl)
