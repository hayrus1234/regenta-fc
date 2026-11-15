import { pgTable, serial, integer, varchar, timestamp, text, uniqueIndex } from "drizzle-orm/pg-core";
import { players } from "./players";
import { tournamentGroups } from "./groups";

export const fixtures = pgTable("fixtures", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  stage: varchar("stage", { length: 32 }).notNull(), // qualifying | super_league
  groupId: integer("group_id").references(() => tournamentGroups.id, { onDelete: "set null" }),
  playerAId: integer("player_a_id").notNull().references(() => players.id),
  playerBId: integer("player_b_id").notNull().references(() => players.id),
  matchDay: integer("match_day").notNull().default(1),
  status: varchar("status", { length: 20 }).notNull().default("upcoming"),
  goalsA: integer("goals_a"),
  goalsB: integer("goals_b"),
  notes: text("notes"),
  playedAt: timestamp("played_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, t => ({ noDuplicatePair: uniqueIndex("fixtures_unique_stage_pair_group").on(t.tournamentId, t.stage, t.groupId, t.playerAId, t.playerBId) }));
