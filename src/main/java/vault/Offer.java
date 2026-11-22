package vault;

/**
 * Food an agent has put up for sale on a town's offer board today.
 * The food is taken out of the seller's bag when the offer is posted (the board holds it),
 * so a buyer always gets what it pays for and the seller cannot sell the same food twice.
 *
 * ENCAPSULATION: only the Marketplace changes how much is left.
 */
public class Offer {

    private final int id;
    private final Agent seller;
    private final Town town;
    private final double price;
    private final int quantity;
    private int left;

    Offer(int id, Agent seller, Town town, int quantity, double price) {
        this.id = id;
        this.seller = seller;
        this.town = town;
        this.quantity = quantity;
        this.left = quantity;
        this.price = price;
    }

    public int getId()        { return id; }
    public Agent getSeller()  { return seller; }
    public Town getTown()     { return town; }
    public double getPrice()  { return price; }
    public int getQuantity()  { return quantity; }
    public int getLeft()      { return left; }
    public int getSold()      { return quantity - left; }

    void take(int amount) {
        if (amount < 0 || amount > left) throw new IllegalArgumentException("cannot take " + amount + " of " + left);
        left -= amount;
    }
}
