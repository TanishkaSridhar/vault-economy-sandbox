/**
 * INHERITANCE: a Farmer IS-AN Agent.
 * POLYMORPHISM: overrides act() with farming behaviour.
 * Farmers grow food and sell their spare food at the market.
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
    public String act(World world) {
        String decision = brain.decide(this, location);

        if (decision.equals("SELL")) {
            return sellFood(getFood() - 2);   // keep 2 food to eat
        }
        // FARM
        int harvest = 3;
        bag.add(harvest);
        return "FARMED " + harvest + " food";
    }
}
