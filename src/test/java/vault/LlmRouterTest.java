package vault;

import org.junit.jupiter.api.Test;
import vault.llm.LlmClient;
import vault.llm.LlmException;
import vault.llm.LlmReply;
import vault.llm.LlmRequest;
import vault.llm.LlmRouter;
import vault.llm.OpenAiClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class LlmRouterTest {

    /** A client that is never actually called; the router only needs its name. */
    private static LlmClient named(String name) {
        return new LlmClient() {
            public LlmReply complete(LlmRequest r) { throw new UnsupportedOperationException(); }
            public String name()  { return name; }
            public String model() { return "m"; }
        };
    }

    /** A fake clock: time only moves when the router "sleeps" or the test moves it. */
    private static class FakeTime {
        long now = 1_000_000;
        final List<Long> sleeps = new ArrayList<>();
        void sleep(long ms) { sleeps.add(ms); now += ms; }
    }

    private static LlmRouter router(FakeTime t, Map<String, LlmRouter.Limits> limits, LlmClient... clients) {
        return new LlmRouter(List.of(clients), limits, 0.7, 300, 15, 30, () -> t.now, t::sleep);
    }

    @Test
    void staysUnderTheRequestsPerMinuteLimitByWaitingBriefly() {
        FakeTime t = new FakeTime();
        LlmClient g = named("g");
        LlmRouter r = router(t, Map.of("g", new LlmRouter.Limits(3, 0)), g);

        assertTrue(r.acquire(g));
        t.now += 50_000;                // 50 s later
        assertTrue(r.acquire(g));
        assertTrue(r.acquire(g));
        // 4th request in the same minute: the oldest one is 50 s old, so wait 10 s (under maxWait 15 s)
        assertTrue(r.acquire(g));
        assertEquals(List.of(10_000L), t.sleeps);
    }

    @Test
    void passesTheDecisionOnIfTheWaitWouldBeTooLong() {
        FakeTime t = new FakeTime();
        LlmClient g = named("g");
        LlmRouter r = router(t, Map.of("g", new LlmRouter.Limits(2, 0)), g);

        assertTrue(r.acquire(g));
        assertTrue(r.acquire(g));
        assertFalse(r.acquire(g));      // would have to wait 60 s
        assertTrue(t.sleeps.isEmpty());
        assertEquals(1, r.stats().get("g").skipped);
        assertFalse(r.stats().get("g").disabled);
    }

    @Test
    void rateLimitedProviderRestsButIsNotSwitchedOff() {
        FakeTime t = new FakeTime();
        LlmClient g = named("g");
        LlmRouter r = router(t, Map.of(), g);

        r.failure(g, new LlmException(LlmException.Kind.RATE_LIMIT, "429", 30L));
        assertFalse(r.acquire(g));                 // resting
        t.now += 31_000;
        assertTrue(r.acquire(g));                  // rested
        for (int i = 0; i < 5; i++) {
            r.failure(g, new LlmException(LlmException.Kind.RATE_LIMIT, "429", (Long) null));
        }
        assertFalse(r.stats().get("g").disabled);  // never switched off for being busy
        assertEquals(6, r.stats().get("g").rateLimited);
    }

    @Test
    void dailyLimitSwitchesTheProviderOffForTheRun() {
        FakeTime t = new FakeTime();
        LlmClient g = named("g");
        LlmRouter r = router(t, Map.of("g", new LlmRouter.Limits(0, 2)), g);

        assertTrue(r.acquire(g));
        assertTrue(r.acquire(g));
        assertFalse(r.acquire(g));
        assertTrue(r.stats().get("g").disabled);
        assertTrue(r.chain().isEmpty());
    }

    @Test
    void chainKeepsTheConfiguredOrderAndDropsSwitchedOffProviders() {
        FakeTime t = new FakeTime();
        LlmClient a = named("main"), b = named("backup"), c = named("last");
        LlmRouter r = router(t, Map.of(), a, b, c);
        assertEquals(List.of("main", "backup", "last"), r.chain().stream().map(LlmClient::name).toList());

        r.failure(b, new LlmException(LlmException.Kind.AUTH, "HTTP 402 (no credit on this account)"));
        assertEquals(List.of("main", "last"), r.chain().stream().map(LlmClient::name).toList());
    }

    @Test
    void http429MovesTheDecisionToTheNextProvider() throws Exception {
        try (FakeLlmServer busy = new FakeLlmServer(); FakeLlmServer free = new FakeLlmServer()) {
            busy.reply(429, "{\"error\":\"quota\"}");
            free.openAiAnswer("{\"reason\":\"r\",\"action\":\"REST\"}");
            Duration timeout = Duration.ofSeconds(5);
            LlmClient b = new OpenAiClient("busy", busy.baseUrl(), "m", null, timeout);
            LlmClient f = new OpenAiClient("free", free.baseUrl(), "m", null, timeout);
            LlmRouter r = new LlmRouter(List.of(b, f), 0.7, 300);
            World world = Scenario.load("classic").build(1, new NoEventLog(), false);
            LlmBrain brain = new LlmBrain(r);

            brain.decide(world.findAgent("Ravi").observe(world, 1));

            assertEquals("llm:free", brain.lastTrace().brainUsed());
            assertFalse(r.stats().get("busy").disabled);
            assertEquals(1, r.stats().get("busy").rateLimited);
        }
    }
}
