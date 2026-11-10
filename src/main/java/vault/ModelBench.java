package vault;

import vault.llm.DotEnv;
import vault.llm.LlmClient;
import vault.llm.LlmException;
import vault.llm.LlmReply;
import vault.llm.LlmRequest;
import vault.llm.OpenAiClient;

import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Model test: sends the same fixed game situations to several language models
 * and scores
 * the answers, so the main model and the fallbacks can be chosen from evidence.
 *
 * Every situation is a real VAULT world (the default scenario) with one agent
 * put into a
 * prepared state. The prompt is built by the same PromptBuilder the game uses,
 * and the answer is
 * checked by the same DecisionParser, with the same single correction retry.
 *
 * Each answer gets one of four results:
 * SENSIBLE a legal action that a sensible player would choose here
 * LEGAL a legal action, but not a sensible one (e.g. setting off with too
 * little food)
 * INVALID no usable answer, even after one correction
 * ERROR the provider failed (rate limit, wrong model name, network): not the
 * model's fault
 *
 * Usage: java -cp target/vault.jar vault.ModelBench [--only TEXT] [--repeats N]
 * [--out FILE]
 * --only TEXT only test models whose provider or name contains TEXT; several
 * separated by commas (e.g. --only groq or --only groq,gemini)
 * --repeats N ask each situation N times per model (default 1); more repeats
 * show consistency
 * --out FILE where to write every answer as CSV (default model-bench.csv)
 */
public class ModelBench {

    private static final int TURN = 6;
    private static final double TEMPERATURE = 0.7;
    private static final int MAX_TOKENS = 1500; // generous: thinking models spend tokens before answering
    private static final Duration TIMEOUT = Duration.ofSeconds(45);

    // ------------------------------------------------------------------ candidates

    /**
     * One model at one provider.
     *
     * @param gapMs pause between requests, to stay under the provider's free
     *              per-minute limit
     */
    record Candidate(String provider, String baseUrl, String model, Map<String, Object> extra,
            long gapMs, String... keyNames) {
        String label() {
            return provider + " " + model;
        }
    }

    private static final Map<String, Object> LOW_REASONING = Map.of("reasoning_effort", "low");

    static List<Candidate> candidates() {
        String groq = "https://api.groq.com/openai/v1";
        String nvidia = "https://integrate.api.nvidia.com/v1";
        String gemini = "https://generativelanguage.googleapis.com/v1beta/openai";
        String deepseek = "https://api.deepseek.com";
        String cloudflare = "https://api.cloudflare.com/client/v4/accounts/{account}/ai/v1";
        return List.of(
                new Candidate("groq", groq, "openai/gpt-oss-120b", LOW_REASONING, 2500, "GROQ_API_KEY"),
                new Candidate("groq", groq, "openai/gpt-oss-20b", LOW_REASONING, 2500, "GROQ_API_KEY"),
                new Candidate("groq", groq, "qwen/qwen3.8-27b", Map.of("reasoning_effort", "none"), 2500,
                        "GROQ_API_KEY"),
                new Candidate("nvidia", nvidia, "deepseek-ai/deepseek-v4.1-flash", Map.of(), 2000, "NVIDIA_API_KEY"),
                new Candidate("nvidia", nvidia, "moonshotai/kimi-k2.6", Map.of(), 2000, "NVIDIA_API_KEY"),
                new Candidate("nvidia", nvidia, "nvidia/nemotron-3-super-120b-a12b", Map.of(), 2000, "NVIDIA_API_KEY"),
                new Candidate("nvidia", nvidia, "z-ai/glm-5.3-flash", Map.of(), 2000, "NVIDIA_API_KEY"),
                new Candidate("gemini", gemini, "gemini-3.5-flash", LOW_REASONING, 7000, "GEMINI_API_KEY"),
                new Candidate("gemini", gemini, "gemini-3.5-flash-lite", LOW_REASONING, 7000, "GEMINI_API_KEY"),
                new Candidate("deepseek", deepseek, "deepseek-flash", Map.of(), 1000, "DEEPSEEK_API_KEY"),
                new Candidate("cloudflare", cloudflare, "@cf/openai/gpt-oss-120b", LOW_REASONING, 1500,
                        "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_TOKEN"),
                new Candidate("cloudflare", cloudflare, "@cf/deepseek-ai/deepseek-v4.1-flash-1017", Map.of(), 1500,
                        "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_TOKEN"));
    }

    // ------------------------------------------------------------------ situations

    interface Setup {
        void apply(World world, Agent agent);
    }

    interface Check {
        boolean sensible(Decision d, Observation obs);
    }

    /**
     * @param expected what a sensible answer looks like, in words (printed in the
     *                 report)
     */
    record Situation(String id, String agent, String expected, Setup setup, Check check) {
    }

    /** Put an agent in a town with the given coins and food, not travelling. */
    static void place(World w, Agent a, String town, double money, int food) {
        a.location = w.findTown(town);
        a.wallet = new Wallet(money);
        a.bag = new Inventory(food);
        a.destination = null;
    }

    static boolean is(Decision d, Action action) {
        return d.action() == action;
    }

    static boolean travelTo(Decision d, String... towns) {
        return d.action() == Action.TRAVEL && Set.of(towns).contains(d.target());
    }

    /**
     * Does not sell all its food or spend its last food on a road (it eats 1 every
     * evening).
     */
    static boolean keepsFood(Decision d, Observation obs) {
        if (d.action() == Action.SELL && d.amount() >= obs.food())
            return false;
        if (d.action() == Action.TRAVEL) {
            Observation.RouteView r = obs.routeTo(d.target());
            return r != null && r.nextFood() < obs.food();
        }
        return true;
    }

    static List<Situation> situations() {
        List<Situation> s = new ArrayList<>();
        // ---- farmers: FARM, SELL, REST ----
        s.add(new Situation("farmer-no-food", "Meena", "FARM (no food left)",
                (w, a) -> place(w, a, "Valley", 10, 0),
                (d, o) -> is(d, Action.FARM)));
        s.add(new Situation("farmer-rich-no-food", "Murugan", "FARM (has coins but a farmer cannot BUY)",
                (w, a) -> place(w, a, "Saltmarsh", 50, 0),
                (d, o) -> is(d, Action.FARM)));
        s.add(new Situation("farmer-surplus", "Selvi", "SELL a good share of 30 food, keeping a little",
                (w, a) -> place(w, a, "Riverton", 5, 30),
                (d, o) -> is(d, Action.SELL) && d.amount() >= 5 && keepsFood(d, o)));
        s.add(new Situation("farmer-last-food", "Devi", "do not sell everything: keep food to eat",
                (w, a) -> place(w, a, "Highpeak", 0, 3),
                (d, o) -> keepsFood(d, o) && !is(d, Action.REST)));
        // ---- traders: BUY, SELL, TRAVEL, REST ----
        s.add(new Situation("trader-buy-cheap", "Arun", "BUY several food cheaply in Valley (or go to even "
                + "cheaper Riverton next door)",
                (w, a) -> place(w, a, "Valley", 80, 1),
                (d, o) -> is(d, Action.BUY) && d.amount() >= 5 || travelTo(d, "Riverton")));
        s.add(new Situation("trader-carry", "Joseph", "carry the food to a dearer town (or buy more first); "
                + "not SELL here at no profit, not REST",
                (w, a) -> {
                    place(w, a, "Riverton", 40, 20);
                    ((Trader) a).setLastBuyPrice(5);
                },
                (d, o) -> is(d, Action.BUY) || travelTo(d, "Valley", "Port", "Woodhaven", "Hill", "Saltmarsh",
                        "Sandreach", "Highpeak")));
        s.add(new Situation("trader-sell-high", "Kavya", "SELL most of the food at Highpeak's high price",
                (w, a) -> {
                    place(w, a, "Highpeak", 20, 15);
                    ((Trader) a).setLastBuyPrice(6);
                },
                (d, o) -> is(d, Action.SELL) && d.amount() >= 8));
        s.add(new Situation("trader-sell-desert", "Farah", "SELL in Sandreach (bought at 5, price 13 here)",
                (w, a) -> {
                    place(w, a, "Sandreach", 10, 12);
                    ((Trader) a).setLastBuyPrice(5);
                },
                (d, o) -> is(d, Action.SELL) && d.amount() >= 6));
        s.add(new Situation("trader-mid-trip", "Ravi", "carry on toward Sandreach (or sell here at a profit)",
                (w, a) -> {
                    place(w, a, "Saltmarsh", 30, 18);
                    a.destination = "Sandreach";
                    ((Trader) a).setLastBuyPrice(6);
                },
                (d, o) -> travelTo(d, "Sandreach", "Highpeak") || is(d, Action.SELL)));
        s.add(new Situation("trader-trap-broke", "Arun", "do not spend the last food on a road; REST "
                + "(or the free road to Riverton)",
                (w, a) -> place(w, a, "Valley", 5, 1),
                (d, o) -> keepsFood(d, o) && !is(d, Action.SELL) && !is(d, Action.BUY)));
        // ---- diplomats: BUY, TRAVEL, REST ----
        s.add(new Situation("diplomat-hungry", "Priya", "BUY a little food (has none)",
                (w, a) -> place(w, a, "Port", 40, 0),
                (d, o) -> is(d, Action.BUY) && d.amount() >= 1 && d.amount() <= 4));
        s.add(new Situation("diplomat-travel", "Vikram", "TRAVEL (the 8-coin fee beats the toll; has food)",
                (w, a) -> place(w, a, "Highpeak", 30, 10),
                (d, o) -> is(d, Action.TRAVEL) && keepsFood(d, o)));
        s.add(new Situation("diplomat-trap-stuck", "Vikram", "REST (cannot afford food or any road)",
                (w, a) -> place(w, a, "Highpeak", 3, 1),
                (d, o) -> is(d, Action.REST)));
        return s;
    }

    // ------------------------------------------------------------------ running

    enum Status {
        SENSIBLE, LEGAL, INVALID, ERROR
    }

    record Result(Candidate candidate, Situation situation, int repeat, Status status, Decision decision,
            String problem, long latencyMs, Integer outputTokens, boolean firstTry, String answer) {
    }

    public static void main(String[] args) throws Exception {
        String only = null;
        int repeats = 1;
        String out = "model-bench.csv";
        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--only":
                    only = args[++i];
                    break;
                case "--repeats":
                    repeats = Integer.parseInt(args[++i]);
                    break;
                case "--out":
                    out = args[++i];
                    break;
                default:
                    System.err.println("unknown option '" + args[i]
                            + "'. Usage: ModelBench [--only TEXT] [--repeats N] [--out FILE]");
                    System.exit(1);
            }
        }

        DotEnv env = DotEnv.load();
        String account = env.get("CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ACCOUNT_ID");
        List<Situation> situations = situations();

        // one client per candidate, grouped by provider (each provider gets its own
        // thread)
        Map<String, List<Candidate>> byProvider = new LinkedHashMap<>();
        Map<Candidate, LlmClient> clients = new LinkedHashMap<>();
        for (Candidate c : candidates()) {
            if (only != null && java.util.Arrays.stream(only.split(","))
                    .noneMatch(o -> c.label().contains(o.trim())))
                continue;
            String key = env.get(c.keyNames());
            String url = c.baseUrl();
            if (url.contains("{account}")) {
                if (account == null)
                    key = null;
                else
                    url = url.replace("{account}", account);
            }
            if (key == null) {
                System.out.println("skipping " + c.label() + " (no key in .env)");
                continue;
            }
            clients.put(c, new OpenAiClient(c.provider(), url, c.model(), key, TIMEOUT, c.extra()));
            byProvider.computeIfAbsent(c.provider(), p -> new ArrayList<>()).add(c);
        }
        int total = clients.size() * situations.size() * repeats;
        System.out.println("Testing " + clients.size() + " models on " + situations.size() + " situations"
                + (repeats > 1 ? " x " + repeats + " repeats" : "") + " = " + total + " questions"
                + " (plus a retry for each unusable answer).");
        System.out.println();

        List<Result> results = Collections.synchronizedList(new ArrayList<>());
        CsvLog csv = new CsvLog(Path.of(out));
        ExecutorService pool = Executors.newFixedThreadPool(Math.max(1, byProvider.size()));
        final int reps = repeats;
        for (List<Candidate> group : byProvider.values()) {
            pool.submit(() -> {
                for (Candidate c : group) {
                    runCandidate(c, clients.get(c), situations, reps, results, csv);
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(2, TimeUnit.HOURS);

        csv.close();
        report(new ArrayList<>(clients.keySet()), situations, results);
        System.out.println();
        System.out.println("Every question and answer is in " + out);
    }

    private static void runCandidate(Candidate c, LlmClient client, List<Situation> situations, int repeats,
            List<Result> results, CsvLog csv) {
        // A wrong model name or key, or a provider that keeps failing: no point asking
        // the rest.
        boolean broken = false;
        int failuresInARow = 0;
        for (Situation s : situations) {
            for (int r = 1; r <= repeats; r++) {
                Result res;
                if (broken) {
                    res = new Result(c, s, r, Status.ERROR, null, "skipped: provider kept failing", 0, null, false, "");
                } else {
                    res = ask(c, client, s, r);
                    failuresInARow = res.status() == Status.ERROR ? failuresInARow + 1 : 0;
                    if (res.problem().startsWith("AUTH") || failuresInARow >= 2)
                        broken = true;
                    pause(c.gapMs());
                }
                results.add(res);
                csv.write(res);
                String what = res.decision() == null ? "" : " " + describe(res.decision());
                System.out.printf("  %-45s %-20s %-8s%s%s%n", c.label(), s.id(), res.status(), what,
                        res.status() == Status.ERROR || res.status() == Status.INVALID ? "  (" + res.problem() + ")"
                                : "");
            }
        }
    }

    /**
     * Ask one situation, with one correction if the answer cannot be used (as the
     * game will).
     */
    private static Result ask(Candidate c, LlmClient client, Situation s, int repeat) {
        World world = Scenario.load("default").build(42, new NoEventLog(), false);
        Agent agent = world.findAgent(s.agent());
        s.setup().apply(world, agent);
        Observation obs = agent.observe(world, TURN);
        LlmRequest request = LlmRequest.of(PromptBuilder.system(obs), PromptBuilder.user(obs), TEMPERATURE, MAX_TOKENS);

        LlmReply reply;
        try {
            reply = call(client, request);
        } catch (LlmException e) {
            return new Result(c, s, repeat, failure(e), null, e.toString(), 0, null, false, "");
        }
        long latency = reply.latencyMs();
        Integer tokens = reply.outputTokens();
        try {
            Decision d = DecisionParser.parse(reply.text(), obs);
            return judged(c, s, repeat, d, obs, latency, tokens, true, reply.text());
        } catch (DecisionParser.InvalidAnswer first) {
            LlmRequest retry = request.withCorrection(reply.text(), "That answer could not be used: "
                    + first.getMessage() + ". Reply again with ONLY the JSON object.");
            try {
                LlmReply second = call(client, retry);
                Decision d = DecisionParser.parse(second.text(), obs);
                return judged(c, s, repeat, d, obs, latency, tokens, false, second.text());
            } catch (DecisionParser.InvalidAnswer again) {
                return new Result(c, s, repeat, Status.INVALID, null, again.getMessage(), latency, tokens, false,
                        reply.text());
            } catch (LlmException e) {
                return new Result(c, s, repeat, failure(e), null, "retry failed: " + e, latency, tokens, false,
                        reply.text());
            }
        }
    }

    /**
     * An empty or unreadable reply (e.g. a thinking model that used its whole token
     * budget on thinking)
     * is the model's failure. Rate limits, wrong keys or model names and network
     * trouble are the provider's.
     */
    private static Status failure(LlmException e) {
        return e.getKind() == LlmException.Kind.BAD_RESPONSE ? Status.INVALID : Status.ERROR;
    }

    private static Result judged(Candidate c, Situation s, int repeat, Decision d, Observation obs, long latency,
            Integer tokens, boolean firstTry, String answer) {
        Status status = s.check().sensible(d, obs) ? Status.SENSIBLE : Status.LEGAL;
        return new Result(c, s, repeat, status, d, "", latency, tokens, firstTry, answer);
    }

    /**
     * One request; waits and tries again (up to 3 times) when the provider says
     * "too many requests".
     */
    private static LlmReply call(LlmClient client, LlmRequest request) throws LlmException {
        for (int attempt = 1;; attempt++) {
            try {
                return client.complete(request);
            } catch (LlmException e) {
                boolean rateLimited = e.getKind() == LlmException.Kind.RATE_LIMIT;
                boolean network = e.getKind() == LlmException.Kind.NETWORK;
                if (rateLimited && attempt < 3) {
                    long waitSeconds = e.getRetryAfterSeconds() != null ? Math.min(60, e.getRetryAfterSeconds()) : 20;
                    pause(waitSeconds * 1000);
                } else if (network && attempt < 2) {
                    pause(5000);
                } else {
                    throw e;
                }
            }
        }
    }

    private static void pause(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static String describe(Decision d) {
        switch (d.action()) {
            case BUY:
            case SELL:
                return d.action() + " " + d.amount();
            case TRAVEL:
                return "TRAVEL " + d.target();
            default:
                return d.action().name();
        }
    }

    // ------------------------------------------------------------------ report

    private static void report(List<Candidate> candidates, List<Situation> situations, List<Result> results) {
        System.out.println();
        System.out.println("==================================== RESULTS ====================================");
        System.out.printf("%-48s %8s %8s %8s %7s %8s %8s%n",
                "model", "sensible", "legal", "1st try", "errors", "avg ms", "avg tok");
        for (Candidate c : candidates) {
            int asked = 0, sensible = 0, legal = 0, firstTry = 0, errors = 0, timed = 0, tokenCount = 0;
            long ms = 0, tokens = 0;
            for (Result r : results) {
                if (r.candidate() != c)
                    continue;
                if (r.status() == Status.ERROR) {
                    errors++;
                    continue;
                }
                asked++;
                if (r.status() == Status.SENSIBLE)
                    sensible++;
                if (r.status() != Status.INVALID)
                    legal++;
                if (r.firstTry())
                    firstTry++;
                if (r.latencyMs() > 0) {
                    ms += r.latencyMs();
                    timed++;
                }
                if (r.outputTokens() != null) {
                    tokens += r.outputTokens();
                    tokenCount++;
                }
            }
            System.out.printf("%-48s %8s %8s %8s %7d %8s %8s%n", c.label(),
                    pct(sensible, asked), pct(legal, asked), pct(firstTry, asked), errors,
                    timed == 0 ? "-" : String.valueOf(ms / timed),
                    tokenCount == 0 ? "-" : String.valueOf(tokens / tokenCount));
        }
        System.out.println();
        System.out.println("sensible = legal and a good move; legal = usable after at most one correction;");
        System.out.println("1st try = usable without a correction; errors = provider failures (not counted in %).");

        System.out.println();
        System.out.println("Per situation (how many models answered sensibly):");
        for (Situation s : situations) {
            int asked = 0, good = 0;
            List<String> missed = new ArrayList<>();
            for (Result r : results) {
                if (r.situation() != s || r.status() == Status.ERROR)
                    continue;
                asked++;
                if (r.status() == Status.SENSIBLE)
                    good++;
                else
                    missed.add(r.candidate().model() + "="
                            + (r.decision() == null ? "invalid" : describe(r.decision())));
            }
            System.out.printf("  %-20s %2d/%-2d  expected: %s%n", s.id(), good, asked, s.expected());
            if (!missed.isEmpty())
                System.out.println("      missed by: " + String.join(", ", missed));
        }
    }

    private static String pct(int part, int whole) {
        return whole == 0 ? "-" : Math.round(100.0 * part / whole) + "%";
    }

    /**
     * Every answer is written (and flushed) as soon as it arrives, so a stopped run
     * keeps what it has.
     */
    private static final class CsvLog {
        private final PrintWriter w;

        CsvLog(Path file) throws IOException {
            w = new PrintWriter(Files.newBufferedWriter(file, StandardCharsets.UTF_8));
            w.println("provider,model,situation,repeat,status,action,amount,target,reason,first_try,latency_ms,"
                    + "output_tokens,problem,raw_answer");
            w.flush();
        }

        synchronized void write(Result r) {
            Decision d = r.decision();
            w.println(String.join(",",
                    csv(r.candidate().provider()), csv(r.candidate().model()), csv(r.situation().id()),
                    String.valueOf(r.repeat()), r.status().name(),
                    d == null ? "" : d.action().name(), d == null ? "" : String.valueOf(d.amount()),
                    csv(d == null ? "" : d.target()), csv(d == null ? "" : d.reason()),
                    String.valueOf(r.firstTry()), String.valueOf(r.latencyMs()),
                    r.outputTokens() == null ? "" : String.valueOf(r.outputTokens()),
                    csv(r.problem()), csv(r.answer())));
            w.flush();
        }

        void close() {
            w.close();
        }
    }

    private static String csv(String s) {
        if (s == null)
            return "";
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
