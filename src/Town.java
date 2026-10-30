/**
 * CLASSES & OBJECTS
 * A town has a food market. Its price changes at the end of every turn,
 * depending on whether agents mostly bought or mostly sold food there.
 */
public class Town {

    private final String name;
    private double foodPrice;
    private int foodStock;

    // counted during a turn, then used to update the price
    private int soldThisTurn = 0;
    private int boughtThisTurn = 0;

    public Town(String name, double foodPrice, int foodStock) {
        this.name = name;
        this.foodPrice = foodPrice;
        this.foodStock = foodStock;
    }

    public String getName()      { return name; }
    public double getFoodPrice() { return foodPrice; }
    public int getFoodStock()    { return foodStock; }

    // an agent sells food TO the town market
    public void receiveFood(int amount) {
        foodStock = foodStock + amount;
        soldThisTurn = soldThisTurn + amount;
    }

    // an agent buys food FROM the town market
    public boolean giveFood(int amount) {
        if (amount > foodStock) {
            return false;
        }
        foodStock = foodStock - amount;
        boughtThisTurn = boughtThisTurn + amount;
        return true;
    }

    /**
     * Supply and demand:
     * more selling than buying -> price falls
     * more buying than selling -> price rises
     */
    public String updatePrice() {
        double oldPrice = foodPrice;

        if (soldThisTurn > boughtThisTurn) {
            foodPrice = Math.max(2, foodPrice - 1);
        } else if (boughtThisTurn > soldThisTurn) {
            foodPrice = Math.min(20, foodPrice + 1);
        }

        soldThisTurn = 0;
        boughtThisTurn = 0;

        return name + " food price: " + (int) oldPrice + " -> " + (int) foodPrice
                + "  (stock " + foodStock + ")";
    }
}