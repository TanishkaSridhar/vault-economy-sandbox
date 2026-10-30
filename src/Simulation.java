/**
 * Entry point. Builds the world, runs the turns and prints a summary.
 *
 * Compile:  javac -d out src/*.java
 * Run:      java -cp out Simulation
 * Run with a different number of turns:  java -cp out Simulation 20
 */
public class Simulation {

    public static void main(String[] args) {
        int turns = 10;
        if (args.length > 0) {
            turns = Integer.parseInt(args[0]);
        }

        // ---- build the world (CLASSES & OBJECTS) ----
        World world = new World();

        Town valley = new Town("Valley", 6, 20);
        Town port   = new Town("Port", 9, 10);
        Town hill   = new Town("Hill", 8, 12);
        world.addTown(valley);
        world.addTown(port);
        world.addTown(hill);

        world.addAgent(new Farmer("Meena", valley));
        world.addAgent(new Farmer("Kumar", valley));
        world.addAgent(new Farmer("Lakshmi", hill));
        world.addAgent(new Trader("Ravi", port));
        world.addAgent(new Trader("Arun", valley));
        world.addAgent(new Diplomat("Priya", port));

        System.out.println("VAULT - Virtual Agent Universe of Logistic Trade  (Team Optimal-ish)");
        System.out.println("Starting state:");
        for (Agent a : world.getAgents()) {
            System.out.println("  " + a);
        }

        // ---- run the simulation ----
        for (int turn = 1; turn <= turns; turn++) {
            world.runTurn(turn);
        }

        // ---- final summary ----
        System.out.println();
        System.out.println("==================== FINAL STATE ====================");
        Agent richest = world.getAgents().get(0);
        Agent poorest = world.getAgents().get(0);
        for (Agent a : world.getAgents()) {
            System.out.println("  " + a);
            if (a.getMoney() > richest.getMoney()) richest = a;
            if (a.getMoney() < poorest.getMoney()) poorest = a;
        }
        System.out.println();
        System.out.println("  Richest: " + richest.getName() + " (" + (int) richest.getMoney() + " coins)");
        System.out.println("  Poorest: " + poorest.getName() + " (" + (int) poorest.getMoney() + " coins)");
        for (Town t : world.getTowns()) {
            System.out.println("  " + t.getName() + " final food price: " + (int) t.getFoodPrice());
        }
    }
}
