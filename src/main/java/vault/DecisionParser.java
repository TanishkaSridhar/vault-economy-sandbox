package vault;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Locale;

/**
 * Reads a model's answer and turns it into a Decision, or explains what is wrong
 * with it so the model can be asked again. This is the gate that stops a model
 * from inventing actions, towns or impossible amounts.
 *
 * The optional extras (a SELL "price", a BUY "from", a "rumour") never cause a retry:
 * if one is unusable it is simply dropped, so they add no extra model calls.
 */
public final class DecisionParser {

    private static final ObjectMapper JSON = new ObjectMapper();

    private DecisionParser() {}

    /** The answer could not be used. The message is sent back to the model. */
    public static class InvalidAnswer extends Exception {
        public InvalidAnswer(String message) {
            super(message);
        }
    }

    public static Decision parse(String answer, Observation obs) throws InvalidAnswer {
        JsonNode json = readJsonObject(answer);

        String actionText = json.path("action").asText("").trim().toUpperCase(Locale.ROOT);
        if (actionText.isEmpty()) throw new InvalidAnswer("the answer has no \"action\"");
        Action action;
        try {
            action = Action.valueOf(actionText);
        } catch (IllegalArgumentException e) {
            throw new InvalidAnswer("\"" + actionText + "\" is not an action");
        }
        if (!obs.actions().contains(action)) {
            throw new InvalidAnswer("a " + obs.role() + " cannot " + action + "; allowed: " + obs.actions());
        }

        String reason = json.path("reason").asText("").trim();
        if (reason.isEmpty()) reason = "(no reason given)";
        Gossip gossip = gossip(json.path("rumour"), obs);

        switch (action) {
            case BUY:
            case SELL: {
                JsonNode amountNode = json.path("amount");
                if (!amountNode.canConvertToInt() || amountNode.asInt() < 1 || amountNode.asDouble() != amountNode.asInt()) {
                    throw new InvalidAnswer(action + " needs \"amount\" as a whole number of at least 1");
                }
                int amount = amountNode.asInt();
                if (action == Action.SELL && amount > obs.food()) {
                    throw new InvalidAnswer("you only have " + obs.food() + " food to sell, not " + amount);
                }
                double price = 0;
                String from = null;
                if (action == Action.SELL) {
                    JsonNode p = json.path("price");
                    if (p.isNumber() && p.asDouble() >= 1) price = p.asDouble();
                } else {
                    String seller = json.path("from").asText("").trim();
                    Observation.OfferView offer = seller.isEmpty() ? null : obs.offerFrom(seller);
                    if (offer != null) from = offer.seller();
                }
                return new Decision(action, amount, null, reason, price, from, gossip);
            }
            case TRAVEL: {
                String target = json.path("target").asText("").trim();
                if (target.isEmpty()) throw new InvalidAnswer("TRAVEL needs a \"target\" town");
                for (Observation.RouteView r : obs.routes()) {
                    if (r.to().equalsIgnoreCase(target)) {
                        return new Decision(action, 0, r.to(), reason, 0, null, gossip);
                    }
                }
                if (target.equalsIgnoreCase(obs.town())) {
                    throw new InvalidAnswer("you are already in " + obs.town());
                }
                throw new InvalidAnswer("there is no route to \"" + target + "\"");
            }
            default:
                return new Decision(action, 0, null, reason, 0, null, gossip);
        }
    }

    /** {"about": "Arun", "says": "good" | "bad"} about someone the agent knows of; anything else is ignored. */
    private static Gossip gossip(JsonNode node, Observation obs) {
        if (!node.isObject()) return null;
        String about = obs.knownName(node.path("about").asText("").trim());
        if (about == null || about.equals(obs.name())) return null;
        String says = node.path("says").asText("").trim().toLowerCase(Locale.ROOT);
        if (says.equals("good")) return new Gossip(about, true);
        if (says.equals("bad")) return new Gossip(about, false);
        return null;
    }

    /** Models sometimes wrap JSON in ```json fences or add a sentence; take the outermost {...}. */
    private static JsonNode readJsonObject(String answer) throws InvalidAnswer {
        if (answer == null) throw new InvalidAnswer("the answer was empty");
        int start = answer.indexOf('{');
        int end = answer.lastIndexOf('}');
        if (start < 0 || end <= start) throw new InvalidAnswer("the answer did not contain a JSON object");
        try {
            JsonNode node = JSON.readTree(answer.substring(start, end + 1));
            if (!node.isObject()) throw new InvalidAnswer("the answer was not a JSON object");
            return node;
        } catch (JsonProcessingException e) {
            throw new InvalidAnswer("the JSON could not be read (" + e.getOriginalMessage() + ")");
        }
    }
}
