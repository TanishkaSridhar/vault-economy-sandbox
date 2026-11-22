package vault;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Word of mouth. A rumour is a claim that some agent is a fair dealer (good) or not to be
 * trusted (bad). It can be true or false.
 *
 * Every night:
 *   1. Agents who chose to gossip today tell everyone in their town (a brand-new rumour).
 *   2. Agents pass on ONE fresh rumour they heard on an earlier day to everyone in the town they
 *      are in now, so rumours travel between towns with the people who carry them.
 * A listener's trust in the person the rumour is about moves a little, more if it trusts the
 * teller, less the further the rumour has travelled. Hearing a rumour about yourself changes
 * how you feel about the teller instead.
 *
 * Rumours are checked against experience: when a listener later trades with the subject and the
 * deal goes the other way from what it was told, it trusts the teller less (caught spreading a
 * false rumour); if the rumour proves right, it trusts the teller a bit more.
 *
 * All of this is plain code; spreading costs no language-model calls.
 */
public class RumourMill {

    /** Trust change from a first-hand rumour told by someone you trust fully. */
    public static final double EFFECT = 0.08;
    /** Each extra hop keeps this share of the effect. */
    public static final double HOP_DECAY = 0.6;
    /** A rumour is not passed on beyond this many hops from whoever started it. */
    public static final int MAX_HOPS = 3;
    /** A rumour is only passed on for this many days after it was heard. */
    public static final int FRESH_DAYS = 3;
    /** The same teller saying the same thing about the same person again within this many days is ignored. */
    public static final int REPEAT_GAP = 5;
    /** Trust in a teller whose rumour proved wrong / right. */
    public static final double CAUGHT_WRONG = -0.10;
    public static final double PROVEN_RIGHT = 0.05;
    /** Trust in someone heard speaking badly / well of you. */
    public static final double SLANDERED = -0.10;
    public static final double PRAISED = 0.05;

    /** The claim itself, as first made. */
    public record Rumour(int id, String origin, String about, boolean good, int turn) {
        public String claim() {
            return about + (good ? " is a fair dealer" : " is not to be trusted");
        }
    }

    /** One agent's memory of hearing a rumour. */
    public static class Heard {
        private final Rumour rumour;
        private final String from;
        private final int hops;
        private final int turn;
        private boolean passedOn;
        private boolean checked;

        Heard(Rumour rumour, String from, int hops, int turn) {
            this.rumour = rumour;
            this.from = from;
            this.hops = hops;
            this.turn = turn;
        }

        public Rumour rumour()      { return rumour; }
        public String from()        { return from; }
        public int hops()           { return hops; }
        public int turn()           { return turn; }
        public boolean passedOn()   { return passedOn; }
        public boolean checked()    { return checked; }
    }

    private final Map<String, List<Heard>> heard = new LinkedHashMap<>();
    private int nextId = 1;

    /** Everything an agent has heard, oldest first. */
    public List<Heard> heardBy(String agent) {
        return List.copyOf(heard.getOrDefault(agent, List.of()));
    }

    /**
     * The night's gossip: new rumours from today's decisions, then rumours passed on.
     * Returns one console line per telling.
     */
    public List<String> spread(Map<Agent, Gossip> said, World world, int turn) {
        List<String> lines = new ArrayList<>();
        for (Map.Entry<Agent, Gossip> e : said.entrySet()) {
            Agent teller = e.getKey();
            Gossip g = e.getValue();
            if (g == null || world.findAgent(g.about()) == null || g.about().equals(teller.getName())) continue;
            Rumour r = new Rumour(nextId++, teller.getName(), g.about(), g.good(), turn);
            tellTown(teller, r, 1, world, turn, lines);
        }
        for (Agent teller : world.getAgents()) {
            Heard h = freshest(teller, world, turn);
            if (h == null) continue;
            h.passedOn = true;
            tellTown(teller, h.rumour, h.hops + 1, world, turn, lines);
        }
        return lines;
    }

    /** The rumour this agent would pass on tonight: heard on an earlier day, still fresh, and believed. */
    private Heard freshest(Agent teller, World world, int turn) {
        Heard best = null;
        for (Heard h : heard.getOrDefault(teller.getName(), List.of())) {
            if (h.passedOn || h.turn >= turn || turn - h.turn > FRESH_DAYS || h.hops >= MAX_HOPS) continue;
            if (h.rumour.about.equals(teller.getName()) || h.rumour.origin.equals(teller.getName())) continue;
            if (world.getSocial().get(teller.getName(), h.from).getTrust() < 0) continue; // does not believe it
            if (best == null || h.turn > best.turn || (h.turn == best.turn && h.hops < best.hops)) best = h;
        }
        return best;
    }

    private void tellTown(Agent teller, Rumour r, int hops, World world, int turn, List<String> lines) {
        List<String> listeners = new ArrayList<>();
        for (Agent listener : world.getAgents()) {
            if (listener.getLocation() == teller.getLocation() && tell(teller, listener, r, hops, world, turn)) {
                listeners.add(listener.getName());
            }
        }
        if (listeners.isEmpty()) return;
        String line = teller.getName() + " told " + String.join(", ", listeners) + ": " + r.claim()
                + (hops > 1 ? " (passed on, " + hops + " hops from " + r.origin + ")" : "");
        lines.add(line);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("rumourId", r.id());
        data.put("origin", r.origin());
        data.put("about", r.about());
        data.put("good", r.good());
        data.put("hops", hops);
        data.put("listeners", listeners);
        world.record("RUMOUR", teller.getName(), teller.getLocation().getName(), line, data);
    }

    /** One listener hears one rumour. Returns false if it was ignored (already heard, or a repeat). */
    private boolean tell(Agent teller, Agent listener, Rumour r, int hops, World world, int turn) {
        String me = listener.getName();
        if (me.equals(teller.getName()) || me.equals(r.origin)) return false; // nobody is told their own rumour
        List<Heard> mine = heard.computeIfAbsent(me, k -> new ArrayList<>());
        for (Heard h : mine) {
            if (h.rumour.id == r.id) return false;
            if (h.from.equals(teller.getName()) && h.rumour.about.equals(r.about) && h.rumour.good == r.good
                    && turn - h.turn < REPEAT_GAP) return false;
        }
        SocialGraph social = world.getSocial();
        if (r.about.equals(me)) {
            social.adjustTrust(me, teller.getName(), r.good ? PRAISED : SLANDERED);
            listener.tell(teller.getName() + (r.good ? " is speaking well of you" : " is telling people you are not to be trusted"));
        } else {
            double weight = clamp((0.5 + social.get(me, teller.getName()).getTrust()) / 1.5, 0, 1);
            double delta = (r.good ? 1 : -1) * EFFECT * weight * Math.pow(HOP_DECAY, hops - 1);
            social.adjustTrust(me, r.about, delta);
            listener.tell(teller.getName() + " says " + r.claim() + (hops > 1 ? " (passing on what they heard)" : ""));
        }
        mine.add(new Heard(r, teller.getName(), hops, turn));
        return true;
    }

    /**
     * An agent has just dealt with {@code subject} and the deal was fair (good) or not.
     * Every rumour it heard about the subject is now judged, and the teller gains or loses trust.
     */
    public void checkExperience(String agent, String subject, boolean good, World world) {
        for (Heard h : heard.getOrDefault(agent, List.of())) {
            if (h.checked || !h.rumour.about.equals(subject) || h.from.equals(subject)) continue;
            h.checked = true;
            boolean right = h.rumour.good == good;
            world.getSocial().adjustTrust(agent, h.from, right ? PROVEN_RIGHT : CAUGHT_WRONG);
            Agent a = world.findAgent(agent);
            if (a != null && !right) {
                a.tell(h.from + " said " + h.rumour.claim() + ", but your deal with " + subject
                        + " says otherwise; you trust " + h.from + " less");
            }
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("rumourId", h.rumour.id());
            data.put("teller", h.from);
            data.put("about", subject);
            data.put("rumourGood", h.rumour.good());
            data.put("dealGood", good);
            data.put("right", right);
            world.record("RUMOUR_CHECKED", agent, a == null ? null : a.getLocation().getName(),
                    agent + " found " + h.from + "'s rumour about " + subject + (right ? " true" : " false"), data);
        }
    }

    private static double clamp(double x, double lo, double hi) {
        return Math.max(lo, Math.min(hi, x));
    }
}
