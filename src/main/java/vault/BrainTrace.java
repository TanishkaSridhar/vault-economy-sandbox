package vault;

import java.util.List;

/**
 * How a decision was made, for the database: which model answered, the full
 * conversation, the raw answer, how long it took and what went wrong on the way.
 *
 * @param brainUsed    "llm:<provider>" if a model's answer was used, "rule-fallback" if every model failed
 * @param model        the model that answered (null for the rule fallback)
 * @param prompt       the whole conversation sent to the model that answered, or the last one tried
 * @param response     that model's raw answer
 * @param latencyMs    total time spent waiting for models on this decision
 * @param inputTokens  prompt tokens of the answer used (null if unknown)
 * @param outputTokens answer tokens of the answer used (null if unknown)
 * @param failures     every failed attempt, e.g. "ollama: NETWORK: could not reach ..."
 */
public record BrainTrace(String brainUsed, String model, String prompt, String response, long latencyMs,
                         Integer inputTokens, Integer outputTokens, List<String> failures) {

    public boolean fellBack() {
        return "rule-fallback".equals(brainUsed);
    }
}
