package vault;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * COMPOSITION: the World HAS towns, agents and an event log.
 * It runs one turn at a time: every agent observes, decides and acts,
 * everyone eats, then every town updates its food price.
 * Everything that happens is printed and also sent to the EventLog.
 */
public class World {

    private final List<Town> towns = new ArrayList<>();
    private final List<Agent> agents = new ArrayList<>();
    private final EventLog log;
    private final long seed;
    // All randomness in the simulation must come from here, so a run can be repeated from its seed.
    private final Random random;

    public World(long seed, EventLog log) {
        this.seed = seed;
        this.random = new Random(seed);
        this.log = log;
    }

    public World() {
        this(0, new NoEventLog());
    }

    public void addTown(Town town)    { towns.add(town); }
    public void addAgent(Agent agent) { agents.add(agent); }

    public List<Town> getTowns()   { return towns; }
    public List<Agent> getAgents() { return agents; }
    public long getSeed()          { return seed; }
    public Random getRandom()      { return random; }

    public Town findTown(String name) {
        for (Town t : towns) {
            if (t.getName().equals(name)) return t;
        }
        return null;
    }

    public void runTurn(int turn) {
        System.out.println();
        System.out.println("==================== TURN " + turn + " ====================");

        // 1. every agent observes, decides and acts (POLYMORPHISM: same call, different behaviour)
        for (Agent a : agents) {
            Observation obs = a.observe(this, turn);
            Agent.State before = a.snapshot();
            Decision decision = a.decide(obs);
            Outcome outcome = a.perform(decision, this);
            Agent.State after = a.snapshot();

            System.out.printf("  %-8s %-11s -> %s%n", a.getName(), "(" + a.getRole() + ")", outcome.message());
            log.decision(turn, a, obs, decision, outcome, before, after);
        }

        // 2. everyone eats 1 food
        for (Agent a : agents) {
            String warning = a.eat();
            if (warning != null) {
                System.out.println("  ! " + warning);
                log.event(turn, "HUNGRY", a.getName(), a.getLocation().getName(), warning, Map.of());
            }
        }

        // 3. the economy reacts: prices update from this turn's buying and selling
        System.out.println("  --- market ---");
        for (Town t : towns) {
            MarketReport report = t.updatePrice();
            System.out.println("  " + report);
            log.market(turn, report);
        }

        log.endTurn(turn, this);
    }
}
