package vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class TravelTest {

    private World world;
    private Town valley, port, hill;

    @BeforeEach
    void setUp() {
        world = new World(1, new NoEventLog());
        valley = new Town("Valley", 6, 20);
        port = new Town("Port", 9, 10);
        hill = new Town("Hill", 8, 12);
        world.addTown(valley);
        world.addTown(port);
        world.addTown(hill);
        world.addRoad(valley, port, 12, Terrain.PLAINS);
        world.addRoad(valley, hill, 8, Terrain.HILLS);
    }

    @Test
    void travelMovesOneRoadAndPays() {
        Trader t = new Trader("T", port); // 100 coins, 2 food
        world.addAgent(t);
        Outcome o = t.perform(Decision.travel("Hill", "test"), world);
        assertTrue(o.success());
        assertEquals("Valley", t.getLocation().getName()); // one road per turn
        assertEquals("Hill", t.getDestination());          // remembers where it is going
        assertEquals(97.0, t.getMoney(), 1e-9);            // 3 coin toll
        assertEquals(1, t.getFood());                      // 1 food eaten on the road

        t.perform(Decision.travel("Hill", "test"), world);
        assertEquals("Hill", t.getLocation().getName());
        assertNull(t.getDestination());                    // arrived
        assertEquals(93.0, t.getMoney(), 1e-9);            // 4 coin toll over the hills
        assertEquals(0, t.getFood());
    }

    @Test
    void travelFailsWithoutFoodAndChangesNothing() {
        Trader t = new Trader("T", port);
        world.addAgent(t);
        t.perform(Decision.sell(2, "test"), world); // now 0 food
        double money = t.getMoney();
        Outcome o = t.perform(Decision.travel("Valley", "test"), world);
        assertFalse(o.success());
        assertEquals("Port", t.getLocation().getName());
        assertEquals(money, t.getMoney(), 1e-9);
    }

    @Test
    void travelToUnknownTownFails() {
        Trader t = new Trader("T", port);
        world.addAgent(t);
        assertFalse(t.perform(Decision.travel("Atlantis", "test"), world).success());
    }

    @Test
    void farawayPricesAreRememberedNotLive() {
        Trader t = new Trader("T", port);
        world.addAgent(t);
        hill.giveFood(5);
        hill.updatePrice(); // Hill's price rises to 9, but T is in Port and does not see it
        Observation obs = t.observe(world, 1);
        assertEquals(8, obs.find("Hill").foodPrice(), 1e-9);
        assertEquals(1, obs.age(obs.find("Hill")));
        assertEquals(0, obs.age(obs.currentTown())); // the town it is in is always live
    }

    @Test
    void observationListsPeopleHereWithRelationships() {
        Trader a = new Trader("A", port);
        Trader b = new Trader("B", port);   // neighbour of A
        Trader c = new Trader("C", valley); // elsewhere
        world.addAgent(a);
        world.addAgent(b);
        world.addAgent(c);
        Observation obs = a.observe(world, 1);
        assertEquals(1, obs.people().size());
        assertEquals("B", obs.people().get(0).name());
        assertEquals(SocialGraph.NEIGHBOUR_FAMILIARITY, obs.people().get(0).familiarity(), 1e-9);
    }
}
