package vault;

/**
 * An edge in the relationship graph: what ONE agent thinks of ANOTHER.
 * Edges are directed, so Ravi's opinion of Arun can differ from Arun's opinion of Ravi.
 *
 * ENCAPSULATION: values only change through the methods below, which keep
 * them inside their allowed ranges.
 */
public class Relationship {

    /** Familiarity gained per meeting, as a share of what is left to gain (so it levels off near 1). */
    public static final double MEET_GAIN = 0.15;
    /** Share of familiarity kept each turn the two do NOT meet (people drift apart). */
    public static final double FORGET_RATE = 0.97;

    private final String from;
    private final String to;
    private double trust;        // -1 (distrusts completely) .. 0 (neutral) .. +1 (trusts completely)
    private double familiarity;  //  0 (stranger) .. 1 (knows them very well)
    private int meetings;        // turns spent in the same town
    private int lastMet = -1;    // turn of the last meeting, -1 = never

    public Relationship(String from, String to, double trust, double familiarity) {
        this.from = from;
        this.to = to;
        this.trust = clamp(trust, -1, 1);
        this.familiarity = clamp(familiarity, 0, 1);
    }

    public String getFrom()         { return from; }
    public String getTo()           { return to; }
    public double getTrust()        { return trust; }
    public double getFamiliarity()  { return familiarity; }
    public int getMeetings()        { return meetings; }
    public int getLastMet()         { return lastMet; }

    /** The two agents spent a turn in the same town. */
    void met(int turn) {
        meetings++;
        lastMet = turn;
        familiarity += MEET_GAIN * (1 - familiarity);
    }

    /** A turn passed without meeting. */
    void forget() {
        familiarity *= FORGET_RATE;
    }

    /** Change trust by delta (deals kept or broken, rumours... in later steps). */
    void adjustTrust(double delta) {
        trust = clamp(trust + delta, -1, 1);
    }

    private static double clamp(double x, double lo, double hi) {
        return Math.max(lo, Math.min(hi, x));
    }

    @Override
    public String toString() {
        return String.format("%s -> %s  trust %+.2f  familiarity %.2f  (%d meetings)",
                from, to, trust, familiarity, meetings);
    }
}
