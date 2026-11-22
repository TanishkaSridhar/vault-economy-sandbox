package vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class RumourMillTest {

    private World world;
    private Town valley, port;
    private Trader ravi, arun, dev;
    private Farmer meena;

    @BeforeEach
    void setUp() {
        world = new World(1, new NoEventLog());
        valley = new Town("Valley", 6, 20);
        port = new Town("Port", 9, 10);
        world.addTown(valley);
        world.addTown(port);
        world.addRoad(valley, port, 12, Terrain.PLAINS);
        ravi = new Trader("Ravi", valley);
        arun = new Trader("Arun", valley);
        meena = new Farmer("Meena", port);   // the subject, far away
        dev = new Trader("Dev", port);
        world.addAgent(ravi);
        world.addAgent(arun);
        world.addAgent(meena);
        world.addAgent(dev);
    }

    private double trust(String from, String to) {
        return world.getSocial().get(from, to).getTrust();
    }

    private Map<Agent, Gossip> says(Agent who, String about, boolean good) {
        Map<Agent, Gossip> m = new LinkedHashMap<>();
        m.put(who, new Gossip(about, good));
        return m;
    }

    @Test
    void aRumourMovesTheListenersTrustOnlyInTheTellersTown() {
        double arunBefore = trust("Arun", "Meena");
        double devBefore = trust("Dev", "Meena");
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        assertTrue(trust("Arun", "Meena") < arunBefore);
        assertEquals(devBefore, trust("Dev", "Meena"), 1e-9); // Dev is in Port and did not hear it
        assertTrue(arun.getNews().get(0).contains("Ravi says Meena is not to be trusted"));
    }

    @Test
    void hearingARumourAboutYourselfChangesHowYouFeelAboutTheTeller() {
        double before = trust("Arun", "Ravi");
        world.getRumours().spread(says(ravi, "Arun", false), world, 1);
        assertEquals(before + RumourMill.SLANDERED, trust("Arun", "Ravi"), 1e-9);
    }

    @Test
    void rumoursTravelWithPeopleAndWeakenWithEachHop() {
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        double firstHand = 0.1 - trust("Arun", "Meena"); // how much Arun's trust fell

        arun.location = port; // Arun carries the rumour to Port
        double devBefore = trust("Dev", "Meena");
        world.getRumours().spread(Map.of(), world, 2);
        double secondHand = devBefore - trust("Dev", "Meena");
        assertTrue(secondHand > 0, "Dev heard it from Arun");
        assertTrue(secondHand < firstHand, "a passed-on rumour counts for less");
        assertEquals(2, world.getRumours().heardBy("Dev").get(0).hops());
        // Meena is in Port too: she hears what is said about her and trusts Arun less
        assertTrue(trust("Meena", "Arun") < 0);
    }

    @Test
    void aFalseRumourIsCaughtWhenTheListenerDealsFairlyWithTheSubject() {
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        double trustInRavi = trust("Arun", "Ravi");
        meena.location = valley;
        meena.perform(Decision.sell(2, "test"), world);
        arun.perform(Decision.buyFrom(1, "Meena", "test"), world);
        assertEquals(trustInRavi + RumourMill.CAUGHT_WRONG, trust("Arun", "Ravi"), 1e-9);
        assertTrue(arun.getNews().stream().anyMatch(n -> n.contains("you trust Ravi less")));
    }

    @Test
    void aRumourDoesNotEchoBackToWhoeverStartedIt() {
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        world.getRumours().spread(Map.of(), world, 2); // Arun passes it on in Valley, where Ravi still is
        assertTrue(world.getRumours().heardBy("Ravi").isEmpty());
    }

    @Test
    void theSameThingFromTheSameTellerIsNotCountedTwice() {
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        double after1 = trust("Arun", "Meena");
        world.getRumours().spread(says(ravi, "Meena", false), world, 2);
        assertEquals(after1, trust("Arun", "Meena"), 1e-9);
    }

    @Test
    void aRumourFromSomeoneYouDistrustIsNotPassedOn() {
        world.getRumours().spread(says(ravi, "Meena", false), world, 1);
        world.getSocial().adjustTrust("Arun", "Ravi", -1);
        arun.location = port;
        double devBefore = trust("Dev", "Meena");
        world.getRumours().spread(Map.of(), world, 2);
        assertEquals(devBefore, trust("Dev", "Meena"), 1e-9);
    }

    @Test
    void ruleBrainGossipsHonestlyOnlyWhenItFeelsStrongly() {
        RuleBrain brain = new RuleBrain();
        assertNull(brain.decide(arun.observe(world, 1)).gossip());
        world.getSocial().adjustTrust("Arun", "Meena", -0.5);
        Gossip g = brain.decide(arun.observe(world, 1)).gossip();
        assertEquals(new Gossip("Meena", false), g);
    }
}
