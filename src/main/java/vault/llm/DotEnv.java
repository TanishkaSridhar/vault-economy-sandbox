package vault.llm;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

/**
 * Reads API keys. A key is looked up in the real environment first, then in a
 * .env file in the project folder (lines like GROQ_API_KEY=gsk_...).
 * The .env file is git-ignored, so keys never end up in the repository.
 */
public final class DotEnv {

    private final Map<String, String> values;

    private DotEnv(Map<String, String> values) {
        this.values = values;
    }

    public static DotEnv load() {
        return load(Path.of(".env"));
    }

    /** Read KEY=VALUE lines; a missing file just means no values. */
    public static DotEnv load(Path file) {
        Map<String, String> values = new HashMap<>();
        if (Files.isRegularFile(file)) {
            try {
                for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                    line = line.replace("﻿", "").trim();
                    if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) continue;
                    if (line.startsWith("export ")) line = line.substring(7).trim();
                    int eq = line.indexOf('=');
                    String value = line.substring(eq + 1).trim();
                    if (value.length() >= 2 && (value.startsWith("\"") && value.endsWith("\"")
                            || value.startsWith("'") && value.endsWith("'"))) {
                        value = value.substring(1, value.length() - 1);
                    }
                    values.put(line.substring(0, eq).trim(), value);
                }
            } catch (IOException e) {
                System.err.println("warning: could not read .env: " + e.getMessage());
            }
        }
        return new DotEnv(values);
    }

    /** The first of the given names that has a value (environment first, then .env), or null. */
    public String get(String... names) {
        for (String name : names) {
            String v = System.getenv(name);
            if (v == null || v.isBlank()) v = values.get(name);
            if (v != null && !v.isBlank()) return v;
        }
        return null;
    }
}
