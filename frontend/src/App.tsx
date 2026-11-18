import { tokens } from './tokens/design'

function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: tokens.colors.pageBg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: tokens.font,
        color: tokens.colors.text,
      }}
    >
      <div
        style={{
          background: tokens.colors.glass,
          border: `1.5px solid ${tokens.colors.glassBorder}`,
          borderRadius: tokens.radii.card,
          boxShadow: tokens.shadow.card,
          padding: '48px 64px',
          textAlign: 'center',
          backdropFilter: 'blur(12px)',
          maxWidth: 480,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: tokens.colors.orange,
            borderRadius: tokens.radii.badge,
            padding: '4px 16px',
            color: '#fff',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.08em',
            marginBottom: 20,
          }}
        >
          PHASE A — SCAFFOLD
        </div>

        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            margin: '0 0 12px',
            background: `linear-gradient(135deg, ${tokens.colors.orange}, ${tokens.colors.orangeDark})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          VAULT
        </h1>

        <p style={{ color: tokens.colors.textSub, fontSize: 18, margin: '0 0 32px' }}>
          Economy Simulation Dashboard
        </p>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          {Object.entries(tokens.colors.terrain).map(([terrain, color]) => (
            <span
              key={terrain}
              style={{
                background: color,
                borderRadius: tokens.radii.pill,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {terrain}
            </span>
          ))}
        </div>

        <p style={{ color: tokens.colors.textSub, fontSize: 15 }}>
          🏗️ VAULT is loading… design system active.
        </p>

        <p style={{ color: tokens.colors.textSub, fontSize: 13, marginTop: 8 }}>
          Data bridge running at{' '}
          <a
            href="http://localhost:3001/api/meta"
            target="_blank"
            rel="noreferrer"
            style={{ color: tokens.colors.orange }}
          >
            localhost:3001/api/meta
          </a>
        </p>
      </div>
    </div>
  )
}

export default App
