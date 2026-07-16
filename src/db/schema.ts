import {
  pgTable,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const fixtures = pgTable("fixtures", {
  fixtureId: text("fixture_id").primaryKey(),
  p1: text("p1").notNull(),
  p2: text("p2").notNull(),
  p1IsHome: boolean("p1_is_home").notNull().default(true),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  gameState: integer("game_state").notNull().default(1),
  stage: text("stage"), // group | r32 | r16 | qf | sf | bronze | final
  groupName: text("group_name"), // A..L
  bracketSlot: text("bracket_slot"), // joins static bracket tree
  finalScore: jsonb("final_score").$type<{
    p1: number;
    p2: number;
    detail?: string;
  }>(),
  hasTimeline: boolean("has_timeline").notNull().default(false),
});

export interface TimelineItem {
  offsetMs: number; // ms since kickoff
  kind: "score" | "odds" | "phase";
  payload: Record<string, unknown>;
}

export interface LineupSide {
  team: string;
  players: { id: number; name: string; num: string; starter: boolean }[];
}

export interface PlayerStatLine {
  id: number;
  name: string;
  team: "p1" | "p2";
  stats: Record<string, number>;
}

export interface CompiledTimeline {
  meta: {
    fixtureId: string;
    p1: string;
    p2: string;
    kickoffTs: number;
    durationMs: number;
    finalScore?: { p1: number; p2: number; detail?: string };
    lineups?: { p1: LineupSide; p2: LineupSide };
    playerStats?: PlayerStatLine[];
  };
  items: TimelineItem[];
}

export const timelines = pgTable("timelines", {
  fixtureId: text("fixture_id")
    .primaryKey()
    .references(() => fixtures.fixtureId),
  compiled: jsonb("compiled").$type<CompiledTimeline>().notNull(),
  itemCount: integer("item_count").notNull(),
  kickoffTs: timestamp("kickoff_ts", { withTimezone: true }).notNull(),
  durationMs: bigint("duration_ms", { mode: "number" }).notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  wallet: text("wallet").primaryKey(), // base58 pubkey
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const authNonces = pgTable("auth_nonces", {
  wallet: text("wallet").primaryKey(),
  nonce: text("nonce").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wallet: text("wallet")
      .notNull()
      .references(() => users.wallet),
    fixtureId: text("fixture_id")
      .notNull()
      .references(() => fixtures.fixtureId),
    mode: text("mode").notNull(), // replay | live
    market: text("market").notNull(), // winner | hilo
    selection: jsonb("selection")
      .$type<Record<string, unknown>>()
      .notNull(),
    marketKey: text("market_key").notNull(), // e.g. "winner" | "hilo:corners"
    placedAtVirtualMs: bigint("placed_at_virtual_ms", { mode: "number" }),
    signedMessage: text("signed_message").notNull(),
    signature: text("signature").notNull(),
    status: text("status").notNull().default("open"), // open | won | lost | void
    points: integer("points").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("picks_unique_market").on(t.wallet, t.fixtureId, t.marketKey)]
);
