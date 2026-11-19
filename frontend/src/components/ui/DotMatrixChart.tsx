interface DotMatrixChartProps {
  data: Array<{ x: number; y: number; value: number; label?: string }>
  width?: number
  height?: number
  color?: string
  cols?: number
  rows?: number
}

export function DotMatrixChart({
  data,
  width = 320,
  height = 200,
  color = '#FF6B2C',
  cols = 10,
  rows = 6,
}: DotMatrixChartProps) {
  const padX = 24
  const padY = 16
  const cellW = (width - padX * 2) / cols
  const cellH = (height - padY * 2) / rows
  const maxVal = Math.max(...data.map(d => d.value), 1)

  // Build a grid lookup
  const lookup = new Map<string, number>()
  for (const d of data) {
    lookup.set(`${d.x},${d.y}`, d.value)
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const val = lookup.get(`${col},${row}`) ?? 0
          const pct = val / maxVal
          const r = Math.max(2, pct * Math.min(cellW, cellH) * 0.42)
          const cx = padX + col * cellW + cellW / 2
          const cy = padY + row * cellH + cellH / 2
          return (
            <circle
              key={`${col}-${row}`}
              cx={cx}
              cy={cy}
              r={r}
              fill={color}
              opacity={0.15 + pct * 0.75}
            />
          )
        })
      )}
    </svg>
  )
}
