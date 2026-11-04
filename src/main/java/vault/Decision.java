package vault;

/**
 * What a brain chose to do, and why.
 *
 * @param action what to do
 * @param amount how much food to buy or sell (ignored by other actions)
 * @param target the town to travel to (ignored by other actions)
 * @param reason a short explanation; the rule brain names its rule, an LLM brain will give its own reasoning
 */
public record Decision(Action action, int amount, String target, String reason) {

    public static Decision farm(String reason)                 { return new Decision(Action.FARM, 0, null, reason); }
    public static Decision buy(int amount, String reason)      { return new Decision(Action.BUY, amount, null, reason); }
    public static Decision sell(int amount, String reason)     { return new Decision(Action.SELL, amount, null, reason); }
    public static Decision travel(String town, String reason)  { return new Decision(Action.TRAVEL, 0, town, reason); }
    public static Decision rest(String reason)                 { return new Decision(Action.REST, 0, null, reason); }
}
