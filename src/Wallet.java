public class Wallet {

    private double balance;

    public Wallet(double startingMoney) {
        this.balance = startingMoney;
    }

    public double getBalance() {
        return balance;
    }

    public void earn(double amount) {
        balance = balance + amount;
    }

    public void spend(double amount) throws NotEnoughMoneyException {
        if (amount > balance) {
            throw new NotEnoughMoneyException(amount, balance);
        }
        balance = balance - amount;
    }
}
