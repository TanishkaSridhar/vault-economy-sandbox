package vault;

/**
 * ABSTRACTION: anything that can decide what an agent does next.
 *
 * A brain sees only an Observation (never the World) and returns a Decision.
 * RuleBrain implements it with fixed if/else rules; LlmBrain asks a language
 * model. The rest of the simulation does not care which one an agent has.
 */
public interface Brain {

    Decision decide(Observation observation);

    /** Short name stored with every decision, so runs can be compared by brain type. */
    String name();

    /**
     * How the last decision was made (model, prompt, answer, failures), for the database.
     * Brains without anything extra to record return null.
     */
    default BrainTrace lastTrace() {
        return null;
    }
}
