package vault;

import java.util.Map;

/**
 * ABSTRACTION: somewhere the history of a run is recorded.
 * The World only talks to this interface, so the simulation does not depend
 * on SQLite. SqliteEventLog saves to a database file; NoEventLog saves nothing.
 */
public interface EventLog extends AutoCloseable {

    /** Record a new run and the starting state of the world. */
    void startRun(World world, long seed, int plannedTurns, String codeVersion);

    /** Record one agent's decision and its outcome (also recorded as an event). */
    void decision(int turn, Agent agent, Observation observation, Decision decision,
                  Outcome outcome, Agent.State before, Agent.State after);

    /** Record something that happened that was not an agent's decision (e.g. hunger). */
    void event(int turn, String type, String agent, String town, String message, Map<String, Object> data);

    /** Record a town's end-of-turn market result. */
    void market(int turn, MarketReport report);

    /** Snapshot every agent and save the turn. */
    void endTurn(int turn, World world);

    /** Mark the run as finished. */
    void endRun(int turnsCompleted);

    /** The id of the current run, or -1 if nothing is being saved. */
    long runId();

    @Override
    void close();
}
