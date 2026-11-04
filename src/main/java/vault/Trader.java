package vault;

import java.util.Map;

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

    @Override
    public String getRole() {
        return "Trader";
    }

    @Override
    protected Map<String, Double> roleStats() {
        return Map.of("lastBuyPrice", lastBuyPrice);
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
                Town target = world.findTown(decision.target());
                if (target == null) {
                    return Outcome.failed(Action.TRAVEL, "no town called " + decision.target());
                }
                return travelTo(target);
            }
            default:
                return super.perform(decision, world);
        }
    }
}
