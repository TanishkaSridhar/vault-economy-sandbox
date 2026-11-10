package vault.llm;

/**
 * A model's answer and what it cost.
 *
 * @param text          the reply text
 * @param model         the model that actually answered (as reported by the provider)
 * @param latencyMs     time from sending the request to receiving the answer
 * @param inputTokens   tokens in the prompt, if the provider reports it (else null)
 * @param outputTokens  tokens in the reply, if the provider reports it (else null)
 */
public record LlmReply(String text, String model, long latencyMs, Integer inputTokens, Integer outputTokens) {}
