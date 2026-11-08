package vault;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ScenarioTest {

    @Test
    void defaultScenarioBuildsAndEveryTownIsReachable() {
        World world = Scenario.load("default").build(1, new NoEventLog(), false);
        assertEquals(8, world.getTowns().size());
        assertEquals(16, world.getAgents().size());
        assertEquals(16 * 15, world.getSocial().all().size()); // complete directed graph
        for (Town a : world.getTowns()) {
            for (Town b : world.getTowns()) {
                if (a != b) {
                    assertNotNull(world.getMap().route(a.getName(), b.getName()),
                            a.getName() + " cannot reach " + b.getName());
                }
            }
        }
    }

    @Test
    void classicScenarioMatchesTheOriginalWorld() {
        World world = Scenario.load("classic").build(1, new NoEventLog(), false);
        assertEquals(3, world.getTowns().size());
        assertEquals(6, world.getAgents().size());
        assertNull(world.getMap().road("Port", "Hill"));
    }

    @Test
    void farmersGrowWhatTheirTerrainAllows() {
        World world = Scenario.load("default").build(1, new NoEventLog(), false);
        Agent selvi = world.findAgent("Selvi"); // Riverton, RIVER: harvest 3
        Agent devi = world.findAgent("Devi");   // Highpeak, MOUNTAINS: harvest 1
        assertEquals(3, selvi.perform(Decision.farm("t"), world).data().get("qty"));
        assertEquals(1, devi.perform(Decision.farm("t"), world).data().get("qty"));
    }

    @Test
    void unknownScenarioGivesAHelpfulError() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class,
                () -> Scenario.load("atlantis"));
        assertTrue(e.getMessage().contains("built-in"));
    }
}
