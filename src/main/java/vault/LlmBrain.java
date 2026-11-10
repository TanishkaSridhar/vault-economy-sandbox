package vault;

import vault.llm.LlmClient;
import vault.llm.LlmException;
import vault.llm.LlmReply;
import vault.llm.LlmRequest;
import vault.llm.LlmRouter;

import java.util.ArrayList;
import java.util.List;

/**
 * A brain that asks a language model what to do.
 *
 * For each decision it walks down the router's fallback chain (main model first):
 * - a provider that is busy, out of quota or unreachable is skipped;
 * - an answer that breaks the rules is sent back once with the reason, then the next provider is tried;
 * - once the decision has taken longer than the router's time budget, or every provider has
 *   failed, the RuleBrain decides, so the simulation never stalls.
 * Everything that happened is kept in a BrainTrace for the database.
 */
public class LlmBrain implements Brain {

    private final LlmRouter router;
    private final Brain fallback = new RuleBrain();
    private BrainTrace lastTrace;
    private int fallbacks; // decisions the rule brain had to make because no model answered in time

    public LlmBrain(LlmRouter router) {
        this.router = router;
    }

    public int fallbacks() {
        return fallbacks;
    }

    @Override
    public String name() {
        return "llm";
    }

    @Override
    public BrainTrace lastTrace() {
        return lastTrace;
    }

    @Override
    public Decision decide(Observation obs) {
        LlmRequest request = LlmRequest.of(PromptBuilder.system(obs), PromptBuilder.user(obs),
                router.temperature(), router.maxTokens());
        List<String> failures = new ArrayList<>();
        long start = router.now();
        String lastPrompt = request.transcript();
        String lastAnswer = null;

        chain:
        for (LlmClient client : router.chain()) {
            LlmRequest attempt = request;
            for (int tryNo = 1; tryNo <= 2; tryNo++) {
                if (router.now() - start >= router.decisionBudgetMs()) {
                    failures.add("out of time (" + router.decisionBudgetMs() / 1000 + " s per decision)");
                    break chain;
                }
                if (!router.acquire(client)) {
                    failures.add(client.name() + ": skipped (resting, or at its request limit)");
                    break;
                }
                LlmReply reply;
                try {
                    reply = client.complete(attempt);
                } catch (LlmException e) {
                    router.failure(client, e);
                    failures.add(client.name() + ": " + e);
                    break; // this provider is not answering: try the next one
                }
                lastPrompt = attempt.transcript();
                lastAnswer = reply.text();
                try {
                    Decision d = DecisionParser.parse(reply.text(), obs);
                    router.success(client, reply);
                    lastTrace = new BrainTrace("llm:" + client.name(), reply.model(), lastPrompt, reply.text(),
                            router.now() - start, reply.inputTokens(), reply.outputTokens(), List.copyOf(failures));
                    return d;
                } catch (DecisionParser.InvalidAnswer e) {
                    router.answeredBadly(client, reply);
                    failures.add(client.name() + ": invalid answer: " + e.getMessage());
                    attempt = attempt.withCorrection(reply.text(),
                            "That answer cannot be used: " + e.getMessage()
                                    + ". Reply again with ONLY the JSON object.");
                }
            }
        }

        // no model gave a usable answer in time: the rule brain decides
        fallbacks++;
        Decision d = fallback.decide(obs);
        lastTrace = new BrainTrace("rule-fallback", null, lastPrompt, lastAnswer, router.now() - start, null, null,
                List.copyOf(failures));
        return new Decision(d.action(), d.amount(), d.target(), "[rule fallback] " + d.reason());
    }
}
