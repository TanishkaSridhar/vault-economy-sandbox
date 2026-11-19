Read frontend/CLAUDE.md and docs/PLAN.md first. This message is the master brief for finishing the VAULT frontend. Work ONLY in /frontend and /docs, on the `frontend` branch.

Legend: ⭐ NEW = an addition beyond the original plan. 🔧 CHANGED = a change to the existing approach.

══════════════════════════════════════════
0. HARD RULES (never break)
══════════════════════════════════════════
- Never modify src/, pom.xml, mvnw*, .mvn, schema.sql, scenarios, tests or anything outside /frontend and /docs. The only allowed exception is adding git-ignore entries.
- vault.db and the scenario JSONs are READ-ONLY. The bridge opens vault.db with readonly: true.
- Never read, print or expose .env or any API key. ⭐ NEW: no external API calls from the frontend at all (no LLM calls, no CDNs for data).
- If a feature seems to need a backend change, find a workaround in /frontend/server or ask me first.
- ⭐ NEW: before every commit run `git diff --name-only | grep -v '^frontend/\|^docs/'` and confirm it prints nothing.

══════════════════════════════════════════
1. CURRENT STATE (do not rebuild what works)
══════════════════════════════════════════
Architecture: Java simulation → vault.db → Node/Express bridge (:3001, frontend/server/index.mjs + demo-data.mjs) → /api → React 19 + TS + Vite 8 + React Router 7 + SWR + Zustand + Recharts + Three.js (@react-three/fiber, drei, react-spring) + Tailwind 4 + lucide-react + oxlint.
Already present: 6 routes, the ui/ widgets, layout, 3D world/ scenes (8 town scenes, Agent3D, AgentCard, worldData.ts, characterData.ts), 16 SVG sprites, useTurn and useSettings stores.
Start by auditing each feature below (Done / Partial / Missing) and extend the existing code with the smallest possible change. Do not rewrite working components.

══════════════════════════════════════════
2. FIX THESE KNOWN BUGS FIRST (one commit each)
══════════════════════════════════════════
1. Demo run has id 0 but useRunData only fetches when runId > 0, so demo mode shows nothing. Fix it.
2. /decisions defaults to limit=50 and the Decisions page never pages. Add server-side limit/offset, search and filters. Overview and Economy must not rely on a truncated list.
3. The bridge picks live vs demo once at startup. 🔧 CHANGED: re-check on each request (cache for a few seconds), and detect a replaced vault.db without restarting.
4. worldData.ts hardcodes the default scenario's town positions. Keep the hand-made layout for the default 8 towns. ⭐ NEW: add an automatic fallback layout (force-directed from /towns and /roads) for `classic` and custom scenarios, with a safe default scene for unknown terrains.
5. Types are defined twice (types/vault.ts and useSimData.ts). Merge into ONE source of truth.
6. Sweep for console errors, race conditions when switching runs, 3D resources not being disposed, and frame drops.

══════════════════════════════════════════
3. DESIGN SYSTEM (reference: docs/uidesign_inspo.jpeg)
══════════════════════════════════════════
Light airy pastel-gradient background, frosted-glass cards (white border, soft shadow, backdrop blur, ~20px radius), a single orange accent (#FF6B2C), and the Plus Jakarta Sans font. Layout: top bar (VAULT logo, pill nav Overview / Towns / Agents / Economy / Decisions / Runs, search, bell, avatar), a slim floating icon rail on the left, and a bold page header. Widgets: KPITile with tick progress, RingGauge with ticks, DotMatrixChart, TickBar, Sparkline, TabSwitch, Timeline.
⭐ NEW: a theme file with every colour, radius, shadow and blur in ONE place (tokens/design.ts), with no hardcoded colours in components.
⭐ NEW: respect `prefers-reduced-motion` (disable auto-rotate, particles and bobbing).
⭐ NEW: a day/night cycle on the 3D scenes tied to the turn number (warm dawn, bright day, orange dusk, cool night). The UI cards stay light.

══════════════════════════════════════════
4. THE 3D WORLD MAP (Overview hero)
══════════════════════════════════════════
- Isometric view, slow auto-rotate, orbit controls with damping, 8 floating town islands, and roads read from the /roads data (do not hardcode them) drawn as glowing curves coloured by terrain.
- Hovering a town lifts it and shows its name. Clicking it flies the camera in and opens that town's scene.
- Agents mid-trip visibly walk along their road, interpolated by turn.
- Use InstancedMesh for repeated props.
- ⭐ NEW: map layers toggle (Prices / Wealth / Hunger / Traffic): towns glow green-to-red by food price, roads thicken or pulse by number of travellers or tolls paid.
- ⭐ NEW: faint trails behind recently moved agents (last 3 turns) in the role colour.
- ⭐ NEW: camera presets (Overview, Top-down, Follow selected agent) plus a double-click to reset.
- ⭐ NEW: a small mini-map or legend (terrain colours, role icons) in a glass card.
- ⭐ NEW: floating event toasts in the scene (e.g. "Ravi sold 4 food at Port", "Murugan went hungry") for the current turn only, fading quickly.

══════════════════════════════════════════
5. EIGHT UNIQUE TOWN SCENES (lazy-loaded)
══════════════════════════════════════════
Riverton: flowing river, wooden bridge, watermill wheel, reeds, ducks. Woodhaven: pines and oaks, log cabin with smoke, falling leaves, fireflies. Hill: rolling hills, windmill, stone walls, sheep. Highpeak: snowy peaks, cabin, snowfall, cloud drift. Valley: swaying wheat, red barn, scarecrow, birds. Port: docks, lighthouse with flashing light, rocking boats, waves, seagulls. Saltmarsh: shallow water, reed beds, boardwalk, mist, dragonflies, frogs. Sandreach: dunes, cacti, striped-awning market, camel, heat shimmer.
Each scene has a MarketStall showing the live price and stock for the current turn, plus the agents currently in town.
⭐ NEW: the stall reacts to the data. The price tag turns green/red on a rise/fall, the stock pile grows or shrinks, and a small arrow shows the last change.
⭐ NEW: a town info panel (glass card) beside the scene: terrain badge, price, stock, units sold/bought this turn, agents present, 10-turn price sparkline.
🔧 CHANGED: Low Graphics replaces particles and shaders with static simple props, and the toggle must visibly change frame cost.

══════════════════════════════════════════
6. AGENTS
══════════════════════════════════════════
- 16 agents, each with ONE unique character from docs/character_inspo.jpeg, assigned consistently for the whole run (sprites in public/characters/, mapping in characterData.ts). 🔧 CHANGED: verify each agent's role against src/main/resources/scenarios/default.json (READ ONLY) instead of trusting any hardcoded table. If a scenario has agent names that aren't in characterData.ts, assign an unused character deterministically (hash of the name) instead of crashing.
- Billboard sprite with faked depth and a contact shadow. If it looks flat, upgrade to chunky low-poly 3D models that keep the same hair, skin, glasses and outfit colours.
- A role badge (Farmer / Trader / Diplomat) with icon is ALWAYS visible above the head. The NAME is shown ONLY after clicking.
- Animations: idle bob, walking hop with a lean, buy/sell hop with a coin burst, hungry droop with a darker tint, profit sparkle. In-town agents wander near the market, fields or docks depending on role.
- ⭐ NEW: speech bubbles. On the current turn, a short bubble shows the agent's decision `reason` (truncated) when hovering, so you can see agents "thinking".
- ⭐ NEW: a small hunger/food and money mini-bar under hovered agents.
- ⭐ NEW: hovering highlights the agent and dims others; Esc deselects.
- Click card (glass): name, role, current town, destination, money, food, money-over-time sparkline, last decision and its reason, top 3 relationships (name, trust, familiarity). The camera gently follows.
- ⭐ NEW: card extras: net worth rank (e.g. "#3 of 16"), total tolls paid, number of times hungry, a "View all decisions" link that opens the Decisions page filtered to that agent, and for LLM runs the brain/model used and latency of the last decision.

══════════════════════════════════════════
7. TIMELINE
══════════════════════════════════════════
Glass bar: play/pause, speed (0.5×/1×/2×/4×), scrubber, turn counter, run selector. Everything (prices, positions, KPIs, charts) is driven by the turn and interpolated smoothly.
⭐ NEW: keyboard shortcuts: Space = play/pause, ←/→ = step a turn, Shift+←/→ = jump 5, Home/End. Show a tiny "?" shortcut help popover.
⭐ NEW: event markers on the scrubber (e.g. dots where many agents were hungry or prices spiked), and loop-replay option.

══════════════════════════════════════════
8. PAGES
══════════════════════════════════════════
- Overview: 3D hero + KPI tiles (total money, trades, hungry events, tolls paid), food price index ring gauge, dot-matrix price history, supply vs demand ring with tick bars, selected-town conditions card.
  ⭐ NEW: a live "Event feed" card (BOUGHT/SOLD/FARMED/TRAVELLED/HUNGRY up to the current turn, newest first, click to focus the agent or town). ⭐ NEW: a "Top earners / Most hungry" mini-leaderboard card.
- Towns: gallery and detail view with price/stock history and who is currently there. ⭐ NEW: compare two towns side by side.
- Agents: grid of all agents with role badges, sortable by money, food or role, plus filter by role and town. ⭐ NEW: search by name.
- Economy: price history for every town (toggle lines), money over time per agent (toggle agents), wealth distribution histogram. ⭐ NEW: wealth inequality (Gini coefficient) over time; trade volume per town; toll spending; price spread between towns (the arbitrage traders exploit); correlation of road terrain with toll cost.
- Decisions: searchable, paginated log with filters (agent, action, result, turn range) and an expandable row for the full observation JSON. For LLM runs show model, latency, tokens and failed attempts. ⭐ NEW: summary strip ("which brain made how many decisions, average latency") and CSV export of the filtered view.
- Runs: list of runs with seed, turns, scenario and timestamps. Compare two runs side by side (KPIs, price curves, wealth). ⭐ NEW: a "How to run a simulation" glass card with a copy button for `java -jar target/vault.jar 30` and its options (UI cannot start the simulation).
- ⭐ NEW: Relationships page (add a nav item). A force-directed graph of agents. Node = character avatar, edge thickness = familiarity, colour = trust (red → green). Time-aware: it changes with the turn. Click a node to open the agent card.
- ⭐ NEW: "Ask VAULT" bar (top of Overview). Answers questions from the already-loaded data only, using simple intent matching in the browser (no external API). Examples: "who is richest?", "which town has the cheapest food?", "who went hungry most?", "how much did Ravi spend on tolls?". Show a short answer with a mini chart or link to the page. If it doesn't understand, show example questions.

══════════════════════════════════════════
9. DATA BRIDGE IMPROVEMENTS (frontend/server only)
══════════════════════════════════════════
- ⭐ NEW: `GET /api/health` (source: live or demo, last db modification time, run count).
- ⭐ NEW: server-side aggregates so the browser doesn't download everything: per-turn KPIs, per-town price series, per-agent money series, leaderboard. Cache them per run, and invalidate when the db file changes.
- ⭐ NEW: `GET /api/runs/:id/summary` for the Runs page and compare view.
- ⭐ NEW: strict input validation (numeric ids, bounded limit/offset) and parameterised queries only.
- ⭐ NEW: friendly JSON errors and a 5-second SWR refresh on `/api/health` to show a Live / Demo badge in the top bar, plus a "new run available" toast.
- ⭐ NEW: a clear startup message if better-sqlite3 fails to load (falls back to demo with a visible banner).

══════════════════════════════════════════
10. QUALITY, PERFORMANCE, ACCESSIBILITY
══════════════════════════════════════════
- 60 fps target on a normal laptop. One Canvas, lazy-loaded scenes, instancing, and dispose geometries and textures on unmount. ⭐ NEW: auto-suggest Low Graphics if the average frame rate stays below ~30 fps. ⭐ NEW: pause rendering when the tab is hidden.
- Loading skeletons, empty states and error states on every page. ⭐ NEW: an error boundary around the 3D canvas with a "Reload scene" button and a 2D fallback map if WebGL isn't available.
- Responsive for laptop and large tablet; cards collapse gracefully.
- ⭐ NEW: accessibility: keyboard focus rings, aria-labels on icon buttons, sufficient contrast for text on glass, and an accessible text/table alternative for the 3D map.
- ⭐ NEW: a few unit tests (Vitest) for the pure logic: the Gini function, the turn-interpolation of agent positions, the fallback layout, the "Ask VAULT" intent matching and the bridge's input validation. Add `npm test`.
- ⭐ NEW: `.env`-free configuration: bridge port, db path and demo mode via environment variables with sane defaults (FRONTEND ONLY, documented in the README).
- Finish frontend/README.md: prerequisites, `npm run dev`, how to run the simulation and refresh, demo mode, the Low Graphics toggle, keyboard shortcuts, architecture diagram.

══════════════════════════════════════════
11. HOW TO WORK
══════════════════════════════════════════
1. Do Milestone 1 (secure the work: check git-ignores, build and lint, commit the untracked world/, characters/, scripts/, docs/ in logical commits).
2. Fix the known bugs in section 2, one commit each.
3. Audit: give me a Done / Partial / Missing checklist for everything in sections 3 to 10 and a priority-ordered plan with rough sizes. STOP and wait for my approval.
4. After approval, build in this order, one phase at a time: (a) bridge improvements, (b) 3D map and town scenes, (c) agents and cards, (d) timeline and pages, (e) the ⭐ extras, (f) polish and tests.
5. After EACH phase: npm run build, npm run lint, npm test (when it exists), run the app, take browser screenshots, compare them against docs/uidesign_inspo.jpeg and docs/character_inspo.jpeg, fix mismatches, commit, run the git check from section 0, then STOP and show me the screenshots.
6. Never merge or push. At the end, give me the exact commands to review and merge myself.