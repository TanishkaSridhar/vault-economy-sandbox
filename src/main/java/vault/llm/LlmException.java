package vault.llm;

/** A model could not be reached or gave an unusable HTTP response. */
public class LlmException extends Exception {

    public enum Kind {
        /** could not connect, or timed out */
        NETWORK,
        /** wrong or missing API key, or no access to the model */
        AUTH,
        /** too many requests: the provider is fine but needs a rest */
        RATE_LIMIT,
        /** the provider answered, but not with something we could read */
        BAD_RESPONSE
    }

    private final Kind kind;
    private final Long retryAfterSeconds; // for RATE_LIMIT: how long the provider asked us to wait, if it said

    public LlmException(Kind kind, String message) {
        this(kind, message, (Long) null);
    }

    public LlmException(Kind kind, String message, Long retryAfterSeconds) {
        super(message);
        this.kind = kind;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public LlmException(Kind kind, String message, Throwable cause) {
        super(message, cause);
        this.kind = kind;
        this.retryAfterSeconds = null;
    }

    public Kind getKind() {
        return kind;
    }

    public Long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }

    @Override
    public String toString() {
        return kind + ": " + getMessage();
    }
}
