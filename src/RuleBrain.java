public class RuleBrain implements Brain {
    @Override
    public String decide(Agent agent, Town town) {
        int food= agent.getFood();
        double money= agent.getMoney();
        double price = town.getPrice();
        if (agent instanceof Farmer){
            if (food>=6) return "SELL";
            return "FARM";
        }

        if (agent instanceof Trader){
            Trader trader = (Trader) agent;
            if (food>=3 && price>trader.getLastBuyPrice()) return "SELL";
            if (food<3 && price<=7 && money>=6*price) return "BUY";
            return "TRAVEL";
            //To get profit, or to stock up when cheap,
            //or to travel to another town to sell when expensive
        }

        if (agent instanceof Diplomat){
            if (food<=1 && money>=2*price) return "BUY"; //get food when hungry
            return "TRAVEL";
        }
        
        return "REST";

}
}
