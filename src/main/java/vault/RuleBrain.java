package vault;

import vault.Observation.RouteView;
import vault.Observation.TownView;

/**
 * A brain made of fixed rules. It is the baseline the LLM brain will be compared
 * against, and the last fallback if every language model is unavailable.
 */
public class RuleBrain implements Brain {

    @Override
    public String name() {
        return "rule";
    }

    /** The rule brain only gossips about someone it feels at least this strongly about, and always honestly. */
    static final double GOSSIP_THRESHOLD = Agent.OPINION_THRESHOLD;

    @Override
    public Decision decide(Observation obs) {
        Decision d;
        switch (obs.role()) {
            case "Farmer":   d = farmer(obs); break;
            case "Trader":   d = trader(obs); break;
            case "Diplomat": d = diplomat(obs); break;
            default:         d = Decision.rest("no rules for role " + obs.role());
        }
        Gossip g = honestGossip(obs);
        return g == null ? d : d.withGossip(g);
    }

    /** Tell the town what it really thinks of the person it feels most strongly about, if strongly enough. */
    private Gossip honestGossip(Observation obs) {
        for (Observation.OpinionView o : obs.opinions()) { // strongest first
            if (Math.abs(o.trust()) >= GOSSIP_THRESHOLD) return new Gossip(o.name(), o.trust() > 0);
        }
        return null;
    }

    private Decision farmer(Observation obs) {
        if (obs.food() >= 6) {
            return Decision.sell(obs.food() - 2, "has 6+ food: sell all but 2 to eat");
        }
        return Decision.farm("not enough spare food to sell");
    }

    private Decision trader(Observation obs) {
        int food = obs.food();
        double price = obs.currentTown().foodPrice();
        double cheapest = obs.bestBuyPrice(); // the market, or a cheaper offer on the board
        double lastBuyPrice = obs.stat("lastBuyPrice", 100);

        // sell for a profit
        if (food >= 3 && price > lastBuyPrice) {
            return Decision.sell(food - 1, "price " + (int) price + " beats buying price " + (int) lastBuyPrice);
        }
        // stock up when cheap
        if (food < 3 && cheapest <= 7 && obs.money() >= 6 * cheapest) {
            return Decision.buy(6, cheapest < price
                    ? "low on stock and someone here sells at " + Marketplace.fmt(cheapest) + ", under the market"
                    : "low on stock and price " + (int) price + " is cheap");
        }
        // part-way through a trip -> carry on
        if (obs.travelling()) {
            return goTo(obs, obs.destination(), "continue the trip to " + obs.destination());
        }
        // carrying food -> go where it sells best; empty -> go where it is cheapest
        TownView target = food >= 3 ? obs.mostExpensiveTown() : obs.cheapestTown();
        if (target.name().equals(obs.town())) {
            target = obs.nextTown(obs.town());
        }
        String why = food >= 3 ? "carry stock to the best-paying town" : "look for cheap food";
        return goTo(obs, target.name(), why);
    }

    /**
     * Travel toward a town, but only with enough food for the next road plus a meal
     * on arrival, and enough coins for the toll. Otherwise buy what is missing,
     * or at least one meal, or rest.
     */
    private Decision goTo(Observation obs, String town, String why) {
        RouteView route = obs.routeTo(town);
        if (route == null) {
            return Decision.rest("no road to " + town);
        }
        double price = obs.currentTown().foodPrice();
        int needed = route.nextFood() + 1; // the road, plus a meal on arrival
        if (obs.food() < needed) {
            // buying takes this turn and we eat tonight, so buy one extra
            int toBuy = needed - obs.food() + 1;
            if (obs.money() >= toBuy * price + route.nextCoins()) {
                return Decision.buy(toBuy, "buy food for the road to " + route.nextStop());
            }
            if (obs.food() == 0 && obs.money() >= price) {
                return Decision.buy(1, "cannot afford the trip yet; buy a meal");
            }
            if (obs.food() < route.nextFood()) {
                return Decision.rest("not enough food for the road to " + route.nextStop()
                        + " and cannot afford more");
            }
        }
        if (obs.money() < route.nextCoins()) {
            return Decision.rest("cannot afford the road to " + route.nextStop());
        }
        return Decision.travel(town, why);
    }

    private Decision diplomat(Observation obs) {
        double price = obs.currentTown().foodPrice();
        if (obs.food() <= 1 && obs.money() >= 2 * price) {
            return Decision.buy(2, "hungry and can afford food");
        }
        if (obs.travelling()) {
            return goTo(obs, obs.destination(), "continue the trip to " + obs.destination());
        }
        return goTo(obs, obs.nextTown(obs.town()).name(), "continue the diplomatic circuit");
    }
}
