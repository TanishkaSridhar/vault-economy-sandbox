package vault;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * A world described as data (a JSON file) instead of code: the towns, the roads
 * between them, the agents and the travel prices. Changing the world for an
 * experiment means editing or copying a scenario file, not the Java code.
 *
 * Built-in scenarios live in src/main/resources/scenarios/. A path to any other
 * JSON file with the same shape also works.
 */
public record Scenario(String name, String description, Travel travel,
                       List<TownSpec> towns, List<RoadSpec> roads, List<AgentSpec> agents) {

    /** Travel prices. Missing values use the WorldMap defaults. */
    public record Travel(Double coinsPerEffort, Double effortPerFood) {}

    public record TownSpec(String name, Terrain terrain, double foodPrice, int foodStock) {}

    public record RoadSpec(String from, String to, double distance, Terrain terrain) {}

    /**
     * money and food are optional; without them the role's usual starting values are used.
     * brain is "rule" (the default) or "llm", so one run can mix rule and language-model agents.
     */
    public record AgentSpec(String name, String role, String town, Double money, Integer food, String brain) {}

    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);

    /** Load a built-in scenario by name (e.g. "default", "classic") or a JSON file by path. */
    public static Scenario load(String nameOrPath) {
        try {
            Path file = Path.of(nameOrPath);
            if (Files.isRegularFile(file)) {
                return JSON.readValue(file.toFile(), Scenario.class);
            }
            try (InputStream in = Scenario.class.getResourceAsStream("/scenarios/" + nameOrPath + ".json")) {
                if (in == null) {
                    throw new IllegalArgumentException("no scenario called '" + nameOrPath
                            + "' (built-in: default, classic; or give a path to a .json file)");
                }
                return JSON.readValue(in, Scenario.class);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("could not read scenario " + nameOrPath + ": " + e.getMessage(), e);
        }
    }

    /** Create the World this scenario describes. */
    public World build(long seed, EventLog log, boolean freeTravel) {
        WorldMap map;
        if (freeTravel) {
            map = WorldMap.free();
        } else {
            double coins = travel != null && travel.coinsPerEffort() != null
                    ? travel.coinsPerEffort() : WorldMap.DEFAULT_COINS_PER_EFFORT;
            double food = travel != null && travel.effortPerFood() != null
                    ? travel.effortPerFood() : WorldMap.DEFAULT_EFFORT_PER_FOOD;
            map = new WorldMap(coins, food);
        }
        World world = new World(seed, log, map);
        world.setScenarioName(name);

        for (TownSpec t : towns) {
            if (world.findTown(t.name()) != null) throw new IllegalArgumentException("two towns called " + t.name());
            world.addTown(new Town(t.name(), t.terrain(), t.foodPrice(), t.foodStock()));
        }
        for (RoadSpec r : roads) {
            world.addRoad(town(world, r.from()), town(world, r.to()), r.distance(), r.terrain());
        }
        for (AgentSpec a : agents) {
            if (world.findAgent(a.name()) != null) throw new IllegalArgumentException("two agents called " + a.name());
            world.addAgent(createAgent(a, town(world, a.town())));
        }
        return world;
    }

    private static Agent createAgent(AgentSpec a, Town town) {
        Agent agent;
        switch (a.role()) {
            case "Farmer":   agent = new Farmer(a.name(), town); break;
            case "Trader":   agent = new Trader(a.name(), town); break;
            case "Diplomat": agent = new Diplomat(a.name(), town); break;
            default: throw new IllegalArgumentException("unknown role '" + a.role() + "' for " + a.name());
        }
        if (a.money() != null) agent.wallet = new Wallet(a.money());
        if (a.food() != null) agent.bag = new Inventory(a.food());
        return agent;
    }

    private static Town town(World world, String name) {
        Town t = world.findTown(name);
        if (t == null) throw new IllegalArgumentException("scenario mentions unknown town " + name);
        return t;
    }
}
