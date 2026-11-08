# VAULT — Virtual Agent Universe of Logistic Trade

A Java multi-agent simulation where independent agents trade, travel and make decisions, and an economy emerges from their choices.

**Team Optimal-ish** — Vaishikaa B A, A S Srinidhi, Tanishka S
**Course:** Object Oriented Programming

## What it does

The world is described by a **scenario** file. The default one has 8 towns on 8 kinds of
terrain, joined by 10 roads, and 16 agents:

```
Riverton (river) ---- Woodhaven (forest) ---- Hill (hills) ---- Highpeak (mountains)
   |   \                                       |                    |
   |    +----------- Valley (plains) ----------+                    |
   |                    |                                           |
   +-------------- Port (coast) ---- Saltmarsh (marsh) ---- Sandreach (desert)
```

Fertile river and plains towns grow cheap food; the coast, marsh, desert and mountains grow
little and pay more. A town's terrain decides how much a farmer harvests there, and a road's
terrain decides how much it costs to travel. `classic` is the original 3-town, 6-agent world.

The agents have three roles:

- **Farmers** grow food and sell their spare food at the market.
- **Traders** buy food where it is cheap and sell it where it is expensive.
- **Diplomats** travel between towns earning a fee, and buy food when they run low.

Each **turn** is one day:

1. Every agent's brain decides what to do, and the agent acts. Travelling moves along **one road per turn** and costs coins (tolls) and food, based on the road's distance and terrain.
2. Every agent eats 1 food.
3. Agents in the same town **meet**: they get to know each other better (the relationship graph). Agents apart slowly drift apart.
4. Every town updates its food price: more selling than buying makes the price fall, more buying than selling makes it rise.

Agents only see the live price of the town they are in. For other towns they know the last price they saw there, which may be out of date.

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
java -jar target/vault.jar                       # 10 turns of the default world, saved to vault.db
java -jar target/vault.jar 20                    # 20 turns
java -jar target/vault.jar --scenario classic    # the original 3-town world
java -jar target/vault.jar --scenario my.json    # your own world
java -jar target/vault.jar 20 --seed 7           # a different random seed
java -jar target/vault.jar --db test.db          # save to a different file
java -jar target/vault.jar --no-db               # don't save anything
java -jar target/vault.jar --free-travel         # roads cost nothing (comparison / policy experiment)
```

## Scenarios

A scenario is a JSON file with `towns` (name, terrain, starting price and stock), `roads`
(two towns, distance in km, terrain), `agents` (name, role, starting town; optionally money
and food) and `travel` prices. The built-in ones are in [`src/main/resources/scenarios/`](src/main/resources/scenarios/); copy one to start
your own. Terrains: RIVER, PLAINS, COAST, FOREST, MARSH, HILLS, DESERT, MOUNTAINS (see `Terrain.java`
for each one's travel difficulty and harvest).

`mvnw package` also runs the unit tests in `src/test/java`.

## Run history (SQLite)

Every run is added to `vault.db` (nothing is overwritten). Open it with any SQLite viewer
(e.g. DB Browser for SQLite, or the SQLite extension for VS Code). The schema is in
[`src/main/resources/schema.sql`](src/main/resources/schema.sql).

| Table | One row per | Holds |
|---|---|---|
| `runs` | run | seed, number of turns, git commit of the code, start/finish time |
| `agents`, `towns` | agent / town per run | starting setup (towns include their terrain) |
| `decisions` | agent per turn | what the agent saw (`observation_json`), what its brain chose and why, the result, before/after money, food and town |
| `events` | thing that happened | BOUGHT, SOLD, FARMED, TRAVELLED, RESTED, ACTION_FAILED, HUNGRY, with details in `data_json` |
| `roads` | road per run | the map: the two towns, distance, terrain, coin and food cost |
| `agent_states` | agent per turn | money, food, town and (mid-trip) destination at the end of each turn (turn 0 = start) |
| `relationships` | pair of agents per turn | what one agent thinks of another: trust, familiarity, number of meetings |
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

-- how much each agent spent on tolls
SELECT agent, SUM(json_extract(data_json, '$.coins')) FROM events
WHERE run_id = (SELECT MAX(id) FROM runs) AND type = 'TRAVELLED' GROUP BY agent;

-- how Ravi's familiarity with everyone changed over time
SELECT turn, to_agent, familiarity FROM relationships
WHERE run_id = (SELECT MAX(id) FROM runs) AND from_agent = 'Ravi' ORDER BY to_agent, turn;
```

## How a turn works in code

```
World.runTurn()
  for each agent:
    Observation obs = agent.observe(world, turn)   // what the agent knows
    Decision d      = agent.decide(obs)            // Brain chooses: action + amount/target + reason
    Outcome o       = agent.perform(d, world)      // subclass carries it out; money/stock/road rules enforced here
    log.decision(...)                              // saved to the database
  everyone eats -> HUNGRY events
  social.update()                                  // agents in the same town meet -> relationships
  towns update prices -> town_states
  log.endTurn()                                    // the whole turn is saved as one transaction
```

A brain only ever sees an `Observation`, never the `World`, and can only return one of the
`Action` values. That is what lets an LLM replace the rule brain safely.

The `Observation` holds: the agent's money, food and town; where it is heading if mid-trip;
what it knows about each market (and how old that information is); the cheapest route and
its cost to every other town; and the other agents in the same town with its trust in and
familiarity with each of them.

## The two graphs

| Graph | Nodes | Edges | Class |
|---|---|---|---|
| Map | towns | two-way roads with distance and terrain (`Road`) | `WorldMap`: adjacency list + Dijkstra's shortest path by effort (distance x terrain difficulty) |
| Relationships | agents | one-way opinions with trust (-1..1) and familiarity (0..1) (`Relationship`) | `SocialGraph`: familiarity grows when agents meet and fades when they are apart; trust will change with deals (step 6) and reputation (step 7) |

Travel costs are settings of the map (`WorldMap(coinsPerEffort, effortPerFood)`), so a policy
experiment such as "abolish tolls" is just a different map.

## Where each OOP concept is used

| Concept | Where |
|---|---|
| Classes & objects | `Town`, `Agent`, `World`; objects created in `Simulation.java` |
| Encapsulation | `Wallet`, `Inventory` and `Relationship` keep their values `private` and only change them through checked methods |
| Abstraction | `Brain` interface (implemented by `RuleBrain`); `EventLog` interface (`SqliteEventLog`, `NoEventLog`) |
| Inheritance | `Farmer`, `Trader`, `Diplomat` extend `Agent` |
| Polymorphism | Each subclass overrides `perform()`; `World.runTurn()` calls it on every agent |
| Composition | An `Agent` has a `Wallet`, an `Inventory` and a `Brain`; the `World` has towns, agents, a `WorldMap`, a `SocialGraph` and an `EventLog` |
| Exception handling | `NotEnoughMoneyException` thrown by `Wallet.spend()` and caught in `Agent.buyFood()`; database errors wrapped in `SqliteEventLog` |
| Records & enums | `Observation`, `Decision`, `Outcome`, `MarketReport`, `Road`, `Route`, `Scenario`; `Action`, `Terrain` |

## Roadmap

1. **Done: groundwork.** Maven build, typed brain input/output (`Observation` -> `Decision`), every run saved to SQLite.
2. **Done: the two graphs.** Map of towns and roads (distance, terrain, one road per turn, tolls and food by distance); agents only see live prices where they are; relationship graph between agents (trust, familiarity, meetings).
3. **Done: bigger world.** Scenario files (towns, roads and agents as JSON); 8 towns on 8 terrains, 16 agents; terrain decides harvests and travel costs.
4. **LLM brain.** Language models chosen from free API tiers, with the rule brain as the last resort. JSON answers checked against `Action`; every prompt and response saved so runs can be replayed.
5. **Personality.** Numeric traits (risk, honesty, greed, trust) plus a written description for the prompt.
6. **Memory.** Each agent's own view of past events, with summaries.
7. **Deals between agents.** Offers, contracts, delivering or breaking them.
8. **Reputation.** Trust in the relationship graph changes with every interaction (deals kept or broken); each agent's opinion of others spreads by word of mouth.
9. **Rumours.** Information spreading along the relationship graph and roads, getting distorted, fading, or made up.
10. **Validation.** Many seeds, baseline comparisons, checks against known real-world economic patterns, so policy tests can be trusted.

Later: parallel decisions, more markets (stocks, labour), policy experiments.
