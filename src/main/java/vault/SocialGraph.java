package vault;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The relationship graph. Agents are nodes; every ordered pair of agents
 * has a directed edge (a Relationship) holding trust and familiarity.
 *
 * For now relationships change only by meeting: agents in the same town
 * at the end of a turn get to know each other, and drift apart otherwise.
 * Trust is stored here but only changes once agents can make deals
 * (step 6) and judge each other's reputation (step 7).
 */
public class SocialGraph {

    /** Starting relationship between agents who begin in the same town (neighbours). */
    public static final double NEIGHBOUR_TRUST = 0.1;
    public static final double NEIGHBOUR_FAMILIARITY = 0.3;

    // adjacency map: from -> (to -> edge); insertion order kept so runs are repeatable
    private final Map<String, Map<String, Relationship>> edges = new LinkedHashMap<>();

    /** Add an agent and create edges both ways with everyone already in the graph. */
    public void addAgent(String name, double trust, double familiarity, List<String> neighbours) {
        if (edges.containsKey(name)) throw new IllegalArgumentException(name + " is already in the graph");
        Map<String, Relationship> mine = new LinkedHashMap<>();
        for (String other : edges.keySet()) {
            boolean neighbour = neighbours.contains(other);
            double t = neighbour ? trust : 0;
            double f = neighbour ? familiarity : 0;
            mine.put(other, new Relationship(name, other, t, f));
            edges.get(other).put(name, new Relationship(other, name, t, f));
        }
        edges.put(name, mine);
    }

    public void addAgent(String name) {
        addAgent(name, 0, 0, List.of());
    }

    /** What {@code from} thinks of {@code to}. */
    public Relationship get(String from, String to) {
        Map<String, Relationship> mine = edges.get(from);
        Relationship r = mine == null ? null : mine.get(to);
        if (r == null) throw new IllegalArgumentException("no relationship " + from + " -> " + to);
        return r;
    }

    /** Everything {@code from} thinks about everyone else. */
    public List<Relationship> from(String from) {
        return new ArrayList<>(edges.getOrDefault(from, Map.of()).values());
    }

    /** Every edge in the graph. */
    public List<Relationship> all() {
        List<Relationship> list = new ArrayList<>();
        for (Map<String, Relationship> mine : edges.values()) list.addAll(mine.values());
        return list;
    }

    public void adjustTrust(String from, String to, double delta) {
        get(from, to).adjustTrust(delta);
    }

    /**
     * One turn of social life: agents in the same town meet (both directions),
     * every other pair forgets a little.
     *
     * @param townOf agent name -> the town it is in
     */
    public void update(Map<String, String> townOf, int turn) {
        for (Relationship r : all()) {
            String a = townOf.get(r.getFrom());
            String b = townOf.get(r.getTo());
            if (a != null && a.equals(b)) {
                r.met(turn);
            } else {
                r.forget();
            }
        }
    }
}
