import { integer, jsonb, pgTable, real, text, timestamp } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("Músico"),
  xp: integer("xp").notNull().default(0),
  settings: jsonb("settings").notNull(),
  lastLessonId: text("last_lesson_id"),
  practiceSeconds: integer("practice_seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exerciseResults = pgTable("exercise_results", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull(),
  levelId: integer("level_id").notNull(),
  errors: integer("errors").notNull(),
  durationSec: real("duration_sec").notNull(),
  attempts: integer("attempts").notNull(),
  stars: integer("stars").notNull(),
  xp: integer("xp").notNull(),
  accuracy: real("accuracy").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
});

export const assessmentResults = pgTable("assessment_results", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  levelId: integer("level_id").notNull(),
  grade: real("grade").notNull(),
  accuracy: real("accuracy").notNull(),
  sequenceScore: real("sequence_score").notNull(),
  changeScore: real("change_score").notNull(),
  timingScore: real("timing_score").notNull(),
  errors: integer("errors").notNull(),
  durationSec: real("duration_sec").notNull(),
  passed: integer("passed").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
});

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull(),
});

export const songs = pgTable("songs", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  artist: text("artist").notNull().default("Importação local"),
  bpm: integer("bpm").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
