package vault.llm;

import java.util.ArrayList;
import java.util.List;

/**
 * What is sent to a model: a system prompt (the rules and the answer format)
 * and a conversation. The conversation is usually a single user message;
 * after an invalid answer it also holds that answer and a correction.
 */
public record LlmRequest(String system, List<Message> messages, double temperature, int maxTokens) {

    /** role is "user" or "assistant". */
    public record Message(String role, String content) {}

    public static LlmRequest of(String system, String user, double temperature, int maxTokens) {
        return new LlmRequest(system, List.of(new Message("user", user)), temperature, maxTokens);
    }

    /** The same request plus the model's previous answer and a correction to retry with. */
    public LlmRequest withCorrection(String badAnswer, String correction) {
        List<Message> more = new ArrayList<>(messages);
        more.add(new Message("assistant", badAnswer));
        more.add(new Message("user", correction));
        return new LlmRequest(system, List.copyOf(more), temperature, maxTokens);
    }

    /** The whole conversation as plain text, for saving in the database. */
    public String transcript() {
        StringBuilder sb = new StringBuilder("[system]\n").append(system).append('\n');
        for (Message m : messages) {
            sb.append("\n[").append(m.role()).append("]\n").append(m.content()).append('\n');
        }
        return sb.toString();
    }
}
