public class NotEnoughMoneyException extends Exception {

    public NotEnoughMoneyException(double needed, double available) {
        super("needed " + needed + " coins but has only " + available);
    }
}

