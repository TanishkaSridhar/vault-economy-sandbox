package vault;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vault.llm.LlmClient;
import vault.llm.LlmReply;
import vault.llm.LlmRequest;
import vault.llm.LlmRouter;
import vault.llm.OpenAiClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LlmBrainTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private World world;
    private Agent ravi; // a Trader in Port (classic scenario)

    @BeforeEach
    void setUp() {
        world = Scenario.load("classic").build(1, new NoEventLog(), false);
        ravi = world.findAgent("Ravi");
    }

    private Observation obs() {
        return ravi.observe(world, 1);
    }

    private static LlmRouter router(LlmClient... clients) {
        return new LlmRouter(List.of(clients), 0.7, 300);
    }

    @Test
    void sendsTheOpenAiFormatAndUsesAValidAnswer() throws Exception {
        try (FakeLlmServer server = new FakeLlmServer()) {
            server.openAiAnswer("{\"reason\": \"Valley is cheaper\", \"action\": \"TRAVEL\", \"target\": \"valley\"}");
            LlmClient client = new OpenAiClient("fake", server.baseUrl(), "m1", "sk-test", TIMEOUT,
                    Map.of("reasoning_effort", "low"));
            LlmBrain brain = new LlmBrain(router(client));

            Decision d = brain.decide(obs());

            assertEquals(Action.TRAVEL, d.action());
            assertEquals("Valley", d.target()); // matched case-insensitively, stored with the real name
            assertEquals("Valley is cheaper", d.reason());

            FakeLlmServer.Received req = server.received.get(0);
            assertEquals("/v1/chat/completions", req.path());
            assertEquals("Bearer sk-test", req.headers().get("Authorization").get(0));
            JsonNode body = JSON.readTree(req.body());
            assertEquals("m1", body.path("model").asText());
            assertEquals("low", body.path("reasoning_effort").asText()); // the provider's extra settings are sent
            assertEquals("system", body.path("messages").path(0).path("role").asText());
            assertTrue(body.path("messages").path(1).path("content").asText().contains("Allowed actions: BUY, SELL, TRAVEL, REST"));

            BrainTrace t = brain.lastTrace();
            assertEquals("llm:fake", t.brainUsed());
            assertEquals("fake-model", t.model());
            assertEquals(100, t.inputTokens());
            assertEquals(20, t.outputTokens());
            assertTrue(t.failures().isEmpty());
            assertEquals(0, brain.fallbacks());
        }
    }

    @Test
    void invalidAnswerIsCorrectedOnce() throws Exception {
        try (FakeLlmServer server = new FakeLlmServer()) {
            server.openAiAnswer("{\"reason\": \"grow food\", \"action\": \"FARM\"}")          // traders cannot farm
                  .openAiAnswer("{\"reason\": \"fine, rest\", \"action\": \"REST\"}");
            LlmBrain brain = new LlmBrain(router(new OpenAiClient("fake", server.baseUrl(), "m", null, TIMEOUT)));

            Decision d = brain.decide(obs());

            assertEquals(Action.REST, d.action());
            assertEquals(2, server.received.size());
            // the retry contains the bad answer and the correction
            JsonNode retry = JSON.readTree(server.received.get(1).body()).path("messages");
            assertEquals("assistant", retry.path(2).path("role").asText());
            assertTrue(retry.path(3).path("content").asText().contains("cannot FARM"));
            assertEquals(1, brain.lastTrace().failures().size());
            assertEquals("llm:fake", brain.lastTrace().brainUsed());
        }
    }

    @Test
    void twoBadAnswersMoveOnToTheNextProvider() throws Exception {
        try (FakeLlmServer bad = new FakeLlmServer(); FakeLlmServer good = new FakeLlmServer()) {
            bad.openAiAnswer("I think I will go to Atlantis").openAiAnswer("{\"action\": \"TRAVEL\", \"target\": \"Atlantis\"}");
            good.openAiAnswer("{\"reason\": \"ok\", \"action\": \"SELL\", \"amount\": 1}");
            LlmBrain brain = new LlmBrain(router(
                    new OpenAiClient("bad", bad.baseUrl(), "m", null, TIMEOUT),
                    new OpenAiClient("good", good.baseUrl(), "m", null, TIMEOUT)));

            Decision d = brain.decide(obs());

            assertEquals(Action.SELL, d.action());
            assertEquals("llm:good", brain.lastTrace().brainUsed());
            assertEquals(2, brain.lastTrace().failures().size());
        }
    }

    @Test
    void mainProviderIsAskedFirst() throws Exception {
        try (FakeLlmServer main = new FakeLlmServer(); FakeLlmServer backup = new FakeLlmServer()) {
            main.openAiAnswer("{\"reason\": \"r\", \"action\": \"REST\"}");
            LlmBrain brain = new LlmBrain(router(
                    new OpenAiClient("main", main.baseUrl(), "m", null, TIMEOUT),
                    new OpenAiClient("backup", backup.baseUrl(), "m", null, TIMEOUT)));

            brain.decide(obs());

            assertEquals(0, backup.received.size());
            assertEquals("llm:main", brain.lastTrace().brainUsed());
        }
    }

    @Test
    void unreachableProviderFallsBackToRulesAndIsSwitchedOff() throws Exception {
        String deadUrl;
        try (FakeLlmServer s = new FakeLlmServer()) {
            deadUrl = s.baseUrl(); // nothing listens here once the server is closed
        }
        LlmClient dead = new OpenAiClient("dead", deadUrl, "m", null, TIMEOUT);
        LlmRouter router = router(dead);
        LlmBrain brain = new LlmBrain(router);

        for (int i = 0; i < LlmRouter.MAX_CONSECUTIVE_FAILURES; i++) {
            Decision d = brain.decide(obs());
            assertTrue(d.reason().startsWith("[rule fallback]"));
            assertTrue(brain.lastTrace().fellBack());
        }
        assertTrue(router.stats().get("dead").disabled);
        assertTrue(router.chain().isEmpty());

        // with every provider off, decisions still happen (by the rules) without waiting
        brain.decide(obs());
        assertTrue(brain.lastTrace().failures().isEmpty());
        assertEquals(LlmRouter.MAX_CONSECUTIVE_FAILURES + 1, brain.fallbacks());
    }

    @Test
    void wrongApiKeySwitchesTheProviderOffAtOnce() throws Exception {
        try (FakeLlmServer server = new FakeLlmServer()) {
            server.reply(401, "{\"error\":\"invalid api key\"}");
            LlmRouter router = router(new OpenAiClient("fake", server.baseUrl(), "m", "wrong", TIMEOUT));
            LlmBrain brain = new LlmBrain(router);

            brain.decide(obs());

            assertTrue(brain.lastTrace().fellBack());
            assertTrue(router.stats().get("fake").disabled);
            assertTrue(brain.lastTrace().failures().get(0).contains("AUTH"));
        }
    }

    @Test
    void ruleBrainDecidesOnceTheDecisionIsOutOfTime() {
        // a fake clock: every model call "takes" 20 s, and a decision may take 30 s
        long[] now = {0};
        LlmClient slow = new LlmClient() {
            int calls;
            public LlmReply complete(LlmRequest r) {
                now[0] += 20_000;
                return new LlmReply(calls++ == 0 ? "not json" : "{\"action\":\"REST\"}", "m", 20_000, null, null);
            }
            public String name()  { return "slow"; }
            public String model() { return "m"; }
        };
        LlmClient never = new LlmClient() {
            public LlmReply complete(LlmRequest r) { throw new AssertionError("should not be asked: out of time"); }
            public String name()  { return "never"; }
            public String model() { return "m"; }
        };
        LlmRouter router = new LlmRouter(List.of(slow, never), Map.of(), 0.7, 300, 15, 30, () -> now[0], ms -> {});
        LlmBrain brain = new LlmBrain(router);

        // 1st answer is invalid (20 s); the correction comes back at 40 s, but the check before it ran at 20 s,
        // so it is still used. Then a new decision starts.
        assertEquals(Action.REST, brain.decide(obs()).action());

        // this time the 1st answer is good immediately; force the budget to run out by moving the clock
        LlmClient late = new LlmClient() {
            public LlmReply complete(LlmRequest r) { now[0] += 31_000; return new LlmReply("nonsense", "m", 31_000, null, null); }
            public String name()  { return "late"; }
            public String model() { return "m"; }
        };
        LlmBrain brain2 = new LlmBrain(new LlmRouter(List.of(late, never), Map.of(), 0.7, 300, 15, 30,
                () -> now[0], ms -> {}));
        Decision d = brain2.decide(obs());
        assertTrue(d.reason().startsWith("[rule fallback]"));
        assertTrue(brain2.lastTrace().failures().stream().anyMatch(f -> f.startsWith("out of time")));
        assertEquals(1, brain2.fallbacks());
    }

    @Test
    void traderSeesThePerFoodProfitOfSellingInEachTown() {
        place(ravi, 6); // bought at 6
        String prompt = PromptBuilder.user(obs());
        assertTrue(prompt.contains("vs the 6 you paid"), prompt);

        Trader fresh = (Trader) world.findAgent("Arun");
        assertFalse(PromptBuilder.user(fresh.observe(world, 1)).contains("you paid")); // has not bought yet
    }

    private static void place(Agent trader, double paid) {
        ((Trader) trader).setLastBuyPrice(paid);
    }
}
