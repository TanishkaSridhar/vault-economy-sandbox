/*got inheritance and polymorphism here, with overriding methods, and also extending the base class */
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
    public String act(World world) {
        String decision = brain.decide(this, location);

        if (decision.equals("BUY")) {
            return buyFood(2);
        }
        // TRAVEL: visit the next town and collect a fee
        Town next = world.nextTown(location);
        String result = travelTo(next);
        wallet.earn(VISIT_FEE);
        return result + " (earned " + (int) VISIT_FEE + " coin fee)";
    }
}
