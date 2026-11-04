package vault;

import java.util.Map;

/** An EventLog that records nothing. Used with --no-db and in quick experiments. */
public class NoEventLog implements EventLog {

    @Override public void startRun(World world, long seed, int plannedTurns, String codeVersion) {}
    @Override public void decision(int turn, Agent agent, Observation observation, Decision decision,
                                   Outcome outcome, Agent.State before, Agent.State after) {}
    @Override public void event(int turn, String type, String agent, String town, String message,
                                Map<String, Object> data) {}
    @Override public void market(int turn, MarketReport report) {}
    @Override public void endTurn(int turn, World world) {}
    @Override public void endRun(int turnsCompleted) {}
    @Override public long runId() { return -1; }
    @Override public void close() {}
}
