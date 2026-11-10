package vault.llm;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The OpenAI "chat completions" format. Many providers accept it, so the same class
 * talks to OpenAI, Google Gemini (its OpenAI-compatible endpoint), Groq, OpenRouter,
 * DeepSeek, Mistral, and to local servers like Ollama and LM Studio. Only the base URL,
 * model and key differ.
 */
public class OpenAiClient extends HttpLlmClient {

    private final String baseUrl;
    private final String apiKey; // may be null for local servers such as Ollama
    // provider-specific settings added to every request, e.g. {"reasoning_effort": "low"} for thinking models
    private final Map<String, Object> extra;

    public OpenAiClient(String name, String baseUrl, String model, String apiKey, Duration timeout) {
        this(name, baseUrl, model, apiKey, timeout, Map.of());
    }

    public OpenAiClient(String name, String baseUrl, String model, String apiKey, Duration timeout,
                        Map<String, Object> extra) {
        super(name, model, timeout);
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.apiKey = apiKey;
        this.extra = extra == null ? Map.of() : Map.copyOf(extra);
    }

    @Override
    protected String endpoint() {
        return baseUrl + "/chat/completions";
    }

    @Override
    protected Map<String, String> headers() {
        return apiKey == null || apiKey.isBlank() ? Map.of() : Map.of("Authorization", "Bearer " + apiKey);
    }

    @Override
    protected Object body(LlmRequest request) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", request.system()));
        for (LlmRequest.Message m : request.messages()) {
            messages.add(Map.of("role", m.role(), "content", m.content()));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model());
        body.put("messages", messages);
        body.put("temperature", request.temperature());
        body.put("max_tokens", request.maxTokens());
        body.putAll(extra);
        return body;
    }

    @Override
    protected LlmReply parse(JsonNode json, long latencyMs) throws LlmException {
        JsonNode text = json.path("choices").path(0).path("message").path("content");
        if (!text.isTextual()) {
            throw new LlmException(LlmException.Kind.BAD_RESPONSE, "no message in reply: " + shorten(json.toString()));
        }
        JsonNode usage = json.path("usage");
        return new LlmReply(text.asText(), json.path("model").asText(model()), latencyMs,
                intOrNull(usage.path("prompt_tokens")), intOrNull(usage.path("completion_tokens")));
    }
}
