package vault;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class WorldMapTest {

    /** Valley is the hub: Port -- Valley -- Hill, no direct Port -- Hill road. */
    private WorldMap hubMap() {
        WorldMap map = new WorldMap();
        map.addRoad("Valley", "Port", 12, Terrain.PLAINS); // effort 12
        map.addRoad("Valley", "Hill", 8, Terrain.HILLS);   // effort 16
        return map;
    }

    @Test
    void roadCostsScaleWithDistanceAndTerrain() {
        WorldMap map = hubMap();
        Road plains = map.road("Valley", "Port");
        Road hills = map.road("Hill", "Valley"); // order of the towns does not matter
        assertEquals(3.0, map.coinCost(plains), 1e-9);  // 12 * 0.25
        assertEquals(1, map.foodCost(plains));          // floor(12 / 10)
        assertEquals(4.0, map.coinCost(hills), 1e-9);   // 8 * 2.0 * 0.25
        assertEquals(1, map.foodCost(hills));
    }

    @Test
    void routeGoesThroughTheHub() {
        Route r = hubMap().route("Port", "Hill");
        assertEquals(List.of("Port", "Valley", "Hill"), r.path());
        assertEquals("Valley", r.nextStop());
        assertEquals(2, r.legs());
        assertEquals(20, r.distance(), 1e-9);
        assertEquals(7.0, r.coins(), 1e-9);
        assertEquals(2, r.food());
    }

    @Test
    void routePrefersLeastEffortNotFewestRoads() {
        WorldMap map = hubMap();
        map.addRoad("Port", "Hill", 20, Terrain.FOREST); // direct, but effort 30 > 12 + 16
        assertEquals(List.of("Port", "Valley", "Hill"), map.route("Port", "Hill").path());
    }

    @Test
    void noRouteToSelfOrUnconnectedTown() {
        WorldMap map = hubMap();
        map.addTown("Island");
        assertNull(map.route("Port", "Port"));
        assertNull(map.route("Port", "Island"));
        assertNull(map.route("Port", "Atlantis"));
    }

    @Test
    void freeMapCostsNothing() {
        WorldMap map = WorldMap.free();
        map.addRoad("A", "B", 100, Terrain.HILLS);
        Road r = map.road("A", "B");
        assertEquals(0, map.coinCost(r), 1e-9);
        assertEquals(0, map.foodCost(r));
    }

    @Test
    void rejectsBadRoads() {
        WorldMap map = hubMap();
        assertThrows(IllegalArgumentException.class, () -> map.addRoad("Port", "Valley", 5, Terrain.COAST));
        assertThrows(IllegalArgumentException.class, () -> map.addRoad("Port", "Port", 5, Terrain.COAST));
        assertThrows(IllegalArgumentException.class, () -> map.addRoad("Port", "Hill", 0, Terrain.COAST));
    }
}
