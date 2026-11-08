package vault;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SocialGraphTest {

    @Test
    void neighboursStartAsAcquaintancesOthersAsStrangers() {
        SocialGraph g = new SocialGraph();
        g.addAgent("A");
        g.addAgent("B", 0.1, 0.3, List.of("A"));
        g.addAgent("C", 0.1, 0.3, List.of());
        assertEquals(0.3, g.get("A", "B").getFamiliarity(), 1e-9);
        assertEquals(0.3, g.get("B", "A").getFamiliarity(), 1e-9);
        assertEquals(0.1, g.get("B", "A").getTrust(), 1e-9);
        assertEquals(0, g.get("A", "C").getFamiliarity(), 1e-9);
        assertEquals(6, g.all().size()); // 3 agents -> 3 * 2 directed edges
    }

    @Test
    void meetingRaisesFamiliarityAndApartLowersIt() {
        SocialGraph g = new SocialGraph();
        g.addAgent("A");
        g.addAgent("B");
        g.update(Map.of("A", "Port", "B", "Port"), 1);
        Relationship ab = g.get("A", "B");
        assertEquals(Relationship.MEET_GAIN, ab.getFamiliarity(), 1e-9);
        assertEquals(1, ab.getMeetings());
        assertEquals(1, ab.getLastMet());

        g.update(Map.of("A", "Port", "B", "Hill"), 2);
        assertEquals(Relationship.MEET_GAIN * Relationship.FORGET_RATE, ab.getFamiliarity(), 1e-9);
        assertEquals(1, ab.getMeetings());
    }

    @Test
    void familiarityLevelsOffBelowOne() {
        SocialGraph g = new SocialGraph();
        g.addAgent("A");
        g.addAgent("B");
        for (int t = 1; t <= 200; t++) g.update(Map.of("A", "X", "B", "X"), t);
        double f = g.get("A", "B").getFamiliarity();
        assertTrue(f > 0.99 && f <= 1.0, "familiarity was " + f);
    }

    @Test
    void trustIsDirectedAndClamped() {
        SocialGraph g = new SocialGraph();
        g.addAgent("A");
        g.addAgent("B");
        g.adjustTrust("A", "B", 5);
        assertEquals(1.0, g.get("A", "B").getTrust(), 1e-9);
        assertEquals(0.0, g.get("B", "A").getTrust(), 1e-9); // B's opinion of A is unchanged
        g.adjustTrust("A", "B", -3);
        assertEquals(-1.0, g.get("A", "B").getTrust(), 1e-9);
    }

    @Test
    void unknownEdgeThrows() {
        SocialGraph g = new SocialGraph();
        g.addAgent("A");
        assertThrows(IllegalArgumentException.class, () -> g.get("A", "Z"));
        assertThrows(IllegalArgumentException.class, () -> g.addAgent("A"));
    }
}
