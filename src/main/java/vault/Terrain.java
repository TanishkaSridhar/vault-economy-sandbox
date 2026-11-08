package vault;

/**
 * The kind of ground a road crosses, or a town is built on.
 *
 * difficulty: how much harder than flat plains a road over this terrain is to travel
 *             (more tolls and cart hire, more food eaten on the way). Below 1 is easier
 *             than plains, e.g. going by boat on a river.
 * harvest:    how much food a farmer grows in one turn in a town on this terrain.
 */
public enum Terrain {
    //          difficulty  harvest
    RIVER      (0.8,        3),
    PLAINS     (1.0,        3),
    COAST      (1.2,        2),
    FOREST     (1.5,        2),
    MARSH      (1.8,        1),
    HILLS      (2.0,        2),
    DESERT     (2.5,        1),
    MOUNTAINS  (3.0,        1);

    public final double difficulty;
    public final int harvest;

    Terrain(double difficulty, int harvest) {
        this.difficulty = difficulty;
        this.harvest = harvest;
    }
}
