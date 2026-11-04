package vault;

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

    @Override
    public Decision decide(Observation obs) {
        switch (obs.role()) {
            case "Farmer":   return farmer(obs);
            case "Trader":   return trader(obs);
            case "Diplomat": return diplomat(obs);
            default:         return Decision.rest("no rules for role " + obs.role());
        }
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
        double lastBuyPrice = obs.stat("lastBuyPrice", 100);

        // sell for a profit
        if (food >= 3 && price > lastBuyPrice) {
            return Decision.sell(food - 1, "price " + (int) price + " beats buying price " + (int) lastBuyPrice);
        }
        // stock up when cheap
        if (food < 3 && price <= 7 && obs.money() >= 6 * price) {
            return Decision.buy(6, "low on stock and price " + (int) price + " is cheap");
        }
        // carrying food -> go where it sells best; empty -> go where it is cheapest
        TownView target = food >= 3 ? obs.mostExpensiveTown() : obs.cheapestTown();
        if (target.name().equals(obs.town())) {
            target = obs.nextTown(obs.town());
        }
        String why = food >= 3 ? "carry stock to the best-paying town" : "look for cheap food";
        return Decision.travel(target.name(), why);
    }

    private Decision diplomat(Observation obs) {
        double price = obs.currentTown().foodPrice();
        if (obs.food() <= 1 && obs.money() >= 2 * price) {
            return Decision.buy(2, "hungry and can afford food");
        }
        return Decision.travel(obs.nextTown(obs.town()).name(), "continue the diplomatic circuit");
    }
}
