package vault;

/**
 * What a brain chose to do, and why.
 *
 * @param action what to do
 * @param amount how much food to buy or sell (ignored by other actions)
 * @param target the town to travel to (ignored by other actions)
 * @param reason a short explanation; the rule brain names its rule, an LLM brain gives its own reasoning
 * @param price  SELL only: the asking price per food on the offer board (0 = the town's market price)
 * @param from   BUY only: a seller on the offer board to buy from first (null = best offers first)
 * @param gossip optional: what the agent tells the people in its town tonight about someone (null = nothing)
 */
public record Decision(Action action, int amount, String target, String reason,
                       double price, String from, Gossip gossip) {

    public Decision(Action action, int amount, String target, String reason) {
        this(action, amount, target, reason, 0, null, null);
    }

    public static Decision farm(String reason)                 { return new Decision(Action.FARM, 0, null, reason); }
    public static Decision buy(int amount, String reason)      { return new Decision(Action.BUY, amount, null, reason); }
    public static Decision sell(int amount, String reason)     { return new Decision(Action.SELL, amount, null, reason); }
    public static Decision travel(String town, String reason)  { return new Decision(Action.TRAVEL, 0, town, reason); }
    public static Decision rest(String reason)                 { return new Decision(Action.REST, 0, null, reason); }

    public static Decision sell(int amount, double price, String reason) {
        return new Decision(Action.SELL, amount, null, reason, price, null, null);
    }

    public static Decision buyFrom(int amount, String seller, String reason) {
        return new Decision(Action.BUY, amount, null, reason, 0, seller, null);
    }

    public Decision withReason(String newReason) {
        return new Decision(action, amount, target, newReason, price, from, gossip);
    }

    public Decision withGossip(Gossip g) {
        return new Decision(action, amount, target, reason, price, from, g);
    }
}
