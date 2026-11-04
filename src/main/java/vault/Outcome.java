package vault;

import java.util.Map;

/**
 * What actually happened when an agent tried to carry out a decision.
 * The intention (Decision) and the result (Outcome) are kept apart because
 * they can differ: a trader may decide to BUY, but the town can run out.
 *
 * @param success   whether the action went through
 * @param eventType what kind of world event this was (BOUGHT, SOLD, TRAVELLED, ...)
 * @param message   the human-readable line printed to the console
 * @param data      the numbers behind it (quantity, price, from/to ...), stored as JSON
 */
public record Outcome(boolean success, String eventType, String message, Map<String, Object> data) {

    public static Outcome ok(String eventType, String message, Map<String, Object> data) {
        return new Outcome(true, eventType, message, data);
    }

    public static Outcome failed(Action attempted, String message) {
        return new Outcome(false, "ACTION_FAILED", message, Map.of("attempted", attempted.name()));
    }
}
