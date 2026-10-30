public class Inventory {

    private int food;

    public Inventory(int startingFood) {
        this.food = startingFood;
    }

    public int getFood() {
        return food;
    }

    public void add(int amount) {
        food = food + amount;
    }

    public boolean remove(int amount) {
        if (amount > food) {
            return false;
        }
        food = food - amount;
        return true;
    }
}
