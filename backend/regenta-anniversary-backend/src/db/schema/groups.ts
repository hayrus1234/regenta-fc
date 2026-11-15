import { pgTable, serial, varchar, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { players } from "./players.js";

export const tournamentGroups = pgTable("groups", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").notNull(),
  code: varchar("code", { length: 12 }).notNull(),
  name: varchar("name", { length: 80 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, t => ({ tournamentCodeUnique: uniqueIndex("groups_tournament_code_uq").on(t.tournamentId, t.code) }));

export const groupPlayers = pgTable("group_players", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => tournamentGroups.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull()
}, t => ({ groupPlayerUnique: uniqueIndex("group_players_group_player_uq").on(t.groupId, t.playerId), playerGroupUnique: uniqueIndex("group_players_player_uq").on(t.playerId) }));
