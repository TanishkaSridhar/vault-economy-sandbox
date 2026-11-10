package vault.llm;

/**
 * ABSTRACTION: one language model reachable over the network.
 * Implementations: OpenAiClient (OpenAI, Gemini, Groq, OpenRouter, Ollama, LM Studio, ...)
 * and AnthropicClient (Claude).
 */
public interface LlmClient {

    /** Send a conversation and return the model's reply. */
    LlmReply complete(LlmRequest request) throws LlmException;

    /** The short name from llm.json, e.g. "claude" or "ollama". */
    String name();

    /** The model this client asks for, e.g. "llama3.2". */
    String model();
}
