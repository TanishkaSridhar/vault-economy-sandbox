package vault.llm;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Which language models to use, read from llm.json.
 *
 * Search order: the --llm-config path if given, else ./llm.json, else the built-in
 * default (src/main/resources/llm.json). API keys are NEVER written in llm.json: each
 * provider names the environment variable that holds its key, and keys are read from
 * the environment or the git-ignored .env file (see DotEnv).
 *
 * @param providers             the fallback chain, main model first
 * @param temperature           randomness of the answers (0 = most predictable)
 * @param maxTokens             longest answer allowed (thinking models count their thinking too)
 * @param timeoutSeconds        how long to wait for one answer before trying the next provider
 * @param maxWaitSeconds        longest pause to stay under a provider's per-minute limit
 * @param maxSecondsPerDecision once one decision has taken this long, the rule brain decides
 */
public record LlmConfig(List<Provider> providers, double temperature, int maxTokens,
                        int timeoutSeconds, int maxWaitSeconds, int maxSecondsPerDecision) {

    /**
     * One model at one provider. Every provider used speaks the OpenAI chat-completions format.
     *
     * @param name              unique short name used in logs ("groq-120b", ...)
     * @param baseUrl           API address; may contain ${VAR}, filled in from the environment or .env
     * @param model             model name at that provider
     * @param apiKeyEnv         the environment variable holding the key
     * @param requestsPerMinute free-tier limit to stay under (null or 0 = no limit)
     * @param requestsPerDay    free-tier limit; once used up the provider is skipped (null or 0 = no limit)
     * @param extra             extra request settings, e.g. {"reasoning_effort": "low"} (may be null)
     */
    public record Provider(String name, String baseUrl, String model, String apiKeyEnv,
                           Integer requestsPerMinute, Integer requestsPerDay, Map<String, Object> extra) {}

    /** What happened when the config was turned into clients. */
    public record Clients(List<LlmClient> available, List<String> skipped) {}

    private static final ObjectMapper JSON = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private static final Pattern VARIABLE = Pattern.compile("\\$\\{([A-Za-z0-9_]+)}");

    public static LlmConfig load(String path) {
        try {
            if (path != null) {
                return JSON.readValue(Path.of(path).toFile(), LlmConfig.class);
            }
            Path local = Path.of("llm.json");
            if (Files.isRegularFile(local)) {
                return JSON.readValue(local.toFile(), LlmConfig.class);
            }
            try (InputStream in = LlmConfig.class.getResourceAsStream("/llm.json")) {
                if (in == null) throw new IllegalStateException("llm.json missing from the build");
                return JSON.readValue(in, LlmConfig.class);
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("could not read LLM config: " + e.getMessage(), e);
        }
    }

    /** A client for every provider whose key (and any ${VAR} in its address) is available. */
    public Clients createClients(DotEnv env) {
        List<LlmClient> available = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        Duration timeout = Duration.ofSeconds(timeoutSeconds <= 0 ? 20 : timeoutSeconds);
        for (Provider p : providers) {
            String key = env.get(p.apiKeyEnv());
            if (key == null) {
                skipped.add(p.name() + " (no " + p.apiKeyEnv() + " in the environment or .env)");
                continue;
            }
            String url = fillIn(p.baseUrl(), env);
            if (url == null) {
                skipped.add(p.name() + " (its baseUrl needs a value that is not set: " + p.baseUrl() + ")");
                continue;
            }
            available.add(new OpenAiClient(p.name(), url, p.model(), key, timeout, p.extra()));
        }
        return new Clients(available, skipped);
    }

    /** The router for a run: the clients in fallback order, with their limits. */
    public LlmRouter createRouter(List<LlmClient> clients) {
        Map<String, LlmRouter.Limits> limits = new HashMap<>();
        for (Provider p : providers) {
            limits.put(p.name(), new LlmRouter.Limits(
                    p.requestsPerMinute() == null ? 0 : p.requestsPerMinute(),
                    p.requestsPerDay() == null ? 0 : p.requestsPerDay()));
        }
        return new LlmRouter(clients, limits, temperature, maxTokens,
                maxWaitSeconds <= 0 ? 15 : maxWaitSeconds,
                maxSecondsPerDecision <= 0 ? 30 : maxSecondsPerDecision,
                System::currentTimeMillis, Thread::sleep);
    }

    /** Replace each ${VAR} with its value; null if one is missing. */
    static String fillIn(String text, DotEnv env) {
        Matcher m = VARIABLE.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String value = env.get(m.group(1));
            if (value == null) return null;
            m.appendReplacement(sb, Matcher.quoteReplacement(value));
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
