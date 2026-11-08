package vault;

/**
 * An edge in the map graph: a two-way road between two towns.
 *
 * @param a        one end
 * @param b        the other end
 * @param distance length in km
 * @param terrain  what the road crosses
 */
public record Road(String a, String b, double distance, Terrain terrain) {

    /** Distance weighted by how hard the terrain is. Travel costs are based on this. */
    public double effort() {
        return distance * terrain.difficulty;
    }

    public boolean connects(String town) {
        return a.equals(town) || b.equals(town);
    }

    /** The town at the other end of the road from {@code town}. */
    public String otherEnd(String town) {
        if (a.equals(town)) return b;
        if (b.equals(town)) return a;
        throw new IllegalArgumentException(town + " is not on the road " + a + " - " + b);
    }
}
