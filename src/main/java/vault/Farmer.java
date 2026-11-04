package vault;

import java.util.Map;

/**
 * INHERITANCE: a Farmer IS-AN Agent.
 * POLYMORPHISM: overrides perform() with farming behaviour.
 * Farmers grow food and sell their spare food at the market.
 */
public class Farmer extends Agent {

    private static final int HARVEST = 3;

    public Farmer(String name, Town startTown) {
        super(name, 20, 4, startTown);
    }

    @Override
    public String getRole() {
        return "Farmer";
    }

    @Override
    public Outcome perform(Decision decision, World world) {
        switch (decision.action()) {
            case SELL:
                return sellFood(decision.amount());
            case FARM:
                bag.add(HARVEST);
                return Outcome.ok("FARMED", "FARMED " + HARVEST + " food", Map.of("qty", HARVEST));
            default:
                return super.perform(decision, world);
        }
    }
}
