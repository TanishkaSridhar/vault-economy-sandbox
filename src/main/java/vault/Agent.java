package vault;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
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
    // where the agent is heading, while it is part-way through a trip of several roads
    protected String destination;
    // the last market information this agent saw in each town (it cannot see far-away prices live)
    protected final Map<String, Observation.TownView> knownMarkets = new LinkedHashMap<>();

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
    public String getDestination() { return destination; }
    public void setBrain(Brain brain) { this.brain = brain; }

    public String getRole() {
        return "Agent"; // overridden by subclasses
    }

    public State snapshot() {
        return new State(location.getName(), getMoney(), getFood());
    }

    // ---- 1. observe ----

    /** Look at the market in the town the agent is in, and remember what it saw. */
    public void seeMarket(Town town, int turn) {
        knownMarkets.put(town.getName(),
                new Observation.TownView(town.getName(), town.getTerrain(), town.getFoodPrice(),
                        town.getFoodStock(), turn));
    }

    public Observation observe(World world, int turn) {
        seeMarket(location, turn);
        List<Observation.TownView> towns = new ArrayList<>();
        for (Town t : world.getTowns()) {
            Observation.TownView known = knownMarkets.get(t.getName());
            if (known != null) towns.add(known);
        }
        List<Observation.RouteView> routes = new ArrayList<>();
        for (Town t : world.getTowns()) {
            Route r = world.getMap().route(location.getName(), t.getName());
            if (r != null) {
                Road first = r.firstRoad();
                routes.add(new Observation.RouteView(t.getName(), r.nextStop(), r.legs(),
                        r.distance(), r.coins(), r.food(),
                        world.getMap().coinCost(first), world.getMap().foodCost(first)));
            }
        }
        List<Observation.PersonView> people = new ArrayList<>();
        for (Agent other : world.getAgents()) {
            if (other != this && other.location == location) {
                Relationship r = world.getSocial().get(name, other.name);
                people.add(new Observation.PersonView(other.name, other.getRole(),
                        r.getTrust(), r.getFamiliarity(), r.getMeetings()));
            }
        }
        return new Observation(turn, name, getRole(), getMoney(), getFood(),
                location.getName(), destination, roleStats(), towns, routes, people, allowedActions());
    }

    /** The actions this kind of agent can take. Subclasses add their own. */
    public List<Action> allowedActions() {
        return List.of(Action.REST);
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

    /**
     * Travel toward a town along the cheapest route, ONE road per turn.
     * The agent pays that road's coins and food before setting off.
     * If the destination is further than one road, the agent remembers it
     * (see getDestination) so the brain can choose to carry on next turn.
     */
    protected Outcome travelToward(String target, World world) {
        Town goal = world.findTown(target);
        if (goal == null) {
            return Outcome.failed(Action.TRAVEL, "no town called " + target);
        }
        Route route = world.getMap().route(location.getName(), goal.getName());
        if (route == null) {
            return Outcome.failed(Action.TRAVEL, "no road from " + location.getName() + " to " + target);
        }
        Road road = route.firstRoad();
        double coins = world.getMap().coinCost(road);
        int food = world.getMap().foodCost(road);
        if (getMoney() < coins) {
            return Outcome.failed(Action.TRAVEL, "cannot afford the road to " + route.nextStop()
                    + " (" + fmt(coins) + " coins)");
        }
        if (getFood() < food) {
            return Outcome.failed(Action.TRAVEL, "not enough food for the road to " + route.nextStop()
                    + " (needs " + food + ")");
        }
        try {
            if (coins > 0) wallet.spend(coins);
        } catch (NotEnoughMoneyException e) {
            return Outcome.failed(Action.TRAVEL, "cannot afford the road (" + e.getMessage() + ")");
        }
        if (food > 0) bag.remove(food);

        Town from = location;
        location = world.findTown(route.nextStop());
        boolean arrived = location == goal;
        destination = arrived ? null : goal.getName();

        StringBuilder msg = new StringBuilder("TRAVELLED " + from.getName() + " -> " + location.getName());
        if (!arrived) msg.append(" (on the way to ").append(goal.getName()).append(")");
        if (coins > 0 || food > 0) {
            msg.append(" [paid ").append(fmt(coins)).append(" coins, ").append(food).append(" food]");
        }
        Map<String, Object> data = new HashMap<>();
        data.put("from", from.getName());
        data.put("to", location.getName());
        data.put("destination", goal.getName());
        data.put("arrived", arrived);
        data.put("distance", road.distance());
        data.put("terrain", road.terrain().name());
        data.put("coins", coins);
        data.put("food", food);
        return Outcome.ok("TRAVELLED", msg.toString(), data);
    }

    private static String fmt(double x) {
        return x == Math.rint(x) ? String.valueOf((int) x) : String.format("%.1f", x);
    }

    @Override
    public String toString() {
        return String.format("%-8s %-11s money: %6.1f food: %2d in %s",
                name, "(" + getRole() + ")", getMoney(), getFood(), location.getName());
    }
}
