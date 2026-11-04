package vault;

/**
 * The fixed set of moves an agent can make in a turn.
 * Using an enum (instead of free text like "SELL") means a brain cannot
 * invent an action the simulation does not understand. This matters once
 * an LLM is choosing: its answer is parsed into one of these or rejected.
 */
public enum Action {
    FARM,
    BUY,
    SELL,
    TRAVEL,
    REST
}
