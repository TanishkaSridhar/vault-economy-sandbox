-- VAULT event store (SQLite).
-- Every run is appended; nothing is overwritten, so runs can be compared later.
-- Columns ending in _json hold JSON text; SQLite can query them with json_extract().

-- One row per simulation run: how it was started and with which code.
CREATE TABLE IF NOT EXISTS runs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at       TEXT    NOT NULL,          -- ISO-8601 timestamp
    finished_at      TEXT,                      -- NULL if the run crashed or is still going
    seed             INTEGER NOT NULL,          -- random seed, for reproducing the run
    turns_planned    INTEGER NOT NULL,
    turns_completed  INTEGER NOT NULL DEFAULT 0,
    code_version     TEXT,                      -- git commit (+ "-dirty" if there were uncommitted changes)
    config_json      TEXT                       -- any other settings
);

-- Who took part in a run, and how they started.
CREATE TABLE IF NOT EXISTS agents (
    run_id       INTEGER NOT NULL REFERENCES runs(id),
    name         TEXT    NOT NULL,
    role         TEXT    NOT NULL,
    brain        TEXT    NOT NULL,
    start_town   TEXT    NOT NULL,
    start_money  REAL    NOT NULL,
    start_food   INTEGER NOT NULL,
    PRIMARY KEY (run_id, name)
);

-- The towns in a run.
CREATE TABLE IF NOT EXISTS towns (
    run_id       INTEGER NOT NULL REFERENCES runs(id),
    name         TEXT    NOT NULL,
    start_price  REAL    NOT NULL,
    start_stock  INTEGER NOT NULL,
    PRIMARY KEY (run_id, name)
);

-- What each brain chose, what it saw when choosing, and how it turned out.
-- Step 2 (LLM brain) adds prompt / response / model / latency columns here.
CREATE TABLE IF NOT EXISTS decisions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id            INTEGER NOT NULL REFERENCES runs(id),
    turn              INTEGER NOT NULL,
    agent             TEXT    NOT NULL,
    brain             TEXT    NOT NULL,
    observation_json  TEXT    NOT NULL,         -- the full Observation given to the brain
    action            TEXT    NOT NULL,         -- FARM / BUY / SELL / TRAVEL / REST
    amount            INTEGER,
    target            TEXT,
    reason            TEXT,
    success           INTEGER NOT NULL,         -- 1 = carried out, 0 = failed
    result            TEXT    NOT NULL,         -- human-readable result
    town_before       TEXT    NOT NULL,
    town_after        TEXT    NOT NULL,
    money_before      REAL    NOT NULL,
    money_after       REAL    NOT NULL,
    food_before       INTEGER NOT NULL,
    food_after        INTEGER NOT NULL
);

-- Things that happened in the world. Memory, reputation and rumours (later steps)
-- are built from this table: an agent remembers events it took part in or heard about.
CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       INTEGER NOT NULL REFERENCES runs(id),
    turn         INTEGER NOT NULL,
    type         TEXT    NOT NULL,              -- BOUGHT, SOLD, FARMED, TRAVELLED, RESTED, ACTION_FAILED, HUNGRY
    agent        TEXT,                          -- who did it (NULL for world-level events)
    town         TEXT,                          -- where it happened
    decision_id  INTEGER REFERENCES decisions(id),
    message      TEXT    NOT NULL,
    data_json    TEXT                           -- the numbers: qty, price, from, to ...
);

-- End-of-turn snapshot of every agent (turn 0 = starting state).
CREATE TABLE IF NOT EXISTS agent_states (
    run_id  INTEGER NOT NULL REFERENCES runs(id),
    turn    INTEGER NOT NULL,
    agent   TEXT    NOT NULL,
    town    TEXT    NOT NULL,
    money   REAL    NOT NULL,
    food    INTEGER NOT NULL,
    PRIMARY KEY (run_id, turn, agent)
);

-- End-of-turn snapshot of every market (turn 0 = starting state).
CREATE TABLE IF NOT EXISTS town_states (
    run_id        INTEGER NOT NULL REFERENCES runs(id),
    turn          INTEGER NOT NULL,
    town          TEXT    NOT NULL,
    price_before  REAL    NOT NULL,
    price         REAL    NOT NULL,
    stock         INTEGER NOT NULL,
    sold          INTEGER NOT NULL,             -- food sold TO the market this turn
    bought        INTEGER NOT NULL,             -- food bought FROM the market this turn
    PRIMARY KEY (run_id, turn, town)
);

CREATE INDEX IF NOT EXISTS idx_events_run_turn   ON events(run_id, turn);
CREATE INDEX IF NOT EXISTS idx_events_run_agent  ON events(run_id, agent);
CREATE INDEX IF NOT EXISTS idx_decisions_run     ON decisions(run_id, turn, agent);
