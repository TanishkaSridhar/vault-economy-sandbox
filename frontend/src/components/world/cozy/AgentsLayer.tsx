import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { AgentMeta, AgentState, Decision } from '../../../hooks/useSimData'
import { assignLooks } from './looks'
import { PLAZA_TOP, route, roadPoints, townSlots, type RoadPath, type XZ } from './layout'
import { Villager, type Motion, type Mood } from './Villager'

interface Props {
  agents: AgentMeta[]
  states: AgentState[]       // this turn
  prevStates: AgentState[]   // previous turn
  decisions: Decision[]      // this turn
  layout: Record<string, XZ>
  /** Ground height of each town's plaza (hill and mountain towns stand higher). */
  liftOf: (town: string) => number
  roads: RoadPath[]
  turn: number
  walkMs: number
  selected: string | null
  onSelect: (name: string | null) => void
  onHover: (name: string | null) => void
  onPosition?: (name: string, p: THREE.Vector3) => void
}

/** Turns the per-turn data into villagers that walk the real roads between towns. */
export function AgentsLayer(p: Props) {
  const { agents, states, prevStates, decisions, layout, liftOf, roads, turn, walkMs, selected, onSelect, onHover, onPosition } = p
  const roleOf = useMemo(() => new Map(agents.map(a => [a.name, a.role])), [agents])
  const looks = useMemo(() => assignLooks(agents.map(a => a.name).concat(states.map(s => s.agent).filter(n => !roleOf.has(n)))), [agents, states, roleOf])
  const lastTurn = useRef<number | null>(null)

  // Who stands where this turn
  const homes = useMemo(() => {
    const byTown = new Map<string, { name: string; role: string }[]>()
    for (const s of states) {
      const list = byTown.get(s.town) ?? []
      list.push({ name: s.agent, role: roleOf.get(s.agent) ?? '' })
      byTown.set(s.town, list)
    }
    const out = new Map<string, THREE.Vector3>()
    for (const [town, list] of byTown) {
      const c = layout[town]
      if (!c) continue
      for (const [n, v] of townSlots(list, c, liftOf(town))) out.set(n, v)
    }
    return out
  }, [states, layout, roleOf, liftOf])

  // Motions: walk the road when an agent changed town by one turn step, otherwise settle/snap.
  const motions = useMemo(() => {
    const stepped = lastTurn.current !== null && turn === lastTurn.current + 1
    const jumped = lastTurn.current !== null && Math.abs(turn - lastTurn.current) > 1
    const prevTown = new Map(prevStates.map(s => [s.agent, s.town]))
    const out = new Map<string, Motion>()
    for (const s of states) {
      const home = homes.get(s.agent)
      if (!home) continue
      const from = prevTown.get(s.agent)
      const id = `${turn}:${s.agent}`
      if (stepped && from && from !== s.town) {
        const hops = route(roads, from, s.town)
        const path: THREE.Vector3[] = []
        if (hops) {
          for (let i = 0; i < hops.length - 1; i++) {
            const pts = roadPoints(roads, hops[i], hops[i + 1])
            if (pts) path.push(...pts.map(v => v.clone().setY(v.y + 0.06)))
            if (i < hops.length - 2) { const c = layout[hops[i + 1]]; path.push(new THREE.Vector3(c[0], PLAZA_TOP + liftOf(hops[i + 1]), c[1])) }
          }
        }
        out.set(s.agent, { id, home, path, duration: walkMs })
      } else {
        out.set(s.agent, { id, home, snap: jumped })
      }
    }
    return out
    // homes already depends on states/layout
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states, homes, roads, turn])

  const moods = useMemo(() => {
    const prevMoney = new Map(prevStates.map(s => [s.agent, s.money]))
    const dec = new Map(decisions.map(d => [d.agent, d]))
    const out = new Map<string, Mood>()
    for (const s of states) {
      const d = dec.get(s.agent)
      out.set(s.agent, {
        hungry: s.food <= 0,
        traded: !!d && d.success === 1 && (d.action === 'BUY' || d.action === 'SELL'),
        profit: (prevMoney.get(s.agent) ?? s.money) < s.money - 0.01,
        key: `${turn}`,
      })
    }
    return out
  }, [states, prevStates, decisions, turn])

  // Remember the committed turn (after render) so the next turn can tell a single step from a jump
  useEffect(() => { lastTurn.current = turn }, [turn])

  const select = useCallback((n: string) => onSelect(selected === n ? null : n), [onSelect, selected])

  return (
    <group>
      {states.map(s => {
        const motion = motions.get(s.agent)
        const look = looks.get(s.agent)
        if (!motion || !look) return null
        return (
          <Villager
            key={s.agent}
            name={s.agent}
            look={look}
            motion={motion}
            mood={moods.get(s.agent)!}
            selected={selected === s.agent}
            onSelect={select}
            onHover={onHover}
            positionRef={onPosition}
          />
        )
      })}
    </group>
  )
}
