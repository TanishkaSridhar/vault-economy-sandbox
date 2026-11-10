package vault;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

/**
 * A pretend LLM provider for tests: answers each request with the next queued
 * (status, body) pair and remembers what it was sent. No network or API key needed.
 */
class FakeLlmServer implements AutoCloseable {

    record Received(String path, Map<String, List<String>> headers, String body) {}

    private final HttpServer server;
    private final Deque<int[]> statuses = new ArrayDeque<>();
    private final Deque<String> bodies = new ArrayDeque<>();
    final List<Received> received = new ArrayList<>();

    FakeLlmServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            synchronized (this) {
                received.add(new Received(exchange.getRequestURI().getPath(), exchange.getRequestHeaders(), body));
            }
            int status;
            String reply;
            synchronized (this) {
                status = statuses.isEmpty() ? 500 : statuses.poll()[0];
                reply = bodies.isEmpty() ? "{\"error\":\"nothing queued\"}" : bodies.poll();
            }
            byte[] bytes = reply.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            try (OutputStream out = exchange.getResponseBody()) {
                out.write(bytes);
            }
        });
        server.start();
    }

    String baseUrl() {
        return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
    }

    synchronized FakeLlmServer reply(int status, String body) {
        statuses.add(new int[] {status});
        bodies.add(body);
        return this;
    }

    /** Queue an OpenAI-format answer whose message text is {@code text}. */
    FakeLlmServer openAiAnswer(String text) {
        return reply(200, "{\"model\":\"fake-model\",\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":"
                + quote(text) + "}}],\"usage\":{\"prompt_tokens\":100,\"completion_tokens\":20}}");
    }


    /** text as a JSON string literal, with quotes and newlines escaped. */
    private static String quote(String text) {
        try {
            return new ObjectMapper().writeValueAsString(text);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }
}
