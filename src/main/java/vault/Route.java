package vault;

import java.util.List;

/**
 * The cheapest way from one town to another along the roads.
 *
 * @param path     every town on the way, starting with where you are and ending at the destination
 * @param roads    the roads taken, in order (one fewer than the towns in path)
 * @param distance total km
 * @param coins    total coin cost if travelled all the way
 * @param food     total extra food eaten on the way
 */
public record Route(List<String> path, List<Road> roads, double distance, double coins, int food) {

    /** The next town to move to (one road per turn). */
    public String nextStop() {
        return path.get(1);
    }

    /** The first road on the route. */
    public Road firstRoad() {
        return roads.get(0);
    }

    /** Number of roads, which is also the number of turns the trip takes. */
    public int legs() {
        return roads.size();
    }
}
