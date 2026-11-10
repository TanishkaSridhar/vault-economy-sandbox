package vault;

import java.util.Map;
import java.util.List;

/**
 * INHERITANCE: a Trader IS-AN Agent.
 * POLYMORPHISM: overrides perform() with trading behaviour.
 * Traders buy food where it is cheap and sell it where it is expensive.
 */
public class Trader extends Agent {

    // the price the trader last paid for food (used to decide when selling makes a profit)
    private double lastBuyPrice = 100;

    public Trader(String name, Town startTown) {
        super(name, 100, 2, startTown);
    }

    public double getLastBuyPrice() {
        return lastBuyPrice;
    }

    /** For setting up test situations (package-private: the simulation itself never calls it). */
    void setLastBuyPrice(double price) {
        this.lastBuyPrice = price;
    }

    @Override
    public String getRole() {
        return "Trader";
    }

    @Override
    protected Map<String, Double> roleStats() {
        return Map.of("lastBuyPrice", lastBuyPrice);
    }

    @Override
    public List<Action> allowedActions() {
        return List.of(Action.BUY, Action.SELL, Action.TRAVEL, Action.REST);
    }

    @Override
    public Outcome perform(Decision decision, World world) {
        switch (decision.action()) {
            case SELL:
                return sellFood(decision.amount());
            case BUY: {
                double price = location.getFoodPrice();
                Outcome result = buyFood(decision.amount());
                if (result.success()) {
                    lastBuyPrice = price;
                }
                return result;
            }
            case TRAVEL: {
                return travelToward(decision.target(), world);
            }
            default:
                return super.perform(decision, world);
        }
    }
}
