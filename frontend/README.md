# VAULT Frontend

Interactive economy simulation dashboard for the VAULT project.

## Prerequisites

- Node.js ≥ 18
- npm (or pnpm)

## Getting Started

### Install dependencies (first time only)

```bash
cd frontend
npm install
```

### Start the development server

```bash
npm run dev
```

This starts **both** the data bridge (`:3001`) and Vite dev server (`:5173`) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Running with live simulation data

First, run the simulation from the **project root** (not the `frontend/` folder):

```bash
java -jar target/vault.jar 30
```

Then refresh the browser. The UI will automatically switch from demo data to live data.

> If `vault.db` is missing or empty, the UI shows **demo data** automatically — a fully generated 30-turn dataset so you can explore the UI without running the simulation first.

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start bridge + Vite together (recommended) |
| `npm run dev:server` | Start data bridge only (`localhost:3001`) |
| `npm run dev:vite` | Start Vite only (`localhost:5173`) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## API endpoints (data bridge)

The bridge server at `localhost:3001` exposes:

| Endpoint | Description |
|---|---|
| `GET /api/meta` | Source info (live/demo) |
| `GET /api/runs` | All simulation runs |
| `GET /api/runs/:id/agents` | Agents in a run |
| `GET /api/runs/:id/towns` | Towns in a run |
| `GET /api/runs/:id/roads` | Roads in a run |
| `GET /api/runs/:id/agent-states?turn=N` | Agent states (optional turn filter) |
| `GET /api/runs/:id/town-states?turn=N` | Town states (optional turn filter) |
| `GET /api/runs/:id/decisions?page=0&limit=50` | Paginated decisions |
| `GET /api/runs/:id/events?turn=N` | Events (optional turn filter) |
| `GET /api/runs/:id/relationships?turn=N` | Relationships (optional turn filter) |

---

## Notes

- **Low Graphics toggle** (coming in a later phase) for slower machines — will disable 3D rendering and use 2D map fallback.
- The bridge reads `vault.db` as **read-only** and never modifies simulation data.
- All `/api/...` calls from the React app are proxied through Vite, so no CORS issues during development.
