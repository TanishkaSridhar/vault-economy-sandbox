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
java -jar target/vault.jar 5 --brain llm         # every agent decides with a language model (needs keys, see below)
```

## Language-model brains

With `--brain llm` (or `"brain": "llm"` on an agent in a scenario file) agents decide by asking a
language model. Only free API tiers are used. The models were chosen with `ModelBench`
(below) and are listed in [`src/main/resources/llm.json`](src/main/resources/llm.json), in fallback order:

| Order | Provider / model | Why |
|---|---|---|
| 1 | Groq, `gpt-oss-120b` | best test score (about 95% sensible moves), about 1 s per answer |
| 2 | Cloudflare Workers AI, `gpt-oss-120b` | the same model, so behaviour stays the same while Groq is busy; about 5 s |
| 3 | Google Gemini, `gemini-3.5-flash-lite` | a different company, in case both of the above are down |
| 4 | Groq, `gpt-oss-20b` | separate quota |
| 5 | the rule brain | never fails, never waits |

**Keys.** Put them in a file called `.env` in the project folder (it is git-ignored, never commit it):

```
GROQ_API_KEY=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
GEMINI_API_KEY=...
```

Providers without a key are skipped. To change models or limits, copy `llm.json` to the project
folder and edit the copy (or pass `--llm-config FILE`).

**What happens on each decision** (`LlmBrain`): the observation is turned into a prompt
(`PromptBuilder`), sent to the first provider, and the answer is checked against the rules
(`DecisionParser`). A rule-breaking answer is sent back once with the reason; after that, or if
the provider is busy, out of quota or does not answer within 20 s, the next provider is asked.
A decision that takes more than 30 s in total is made by the rule brain. `LlmRouter` keeps every
provider under its free limits (requests per minute and per day), rests a provider that says
"too many requests" and switches off one with a bad key. The whole conversation, the model that
answered, the time taken, tokens and every failed attempt are saved in the `decisions` table.

**Free-tier limits.** Groq allows gpt-oss-120b about 8000 tokens a minute (about 6 decisions)
and about 1000 requests a day, so in a 16-agent world most decisions go to Cloudflare's copy of
the same model. One turn takes roughly a minute.

**ModelBench** checks candidate models on 13 fixed situations (easy moves and traps, such as
spending the last food on a toll) using the same prompt and checks as the game:

```
java -cp target/vault.jar vault.ModelBench                      # every candidate, once
java -cp target/vault.jar vault.ModelBench --only groq --repeats 3
```

It prints a score table and writes every answer to `model-bench.csv`.

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
| `decisions` | agent per turn | what the agent saw (`observation_json`), what its brain chose and why, the result, before/after money, food and town; for language-model brains also the model that answered, the prompt and answer, time, tokens and failed attempts |
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

-- which model made each decision, and how long it took
SELECT brain_used, COUNT(*), AVG(latency_ms) FROM decisions
WHERE run_id = (SELECT MAX(id) FROM runs) GROUP BY brain_used;

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
| Abstraction | `Brain` interface (implemented by `RuleBrain` and `LlmBrain`); `EventLog` interface (`SqliteEventLog`, `NoEventLog`); `LlmClient` interface (any language model) |
| Inheritance | `Farmer`, `Trader`, `Diplomat` extend `Agent`; `OpenAiClient` extends the abstract `HttpLlmClient` |
| Polymorphism | Each subclass overrides `perform()`; `World.runTurn()` calls it on every agent |
| Composition | An `Agent` has a `Wallet`, an `Inventory` and a `Brain`; the `World` has towns, agents, a `WorldMap`, a `SocialGraph` and an `EventLog` |
| Exception handling | `NotEnoughMoneyException` thrown by `Wallet.spend()` and caught in `Agent.buyFood()`; database errors wrapped in `SqliteEventLog`; `LlmException` (network, key, rate limit, bad reply) and `DecisionParser.InvalidAnswer` decide what `LlmBrain` tries next |
| Records & enums | `Observation`, `Decision`, `Outcome`, `MarketReport`, `Road`, `Route`, `Scenario`; `Action`, `Terrain` |

## Roadmap

1. **Done: groundwork.** Maven build, typed brain input/output (`Observation` -> `Decision`), every run saved to SQLite.
2. **Done: the two graphs.** Map of towns and roads (distance, terrain, one road per turn, tolls and food by distance); agents only see live prices where they are; relationship graph between agents (trust, familiarity, meetings).
3. **Done: bigger world.** Scenario files (towns, roads and agents as JSON); 8 towns on 8 terrains, 16 agents; terrain decides harvests and travel costs.
4. **Done: LLM brain.** Language models chosen by testing (`ModelBench`) from free API tiers, in a fallback chain ending in the rule brain; time limits per answer and per decision; JSON answers checked against the rules; every prompt and response saved.
5. **Personality.** Numeric traits (risk, honesty, greed, trust) plus a written description for the prompt.
6. **Memory.** Each agent's own view of past events, with summaries.
7. **Deals between agents.** Offers, contracts, delivering or breaking them.
8. **Reputation.** Trust in the relationship graph changes with every interaction (deals kept or broken); each agent's opinion of others spreads by word of mouth.
9. **Rumours.** Information spreading along the relationship graph and roads, getting distorted, fading, or made up.
10. **Validation.** Many seeds, baseline comparisons, checks against known real-world economic patterns, so policy tests can be trusted.

Later: parallel decisions, more markets (stocks, labour), policy experiments.
