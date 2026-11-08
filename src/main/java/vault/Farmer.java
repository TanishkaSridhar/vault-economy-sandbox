package vault;

import java.util.Map;
import java.util.List;

/**
 * INHERITANCE: a Farmer IS-AN Agent.
 * POLYMORPHISM: overrides perform() with farming behaviour.
 * Farmers grow food and sell their spare food at the market.
 * How much they grow depends on the terrain of the town they farm in.
 */
public class Farmer extends Agent {

    public Farmer(String name, Town startTown) {
        super(name, 20, 4, startTown);
    }

    @Override
    public String getRole() {
        return "Farmer";
    }

    @Override
    public List<Action> allowedActions() {
        return List.of(Action.FARM, Action.SELL, Action.REST);
    }

    @Override
    public Outcome perform(Decision decision, World world) {
        switch (decision.action()) {
            case SELL:
                return sellFood(decision.amount());
            case FARM: {
                int harvest = location.getTerrain().harvest;
                bag.add(harvest);
                return Outcome.ok("FARMED", "FARMED " + harvest + " food", Map.of("qty", harvest));
            }
            default:
                return super.perform(decision, world);
        }
    }
}
