package vault;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.Instant;
import java.util.Map;
import java.util.TreeMap;

/**
 * Saves a run's full history to a SQLite database file.
 *
 * Each turn is one transaction: it is either saved completely or not at all,
 * so a crash never leaves half a turn in the database.
 */
public class SqliteEventLog implements EventLog {

    private final Connection db;
    private final ObjectMapper json = new ObjectMapper();
    private long runId = -1;

    public SqliteEventLog(String path) {
        try {
            db = DriverManager.getConnection("jdbc:sqlite:" + path);
            try (Statement s = db.createStatement()) {
                s.execute("PRAGMA foreign_keys = ON");
                s.execute("PRAGMA journal_mode = WAL"); // lets you read the db while a run is writing
            }
            createTables();
            migrate();
            db.setAutoCommit(false);
        } catch (SQLException e) {
            throw new IllegalStateException("could not open database " + path, e);
        }
    }

    private void createTables() throws SQLException {
        String schema;
        try (InputStream in = SqliteEventLog.class.getResourceAsStream("/schema.sql")) {
            if (in == null) throw new IllegalStateException("schema.sql missing from the build");
            schema = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("could not read schema.sql", e);
        }
        try (Statement s = db.createStatement()) {
            for (String sql : schema.replaceAll("(?m)--.*$", "").split(";")) {
                if (!sql.isBlank()) s.execute(sql);
            }
        }
    }

    /**
     * Bring a database made by an older version of VAULT up to date.
     * CREATE TABLE IF NOT EXISTS does not add new columns to an existing table,
     * so columns added later are added here.
     */
    private void migrate() throws SQLException {
        addColumnIfMissing("agent_states", "destination", "TEXT");
        addColumnIfMissing("towns", "terrain", "TEXT");
        String[][] llmColumns = {{"brain_used", "TEXT"}, {"model", "TEXT"}, {"prompt", "TEXT"},
                {"response", "TEXT"}, {"latency_ms", "INTEGER"}, {"input_tokens", "INTEGER"},
                {"output_tokens", "INTEGER"}, {"failures_json", "TEXT"}};
        for (String[] col : llmColumns) {
            addColumnIfMissing("decisions", col[0], col[1]);
        }
    }

    private void addColumnIfMissing(String table, String column, String type) throws SQLException {
        try (Statement s = db.createStatement();
             ResultSet cols = s.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (cols.next()) {
                if (cols.getString("name").equals(column)) return;
            }
        }
        try (Statement s = db.createStatement()) {
            s.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + type);
        }
    }

    @Override
    public long runId() {
        return runId;
    }

    @Override
    public void startRun(World world, long seed, int plannedTurns, String codeVersion) {
        try {
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO runs (started_at, seed, turns_planned, code_version, config_json) VALUES (?,?,?,?,?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                ps.setString(1, Instant.now().toString());
                ps.setLong(2, seed);
                ps.setInt(3, plannedTurns);
                ps.setString(4, codeVersion);
                ps.setString(5, toJson(new TreeMap<>(Map.of(
                        "scenario", world.getScenarioName(),
                        "agents", world.getAgents().size(),
                        "towns", world.getTowns().size(),
                        "roads", world.getMap().allRoads().size(),
                        "coinsPerEffort", world.getMap().getCoinsPerEffort(),
                        // JSON has no "infinity", so free food travel is saved as 0
                        "effortPerFood", Double.isInfinite(world.getMap().getEffortPerFood())
                                ? 0 : world.getMap().getEffortPerFood()))));
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    keys.next();
                    runId = keys.getLong(1);
                }
            }
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO agents (run_id, name, role, brain, start_town, start_money, start_food) VALUES (?,?,?,?,?,?,?)")) {
                for (Agent a : world.getAgents()) {
                    ps.setLong(1, runId);
                    ps.setString(2, a.getName());
                    ps.setString(3, a.getRole());
                    ps.setString(4, a.getBrain().name());
                    ps.setString(5, a.getLocation().getName());
                    ps.setDouble(6, a.getMoney());
                    ps.setInt(7, a.getFood());
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO towns (run_id, name, terrain, start_price, start_stock) VALUES (?,?,?,?,?)")) {
                for (Town t : world.getTowns()) {
                    ps.setLong(1, runId);
                    ps.setString(2, t.getName());
                    ps.setString(3, t.getTerrain().name());
                    ps.setDouble(4, t.getFoodPrice());
                    ps.setInt(5, t.getFoodStock());
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO roads (run_id, town_a, town_b, distance, terrain, coins, food) VALUES (?,?,?,?,?,?,?)")) {
                WorldMap map = world.getMap();
                for (Road r : map.allRoads()) {
                    ps.setLong(1, runId);
                    ps.setString(2, r.a());
                    ps.setString(3, r.b());
                    ps.setDouble(4, r.distance());
                    ps.setString(5, r.terrain().name());
                    ps.setDouble(6, map.coinCost(r));
                    ps.setInt(7, map.foodCost(r));
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            // turn 0 = the starting state
            for (Town t : world.getTowns()) {
                market(0, new MarketReport(t.getName(), t.getFoodPrice(), t.getFoodPrice(), t.getFoodStock(), 0, 0));
            }
            endTurn(0, world);
        } catch (SQLException e) {
            throw failure("start run", e);
        }
    }

    @Override
    public void decision(int turn, Agent agent, Observation observation, Decision decision, BrainTrace trace,
                         Outcome outcome, Agent.State before, Agent.State after) {
        long decisionId;
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO decisions (run_id, turn, agent, brain, observation_json, action, amount, target, reason,"
                        + " success, result, town_before, town_after, money_before, money_after, food_before, food_after,"
                        + " brain_used, model, prompt, response, latency_ms, input_tokens, output_tokens, failures_json)"
                        + " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, runId);
            ps.setInt(2, turn);
            ps.setString(3, agent.getName());
            ps.setString(4, agent.getBrain().name());
            ps.setString(5, toJson(observation));
            ps.setString(6, decision.action().name());
            ps.setInt(7, decision.amount());
            ps.setString(8, decision.target());
            ps.setString(9, decision.reason());
            ps.setInt(10, outcome.success() ? 1 : 0);
            ps.setString(11, outcome.message());
            ps.setString(12, before.town());
            ps.setString(13, after.town());
            ps.setDouble(14, before.money());
            ps.setDouble(15, after.money());
            ps.setInt(16, before.food());
            ps.setInt(17, after.food());
            if (trace == null) {
                for (int i = 18; i <= 25; i++) ps.setNull(i, Types.VARCHAR);
            } else {
                ps.setString(18, trace.brainUsed());
                ps.setString(19, trace.model());
                ps.setString(20, trace.prompt());
                ps.setString(21, trace.response());
                ps.setLong(22, trace.latencyMs());
                if (trace.inputTokens() == null) ps.setNull(23, Types.INTEGER); else ps.setInt(23, trace.inputTokens());
                if (trace.outputTokens() == null) ps.setNull(24, Types.INTEGER); else ps.setInt(24, trace.outputTokens());
                ps.setString(25, trace.failures().isEmpty() ? null : toJson(trace.failures()));
            }
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                keys.next();
                decisionId = keys.getLong(1);
            }
        } catch (SQLException e) {
            throw failure("save decision", e);
        }
        insertEvent(turn, outcome.eventType(), agent.getName(), before.town(), decisionId,
                outcome.message(), outcome.data());
    }

    @Override
    public void event(int turn, String type, String agent, String town, String message, Map<String, Object> data) {
        insertEvent(turn, type, agent, town, null, message, data);
    }

    private void insertEvent(int turn, String type, String agent, String town, Long decisionId,
                             String message, Map<String, Object> data) {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO events (run_id, turn, type, agent, town, decision_id, message, data_json) VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setLong(1, runId);
            ps.setInt(2, turn);
            ps.setString(3, type);
            ps.setString(4, agent);
            ps.setString(5, town);
            if (decisionId == null) ps.setNull(6, Types.INTEGER); else ps.setLong(6, decisionId);
            ps.setString(7, message);
            ps.setString(8, data == null || data.isEmpty() ? null : toJson(new TreeMap<>(data)));
            ps.executeUpdate();
        } catch (SQLException e) {
            throw failure("save event", e);
        }
    }

    @Override
    public void market(int turn, MarketReport r) {
        try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO town_states (run_id, turn, town, price_before, price, stock, sold, bought) VALUES (?,?,?,?,?,?,?,?)")) {
            ps.setLong(1, runId);
            ps.setInt(2, turn);
            ps.setString(3, r.town());
            ps.setDouble(4, r.oldPrice());
            ps.setDouble(5, r.newPrice());
            ps.setInt(6, r.stock());
            ps.setInt(7, r.sold());
            ps.setInt(8, r.bought());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw failure("save market", e);
        }
    }

    @Override
    public void endTurn(int turn, World world) {
        try {
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO agent_states (run_id, turn, agent, town, money, food, destination) VALUES (?,?,?,?,?,?,?)")) {
                for (Agent a : world.getAgents()) {
                    ps.setLong(1, runId);
                    ps.setInt(2, turn);
                    ps.setString(3, a.getName());
                    ps.setString(4, a.getLocation().getName());
                    ps.setDouble(5, a.getMoney());
                    ps.setInt(6, a.getFood());
                    ps.setString(7, a.getDestination());
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            try (PreparedStatement ps = db.prepareStatement(
                    "INSERT INTO relationships (run_id, turn, from_agent, to_agent, trust, familiarity, meetings)"
                            + " VALUES (?,?,?,?,?,?,?)")) {
                for (Relationship r : world.getSocial().all()) {
                    ps.setLong(1, runId);
                    ps.setInt(2, turn);
                    ps.setString(3, r.getFrom());
                    ps.setString(4, r.getTo());
                    ps.setDouble(5, r.getTrust());
                    ps.setDouble(6, r.getFamiliarity());
                    ps.setInt(7, r.getMeetings());
                    ps.addBatch();
                }
                ps.executeBatch();
            }
            try (PreparedStatement ps = db.prepareStatement("UPDATE runs SET turns_completed = ? WHERE id = ?")) {
                ps.setInt(1, turn);
                ps.setLong(2, runId);
                ps.executeUpdate();
            }
            db.commit(); // the whole turn is saved together
        } catch (SQLException e) {
            throw failure("save turn " + turn, e);
        }
    }

    @Override
    public void endRun(int turnsCompleted) {
        try (PreparedStatement ps = db.prepareStatement(
                "UPDATE runs SET finished_at = ?, turns_completed = ? WHERE id = ?")) {
            ps.setString(1, Instant.now().toString());
            ps.setInt(2, turnsCompleted);
            ps.setLong(3, runId);
            ps.executeUpdate();
            db.commit();
        } catch (SQLException e) {
            throw failure("finish run", e);
        }
    }

    @Override
    public void close() {
        try {
            if (!db.getAutoCommit()) db.rollback(); // drop any unfinished turn
            db.close();
        } catch (SQLException e) {
            throw failure("close database", e);
        }
    }

    private String toJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("could not convert to JSON: " + value, e);
        }
    }

    private IllegalStateException failure(String what, SQLException e) {
        return new IllegalStateException("database error while trying to " + what, e);
    }
}
