package vault.llm;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LlmConfigTest {

    @Test
    void builtInConfigHasTheAgreedFallbackChain() {
        LlmConfig config = LlmConfig.load(null);
        assertEquals(List.of("groq-120b", "cloudflare-120b", "gemini-lite", "groq-20b"),
                config.providers().stream().map(LlmConfig.Provider::name).toList());
        assertEquals("low", config.providers().get(0).extra().get("reasoning_effort"));
        assertTrue(config.maxSecondsPerDecision() > 0);
    }

    @Test
    void fillsInVariablesFromDotEnvAndSkipsProvidersWithoutKeys(@TempDir Path dir) throws Exception {
        Path env = dir.resolve(".env");
        // made-up names, so a real key in the environment cannot change the result
        Files.writeString(env, "VAULT_TEST_KEY=abc\nVAULT_TEST_ACCOUNT=acc42\n");
        DotEnv dotEnv = DotEnv.load(env);
        assertEquals("https://x/acc42/v1", LlmConfig.fillIn("https://x/${VAULT_TEST_ACCOUNT}/v1", dotEnv));
        assertNull(LlmConfig.fillIn("https://x/${VAULT_TEST_MISSING}/v1", dotEnv));

        LlmConfig config = new LlmConfig(List.of(
                new LlmConfig.Provider("ok", "https://x/${VAULT_TEST_ACCOUNT}", "m", "VAULT_TEST_KEY", 0, 0, null),
                new LlmConfig.Provider("no-key", "https://x", "m", "VAULT_TEST_NO_SUCH_KEY", 0, 0, null),
                new LlmConfig.Provider("no-account", "https://x/${VAULT_TEST_MISSING}", "m", "VAULT_TEST_KEY", 0, 0, null)),
                0.7, 500, 20, 10, 30);
        LlmConfig.Clients clients = config.createClients(dotEnv);
        assertEquals(List.of("ok"), clients.available().stream().map(LlmClient::name).toList());
        assertEquals(2, clients.skipped().size());
    }
}
