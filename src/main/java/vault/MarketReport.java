package vault;

/**
 * The result of one town's end-of-turn price update.
 * It used to be only a printed line; now the numbers are kept so they can be saved.
 */
public record MarketReport(String town, double oldPrice, double newPrice, int stock, int sold, int bought) {

    @Override
    public String toString() {
        return town + " food price: " + (int) oldPrice + " -> " + (int) newPrice + "  (stock " + stock + ")";
    }
}
