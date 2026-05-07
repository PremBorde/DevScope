import { pgTable, serial, text, integer, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const analysesTable = pgTable("analyses", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  hiringRecommendation: text("hiring_recommendation").notNull(),
  avatarUrl: text("avatar_url"),
  topLanguages: text("top_languages").array().notNull().default([]),
  profileJson: jsonb("profile_json").notNull(),
  repoStatsJson: jsonb("repo_stats_json").notNull(),
  languageDistributionJson: jsonb("language_distribution_json").notNull(),
  scoreBreakdownJson: jsonb("score_breakdown_json").notNull(),
  aiInsightsJson: jsonb("ai_insights_json").notNull(),
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analysesTable).omit({ id: true });
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analysesTable.$inferSelect;
