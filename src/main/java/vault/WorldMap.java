package vault;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;

/**
 * The geography graph. Towns are nodes, roads are weighted edges.
 * Agents can only travel along roads, one road per turn. Each road costs
 * coins and food in proportion to its effort (distance x terrain difficulty).
 */
public class WorldMap {

    /** Default: coins paid per unit of effort (tolls, cart hire). */
    public static final double DEFAULT_COINS_PER_EFFORT = 0.25;
    /** Default: extra food eaten on the road, 1 per this many units of effort. */
    public static final double DEFAULT_EFFORT_PER_FOOD = 10;

    // Travel prices are settings of the map, so a policy experiment
    // (e.g. "abolish tolls") is just a different WorldMap.
    private final double coinsPerEffort;
    private final double effortPerFood;

    // adjacency list: town -> roads touching it (insertion order kept so runs are repeatable)
    private final Map<String, List<Road>> roads = new LinkedHashMap<>();

    public WorldMap() {
        this(DEFAULT_COINS_PER_EFFORT, DEFAULT_EFFORT_PER_FOOD);
    }

    /** @param effortPerFood use Double.POSITIVE_INFINITY for "travel never costs food" */
    public WorldMap(double coinsPerEffort, double effortPerFood) {
        this.coinsPerEffort = coinsPerEffort;
        this.effortPerFood = effortPerFood;
    }

    /** A map where travel costs nothing (useful as a comparison baseline). */
    public static WorldMap free() {
        return new WorldMap(0, Double.POSITIVE_INFINITY);
    }

    public double getCoinsPerEffort() { return coinsPerEffort; }
    public double getEffortPerFood()  { return effortPerFood; }

    public boolean hasTown(String town) {
        return roads.containsKey(town);
    }

    public void addTown(String town) {
        roads.putIfAbsent(town, new ArrayList<>());
    }

    public void addRoad(String a, String b, double distance, Terrain terrain) {
        if (a.equals(b)) throw new IllegalArgumentException("a road needs two different towns");
        if (distance <= 0) throw new IllegalArgumentException("road length must be positive");
        if (road(a, b) != null) throw new IllegalArgumentException("road " + a + " - " + b + " already exists");
        Road road = new Road(a, b, distance, terrain);
        addTown(a);
        addTown(b);
        roads.get(a).add(road);
        roads.get(b).add(road);
    }

    /** Roads leaving a town. */
    public List<Road> roadsFrom(String town) {
        return Collections.unmodifiableList(roads.getOrDefault(town, List.of()));
    }

    /** All roads, each listed once. */
    public List<Road> allRoads() {
        List<Road> all = new ArrayList<>();
        for (List<Road> list : roads.values()) {
            for (Road r : list) {
                if (!all.contains(r)) all.add(r);
            }
        }
        return all;
    }

    /** The direct road between two towns, or null if there is none. */
    public Road road(String a, String b) {
        for (Road r : roads.getOrDefault(a, List.of())) {
            if (r.otherEnd(a).equals(b)) return r;
        }
        return null;
    }

    public double coinCost(Road road) {
        return road.effort() * coinsPerEffort;
    }

    public int foodCost(Road road) {
        return (int) Math.floor(road.effort() / effortPerFood);
    }

    /**
     * Dijkstra's shortest-path algorithm, weighted by effort.
     * Returns null if {@code to} cannot be reached, or if from == to.
     */
    public Route route(String from, String to) {
        if (from.equals(to) || !roads.containsKey(from) || !roads.containsKey(to)) return null;

        Map<String, Double> best = new HashMap<>();
        Map<String, Road> cameBy = new HashMap<>();
        PriorityQueue<Map.Entry<String, Double>> queue =
                new PriorityQueue<>(Map.Entry.comparingByValue());
        best.put(from, 0.0);
        queue.add(Map.entry(from, 0.0));

        while (!queue.isEmpty()) {
            Map.Entry<String, Double> current = queue.poll();
            String town = current.getKey();
            if (current.getValue() > best.get(town)) continue; // stale queue entry
            if (town.equals(to)) break;
            for (Road r : roads.get(town)) {
                String next = r.otherEnd(town);
                double effort = current.getValue() + r.effort();
                if (effort < best.getOrDefault(next, Double.MAX_VALUE)) {
                    best.put(next, effort);
                    cameBy.put(next, r);
                    queue.add(Map.entry(next, effort));
                }
            }
        }
        if (!cameBy.containsKey(to)) return null;

        // walk back from the destination to rebuild the path
        List<String> path = new ArrayList<>();
        List<Road> used = new ArrayList<>();
        String town = to;
        while (!town.equals(from)) {
            Road r = cameBy.get(town);
            path.add(town);
            used.add(r);
            town = r.otherEnd(town);
        }
        path.add(from);
        Collections.reverse(path);
        Collections.reverse(used);

        double distance = 0, coins = 0;
        int food = 0;
        for (Road r : used) {
            distance += r.distance();
            coins += coinCost(r);
            food += foodCost(r);
        }
        return new Route(List.copyOf(path), List.copyOf(used), distance, coins, food);
    }
}
