package vault;

import java.util.List;
import java.util.Map;

/**
 * Everything an agent knows when it makes a decision.
 * A brain receives ONLY this, never the World itself, so what an agent
 * can know is controlled in one place. Prices are only live for the town the
 * agent is in; for other towns it is the last price the agent saw there.
 * Later steps add memories, reputation and rumours to it.
 *
 * @param turn       the current turn number
 * @param name       the agent's name
 * @param role       Farmer, Trader, Diplomat, ...
 * @param money      coins in the wallet
 * @param food       food in the bag
 * @param town        the town the agent is in
 * @param destination where the agent is heading if it is part-way through a trip, otherwise null
 * @param roleStats   role-specific numbers (e.g. a trader's last buying price)
 * @param towns       what the agent knows about each town's market, in world order
 * @param routes      the cheapest route from here to every other reachable town
 * @param people      the other agents in the same town, and what this agent thinks of them
 * @param actions     the actions this agent's role allows
 */
public record Observation(int turn, String name, String role, double money, int food,
                          String town, String destination, Map<String, Double> roleStats,
                          List<TownView> towns, List<RouteView> routes, List<PersonView> people,
                          List<Action> actions) {

    /**
     * Another agent who is here, as seen by this agent.
     *
     * @param trust        -1 .. +1
     * @param familiarity  0 (stranger) .. 1
     * @param meetings     turns spent in the same town so far
     */
    public record PersonView(String name, String role, double trust, double familiarity, int meetings) {}

    /**
     * What an agent knows about one town's market.
     *
     * @param seenTurn the turn the agent last saw this market (the current turn if it is there now,
     *                 0 if it only knows the starting price)
     */
    public record TownView(String name, Terrain terrain, double foodPrice, int foodStock, int seenTurn) {}

    /** How many turns old the agent's information about a town is. */
    public int age(TownView t) {
        return turn - t.seenTurn();
    }

    /**
     * How to get to another town.
     *
     * @param to        destination
     * @param nextStop  the town reached after one turn of travel
     * @param legs      number of roads, which is also the number of turns the trip takes
     * @param distance  total km
     * @param coins     total coin cost of the whole trip
     * @param food      total extra food eaten on the whole trip
     * @param nextCoins coin cost of just the next road (what is paid this turn)
     * @param nextFood  food cost of just the next road
     */
    public record RouteView(String to, String nextStop, int legs, double distance, double coins, int food,
                            double nextCoins, int nextFood) {}

    /** The route to a town, or null if it cannot be reached. */
    public RouteView routeTo(String townName) {
        for (RouteView r : routes) {
            if (r.to().equals(townName)) return r;
        }
        return null;
    }

    /** True if the agent is part-way through a trip. */
    public boolean travelling() {
        return destination != null && !destination.equals(town);
    }

    public TownView currentTown() {
        return find(town);
    }

    public TownView find(String townName) {
        for (TownView t : towns) {
            if (t.name().equals(townName)) return t;
        }
        throw new IllegalArgumentException("unknown town: " + townName);
    }

    public double stat(String key, double fallback) {
        return roleStats.getOrDefault(key, fallback);
    }

    // On ties the first town in world order wins, matching the original World helpers.
    public TownView mostExpensiveTown() {
        TownView best = towns.get(0);
        for (TownView t : towns) {
            if (t.foodPrice() > best.foodPrice()) best = t;
        }
        return best;
    }

    public TownView cheapestTown() {
        TownView best = towns.get(0);
        for (TownView t : towns) {
            if (t.foodPrice() < best.foodPrice()) best = t;
        }
        return best;
    }

    public TownView nextTown(String from) {
        int i = towns.indexOf(find(from));
        return towns.get((i + 1) % towns.size());
    }
}
