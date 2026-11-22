export const tokens = {
  colors: {
    pageBg: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fff8f0 100%)',
    glass: 'rgba(255,255,255,0.65)',
    glassBorder: 'rgba(255,255,255,0.9)',
    orange: '#5b7a34',
    orangeLight: '#e2e9cf',
    orangeDark: '#44602a',
    text: '#33281d',
    textSub: '#6f5d48',
    surface: '#FFFFFF',
    terrain: {
      RIVER: '#4FC3F7',
      PLAINS: '#81C784',
      COAST: '#4f8a9a',
      FOREST: '#388E3C',
      HILLS: '#A5D6A7',
      DESERT: '#FFB74D',
      MOUNTAINS: '#B0BEC5',
      MARSH: '#80CBC4',
    }
  },
  radii: { card: '20px', pill: '999px', badge: '8px' },
  shadow: {
    card: '0 8px 32px rgba(0,0,0,0.08), 0 1.5px 4px rgba(0,0,0,0.04)',
    hover: '0 16px 48px rgba(0,0,0,0.12)',
  },
  font: "'Plus Jakarta Sans', sans-serif",
} as const
