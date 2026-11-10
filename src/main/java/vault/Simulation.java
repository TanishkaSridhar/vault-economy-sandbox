package vault;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import vault.llm.DotEnv;
import vault.llm.LlmConfig;
import vault.llm.LlmRouter;

/**
 * Entry point. Builds the world, runs the turns, prints a summary,
 * and saves the whole run to a SQLite database.
 *
 * Usage:  java -jar target/vault.jar [turns] [--scenario NAME|FILE] [--brain rule|llm] [--seed N]
 *                                    [--db FILE] [--no-db] [--free-travel] [--llm-config FILE]
 *   turns     number of turns to run (default 10)
 *   --scenario  which world to build: "default" (8 towns, 16 agents), "classic" (3 towns, 6 agents),
 *               or a path to your own scenario .json file
 *   --seed N  random seed (default 42); the same seed repeats the same run
 *   --db FILE database file to save to (default vault.db)
 *   --no-db   do not save anything
 *   --free-travel  roads cost nothing (a comparison baseline / policy experiment)
 *   --brain B      rule or llm for every agent (default: each agent's "brain" in the scenario, else rule)
 *   --llm-config F which language models to use (default: ./llm.json, else the built-in one)
 */
public class Simulation {

    private static final String USAGE = "Usage: java -jar target/vault.jar [turns] [--scenario NAME|FILE]"
            + " [--brain rule|llm] [--seed N] [--db FILE] [--no-db] [--free-travel] [--llm-config FILE]";

    public static void main(String[] args) {
        int turns = 10;
        long seed = 42;
        String dbPath = "vault.db";
        boolean saveToDb = true;
        boolean freeTravel = false;
        String scenarioName = "default";
        String brainOverride = null;   // null = what the scenario says per agent (rule by default)
        String llmConfigPath = null;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--seed":  seed = Long.parseLong(args[++i]); break;
                case "--db":    dbPath = args[++i]; break;
                case "--no-db": saveToDb = false; break;
                case "--free-travel": freeTravel = true; break;
                case "--scenario": scenarioName = args[++i]; break;
                case "--brain": brainOverride = args[++i]; break;
                case "--llm-config": llmConfigPath = args[++i]; break;
                default:
                    try {
                        turns = Integer.parseInt(args[i]);
                    } catch (NumberFormatException e) {
                        System.err.println("unknown option '" + args[i] + "'. " + USAGE);
                        System.exit(1);
                    }
            }
        }

        Scenario scenario = Scenario.load(scenarioName);
        try (EventLog log = saveToDb ? new SqliteEventLog(dbPath) : new NoEventLog()) {
            run(scenario, turns, seed, freeTravel, brainOverride, llmConfigPath, log);
            if (saveToDb) {
                System.out.println();
                System.out.println("  Saved as run #" + log.runId() + " in " + dbPath);
            }
        }
    }

    private static void run(Scenario scenario, int turns, long seed, boolean freeTravel,
                            String brainOverride, String llmConfigPath, EventLog log) {
        // ---- build the world from a scenario file (towns, roads, agents) ----
        World world = scenario.build(seed, log, freeTravel);
        LlmRouter router = assignBrains(world, scenario, brainOverride, llmConfigPath);

        log.startRun(world, seed, turns, codeVersion());

        System.out.println("VAULT - Virtual Agent Universe of Logistic Trade  (Team Optimal-ish)");
        System.out.println("Scenario: " + scenario.name() + " (" + world.getTowns().size() + " towns, "
                + world.getAgents().size() + " agents)");
        if (router != null) {
            long llmAgents = world.getAgents().stream().filter(a -> a.getBrain() instanceof LlmBrain).count();
            System.out.println("Brains: " + llmAgents + " of " + world.getAgents().size()
                    + " agents use a language model. Fallback order: "
                    + router.clients().stream().map(c -> c.name() + " (" + c.model() + ")")
                            .collect(Collectors.joining(" -> "))
                    + (router.clients().isEmpty() ? "" : " -> ") + "rule brain");
        }
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

        if (router != null) {
            System.out.println();
            System.out.println("  Language model use:");
            if (router.clients().isEmpty()) System.out.println("    none available: every decision used the rule brain");
            router.stats().forEach((name, s) -> System.out.printf(
                    "    %-16s %4d answers, %3d errors (%d rate-limited), %3d skipped, avg %.1fs, tokens in/out %d/%d%s%n",
                    name, s.calls, s.errors, s.rateLimited, s.skipped,
                    s.calls == 0 ? 0 : s.totalLatencyMs / 1000.0 / s.calls,
                    s.inputTokens, s.outputTokens, s.disabled ? "  (switched off: " + s.disabledReason + ")" : ""));
            int fellBack = 0;
            for (Agent a : world.getAgents()) {
                if (a.getBrain() instanceof LlmBrain b) fellBack += b.fallbacks();
            }
            System.out.println("    decisions made by the rule brain because no model answered in time: " + fellBack);
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

    /**
     * Give each agent its brain. --brain on the command line applies to everyone; otherwise
     * each agent uses the "brain" field of its scenario entry (rule if missing). All language-model
     * agents share one router, so they share the providers' limits and the same fallback order.
     * Returns that router, or null if no agent uses a language model.
     */
    private static LlmRouter assignBrains(World world, Scenario scenario, String brainOverride, String llmConfigPath) {
        List<String> llmAgents = new ArrayList<>();
        for (Scenario.AgentSpec spec : scenario.agents()) {
            String kind = brainOverride != null ? brainOverride : (spec.brain() == null ? "rule" : spec.brain());
            switch (kind) {
                case "rule": break; // agents start with a RuleBrain
                case "llm":  llmAgents.add(spec.name()); break;
                default: throw new IllegalArgumentException("unknown brain '" + kind + "' (use rule or llm)");
            }
        }
        if (llmAgents.isEmpty()) return null;

        LlmConfig config = LlmConfig.load(llmConfigPath);
        LlmConfig.Clients clients = config.createClients(DotEnv.load());
        for (String s : clients.skipped()) System.err.println("  [llm] skipping " + s);
        if (clients.available().isEmpty()) {
            System.err.println("  [llm] no language model available: agents will use the rule brain."
                    + " Put API keys in .env (see llm.json).");
        }
        LlmRouter router = config.createRouter(clients.available());
        for (String name : llmAgents) {
            world.findAgent(name).setBrain(new LlmBrain(router));
        }
        return router;
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
