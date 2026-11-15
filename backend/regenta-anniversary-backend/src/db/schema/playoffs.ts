import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";
import { players } from "./players";

export const playoffFixtures = pgTable("playoff_fixtures", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  round: varchar("round", { length: 24 }).notNull(), // quarterfinal | semifinal | final
  slot: integer("slot").notNull(),
  playerAId: integer("player_a_id").references(() => players.id),
  playerBId: integer("player_b_id").references(() => players.id),
  goalsA: integer("goals_a"),
  goalsB: integer("goals_b"),
  winnerId: integer("winner_id").references(() => players.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
