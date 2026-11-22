package vault;

/**
 * Something an agent chooses to say about another agent tonight, as part of its decision:
 * "Arun is a fair dealer" (good) or "Arun is not to be trusted" (bad).
 * It does not have to be true; the RumourMill spreads it and checks it against experience.
 *
 * @param about the agent the rumour is about
 * @param good  true = speaks well of them, false = speaks badly of them
 */
public record Gossip(String about, boolean good) {

    public String says() {
        return good ? "good" : "bad";
    }
}
