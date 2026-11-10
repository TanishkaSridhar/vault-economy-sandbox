package vault.llm;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.LongSupplier;

/**
 * Shared by every LLM brain in a run. It holds the providers in fallback order
 * (main model first) and looks after their free-tier limits:
 *
 * - requests per minute: requests are spaced out so the limit is never hit. If the
 *   wait would be longer than maxWaitSeconds, the decision goes to the next provider.
 * - requests per day: once used up, the provider is switched off for the rest of the run.
 * - "too many requests" (HTTP 429): the provider is rested for the time it asks for
 *   (or DEFAULT_REST_SECONDS), never switched off, because it is fine, just busy.
 * - a wrong key, missing model or empty account: switched off at once.
 * - a provider that cannot be reached several times in a row: switched off, so nobody
 *   keeps waiting for a dead server.
 *
 * It also counts calls and tokens for the end-of-run summary.
 */
public class LlmRouter {

    /** Consecutive connection failures after which a provider is switched off for the run. */
    public static final int MAX_CONSECUTIVE_FAILURES = 3;
    /** How long to rest a provider that said "too many requests" without saying for how long. */
    public static final long DEFAULT_REST_SECONDS = 60;

    /** A provider's free-tier limits; 0 means no limit. */
    public record Limits(int perMinute, int perDay) {
        public static final Limits NONE = new Limits(0, 0);
    }

    /** Waits; replaceable in tests so they do not really sleep. */
    public interface Sleeper {
        void sleep(long ms) throws InterruptedException;
    }

    /** Usage of one provider during the run. */
    public static class Stats {
        public int calls, errors, rateLimited, skipped, inputTokens, outputTokens;
        public long totalLatencyMs;
        public boolean disabled;
        public String disabledReason;
    }

    private final List<LlmClient> clients;
    private final Map<String, Limits> limits;
    private final double temperature;
    private final int maxTokens;
    private final long maxWaitMs;
    private final long decisionBudgetMs;
    private final LongSupplier clock;
    private final Sleeper sleeper;

    private final Map<String, Integer> failuresInARow = new HashMap<>();
    private final Map<String, Deque<Long>> recentRequests = new HashMap<>();
    private final Map<String, Integer> requestsToday = new HashMap<>();
    private final Map<String, Long> restUntil = new HashMap<>();
    private final Map<String, Stats> stats = new LinkedHashMap<>();

    /** Simple router for tests: no limits, 15 s max wait, 30 s per decision, real clock. */
    public LlmRouter(List<LlmClient> clients, double temperature, int maxTokens) {
        this(clients, Map.of(), temperature, maxTokens, 15, 30, System::currentTimeMillis, Thread::sleep);
    }

    /**
     * @param clients               providers in fallback order, main model first
     * @param limits                free-tier limits per provider name
     * @param maxWaitSeconds        longest pause to stay under a per-minute limit before moving on
     * @param maxSecondsPerDecision once a decision has taken this long, the rule brain decides instead
     */
    public LlmRouter(List<LlmClient> clients, Map<String, Limits> limits, double temperature, int maxTokens,
                     int maxWaitSeconds, int maxSecondsPerDecision, LongSupplier clock, Sleeper sleeper) {
        this.clients = List.copyOf(clients);
        this.limits = Map.copyOf(limits);
        this.temperature = temperature;
        this.maxTokens = maxTokens;
        this.maxWaitMs = maxWaitSeconds * 1000L;
        this.decisionBudgetMs = maxSecondsPerDecision * 1000L;
        this.clock = clock;
        this.sleeper = sleeper;
        for (LlmClient c : clients) {
            stats.put(c.name(), new Stats());
            recentRequests.put(c.name(), new ArrayDeque<>());
        }
    }

    public double temperature()     { return temperature; }
    public int maxTokens()          { return maxTokens; }
    public long decisionBudgetMs()  { return decisionBudgetMs; }
    public long now()               { return clock.getAsLong(); }
    public List<LlmClient> clients() { return clients; }
    public Map<String, Stats> stats() { return stats; }

    public Limits limitsOf(String provider) {
        return limits.getOrDefault(provider, Limits.NONE);
    }

    /** The providers to try for a decision, in fallback order, without switched-off ones. */
    public List<LlmClient> chain() {
        List<LlmClient> chain = new ArrayList<>();
        for (LlmClient c : clients) {
            if (!stats.get(c.name()).disabled) chain.add(c);
        }
        return chain;
    }

    /**
     * Ask permission to send one request to this provider. Waits a little if that keeps it
     * under its per-minute limit. Returns false (skip this provider for now) if it is resting,
     * out of requests for today, or the wait would be too long.
     */
    public boolean acquire(LlmClient client) {
        String name = client.name();
        Stats s = stats.get(name);
        if (s.disabled) return false;

        long now = clock.getAsLong();
        Long rest = restUntil.get(name);
        if (rest != null && now < rest) {
            s.skipped++;
            return false;
        }

        Limits lim = limitsOf(name);
        if (lim.perDay() > 0 && requestsToday.getOrDefault(name, 0) >= lim.perDay()) {
            disable(name, "used all " + lim.perDay() + " requests allowed per day");
            return false;
        }

        if (lim.perMinute() > 0) {
            Deque<Long> recent = recentRequests.get(name);
            while (!recent.isEmpty() && recent.peekFirst() <= now - 60_000) recent.pollFirst();
            if (recent.size() >= lim.perMinute()) {
                long wait = recent.peekFirst() + 60_000 - now;
                if (wait > maxWaitMs) {
                    s.skipped++;
                    return false;
                }
                try {
                    sleeper.sleep(wait);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return false;
                }
                now = clock.getAsLong();
                while (!recent.isEmpty() && recent.peekFirst() <= now - 60_000) recent.pollFirst();
            }
            recent.addLast(now);
        }
        requestsToday.merge(name, 1, Integer::sum);
        return true;
    }

    public void success(LlmClient client, LlmReply reply) {
        failuresInARow.put(client.name(), 0);
        Stats s = stats.get(client.name());
        s.calls++;
        s.totalLatencyMs += reply.latencyMs();
        if (reply.inputTokens() != null) s.inputTokens += reply.inputTokens();
        if (reply.outputTokens() != null) s.outputTokens += reply.outputTokens();
    }

    /** The provider answered, but the answer was unusable. It is working, so this does not count toward switching it off. */
    public void answeredBadly(LlmClient client, LlmReply reply) {
        success(client, reply);
        stats.get(client.name()).errors++;
    }

    public void failure(LlmClient client, LlmException e) {
        String name = client.name();
        Stats s = stats.get(name);
        s.errors++;
        if (e.getKind() == LlmException.Kind.RATE_LIMIT) {
            // the provider is fine, just busy: rest it, do not switch it off
            s.rateLimited++;
            long seconds = e.getRetryAfterSeconds() != null ? e.getRetryAfterSeconds() : DEFAULT_REST_SECONDS;
            restUntil.put(name, clock.getAsLong() + seconds * 1000);
            return;
        }
        // a missing model, bad key or empty account will not fix itself: give up on it at once
        int limit = e.getKind() == LlmException.Kind.AUTH ? 1 : MAX_CONSECUTIVE_FAILURES;
        int inARow = failuresInARow.merge(name, 1, Integer::sum);
        if (inARow >= limit) {
            disable(name, inARow + " failure(s) in a row: " + e);
        }
    }

    private void disable(String name, String reason) {
        Stats s = stats.get(name);
        if (s.disabled) return;
        s.disabled = true;
        s.disabledReason = reason;
        System.err.println("  [llm] " + name + " switched off for this run: " + reason);
    }
}
