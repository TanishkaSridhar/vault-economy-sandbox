/**
 * Patches all 8 town scene files to accept agentStates and pass them to TownSceneBase.
 * Run from frontend/: node scripts/patch_town_scenes.mjs
 */
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SCENES_DIR = path.resolve(__dirname, '../src/components/world/towns')

const FILES = [
  'RivertonScene.tsx',
  'WoodhavenScene.tsx',
  'HillScene.tsx',
  'HighpeakScene.tsx',
  'ValleyScene.tsx',
  'PortScene.tsx',
  'SaltmarshScene.tsx',
  'SandreachScene.tsx',
]

for (const file of FILES) {
  const fpath = path.join(SCENES_DIR, file)
  let src = readFileSync(fpath, 'utf8')

  // 1. Add AgentState import if not present
  if (!src.includes("import type { AgentState }")) {
    src = src.replace(
      "import { useSettings } from '../../../hooks/useSettings'",
      "import { useSettings } from '../../../hooks/useSettings'\nimport type { AgentState } from '../../../hooks/useSimData'"
    )
  }

  // 2. Add agentStates to the props interface
  // Pattern: interface XxxSceneProps { price?: number; stock?: number ... }
  src = src.replace(
    /interface (\w+SceneProps)\s*\{([^}]*)\}/,
    (match, name, body) => {
      if (body.includes('agentStates')) return match
      return `interface ${name} {${body.trimEnd()} agentStates?: AgentState[] }`
    }
  )

  // 3. Add agentStates to destructuring in function signature
  // Pattern: export function XxxScene({ price, stock }: XxxSceneProps)
  //       or export function XxxScene({ price, stock, agentCount }: XxxSceneProps)
  src = src.replace(
    /export function (\w+Scene)\(\{([^}]*)\}:\s*\w+SceneProps\)/,
    (match, fname, params) => {
      if (params.includes('agentStates')) return match
      return `export function ${fname}({ ${params.trim()}, agentStates = [] }: ${fname}Props)`
    }
  )

  // 4. Pass agentStates to TownSceneBase
  src = src.replace(
    /<TownSceneBase ([^>]*?)>/,
    (match, attrs) => {
      if (attrs.includes('agentStates')) return match
      return `<TownSceneBase ${attrs}agentStates={agentStates}>`
    }
  )

  writeFileSync(fpath, src, 'utf8')
  console.log(`✓ Patched ${file}`)
}

console.log('All town scenes patched.')
