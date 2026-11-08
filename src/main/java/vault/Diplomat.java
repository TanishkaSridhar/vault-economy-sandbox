package vault;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * INHERITANCE: a Diplomat IS-AN Agent.
 * POLYMORPHISM: overrides perform() with diplomatic behaviour.
 * Diplomats travel between towns, earning a fee for each visit.
 */
public class Diplomat extends Agent {

    private static final double VISIT_FEE = 8;

    public Diplomat(String name, Town startTown) {
        super(name, 40, 2, startTown);
    }

    @Override
    public String getRole() {
        return "Diplomat";
    }

    @Override
    public List<Action> allowedActions() {
        return List.of(Action.BUY, Action.TRAVEL, Action.REST);
    }

    @Override
    public Outcome perform(Decision decision, World world) {
        switch (decision.action()) {
            case BUY:
                return buyFood(decision.amount());
            case TRAVEL: {
                Outcome travel = travelToward(decision.target(), world);
                if (!travel.success()) return travel;
                wallet.earn(VISIT_FEE);
                Map<String, Object> data = new HashMap<>(travel.data());
                data.put("fee", VISIT_FEE);
                return new Outcome(true, travel.eventType(),
                        travel.message() + " (earned " + (int) VISIT_FEE + " coin fee)", data);
            }
            default:
                return super.perform(decision, world);
        }
    }
}
