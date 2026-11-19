export const tokens = {
  colors: {
    pageBg: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #fff8f0 100%)',
    glass: 'rgba(255,255,255,0.65)',
    glassBorder: 'rgba(255,255,255,0.9)',
    orange: '#FF6B2C',
    orangeLight: '#FFE4D6',
    orangeDark: '#D94F10',
    text: '#1A1A2E',
    textSub: '#6B7280',
    surface: '#FFFFFF',
    terrain: {
      RIVER: '#4FC3F7',
      PLAINS: '#81C784',
      COAST: '#64B5F6',
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
