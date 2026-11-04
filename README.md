# VAULT — Virtual Agent Universe of Logistic Trade

A Java multi-agent simulation where independent agents trade, travel and make decisions, and an economy emerges from their choices.

**Team Optimal-ish** — Vaishikaa B A, A S Srinidhi, Tanishka S
**Course:** Object Oriented Programming

## What it does

The world has three towns (Valley, Port, Hill), each with a food market. Six agents live in it:

- **Farmers** grow food and sell their spare food at the market.
- **Traders** buy food where it is cheap and sell it where it is expensive.
- **Diplomats** travel between towns earning a fee, and buy food when they run low.

Each **turn** is one day:

1. Every agent's brain decides what to do, and the agent acts.
2. Every agent eats 1 food.
3. Every town updates its food price: more selling than buying makes the price fall, more buying than selling makes it rise.

No one programs the overall economy. Prices, who gets rich and who goes hungry all emerge from individual decisions.

## How to run

Requires Java 17 or newer. Maven is not needed: the included wrapper (`mvnw`) downloads it the first time.

Build (from the project folder):

```
./mvnw package          # macOS / Linux / Git Bash
mvnw.cmd package        # Windows cmd / PowerShell
```

Run:

```
java -jar target/vault.jar                 # 10 turns, saved to vault.db
java -jar target/vault.jar 20              # 20 turns
java -jar target/vault.jar 20 --seed 7     # a different random seed
java -jar target/vault.jar --db test.db    # save to a different file
java -jar target/vault.jar --no-db         # don't save anything
```

## Run history (SQLite)

Every run is added to `vault.db` (nothing is overwritten). Open it with any SQLite viewer
(e.g. DB Browser for SQLite, or the SQLite extension for VS Code). The schema is in
[`src/main/resources/schema.sql`](src/main/resources/schema.sql).

| Table | One row per | Holds |
|---|---|---|
| `runs` | run | seed, number of turns, git commit of the code, start/finish time |
| `agents`, `towns` | agent / town per run | starting setup |
| `decisions` | agent per turn | what the agent saw (`observation_json`), what its brain chose and why, the result, before/after money, food and town |
| `events` | thing that happened | BOUGHT, SOLD, FARMED, TRAVELLED, RESTED, ACTION_FAILED, HUNGRY, with details in `data_json` |
| `agent_states` | agent per turn | money, food and town at the end of each turn (turn 0 = start) |
| `town_states` | town per turn | price before and after, stock, units sold and bought |

Example queries:

```sql
-- money of every agent over time in the latest run
SELECT turn, agent, money FROM agent_states
WHERE run_id = (SELECT MAX(id) FROM runs) ORDER BY agent, turn;

-- why did each trader do what it did?
SELECT turn, agent, action, reason, result FROM decisions
WHERE run_id = (SELECT MAX(id) FROM runs) AND agent IN ('Ravi', 'Arun');

-- how often each agent went hungry, per run
SELECT run_id, agent, COUNT(*) FROM events WHERE type = 'HUNGRY' GROUP BY run_id, agent;
```

## How a turn works in code

```
World.runTurn()
  for each agent:
    Observation obs = agent.observe(world, turn)   // what the agent knows
    Decision d      = agent.decide(obs)            // Brain chooses: action + amount/target + reason
    Outcome o       = agent.perform(d, world)      // subclass carries it out; money/stock rules enforced here
    log.decision(...)                              // saved to the database
  everyone eats -> HUNGRY events
  towns update prices -> town_states
  log.endTurn()                                    // the whole turn is saved as one transaction
```

A brain only ever sees an `Observation`, never the `World`, and can only return one of the
`Action` values. That is what lets an LLM replace the rule brain safely.

## Where each OOP concept is used

| Concept | Where |
|---|---|
| Classes & objects | `Town`, `Agent`, `World`; objects created in `Simulation.java` |
| Encapsulation | `Wallet` and `Inventory` keep their values `private` and only change them through checked methods |
| Abstraction | `Brain` interface (implemented by `RuleBrain`); `EventLog` interface (implemented by `SqliteEventLog`, `NoEventLog`) |
| Inheritance | `Farmer`, `Trader`, `Diplomat` extend `Agent` |
| Polymorphism | Each subclass overrides `perform()`; `World.runTurn()` calls it on every agent |
| Composition | An `Agent` has a `Wallet`, an `Inventory` and a `Brain`; the `World` has towns, agents and an `EventLog` |
| Exception handling | `NotEnoughMoneyException` thrown by `Wallet.spend()` and caught in `Agent.buyFood()`; database errors wrapped in `SqliteEventLog` |
| Records & enums | `Observation`, `Decision`, `Outcome`, `MarketReport`; `Action` |

## Roadmap

1. **Done: groundwork.** Maven build, typed brain input/output (`Observation` -> `Decision`), every run saved to SQLite.
2. **LLM brain.** Cloud LLM APIs with Ollama, then `RuleBrain`, as fallbacks. JSON answers checked against `Action`; every prompt and response saved so runs can be replayed.
3. **Map as a graph.** Towns joined by roads with distance and terrain. Travel takes time and costs food/money based on distance. Agents only see prices where they are (or where they heard about them).
4. **Personality.** Numeric traits (risk, honesty, greed, trust) plus a written description for the prompt.
5. **Memory.** Each agent's own view of past events, with summaries.
6. **Deals between agents.** Offers, contracts, delivering or breaking them.
7. **Relationship graph and reputation.** Edges between agents (trust, familiarity, history) that change with every interaction; each agent's own opinion of others.
8. **Rumours.** Information spreading along the relationship graph and roads, getting distorted, fading, or made up.
9. **Validation.** Many seeds, baseline comparisons, checks against known real-world economic patterns, so policy tests can be trusted.

Later: parallel decisions, more markets (stocks, labour), policy experiments.
