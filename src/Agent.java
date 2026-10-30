public class Agent {
    protected String name;
    protected Town location ;
    protected Wallet wallet;
    protected Brain brain;
    protected Inventory bag;

    public Agent(String name, Town location, Wallet wallet, Brain brain, Inventory bag) {
        this.name = name;
        this.location = location;
        this.wallet = wallet;
        this.brain = brain;
        this.bag = bag;
    }
    public String getName(){
        return name;
    }
    public Town getLocation(){
        return location;
    }
    public int getFood(){
        return bag.getFood();
    }
    public double getMoney(){
        return wallet.getMoney();
    }
    public String getRole(){
        return "Agent"; //can be overridden by subclasses
    }
    public String act(World world){
        return "rests";
    }

    public String eat(){
        if (bag.remove(1)){
            return null;
        }
        return name+" has no food and goes hungry";
    }

    protected String buyFood(int amount){
        double cost=amount*location.getPrice();
        try{
            wallet.spend(cost);
            if (!location.giveFood(amount)){
                wallet.earn(cost); //get refund if no food available
                return name+" tried to buy food but "+location.getName()+" food at "+(int)location.getFoodPrice()+" each in "+location.getName();
            }
        }   
        catch(NotEnoughMoneyException e){
            return "cannot afford food ("+e.getMessage()+")";
        }
    }
    protected String sellFood(int amount){
        if (!bag.remove(amount)){
            return name+" does not have enough food to sell";
        }
        double earned=amount*location.getPrice();
        wallet.earn(earned);
        location.receiveFood(amount);
        return "SOLD "+amount+" food at "+(int)location.getPrice()+" each in "+location.getName();
    }
    protected String travelTo(Town town){
        Town from=location;
        location=town;
        return "TRAVELLED "+from.getName()+" -> "+town.getName();
    }
    @Override 
    public String toString(){
        return String.format("%-8s %-11s money: %6.1f food: %2d in %s", name, "(",getRole(), ")",getMoney(), getFood(), getName());
    }
}
