package vault;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;

/**
 * Entry point. Builds the world, runs the turns, prints a summary,
 * and saves the whole run to a SQLite database.
 *
 * Usage:  java -jar target/vault.jar [turns] [--scenario NAME|FILE] [--seed N] [--db FILE] [--no-db] [--free-travel]
 *   turns     number of turns to run (default 10)
 *   --scenario  which world to build: "default" (8 towns, 16 agents), "classic" (3 towns, 6 agents),
 *               or a path to your own scenario .json file
 *   --seed N  random seed (default 42); the same seed repeats the same run
 *   --db FILE database file to save to (default vault.db)
 *   --no-db   do not save anything
 *   --free-travel  roads cost nothing (a comparison baseline / policy experiment)
 */
public class Simulation {

    public static void main(String[] args) {
        int turns = 10;
        long seed = 42;
        String dbPath = "vault.db";
        boolean saveToDb = true;
        boolean freeTravel = false;
        String scenarioName = "default";

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--seed":  seed = Long.parseLong(args[++i]); break;
                case "--db":    dbPath = args[++i]; break;
                case "--no-db": saveToDb = false; break;
                case "--free-travel": freeTravel = true; break;
                case "--scenario": scenarioName = args[++i]; break;
                default:
                    try {
                        turns = Integer.parseInt(args[i]);
                    } catch (NumberFormatException e) {
                        System.err.println("unknown option '" + args[i] + "'. Usage: java -jar target/vault.jar"
                                + " [turns] [--scenario NAME|FILE] [--seed N] [--db FILE] [--no-db] [--free-travel]");
                        System.exit(1);
                    }
            }
        }

        Scenario scenario = Scenario.load(scenarioName);
        try (EventLog log = saveToDb ? new SqliteEventLog(dbPath) : new NoEventLog()) {
            run(scenario, turns, seed, freeTravel, log);
            if (saveToDb) {
                System.out.println();
                System.out.println("  Saved as run #" + log.runId() + " in " + dbPath);
            }
        }
    }

    private static void run(Scenario scenario, int turns, long seed, boolean freeTravel, EventLog log) {
        // ---- build the world from a scenario file (towns, roads, agents) ----
        World world = scenario.build(seed, log, freeTravel);

        log.startRun(world, seed, turns, codeVersion());

        System.out.println("VAULT - Virtual Agent Universe of Logistic Trade  (Team Optimal-ish)");
        System.out.println("Scenario: " + scenario.name() + " (" + world.getTowns().size() + " towns, "
                + world.getAgents().size() + " agents)");
        System.out.println("Map" + (freeTravel ? " (free travel)" : "") + ":");
        WorldMap map = world.getMap();
        for (Road r : map.allRoads()) {
            System.out.printf("  %-9s -- %-9s %4.0f km %-9s costs %.1f coins, %d food%n",
                    r.a(), r.b(), r.distance(), r.terrain().name().toLowerCase(),
                    map.coinCost(r), map.foodCost(r));
        }
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

        System.out.println();
        System.out.println("  Who knows whom best:");
        for (Agent a : world.getAgents()) {
            Relationship best = null;
            for (Relationship r : world.getSocial().from(a.getName())) {
                if (best == null || r.getFamiliarity() > best.getFamiliarity()) best = r;
            }
            if (best != null) {
                System.out.printf("    %-8s -> %-8s familiarity %.2f, trust %+.2f, %d meetings%n",
                        a.getName(), best.getTo(), best.getFamiliarity(), best.getTrust(), best.getMeetings());
            }
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
