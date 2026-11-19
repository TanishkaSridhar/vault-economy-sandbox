import { Suspense, lazy } from 'react'
import { Canvas } from '@react-three/fiber'
import type { AgentState } from '../../hooks/useSimData'

// Lazy-load each town scene
const SCENES = {
  Riverton:  lazy(() => import('./towns/RivertonScene').then(m => ({ default: m.RivertonScene }))),
  Woodhaven: lazy(() => import('./towns/WoodhavenScene').then(m => ({ default: m.WoodhavenScene }))),
  Hill:      lazy(() => import('./towns/HillScene').then(m => ({ default: m.HillScene }))),
  Highpeak:  lazy(() => import('./towns/HighpeakScene').then(m => ({ default: m.HighpeakScene }))),
  Valley:    lazy(() => import('./towns/ValleyScene').then(m => ({ default: m.ValleyScene }))),
  Port:      lazy(() => import('./towns/PortScene').then(m => ({ default: m.PortScene }))),
  Saltmarsh: lazy(() => import('./towns/SaltmarshScene').then(m => ({ default: m.SaltmarshScene }))),
  Sandreach: lazy(() => import('./towns/SandreachScene').then(m => ({ default: m.SandreachScene }))),
}

interface TownDetailCanvasProps {
  townName: string
  price?: number
  stock?: number
  agentStates?: AgentState[]
  style?: React.CSSProperties
}

export function TownDetailCanvas({ townName, price, stock, agentStates = [], style }: TownDetailCanvasProps) {
  const SceneComponent = SCENES[townName as keyof typeof SCENES]

  if (!SceneComponent) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: 14 }}>
        Unknown town: {townName}
      </div>
    )
  }

  // Town-specific sky gradients
  const SKY_GRADIENTS: Record<string, string> = {
    Riverton:  'linear-gradient(180deg, #bbdefb 0%, #e3f2fd 60%, #e8f5e9 100%)',
    Woodhaven: 'linear-gradient(180deg, #c8e6c9 0%, #dcedc8 60%, #f9fbe7 100%)',
    Hill:      'linear-gradient(180deg, #dcedc8 0%, #e8f5e9 60%, #f9fbe7 100%)',
    Highpeak:  'linear-gradient(180deg, #bbdefb 0%, #e3f2fd 60%, #e8eaf6 100%)',
    Valley:    'linear-gradient(180deg, #fff9c4 0%, #fff8e1 60%, #fffff0 100%)',
    Port:      'linear-gradient(180deg, #90caf9 0%, #bbdefb 60%, #e3f2fd 100%)',
    Saltmarsh: 'linear-gradient(180deg, #b2dfdb 0%, #c8e6c9 60%, #e0f2f1 100%)',
    Sandreach: 'linear-gradient(180deg, #ffe082 0%, #fff8e1 60%, #fff3e0 100%)',
  }

  return (
    <div style={{ width: '100%', height: '100%', borderRadius: 20, overflow: 'hidden', ...style }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 5, 10], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: SKY_GRADIENTS[townName] ?? 'linear-gradient(180deg, #ddeeff 0%, #f0f4ff 100%)' }}
      >
        <Suspense fallback={null}>
          <SceneComponent price={price} stock={stock} agentStates={agentStates} />
        </Suspense>
      </Canvas>
    </div>
  )
}
