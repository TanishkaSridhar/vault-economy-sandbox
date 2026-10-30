/**
 * INHERITANCE: a Trader IS-AN Agent.
 * POLYMORPHISM: overrides act() with trading behaviour.
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
    public String act(World world) {
        String decision = brain.decide(this, location);

        if (decision.equals("SELL")) {
            return sellFood(getFood() - 1);
        }
        if (decision.equals("BUY")) {
            double price = location.getFoodPrice();
            String result = buyFood(6);
            if (result.startsWith("BOUGHT")) {
                lastBuyPrice = price;
            }
            return result;
        }
        // TRAVEL: carrying food -> go where it sells best; empty -> go where it is cheapest
        Town target;
        if (getFood() >= 3) {
            target = world.mostExpensiveTown();
        } else {
            target = world.cheapestTown();
        }
        if (target == location) {
            target = world.nextTown(location);
        }
        return travelTo(target);
    }
}
