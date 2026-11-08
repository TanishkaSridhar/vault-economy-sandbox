package vault;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * COMPOSITION: the World HAS towns, agents, two graphs (a map of roads between towns,
 * and a social graph of relationships between agents) and an event log.
 * It runs one turn at a time: every agent observes, decides and acts,
 * everyone eats, then every town updates its food price.
 * Everything that happens is printed and also sent to the EventLog.
 */
public class World {

    private final List<Town> towns = new ArrayList<>();
    private final List<Agent> agents = new ArrayList<>();
    private final WorldMap map;
    private final SocialGraph social = new SocialGraph();
    private final EventLog log;
    private final long seed;
    private String scenarioName = "custom";
    // All randomness in the simulation must come from here, so a run can be repeated from its seed.
    private final Random random;

    public World(long seed, EventLog log, WorldMap map) {
        this.seed = seed;
        this.random = new Random(seed);
        this.log = log;
        this.map = map;
    }

    public World(long seed, EventLog log) {
        this(seed, log, new WorldMap());
    }

    public World() {
        this(0, new NoEventLog());
    }

    public void addTown(Town town) {
        towns.add(town);
        map.addTown(town.getName());
    }

    /** Join two towns with a two-way road. Both towns must already be added. */
    public void addRoad(Town a, Town b, double distance, Terrain terrain) {
        map.addRoad(a.getName(), b.getName(), distance, terrain);
    }

    /**
     * Agents start knowing every town's starting price (common knowledge on day 0),
     * and already know the agents who start in the same town as them (neighbours).
     */
    public void addAgent(Agent agent) {
        List<String> neighbours = new ArrayList<>();
        for (Agent other : agents) {
            if (other.getLocation() == agent.getLocation()) neighbours.add(other.getName());
        }
        agents.add(agent);
        social.addAgent(agent.getName(), SocialGraph.NEIGHBOUR_TRUST, SocialGraph.NEIGHBOUR_FAMILIARITY, neighbours);
        for (Town t : towns) agent.seeMarket(t, 0);
    }

    public Agent findAgent(String name) {
        for (Agent a : agents) {
            if (a.getName().equals(name)) return a;
        }
        return null;
    }

    public List<Town> getTowns()   { return towns; }
    public List<Agent> getAgents() { return agents; }
    public WorldMap getMap()       { return map; }
    public SocialGraph getSocial() { return social; }
    public long getSeed()          { return seed; }
    public String getScenarioName() { return scenarioName; }
    public void setScenarioName(String name) { this.scenarioName = name; }
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

        // 3. agents in the same town meet; everyone else drifts apart a little
        Map<String, String> townOf = new LinkedHashMap<>();
        for (Agent a : agents) townOf.put(a.getName(), a.getLocation().getName());
        social.update(townOf, turn);

        // 4. the economy reacts: prices update from this turn's buying and selling
        System.out.println("  --- market ---");
        for (Town t : towns) {
            MarketReport report = t.updatePrice();
            System.out.println("  " + report);
            log.market(turn, report);
        }

        log.endTurn(turn, this);
    }
}
