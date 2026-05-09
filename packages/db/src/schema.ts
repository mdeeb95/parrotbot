import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  bigint,
  date,
  real,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ChannelSettings } from "./kb-schema.js";

export type KnowledgeBase = {
  identity: { name: string; pronouns: string };
  bio: string;
  game: string;
  schedule: string;
  links: { label: string; url: string }[];
  custom_fields: { label: string; value: string }[];
  custom_qa: { question: string; answer: string }[];
};

export const DEFAULT_KB: KnowledgeBase = {
  identity: { name: "", pronouns: "" },
  bio: "",
  game: "",
  schedule: "",
  links: [],
  custom_fields: [],
  custom_qa: [],
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  twitchId: text("twitch_id").notNull().unique(),
  twitchLogin: text("twitch_login").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("free").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  twitchChannel: text("twitch_channel").notNull().unique(),
  isActive: boolean("is_active").default(false).notNull(),
  isModded: boolean("is_modded").default(false).notNull(),
  kb: jsonb("kb").$type<KnowledgeBase>().default(DEFAULT_KB).notNull(),
  settings: jsonb("settings").$type<ChannelSettings>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usageDaily = pgTable(
  "usage_daily",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    answersPosted: integer("answers_posted").default(0).notNull(),
    tokensInput: bigint("tokens_input", { mode: "number" }).default(0).notNull(),
    tokensOutput: bigint("tokens_output", { mode: "number" }).default(0).notNull(),
  },
  (t) => ({
    channelDateUnique: unique("usage_daily_channel_date_uniq").on(t.channelId, t.date),
    channelDateIdx: index("usage_daily_channel_date_idx").on(t.channelId, t.date),
  }),
);

export const answersLog = pgTable(
  "answers_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { withTimezone: true }).defaultNow().notNull(),
    intent: text("intent"),
    answerText: text("answer_text"),
    askerCount: integer("asker_count").default(1).notNull(),
    confidence: real("confidence"),
  },
  (t) => ({
    channelTsIdx: index("answers_log_channel_ts_idx").on(t.channelId, t.ts.desc()),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type ChannelRow = typeof channels.$inferSelect;
