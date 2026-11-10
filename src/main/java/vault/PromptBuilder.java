package vault;

import java.util.Map;
import java.util.stream.Collectors;

/**
 * Turns an Observation into the text a language model reads.
 * The system prompt holds the rules of the world and the answer format (the same
 * every turn); the user prompt holds this agent's situation today.
 * Everything here comes from the Observation, so the model knows exactly what the
 * agent knows and nothing more.
 */
public final class PromptBuilder {

    private PromptBuilder() {}

    public static String system(Observation obs) {
        return "You are " + obs.name() + ", a " + obs.role() + " in VAULT, a trading economy of towns linked by roads.\n"
                + "Each turn is one day, and you choose exactly ONE action per day. Try to stay fed and grow your wealth.\n"
                + "\n"
                + "How the world works:\n"
                + "- At the end of every day you eat 1 food. With no food you go hungry.\n"
                + "- At the end of every day each market's food price moves by 1 coin: down if more food was sold "
                + "there than bought, up if more was bought than sold (it stays between 2 and 20). It moves by only "
                + "1 coin however much is traded, so selling many at a good price is not punished.\n"
                + "- You only see the live price of the town you are in. For other towns you know the price you "
                + "last saw there, which may be out of date.\n"
                + "- Travelling moves you along ONE road per day toward the town you name. Before setting off you pay "
                + "that road's toll in coins and extra food. Longer trips take several days.\n"
                + "- Buying needs enough coins and enough food in the local market. You can only sell food you have.\n"
                + "\n"
                + "Your role:\n"
                + roleGuide(obs.role()) + "\n"
                + "\n"
                + "Reply with ONLY a JSON object, no other text:\n"
                + "{\"reason\": \"<one or two short sentences>\", \"action\": \"<one of your allowed actions>\", "
                + "\"amount\": <whole number, only for BUY or SELL>, \"target\": \"<town name, only for TRAVEL>\"}";
    }

    private static String roleGuide(String role) {
        switch (role) {
            case "Farmer":
                return "You are a Farmer. FARM grows food (how much depends on the terrain of your town). "
                        + "SELL some of your food at the local market for coins. You cannot travel or buy. "
                        + "Food beyond what you need to eat in the coming days only earns you something once you sell it.";
            case "Trader":
                return "You are a Trader. BUY food where it is cheap, TRAVEL to where it is dear, and SELL it there. "
                        + "Remember the tolls and the food eaten on the road when judging a trade.";
            case "Diplomat":
                return "You are a Diplomat. Each time you TRAVEL into a town you are paid an 8-coin visiting fee. "
                        + "BUY food when you need to eat. You cannot sell.";
            default:
                return "You are a " + role + ".";
        }
    }

    public static String user(Observation obs) {
        StringBuilder sb = new StringBuilder();
        sb.append("Day ").append(obs.turn()).append(".\n");
        sb.append("You are in ").append(obs.town()).append(" with ").append(money(obs.money()))
                .append(" coins and ").append(obs.food()).append(" food.\n");
        if (obs.travelling()) {
            sb.append("You are part-way through a trip to ").append(obs.destination())
                    .append(". You can carry on or change your plans.\n");
        }
        if (!obs.roleStats().isEmpty()) {
            sb.append("Your notes: ").append(notes(obs.roleStats())).append(".\n");
        }

        sb.append("\nMarkets you know about:\n");
        for (Observation.TownView t : obs.towns()) {
            sb.append("- ").append(t.name()).append(" (").append(t.terrain().name().toLowerCase())
                    .append(", farming yields ").append(t.terrain().harvest).append("): price ")
                    .append(money(t.foodPrice())).append(", stock ").append(t.foodStock());
            int age = obs.age(t);
            if (t.name().equals(obs.town())) sb.append("  <- you are here, live");
            else if (t.seenTurn() == 0) sb.append("  (starting price, never visited)");
            else sb.append("  (seen ").append(age).append(age == 1 ? " day" : " days").append(" ago)");
            sb.append(profit(obs, t));
            sb.append('\n');
        }

        if (obs.actions().contains(Action.TRAVEL)) {
            sb.append("\nRoutes from ").append(obs.town()).append(":\n");
            for (Observation.RouteView r : obs.routes()) {
                sb.append("- to ").append(r.to()).append(": ").append(r.legs())
                        .append(r.legs() == 1 ? " day" : " days").append(", ")
                        .append(money(r.distance())).append(" km. ");
                if (r.legs() > 1) sb.append("First stop ").append(r.nextStop()).append(". ");
                sb.append("Today's road costs ").append(money(r.nextCoins())).append(" coins + ")
                        .append(r.nextFood()).append(" food");
                if (r.legs() > 1) {
                    sb.append(" (whole trip ").append(money(r.coins())).append(" coins + ").append(r.food()).append(" food)");
                }
                sb.append('\n');
            }
        }

        if (obs.people().isEmpty()) {
            sb.append("\nNobody else is here.\n");
        } else {
            sb.append("\nPeople here:\n");
            for (Observation.PersonView p : obs.people()) {
                sb.append("- ").append(p.name()).append(" (").append(p.role()).append("): ")
                        .append(familiarity(p.familiarity())).append(", trust ")
                        .append(String.format("%+.2f", p.trust())).append(", met ").append(p.meetings())
                        .append(p.meetings() == 1 ? " time" : " times").append('\n');
            }
        }

        sb.append("\nAllowed actions: ")
                .append(obs.actions().stream().map(Enum::name).collect(Collectors.joining(", ")))
                .append(".\nWhat do you do today?");
        return sb.toString();
    }

    /**
     * For a trader carrying food it paid for: what selling it in this town would earn per food,
     * spelled out, because models often mix up "buy where cheap" and "sell where dear".
     */
    private static String profit(Observation obs, Observation.TownView t) {
        double paid = obs.stat("lastBuyPrice", 100);
        if (!obs.role().equals("Trader") || obs.food() == 0 || paid >= 100) return "";
        double gain = t.foodPrice() - paid;
        return String.format("  [selling here: %s%s each vs the %s you paid]",
                gain >= 0 ? "+" : "-", money(Math.abs(gain)), money(paid));
    }

    private static String notes(Map<String, Double> stats) {
        return stats.entrySet().stream().map(e -> {
            if (e.getKey().equals("lastBuyPrice")) {
                return e.getValue() >= 100 ? "you have not bought food yet"
                        : "you last bought food at " + money(e.getValue()) + " coins each";
            }
            return e.getKey() + " = " + money(e.getValue());
        }).collect(Collectors.joining("; "));
    }

    private static String familiarity(double f) {
        if (f >= 0.75) return "you know them well";
        if (f >= 0.4) return "you know them";
        if (f >= 0.1) return "you have met";
        return "a stranger";
    }

    private static String money(double x) {
        return x == Math.rint(x) ? String.valueOf((long) x) : String.format("%.1f", x);
    }
}
