package vault;

import java.util.List;
import java.util.Map;

/**
 * Everything an agent knows when it makes a decision.
 * A brain receives ONLY this, never the World itself, so what an agent
 * can know is controlled in one place. Later steps will narrow it
 * (an agent should not see far-away prices for free) and add memories,
 * reputation and rumours to it.
 *
 * @param turn       the current turn number
 * @param name       the agent's name
 * @param role       Farmer, Trader, Diplomat, ...
 * @param money      coins in the wallet
 * @param food       food in the bag
 * @param town       the town the agent is in
 * @param roleStats  role-specific numbers (e.g. a trader's last buying price)
 * @param towns      market information for each town, in world order
 */
public record Observation(int turn, String name, String role, double money, int food,
                          String town, Map<String, Double> roleStats, List<TownView> towns) {

    /** What an agent can see about one town's market. */
    public record TownView(String name, double foodPrice, int foodStock) {}

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
