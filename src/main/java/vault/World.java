package vault;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * COMPOSITION: the World HAS towns, agents, two graphs (a map of roads between towns,
 * and a social graph of relationships between agents), a marketplace (the towns' offer
 * boards), a rumour mill and an event log.
 * It runs one turn (day) at a time:
 *   1. agents act one after another, in a new random order every day; each sees the offer board
 *      as it is when its turn comes, and who has already acted;
 *   2. food still on the offer boards is sold to the town markets;
 *   3. everyone eats;
 *   4. agents in the same town meet;
 *   5. rumours are told and passed on;
 *   6. every town updates its food price.
 * Everything that happens is printed and also sent to the EventLog.
 */
public class World {

    private final List<Town> towns = new ArrayList<>();
    private final List<Agent> agents = new ArrayList<>();
    private final WorldMap map;
    private final SocialGraph social = new SocialGraph();
    private final Marketplace market = new Marketplace();
    private final RumourMill rumours = new RumourMill();
    // who has already taken their turn today
    private final Set<String> actedToday = new HashSet<>();
    private int turn = 0;
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
    public Marketplace getMarket() { return market; }
    public RumourMill getRumours() { return rumours; }
    public int getTurn()           { return turn; }
    public boolean hasActed(String agentName) { return actedToday.contains(agentName); }

    /** Record something that happened today that is not an agent's own decision (a trade, a rumour...). */
    public void record(String type, String agent, String town, String message, Map<String, Object> data) {
        log.event(turn, type, agent, town, message, data);
    }
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
        this.turn = turn;
        actedToday.clear();
        System.out.println();
        System.out.println("==================== TURN " + turn + " ====================");

        // 1. every agent observes, decides and acts (POLYMORPHISM: same call, different behaviour).
        //    The order is shuffled every day so nobody is always first to the offer board.
        List<Agent> order = new ArrayList<>(agents);
        Collections.shuffle(order, random);
        Map<Agent, Gossip> gossip = new LinkedHashMap<>();
        for (Agent a : order) {
            Observation obs = a.observe(this, turn);
            a.clearNews(); // read now; anything that happens from here on is news for tomorrow
            Agent.State before = a.snapshot();
            Decision decision = a.decide(obs);
            BrainTrace trace = a.getBrain().lastTrace();
            Outcome outcome = a.perform(decision, this);
            Agent.State after = a.snapshot();
            actedToday.add(a.getName());
            if (decision.gossip() != null) gossip.put(a, decision.gossip());

            System.out.printf("  %-8s %-11s -> %s%n", a.getName(), "(" + a.getRole() + ")", outcome.message());
            if (trace != null) {
                // language-model brains explain themselves; show which model answered and why
                String who = trace.fellBack() ? "rule fallback" : trace.brainUsed().substring(4);
                System.out.printf("  %21s why [%s, %.1fs]: %s%n", "", who, trace.latencyMs() / 1000.0, decision.reason());
            }
            if (decision.gossip() != null) {
                System.out.printf("  %21s will say tonight: %s is %s%n", "", decision.gossip().about(),
                        decision.gossip().good() ? "a fair dealer" : "not to be trusted");
            }
            log.decision(turn, a, obs, decision, trace, outcome, before, after);
        }

        // 2. the offer boards close: unsold food goes to the town markets
        List<String> settled = market.settle(this);
        if (!settled.isEmpty()) {
            System.out.println("  --- offer boards ---");
            for (String line : settled) System.out.println("  " + line);
        }

        // 3. everyone eats 1 food
        for (Agent a : agents) {
            String warning = a.eat();
            if (warning != null) {
                System.out.println("  ! " + warning);
                log.event(turn, "HUNGRY", a.getName(), a.getLocation().getName(), warning, Map.of());
            }
        }

        // 4. agents in the same town meet; everyone else drifts apart a little
        Map<String, String> townOf = new LinkedHashMap<>();
        for (Agent a : agents) townOf.put(a.getName(), a.getLocation().getName());
        social.update(townOf, turn);

        // 5. word of mouth: tonight's gossip, and rumours passed on from earlier days
        List<String> told = rumours.spread(gossip, this, turn);
        if (!told.isEmpty()) {
            System.out.println("  --- rumours ---");
            for (String line : told) System.out.println("  " + line);
        }

        // 6. the economy reacts: prices update from this turn's buying and selling at the markets
        System.out.println("  --- market ---");
        for (Town t : towns) {
            MarketReport report = t.updatePrice();
            System.out.println("  " + report);
            log.market(turn, report);
        }

        log.endTurn(turn, this);
    }
}
