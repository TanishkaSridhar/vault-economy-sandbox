/**
 * Sprite slicer – cuts character_inspo.jpeg (5×5 grid of 25 chibi characters)
 * into 16 individual PNGs saved to ../public/characters/
 * Uses only built-in Node.js (no sharp/Pillow needed).
 * We use the Canvas API via the 'canvas' npm package (bundled in many Node envs)
 * OR fall back to writing placeholder SVG files if canvas is not available.
 */
import { mkdirSync, existsSync, writeFileSync } from 'fs'

// Try to import canvas (optional)
let createCanvas, loadImage
try {
  const mod = await import('canvas')
  createCanvas = mod.createCanvas
  loadImage = mod.loadImage
} catch {}

import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SRC = path.resolve(__dirname, '../../docs/character_inspo.jpeg')
const OUT = path.resolve(__dirname, '../public/characters')

// Agent → character-sheet grid position (row 0-4, col 0-4)
const ASSIGNMENTS = [
  { name: 'Meena',   row: 0, col: 0, role: 'Farmer'   },
  { name: 'Kumar',   row: 0, col: 1, role: 'Farmer'   },
  { name: 'Selvi',  row: 0, col: 2, role: 'Farmer'   },
  { name: 'Ganesh', row: 0, col: 3, role: 'Farmer'   },
  { name: 'Lakshmi',row: 0, col: 4, role: 'Farmer'   },
  { name: 'Anita',  row: 1, col: 0, role: 'Farmer'   },
  { name: 'Murugan',row: 1, col: 1, role: 'Trader'   },
  { name: 'Devi',   row: 1, col: 2, role: 'Trader'   },
  { name: 'Ravi',   row: 1, col: 3, role: 'Trader'   },
  { name: 'Arun',   row: 1, col: 4, role: 'Trader'   },
  { name: 'Joseph', row: 2, col: 0, role: 'Diplomat' },
  { name: 'Kavya',  row: 2, col: 1, role: 'Diplomat' },
  { name: 'Farah',  row: 2, col: 2, role: 'Diplomat' },
  { name: 'Priya',  row: 2, col: 3, role: 'Trader'   },
  { name: 'Vikram', row: 2, col: 4, role: 'Trader'   },
  { name: 'Nisha',  row: 3, col: 0, role: 'Diplomat' },
]

mkdirSync(OUT, { recursive: true })

async function run() {
  let img
  if (!createCanvas || !loadImage) {
    console.log('canvas package not available. Writing placeholder SVG sprites...')
    writePlaceholders()
    return
  }
  try {
    img = await loadImage(SRC)
    console.log(`Loaded sheet: ${img.width}×${img.height}`)
  } catch (e) {
    console.error('canvas loadImage failed:', e.message)
    console.log('Writing placeholder SVG sprites instead...')
    writePlaceholders()
    return
  }

  const cols = 5, rows = 5
  const cellW = Math.floor(img.width / cols)
  const cellH = Math.floor(img.height / rows)

  for (const { name, row, col } of ASSIGNMENTS) {
    const canvas = createCanvas(cellW, cellH)
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH)
    const buf = canvas.toBuffer('image/png')
    writeFileSync(path.join(OUT, `${name.toLowerCase()}.png`), buf)
    console.log(`  ✓ ${name.toLowerCase()}.png (${col},${row})`)
  }
  console.log('Done.')
}

function writePlaceholders() {
  const ROLE_COLOURS = { Farmer: '#4CAF50', Trader: '#FF6B2C', Diplomat: '#7C9CB5' }
  const ROLE_EMOJI   = { Farmer: '🌾', Trader: '💰', Diplomat: '🕊' }
  for (const { name, role } of ASSIGNMENTS) {
    const col = ROLE_COLOURS[role]
    const em  = ROLE_EMOJI[role]
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="96" viewBox="0 0 80 96">
  <rect width="80" height="96" rx="12" fill="${col}22"/>
  <!-- body -->
  <ellipse cx="40" cy="62" rx="22" ry="28" fill="${col}"/>
  <!-- head -->
  <circle cx="40" cy="30" r="20" fill="#ffe0b2"/>
  <!-- eyes -->
  <circle cx="33" cy="28" r="3" fill="#333"/>
  <circle cx="47" cy="28" r="3" fill="#333"/>
  <!-- smile -->
  <path d="M33 36 Q40 42 47 36" stroke="#333" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- role badge -->
  <text x="40" y="92" text-anchor="middle" font-size="14" font-family="sans-serif">${em}</text>
  <!-- name -->
  <text x="40" y="12" text-anchor="middle" font-size="9" font-family="sans-serif" fill="#555">${name}</text>
</svg>`
    writeFileSync(path.join(OUT, `${name.toLowerCase()}.svg`), svg)
    console.log(`  ✓ ${name.toLowerCase()}.svg (placeholder)`)
  }
  console.log('Done — placeholder SVGs written. Replace with real sliced PNGs later.')
}

run().catch(e => { console.error(e); process.exit(1) })
