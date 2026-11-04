package vault;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Entry point. Builds the world, runs the turns, prints a summary,
 * and saves the whole run to a SQLite database.
 *
 * Usage:  java -jar target/vault.jar [turns] [--seed N] [--db FILE] [--no-db]
 *   turns     number of turns to run (default 10)
 *   --seed N  random seed (default 42); the same seed repeats the same run
 *   --db FILE database file to save to (default vault.db)
 *   --no-db   do not save anything
 */
public class Simulation {

    public static void main(String[] args) {
        int turns = 10;
        long seed = 42;
        String dbPath = "vault.db";
        boolean saveToDb = true;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--seed":  seed = Long.parseLong(args[++i]); break;
                case "--db":    dbPath = args[++i]; break;
                case "--no-db": saveToDb = false; break;
                default:        turns = Integer.parseInt(args[i]);
            }
        }

        try (EventLog log = saveToDb ? new SqliteEventLog(dbPath) : new NoEventLog()) {
            run(turns, seed, log);
            if (saveToDb) {
                System.out.println();
                System.out.println("  Saved as run #" + log.runId() + " in " + dbPath);
            }
        }
    }

    private static void run(int turns, long seed, EventLog log) {
        // ---- build the world (CLASSES & OBJECTS) ----
        World world = new World(seed, log);

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

        log.startRun(world, seed, turns, codeVersion());

        System.out.println("VAULT - Virtual Agent Universe of Logistic Trade  (Team Optimal-ish)");
        System.out.println("Starting state:");
        for (Agent a : world.getAgents()) {
            System.out.println("  " + a);
        }

        // ---- run the simulation ----
        for (int turn = 1; turn <= turns; turn++) {
            world.runTurn(turn);
        }
        log.endRun(turns);

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

    /** The git commit the code was built from, so every saved run can be traced to its code. */
    private static String codeVersion() {
        try {
            String commit = git("rev-parse", "--short", "HEAD");
            if (commit.isEmpty()) return "unknown";
            boolean dirty = !git("status", "--porcelain", "--untracked-files=no").isEmpty();
            return dirty ? commit + "-dirty" : commit;
        } catch (IOException | InterruptedException e) {
            return "unknown";
        }
    }

    private static String git(String... args) throws IOException, InterruptedException {
        String[] cmd = new String[args.length + 1];
        cmd[0] = "git";
        System.arraycopy(args, 0, cmd, 1, args.length);
        Process p = new ProcessBuilder(cmd).redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
        if (!p.waitFor(5, TimeUnit.SECONDS) || p.exitValue() != 0) return "";
        return out;
    }
}
