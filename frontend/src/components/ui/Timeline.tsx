import { useEffect, useRef } from 'react'
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react'
import { useTurn } from '../../hooks/useTurn'
import { useRuns } from '../../hooks/useSimData'

export function Timeline() {
  const { turn, maxTurn, playing, speed, runId, setTurn, play, pause, setSpeed, setRun, setMaxTurn } = useTurn()
  const { runs } = useRuns()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-play
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (playing) {
      intervalRef.current = setInterval(() => {
        const { turn: t, maxTurn: max, pause: doPause, setTurn: doSet } = useTurn.getState()
        if (t >= max) {
          doPause()
        } else {
          doSet(t + 1)
        }
      }, 1000 / speed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, speed])

  // Update maxTurn from selected run
  useEffect(() => {
    const run = runs.find(r => r.id === runId)
    if (run?.turns_completed) setMaxTurn(Math.max(run.turns_completed, 1))
  }, [runs, runId])

  const SPEEDS = [0.5, 1, 2, 4]

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 72,
      zIndex: 100,
      background: 'var(--surface)',


      borderTop: '1px solid var(--line)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
    }}>
      {/* Skip back */}
      <button
        onClick={() => setTurn(1)}
        style={btnStyle}
        title="Go to start"
      >
        <SkipBack size={16} color="#6f5d48" />
      </button>

      {/* Play/Pause */}
      <button
        onClick={() => playing ? pause() : play()}
        style={{
          ...btnStyle,
          background: '#5b7a34',
          borderColor: 'rgba(91,122,52,0.3)',
          boxShadow: 'var(--shadow-press)',
        }}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <Pause size={16} color="#fff" />
          : <Play size={16} color="#fff" />
        }
      </button>

      {/* Skip forward */}
      <button
        onClick={() => setTurn(maxTurn)}
        style={btnStyle}
        title="Go to end"
      >
        <SkipForward size={16} color="#6f5d48" />
      </button>

      {/* Speed selector */}
      <div style={{ position: 'relative' }}>
        <select
          value={speed}
          onChange={e => setSpeed(Number(e.target.value))}
          style={{
            background: 'rgba(0,0,0,0.05)',
            border: '1px solid var(--line)',
            borderRadius: 8,
            padding: '4px 24px 4px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#33281d',
            fontFamily: 'inherit',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          {SPEEDS.map(s => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>
        <div style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          fontSize: 10,
          color: '#6f5d48',
        }}>▼</div>
      </div>

      {/* Scrubber */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="range"
          min={1}
          max={maxTurn}
          value={turn}
          onChange={e => setTurn(Number(e.target.value))}
          style={{ flex: 1, accentColor: '#5b7a34' }}
        />
      </div>

      {/* Turn indicator */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: '#33281d',
        whiteSpace: 'nowrap',
        minWidth: 80,
      }}>
        Turn <span style={{ color: '#5b7a34' }}>{turn}</span> / {maxTurn}
      </div>

      {/* Run selector */}
      {runs.length > 0 && (
        <div style={{ position: 'relative' }}>
          <select
            value={runId}
            onChange={e => setRun(Number(e.target.value))}
            style={{
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '4px 24px 4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: '#33281d',
              fontFamily: 'inherit',
              outline: 'none',
              cursor: 'pointer',
              maxWidth: 130,
            }}
          >
            {runs.map(r => (
              <option key={r.id} value={r.id}>
                Run #{r.id} (T{r.turns_completed})
              </option>
            ))}
          </select>
          <div style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            fontSize: 10,
            color: '#6f5d48',
          }}>▼</div>
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: '1px solid var(--line)',
  background: 'rgba(0,0,0,0.05)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}
