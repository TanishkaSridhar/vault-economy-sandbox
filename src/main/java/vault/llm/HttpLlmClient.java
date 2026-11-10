package vault.llm;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.Map;

/**
 * INHERITANCE: the shared HTTP part of every client. Subclasses only decide
 * what JSON to send and how to read the reply (the two providers' formats differ).
 * Handles timeouts and turns error codes into LlmExceptions the router understands.
 */
public abstract class HttpLlmClient implements LlmClient {

    protected static final ObjectMapper JSON = new ObjectMapper();

    private final String name;
    private final String model;
    private final Duration timeout;
    private final HttpClient http;

    protected HttpLlmClient(String name, String model, Duration timeout) {
        this.name = name;
        this.model = model;
        this.timeout = timeout;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    }

    @Override public String name()  { return name; }
    @Override public String model() { return model; }

    /** The URL to POST to. */
    protected abstract String endpoint();

    /** Extra headers, e.g. the API key. */
    protected abstract Map<String, String> headers();

    /** The JSON body for this provider. */
    protected abstract Object body(LlmRequest request);

    /** Read the reply text, model and token counts from the provider's JSON. */
    protected abstract LlmReply parse(JsonNode json, long latencyMs) throws LlmException;

    @Override
    public LlmReply complete(LlmRequest request) throws LlmException {
        String body;
        try {
            body = JSON.writeValueAsString(body(request));
        } catch (IOException e) {
            throw new LlmException(LlmException.Kind.BAD_RESPONSE, "could not build request", e);
        }
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(endpoint()))
                .timeout(timeout)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        headers().forEach(builder::header);
        HttpRequest httpRequest = builder.build();

        long start = System.nanoTime();
        HttpResponse<String> response;
        try {
            response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException e) {
            throw new LlmException(LlmException.Kind.NETWORK, "timed out after " + timeout.toSeconds() + "s", e);
        } catch (IOException e) {
            throw new LlmException(LlmException.Kind.NETWORK, "could not reach " + endpoint() + " (" + e + ")", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LlmException(LlmException.Kind.NETWORK, "interrupted", e);
        }
        long latencyMs = (System.nanoTime() - start) / 1_000_000;
        int status = response.statusCode();

        if (status == 429) {
            // Do not wait here: the router rests this provider and the decision moves on to the next one.
            throw new LlmException(LlmException.Kind.RATE_LIMIT, "HTTP 429: " + shorten(response.body()),
                    retryAfterSeconds(response));
        }
        if (status == 402) {
            // "payment required": the account has no credit left (e.g. a used-up signup grant)
            throw new LlmException(LlmException.Kind.AUTH, "HTTP 402 (no credit on this account): " + shorten(response.body()));
        }
        if (status == 401 || status == 403) {
            throw new LlmException(LlmException.Kind.AUTH, "HTTP " + status + ": " + shorten(response.body()));
        }
        if (status == 404) {
            // usually a wrong model name or base URL
            throw new LlmException(LlmException.Kind.AUTH, "HTTP 404 (wrong model or URL?): " + shorten(response.body()));
        }
        if (status / 100 != 2) {
            throw new LlmException(LlmException.Kind.BAD_RESPONSE, "HTTP " + status + ": " + shorten(response.body()));
        }
        try {
            return parse(JSON.readTree(response.body()), latencyMs);
        } catch (IOException e) {
            throw new LlmException(LlmException.Kind.BAD_RESPONSE, "reply was not JSON: " + shorten(response.body()), e);
        }
    }

    /** The provider's Retry-After header in seconds, or null if it did not send one. */
    private static Long retryAfterSeconds(HttpResponse<?> response) {
        try {
            return response.headers().firstValue("Retry-After").map(Long::parseLong).orElse(null);
        } catch (NumberFormatException e) {
            return null; // some providers send a date instead; use the router's default rest
        }
    }

    protected static String shorten(String s) {
        if (s == null) return "";
        s = s.replaceAll("\\s+", " ").trim();
        return s.length() > 300 ? s.substring(0, 300) + "..." : s;
    }

    /** Read an optional integer field (token counts are not reported by every provider). */
    protected static Integer intOrNull(JsonNode node) {
        return node == null || node.isMissingNode() || node.isNull() ? null : node.asInt();
    }
}
