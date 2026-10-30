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

Requires Java 17 or newer. From the project folder:

```
javac -d out src/*.java
java -cp out Simulation
```

Run for a different number of turns:

```
java -cp out Simulation 20
```

## Where each OOP concept is used

| Concept | Where |
|---|---|
| Classes & objects | `Town`, `Agent`, `World`; objects created in `Simulation.java` |
| Encapsulation | `Wallet` and `Inventory` keep their values `private` and only change them through checked methods |
| Abstraction | `Brain` interface, implemented by `RuleBrain` |
| Inheritance | `Farmer`, `Trader`, `Diplomat` extend `Agent` |
| Polymorphism | Each subclass overrides `act()`; `World.runTurn()` calls it on every agent |
| Composition | An `Agent` has a `Wallet`, an `Inventory` and a `Brain`; the `World` has towns and agents |
| Exception handling | `NotEnoughMoneyException` thrown by `Wallet.spend()` and caught in `Agent.buyFood()` |

## Project status

**Done (first demo, around 25%)**
- Core simulation engine with turns in small-scale just for the demo
- Three agent types with rule-based decisions
- Town markets with supply-and-demand pricing

**Next up for building**
- `LlmBrain`: decisions made by a local LLM (Ollama+LangChain4j), replacing `RuleBrain` through the `Brain` interface
- Vector memory so agents remember past events
- Graph-based map, trust network and trade network (JGraphT)
- Parallel decisions (CompletableFuture + Phaser) synchronizing and multi-threading
- More markets (stocks, labour) for real-world scenarios such as market stress testing and policy testing
