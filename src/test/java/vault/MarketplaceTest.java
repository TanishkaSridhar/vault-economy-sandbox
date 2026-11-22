package vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class MarketplaceTest {

    private World world;
    private Town valley, port;
    private Farmer meena;   // 20 coins, 4 food
    private Trader arun;    // 100 coins, 2 food

    @BeforeEach
    void setUp() {
        world = new World(1, new NoEventLog());
        valley = new Town("Valley", 6, 20);
        port = new Town("Port", 9, 10);
        world.addTown(valley);
        world.addTown(port);
        world.addRoad(valley, port, 12, Terrain.PLAINS);
        meena = new Farmer("Meena", valley);
        arun = new Trader("Arun", valley);
        world.addAgent(meena);
        world.addAgent(arun);
    }

    @Test
    void sellPostsAnOfferAndALaterBuyerBuysFromTheSeller() {
        Outcome offered = meena.perform(Decision.sell(3, 5, "spare food"), world);
        assertTrue(offered.success());
        assertEquals("OFFERED", offered.eventType());
        assertEquals(1, meena.getFood());          // the board holds the 3 food
        assertEquals(20, meena.getMoney(), 1e-9);  // not paid yet

        Outcome bought = arun.perform(Decision.buy(3, "test"), world);
        assertTrue(bought.success());
        assertTrue(bought.message().contains("3 from Meena at 5"), bought.message());
        assertEquals(35, meena.getMoney(), 1e-9);
        assertEquals(85, arun.getMoney(), 1e-9);
        assertEquals(5, arun.getFood());
        assertEquals(5, arun.getLastBuyPrice(), 1e-9);
        assertEquals(20, valley.getFoodStock());    // the market was not touched
        assertTrue(world.getMarket().openIn(valley).isEmpty());
        assertTrue(meena.getNews().get(0).contains("Arun bought 3 of your food at 5"));
    }

    @Test
    void buyerTakesTheRestFromTheMarket() {
        meena.perform(Decision.sell(2, "test"), world); // at the market price, 6
        Outcome bought = arun.perform(Decision.buy(5, "test"), world);
        assertTrue(bought.message().contains("2 from Meena at 6, 3 from the market at 6"), bought.message());
        assertEquals(17, valley.getFoodStock());
        assertEquals(70, arun.getMoney(), 1e-9);
    }

    @Test
    void unsoldFoodGoesToTheMarketAtItsBuyingPriceAtNight() {
        meena.perform(Decision.sell(3, 7, "test"), world);
        world.getMarket().settle(world);
        assertEquals(20 + 3 * 5, meena.getMoney(), 1e-9); // market buys at 6 - 1
        assertEquals(23, valley.getFoodStock());
        assertTrue(world.getMarket().openIn(valley).isEmpty());
        assertTrue(meena.getNews().get(0).contains("found no buyer"));
    }

    @Test
    void aLaterAgentSeesTheOfferAndWhoHasActed() {
        meena.perform(Decision.sell(3, 5, "test"), world);
        Observation obs = arun.observe(world, 1);
        assertEquals(1, obs.offers().size());
        assertEquals("Meena", obs.offers().get(0).seller());
        assertEquals(5, obs.bestBuyPrice(), 1e-9);
        String prompt = PromptBuilder.user(obs);
        assertTrue(prompt.contains("Meena (Farmer) sells 3 food at 5"), prompt);
    }

    @Test
    void ruleTraderBuysAnUndercutOfferEvenWhenTheMarketIsDear() {
        Town dear = new Town("Dear", 10, 20);
        world.addTown(dear);
        world.addRoad(dear, valley, 5, Terrain.PLAINS);
        Farmer f = new Farmer("F", dear);
        Trader t = new Trader("T", dear);
        world.addAgent(f);
        world.addAgent(t);
        f.perform(Decision.sell(4, 6, "test"), world);
        Decision d = new RuleBrain().decide(t.observe(world, 1));
        assertEquals(Action.BUY, d.action(), d.reason());
    }

    @Test
    void aTrustedSellerBeatsACheaperStranger() {
        Farmer kumar = new Farmer("Kumar", valley);
        world.addAgent(kumar);
        world.getSocial().adjustTrust("Arun", "Meena", 0.9);
        meena.perform(Decision.sell(1, 6, "test"), world);
        kumar.perform(Decision.sell(1, 5.5, "test"), world);
        Outcome bought = arun.perform(Decision.buy(1, "test"), world);
        assertTrue(bought.message().contains("from Meena"), bought.message());
    }

    @Test
    void aDistrustedSellerIsRefusedUnlessNamed() {
        world.getSocial().adjustTrust("Arun", "Meena", -2);
        meena.perform(Decision.sell(3, 4, "test"), world);
        Outcome bought = arun.perform(Decision.buy(1, "test"), world);
        assertTrue(bought.message().contains("from the market"), bought.message());

        Outcome named = arun.perform(Decision.buyFrom(1, "Meena", "test"), world);
        assertTrue(named.message().contains("from Meena"), named.message());
    }

    @Test
    void fairDealsRaiseTrustAndReputationAtOnceOverchargingLowersIt() {
        double before = world.getSocial().get("Arun", "Meena").getTrust();
        double repBefore = world.getSocial().reputation("Meena");
        meena.perform(Decision.sell(1, 6, "test"), world);
        arun.perform(Decision.buy(1, "test"), world);
        assertEquals(before + Marketplace.FAIR_DEAL_BUYER, world.getSocial().get("Arun", "Meena").getTrust(), 1e-9);
        assertTrue(world.getSocial().reputation("Meena") > repBefore);

        double mid = world.getSocial().get("Arun", "Meena").getTrust();
        meena.perform(Decision.sell(1, 9, "test"), world); // 3 above the market
        arun.perform(Decision.buyFrom(1, "Meena", "test"), world);
        assertEquals(mid - 3 * Marketplace.OVERCHARGE_PER_COIN, world.getSocial().get("Arun", "Meena").getTrust(), 1e-9);
    }

    @Test
    void cannotSellFoodYouDoNotHave() {
        assertFalse(meena.perform(Decision.sell(9, "test"), world).success());
        assertTrue(world.getMarket().openIn(valley).isEmpty());
    }

    @Test
    void aWholeTurnLeavesTheBoardsEmpty() {
        world.runTurn(1);
        assertTrue(world.getMarket().all().isEmpty());
    }
}
