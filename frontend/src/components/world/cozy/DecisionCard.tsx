import type { AgentState, Decision } from '../../../hooks/useSimData'
import { roleStyle } from './palette'

const ACTION_ICON: Record<string, string> = {
  FARM: '🌱', BUY: '🛒', SELL: '💰', TRAVEL: '🧭', REST: '💤', NEGOTIATE: '🤝', WAIT: '⏳',
}
const ACTION_VERB: Record<string, string> = {
  FARM: 'Farming', BUY: 'Buying', SELL: 'Selling', TRAVEL: 'Travelling', REST: 'Resting', NEGOTIATE: 'Negotiating', WAIT: 'Waiting',
}

/** Name + this turn's decision, shown above a clicked villager. */
export function DecisionCard({ name, role, state, decision, onClose }: {
  name: string; role: string; state: AgentState; decision?: Decision; onClose: () => void
}) {
  const rs = roleStyle(role)
  const d = decision
  const verb = d ? (ACTION_VERB[d.action] ?? d.action) : 'Thinking…'
  const detail = d ? [d.amount ? `${d.amount}` : '', d.target ?? ''].filter(Boolean).join(' → ') : ''
  return (
    <div className="cz-card" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
      <button className="cz-close" aria-label="Close" onClick={onClose}>✕</button>
      <div className="cz-card-name">{name}</div>
      <div className="cz-card-sub">
        <span className="cz-pill" style={{ background: rs.color, color: rs.ink }}>{rs.icon} {role}</span>
        <span className="cz-pill">📍 {state.town}{state.destination && state.destination !== state.town ? ` → ${state.destination}` : ''}</span>
      </div>
      <div className="cz-decision">
        <span className="cz-decision-icon" aria-hidden>{d ? (ACTION_ICON[d.action] ?? '•') : '💭'}</span>
        <div>
          <div className="cz-decision-verb">{verb}{detail && <span className="cz-decision-detail"> {detail}</span>}</div>
          {d?.reason && <div className="cz-reason">“{d.reason}”</div>}
        </div>
        {d && <span className={`cz-result ${d.success ? 'ok' : 'fail'}`}>{d.success ? '✓' : '✗'}</span>}
      </div>
      {d?.result && <div className="cz-outcome">{d.result}</div>}
      <div className="cz-stats">
        <span className="cz-pill">🪙 {state.money.toFixed(0)}</span>
        <span className="cz-pill">🍞 {state.food}</span>
        {d?.brain_used && <span className="cz-pill">🤖 {d.model ?? d.brain_used}{d.latency_ms != null ? ` · ${d.latency_ms}ms` : ''}</span>}
      </div>
    </div>
  )
}
