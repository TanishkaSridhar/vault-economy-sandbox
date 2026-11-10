package vault;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DecisionParserTest {

    private Observation trader; // Ravi: Trader in Port with 2 food
    private Observation farmer; // Meena: Farmer in Valley with 4 food

    @BeforeEach
    void setUp() {
        World world = Scenario.load("classic").build(1, new NoEventLog(), false);
        trader = world.findAgent("Ravi").observe(world, 1);
        farmer = world.findAgent("Meena").observe(world, 1);
    }

    private static String error(String answer, Observation obs) {
        return assertThrows(DecisionParser.InvalidAnswer.class, () -> DecisionParser.parse(answer, obs)).getMessage();
    }

    @Test
    void acceptsAPlainAnswer() throws Exception {
        Decision d = DecisionParser.parse("{\"reason\":\"spare food\",\"action\":\"sell\",\"amount\":2}", farmer);
        assertEquals(Action.SELL, d.action());
        assertEquals(2, d.amount());
        assertEquals("spare food", d.reason());
    }

    @Test
    void acceptsJsonWrappedInTextOrFences() throws Exception {
        assertEquals(Action.FARM, DecisionParser.parse("Sure!\n```json\n{\"action\":\"FARM\"}\n```", farmer).action());
    }

    @Test
    void travelResolvesTownNamesAndRejectsUnknownOnes() throws Exception {
        assertEquals("Hill", DecisionParser.parse("{\"action\":\"TRAVEL\",\"target\":\"HILL\"}", trader).target());
        assertTrue(error("{\"action\":\"TRAVEL\",\"target\":\"Atlantis\"}", trader).contains("no route"));
        assertTrue(error("{\"action\":\"TRAVEL\",\"target\":\"Port\"}", trader).contains("already in"));
        assertTrue(error("{\"action\":\"TRAVEL\"}", trader).contains("target"));
    }

    @Test
    void rejectsActionsTheRoleCannotTake() {
        assertTrue(error("{\"action\":\"TRAVEL\",\"target\":\"Port\"}", farmer).contains("cannot TRAVEL"));
        assertTrue(error("{\"action\":\"STEAL\"}", trader).contains("not an action"));
        assertTrue(error("{\"reason\":\"hmm\"}", trader).contains("no \"action\""));
    }

    @Test
    void rejectsBadAmounts() {
        assertTrue(error("{\"action\":\"BUY\"}", trader).contains("amount"));
        assertTrue(error("{\"action\":\"BUY\",\"amount\":0}", trader).contains("amount"));
        assertTrue(error("{\"action\":\"BUY\",\"amount\":2.5}", trader).contains("whole number"));
        assertTrue(error("{\"action\":\"SELL\",\"amount\":9}", farmer).contains("only have 4"));
    }

    @Test
    void rejectsNonJson() {
        assertTrue(error("I will rest today.", trader).contains("JSON"));
        assertTrue(error("{action: REST", trader).contains("JSON"));
    }
}
