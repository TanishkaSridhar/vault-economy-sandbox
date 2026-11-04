package vault;

/**
 * ABSTRACTION: anything that can decide what an agent does next.
 *
 * A brain sees only an Observation (never the World) and returns a Decision.
 * RuleBrain implements it with fixed if/else rules; step 2 adds an LlmBrain
 * that asks a language model, and the rest of the simulation does not change.
 */
public interface Brain {

    Decision decide(Observation observation);

    /** Short name stored with every decision, so runs can be compared by brain type. */
    String name();
}
