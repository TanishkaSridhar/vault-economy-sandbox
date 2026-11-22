package vault;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Trade between agents: every town has an offer board for the day.
 *
 * SELL posts an offer (the food leaves the seller's bag and waits on the board).
 * BUY first takes the best offers on the board in the buyer's town, then the town market.
 * "Best" means cheap AND from someone the buyer trusts: a trusted seller can ask a little more
 * than a stranger and still be chosen, and a seller the buyer distrusts badly is refused.
 * At the end of the day, whatever is still on a board is sold to that town's market at its
 * buying price (1 coin under its selling price), so a seller is never left without a buyer.
 *
 * Trades change trust straight away: a fair deal raises it both ways, overcharging lowers it.
 * All of this is plain code; no language model is asked anything extra.
 */
public class Marketplace {

    /** Buyer's trust in the seller after a fair deal (price at or below the market's). */
    public static final double FAIR_DEAL_BUYER = 0.05;
    /** Seller's trust in the buyer after a deal. */
    public static final double FAIR_DEAL_SELLER = 0.03;
    /** Buyer's trust lost per coin paid above the market price. */
    public static final double OVERCHARGE_PER_COIN = 0.03;
    /** A buyer will not buy from a seller its opinion is below this (unless it names the seller). */
    public static final double REFUSE_BELOW = -0.3;
    /** How much a fully trusted seller's price is "discounted" in the buyer's eyes when choosing. */
    public static final double TRUST_PREMIUM = 0.2;

    private final List<Offer> offers = new ArrayList<>();
    private int nextId = 1;

    /** What a buy achieved, for the agent (a trader remembers what it paid). */
    public record Purchase(int quantity, double cost, Outcome outcome) {
        public double averagePrice() { return quantity == 0 ? 0 : cost / quantity; }
    }

    /** One place food can be bought from: an offer, or the town market (offer == null). */
    private record Source(Offer offer, double price, double score, boolean named) {}

    // ---- the board ----

    Offer post(Agent seller, int quantity, double price) {
        Offer o = new Offer(nextId++, seller, seller.getLocation(), quantity, price);
        offers.add(o);
        return o;
    }

    /** Offers in a town that still have food left, oldest first. */
    public List<Offer> openIn(Town town) {
        List<Offer> list = new ArrayList<>();
        for (Offer o : offers) {
            if (o.getTown() == town && o.getLeft() > 0) list.add(o);
        }
        return list;
    }

    public List<Offer> all() {
        return List.copyOf(offers);
    }

    /**
     * What a buyer thinks of a seller when choosing between offers: mostly its own trust,
     * partly the seller's reputation (what everyone else thinks), which matters most for strangers.
     */
    public static double opinion(SocialGraph social, String buyer, String seller) {
        return 0.6 * social.get(buyer, seller).getTrust() + 0.4 * social.reputation(seller);
    }

    /** The price as the buyer weighs it: trusted sellers look a little cheaper, distrusted ones dearer. */
    public static double score(double price, double opinion) {
        return price * (1 - TRUST_PREMIUM * opinion);
    }

    // ---- buying ----

    /**
     * Buy up to {@code amount} food in the buyer's town: from {@code from} first if named,
     * then the best offers, then the market. Stops when the buyer has what it wanted,
     * runs out of money, or nobody has food left.
     */
    public Purchase buy(Agent buyer, int amount, String from, World world) {
        if (amount <= 0) {
            return new Purchase(0, 0, Outcome.failed(Action.BUY, "cannot buy " + amount + " food"));
        }
        Town town = buyer.getLocation();
        SocialGraph social = world.getSocial();
        double ask = town.getFoodPrice();

        List<Source> sources = new ArrayList<>();
        for (Offer o : openIn(town)) {
            if (o.getSeller() == buyer) continue;
            boolean named = from != null && o.getSeller().getName().equalsIgnoreCase(from);
            double op = opinion(social, buyer.getName(), o.getSeller().getName());
            if (!named && op < REFUSE_BELOW) continue; // does not trust them enough to deal
            sources.add(new Source(o, o.getPrice(), score(o.getPrice(), op), named));
        }
        sources.add(new Source(null, ask, ask, false));
        // the named seller first; then by weighed price; at an equal price an offer beats the market
        sources.sort(Comparator.comparing((Source s) -> !s.named())
                .thenComparingDouble(Source::score)
                .thenComparing(s -> s.offer() == null)
                .thenComparingInt(s -> s.offer() == null ? 0 : s.offer().getId()));

        int need = amount;
        int got = 0;
        double spent = 0;
        List<String> parts = new ArrayList<>();
        List<Map<String, Object>> fills = new ArrayList<>();
        for (Source s : sources) {
            if (need == 0) break;
            int available = s.offer() == null ? town.getFoodStock() : s.offer().getLeft();
            int affordable = (int) Math.floor((buyer.getMoney() + 1e-9) / s.price());
            int take = Math.min(need, Math.min(available, affordable));
            if (take <= 0) continue;
            double cost = take * s.price();
            if (s.offer() == null) {
                buyFromMarket(buyer, town, take, cost);
                parts.add(take + " from the market at " + fmt(s.price()));
            } else {
                trade(buyer, s.offer(), take, ask, world);
                parts.add(take + " from " + s.offer().getSeller().getName() + " at " + fmt(s.price()));
            }
            Map<String, Object> fill = new LinkedHashMap<>();
            fill.put("from", s.offer() == null ? "market" : s.offer().getSeller().getName());
            fill.put("qty", take);
            fill.put("price", s.price());
            fills.add(fill);
            need -= take;
            got += take;
            spent += cost;
        }

        if (got == 0) {
            boolean anyFood = town.getFoodStock() > 0 || !openIn(town).isEmpty();
            String why = anyFood
                    ? "cannot afford food in " + town.getName() + " (market price " + fmt(ask) + ")"
                    : "tried to buy food but nobody in " + town.getName() + " has any left";
            return new Purchase(0, 0, Outcome.failed(Action.BUY, why));
        }
        String msg = "BOUGHT " + got + " food in " + town.getName() + ": " + String.join(", ", parts);
        if (got < amount) msg += " (wanted " + amount + ")";
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("qty", got);
        data.put("cost", spent);
        data.put("price", spent / got);
        data.put("fills", fills);
        return new Purchase(got, spent, Outcome.ok("BOUGHT", msg, data));
    }

    private void buyFromMarket(Agent buyer, Town town, int take, double cost) {
        try {
            buyer.wallet.spend(cost);
        } catch (NotEnoughMoneyException e) {
            throw new IllegalStateException("affordability was checked", e);
        }
        town.giveFood(take);
        buyer.bag.add(take);
    }

    /** One agent-to-agent deal: money and food change hands, and both sides update their trust now. */
    private void trade(Agent buyer, Offer offer, int take, double ask, World world) {
        Agent seller = offer.getSeller();
        double cost = take * offer.getPrice();
        try {
            buyer.wallet.spend(cost);
        } catch (NotEnoughMoneyException e) {
            throw new IllegalStateException("affordability was checked", e);
        }
        seller.wallet.earn(cost);
        offer.take(take);
        buyer.bag.add(take);

        SocialGraph social = world.getSocial();
        boolean fair = offer.getPrice() <= ask + 1e-9;
        if (fair) {
            social.adjustTrust(buyer.getName(), seller.getName(), FAIR_DEAL_BUYER);
            social.adjustTrust(seller.getName(), buyer.getName(), FAIR_DEAL_SELLER);
        } else {
            social.adjustTrust(buyer.getName(), seller.getName(), -OVERCHARGE_PER_COIN * (offer.getPrice() - ask));
            social.adjustTrust(seller.getName(), buyer.getName(), FAIR_DEAL_SELLER);
        }
        world.getRumours().checkExperience(buyer.getName(), seller.getName(), fair, world);

        String town = offer.getTown().getName();
        seller.tell(buyer.getName() + " bought " + take + " of your food at " + fmt(offer.getPrice())
                + " in " + town + (fair ? "" : " (above the market price of " + fmt(ask) + ")"));
        if (!fair) {
            buyer.tell("you paid " + seller.getName() + " " + fmt(offer.getPrice()) + " per food, above the market's "
                    + fmt(ask) + "; you trust them less for it");
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("buyer", buyer.getName());
        data.put("seller", seller.getName());
        data.put("qty", take);
        data.put("price", offer.getPrice());
        data.put("marketPrice", ask);
        data.put("fair", fair);
        data.put("offerId", offer.getId());
        world.record("TRADE", buyer.getName(), town,
                buyer.getName() + " bought " + take + " food from " + seller.getName() + " at " + fmt(offer.getPrice()),
                data);
    }

    // ---- end of the day ----

    /**
     * Sell whatever is left on every board to the town markets at their buying price, pay the
     * sellers, and clear the boards for tomorrow. Returns one console line per settled offer.
     */
    public List<String> settle(World world) {
        List<String> lines = new ArrayList<>();
        for (Offer o : offers) {
            Agent seller = o.getSeller();
            String town = o.getTown().getName();
            if (o.getLeft() == 0) {
                lines.add(seller.getName() + " sold all " + o.getQuantity() + " food to other people in " + town);
                continue;
            }
            double bid = Town.bid(o.getTown().getFoodPrice());
            int left = o.getLeft();
            int toPeople = o.getSold();
            o.getTown().receiveFood(left);
            seller.wallet.earn(left * bid);
            o.take(left);
            String sold = toPeople == 0 ? "" : toPeople + " to people, ";
            seller.tell(left + " of your " + o.getQuantity() + " food found no buyer and went to the "
                    + town + " market at " + fmt(bid));
            lines.add(seller.getName() + " sold " + sold + left + " to the " + town + " market at " + fmt(bid));
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("qty", left);
            data.put("price", bid);
            data.put("revenue", left * bid);
            data.put("offered", o.getQuantity());
            data.put("askingPrice", o.getPrice());
            data.put("offerId", o.getId());
            world.record("MARKET_SALE", seller.getName(), town,
                    seller.getName() + " sold " + left + " unsold food to the market at " + fmt(bid), data);
        }
        offers.clear();
        return lines;
    }

    static String fmt(double x) {
        return x == Math.rint(x) ? String.valueOf((long) x) : String.format("%.1f", x);
    }
}
