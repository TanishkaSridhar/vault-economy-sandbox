import java.util.ArrayList;
import java.util.List;

/**
 * COMPOSITION: the World HAS towns and agents.
 * It runs one turn at a time: every agent acts, everyone eats,
 * then every town updates its food price.
 */
public class World {

    private final List<Town> towns = new ArrayList<>();
    private final List<Agent> agents = new ArrayList<>();

    public void addTown(Town town)    { towns.add(town); }
    public void addAgent(Agent agent) { agents.add(agent); }

    public List<Town> getTowns()   { return towns; }
    public List<Agent> getAgents() { return agents; }

    public void runTurn(int turn) {
        System.out.println();
        System.out.println("==================== TURN " + turn + " ====================");

        // 1. every agent decides and acts (POLYMORPHISM: same call, different behaviour)
        for (Agent a : agents) {
            String result = a.act(this);
            System.out.printf("  %-8s %-11s -> %s%n", a.getName(), "(" + a.getRole() + ")", result);
        }

        // 2. everyone eats 1 food
        for (Agent a : agents) {
            String warning = a.eat();
            if (warning != null) {
                System.out.println("  ! " + warning);
            }
        }

        // 3. the economy reacts: prices update from this turn's buying and selling
        System.out.println("  --- market ---");
        for (Town t : towns) {
            System.out.println("  " + t.updatePrice());
        }
    }

    // ---- helpers the agents use to choose where to go ----

    public Town mostExpensiveTown() {
        Town best = towns.get(0);
        for (Town t : towns) {
            if (t.getFoodPrice() > best.getFoodPrice()) best = t;
        }
        return best;
    }

    public Town cheapestTown() {
        Town best = towns.get(0);
        for (Town t : towns) {
            if (t.getFoodPrice() < best.getFoodPrice()) best = t;
        }
        return best;
    }

    public Town nextTown(Town current) {
        int i = towns.indexOf(current);
        return towns.get((i + 1) % towns.size());
    }
}
