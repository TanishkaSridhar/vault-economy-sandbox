interface RingGaugeProps {
  value: number
  label: string
  sublabel?: string
  size?: number
  color?: string
  tickCount?: number
}

export function RingGauge({
  value,
  label,
  sublabel,
  size = 140,
  color = '#5b7a34',
  tickCount = 24,
}: RingGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const arcR = size / 2 - 16
  const tickInnerR = outerR - 10
  const tickOuterR = outerR - 2
  const strokeWidth = 7
  const circumference = 2 * Math.PI * arcR
  // Arc goes from -210deg to 30deg (270deg sweep) clockwise
  const sweepDeg = 270
  const startDeg = -225 // bottom-left
  const pct = Math.min(100, Math.max(0, value)) / 100
  const arcLen = pct * (circumference * sweepDeg / 360)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background arc track */}
      <circle
        cx={cx}
        cy={cy}
        r={arcR}
        fill="none"
        stroke="rgba(0,0,0,0.07)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * sweepDeg / 360} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startDeg + 90} ${cx} ${cy})`}
      />
      {/* Coloured progress arc */}
      <circle
        cx={cx}
        cy={cy}
        r={arcR}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLen} ${circumference}`}
        strokeDashoffset={0}
        strokeLinecap="round"
        transform={`rotate(${startDeg + 90} ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Tick marks around outer ring */}
      {Array.from({ length: tickCount }).map((_, i) => {
        const angle = startDeg + (i / (tickCount - 1)) * sweepDeg
        const rad = (angle * Math.PI) / 180
        const x1 = cx + tickInnerR * Math.cos(rad)
        const y1 = cy + tickInnerR * Math.sin(rad)
        const x2 = cx + tickOuterR * Math.cos(rad)
        const y2 = cy + tickOuterR * Math.sin(rad)
        const filled = i / (tickCount - 1) <= pct
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={filled ? color : 'rgba(0,0,0,0.12)'}
            strokeWidth={i % 6 === 0 ? 2 : 1}
            strokeLinecap="round"
          />
        )
      })}
      {/* Centre label */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: size * 0.18,
          fontWeight: 800,
          fill: '#33281d',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}
      >
        {label}
      </text>
      {sublabel && (
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: size * 0.09,
            fontWeight: 500,
            fill: '#6f5d48',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {sublabel}
        </text>
      )}
    </svg>
  )
}
