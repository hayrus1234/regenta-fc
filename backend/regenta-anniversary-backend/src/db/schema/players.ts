import { pgTable, serial, varchar, integer, timestamp, boolean, text } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  gameUid: varchar("game_uid", { length: 80 }),
  contact: varchar("contact", { length: 80 }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
