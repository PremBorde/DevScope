import { pgTable, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

/**
 * Table used by connect-pg-simple for session storage.
 * The naming and structure must match what connect-pg-simple expects.
 */
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
});
