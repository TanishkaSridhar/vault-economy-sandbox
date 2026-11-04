package vault;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * A turn for an agent has three steps:
 *   1. observe(): collect what the agent knows into an Observation
 *   2. decide():  the Brain picks a Decision (rules today, an LLM later)
 *   3. perform(): the agent carries it out; subclasses define what each action means
 * The brain only chooses. The agent's own methods enforce money, stock and
 * role limits, so no brain can break the rules of the world.
 */
public class Agent {
    protected String name;
    protected Town location;
    protected Wallet wallet;
    protected Brain brain;
    protected Inventory bag;

    /** A copy of the agent's state at a moment in time (used for before/after logging). */
    public record State(String town, double money, int food) {}

    public Agent(String name, double money, int food, Town startTown) {
        this.name = name;
        this.location = startTown;
        this.wallet = new Wallet(money);
        this.brain = new RuleBrain();
        this.bag = new Inventory(food);
    }

    public String getName()     { return name; }
    public Town getLocation()   { return location; }
    public int getFood()        { return bag.getFood(); }
    public double getMoney()    { return wallet.getBalance(); }
    public Brain getBrain()     { return brain; }
    public void setBrain(Brain brain) { this.brain = brain; }

    public String getRole() {
        return "Agent"; // overridden by subclasses
    }

    public State snapshot() {
        return new State(location.getName(), getMoney(), getFood());
    }

    // ---- 1. observe ----

    public Observation observe(World world, int turn) {
        List<Observation.TownView> towns = new ArrayList<>();
        for (Town t : world.getTowns()) {
            towns.add(new Observation.TownView(t.getName(), t.getFoodPrice(), t.getFoodStock()));
        }
        return new Observation(turn, name, getRole(), getMoney(), getFood(),
                location.getName(), roleStats(), towns);
    }

    /** Role-specific facts added to the observation. Subclasses override this. */
    protected Map<String, Double> roleStats() {
        return Map.of();
    }

    // ---- 2. decide ----

    public Decision decide(Observation observation) {
        return brain.decide(observation);
    }

    // ---- 3. perform (POLYMORPHISM: subclasses override) ----

    public Outcome perform(Decision decision, World world) {
        if (decision.action() == Action.REST) {
            return Outcome.ok("RESTED", "rests", Map.of());
        }
        return Outcome.failed(decision.action(), "a " + getRole() + " cannot " + decision.action());
    }

    // ---- basic needs and market actions shared by all agents ----

    public String eat() {
        if (bag.remove(1)) {
            return null;
        }
        return name + " has no food and goes hungry";
    }

    protected Outcome buyFood(int amount) {
        if (amount <= 0) {
            return Outcome.failed(Action.BUY, "cannot buy " + amount + " food");
        }
        double price = location.getFoodPrice();
        double cost = amount * price;
        try {
            wallet.spend(cost);
            if (!location.giveFood(amount)) {
                wallet.earn(cost); // refund if the town has no food
                return Outcome.failed(Action.BUY, "tried to buy food but " + location.getName() + " has none left");
            }
            bag.add(amount);
            return Outcome.ok("BOUGHT",
                    "BOUGHT " + amount + " food at " + (int) price + " each in " + location.getName(),
                    Map.of("qty", amount, "price", price, "cost", cost));
        } catch (NotEnoughMoneyException e) {
            return Outcome.failed(Action.BUY, "cannot afford food (" + e.getMessage() + ")");
        }
    }

    protected Outcome sellFood(int amount) {
        if (amount <= 0 || !bag.remove(amount)) {
            return Outcome.failed(Action.SELL, name + " does not have enough food to sell");
        }
        double price = location.getFoodPrice();
        double earned = amount * price;
        wallet.earn(earned);
        location.receiveFood(amount);
        return Outcome.ok("SOLD",
                "SOLD " + amount + " food at " + (int) price + " each in " + location.getName(),
                Map.of("qty", amount, "price", price, "revenue", earned));
    }

    protected Outcome travelTo(Town town) {
        Town from = location;
        location = town;
        return Outcome.ok("TRAVELLED",
                "TRAVELLED " + from.getName() + " -> " + town.getName(),
                Map.of("from", from.getName(), "to", town.getName()));
    }

    @Override
    public String toString() {
        return String.format("%-8s %-11s money: %6.1f food: %2d in %s",
                name, "(" + getRole() + ")", getMoney(), getFood(), location.getName());
    }
}
