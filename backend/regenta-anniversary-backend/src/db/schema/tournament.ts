import { pgTable, serial, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  currentStage: varchar("current_stage", { length: 32 }).notNull().default("qualifying"),
  groupCount: integer("group_count").notNull().default(8),
  qualifiersPerGroup: integer("qualifiers_per_group").notNull().default(4),
  playoffSlots: integer("playoff_slots").notNull().default(8),
  awardsStartStage: varchar("awards_start_stage", { length: 32 }).notNull().default("super_league"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
