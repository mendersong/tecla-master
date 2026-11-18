import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { achievements, assessmentResults, exerciseResults, profiles, songs } from "@/db/schema";
import type { ProfileState } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId || profileId.length > 100) return NextResponse.json({ error: "profileId inválido" }, { status: 400 });
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return NextResponse.json({ profile: null });
  const [results, assessments, unlocked, userSongs] = await Promise.all([
    db.select().from(exerciseResults).where(eq(exerciseResults.profileId, profileId)),
    db.select().from(assessmentResults).where(eq(assessmentResults.profileId, profileId)),
    db.select().from(achievements).where(eq(achievements.profileId, profileId)),
    db.select().from(songs).where(eq(songs.profileId, profileId)),
  ]);
  const state: ProfileState = {
    profileId: profile.id,
    settings: profile.settings as ProfileState["settings"],
    xp: profile.xp,
    results: results.map((row) => ({
      id: row.id, lessonId: row.lessonId, levelId: row.levelId, errors: row.errors, durationSec: row.durationSec,
      attempts: row.attempts, stars: row.stars as 1 | 2 | 3, xp: row.xp, accuracy: row.accuracy, completedAt: row.completedAt.toISOString(),
    })),
    assessments: assessments.map((row) => ({
      id: row.id, levelId: row.levelId, grade: row.grade, accuracy: row.accuracy, sequenceScore: row.sequenceScore,
      changeScore: row.changeScore, timingScore: row.timingScore, errors: row.errors, durationSec: row.durationSec,
      passed: row.passed === 1, completedAt: row.completedAt.toISOString(),
    })),
    achievements: unlocked.map((row) => row.id.replace(`${profileId}:`, "")),
    customSongs: userSongs.map((row) => ({ ...(row.data as ProfileState["customSongs"][number]), id: row.id, title: row.title, artist: row.artist, bpm: row.bpm, createdAt: row.createdAt.toISOString() })),
    lastLessonId: profile.lastLessonId,
    practiceSeconds: profile.practiceSeconds,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
  return NextResponse.json({ profile: state });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { profile?: ProfileState; reset?: boolean };
    const profile = body.profile;
    if (!profile?.profileId || profile.profileId.length > 100 || !profile.settings) {
      return NextResponse.json({ error: "Dados de perfil inválidos" }, { status: 400 });
    }
    await db.transaction(async (tx) => {
      const timestamp = new Date();
      await tx.insert(profiles).values({
        id: profile.profileId, name: profile.settings.username.slice(0, 60) || "Músico", xp: Math.max(0, Math.round(profile.xp)),
        settings: profile.settings, lastLessonId: profile.lastLessonId, practiceSeconds: Math.max(0, Math.round(profile.practiceSeconds)),
        createdAt: new Date(profile.createdAt), updatedAt: timestamp,
      }).onConflictDoUpdate({
        target: profiles.id,
        set: { name: profile.settings.username.slice(0, 60) || "Músico", xp: Math.max(0, Math.round(profile.xp)), settings: profile.settings,
          lastLessonId: profile.lastLessonId, practiceSeconds: Math.max(0, Math.round(profile.practiceSeconds)), updatedAt: timestamp },
      });
      if (body.reset) {
        await tx.delete(exerciseResults).where(eq(exerciseResults.profileId, profile.profileId));
        await tx.delete(assessmentResults).where(eq(assessmentResults.profileId, profile.profileId));
        await tx.delete(achievements).where(eq(achievements.profileId, profile.profileId));
        await tx.delete(songs).where(eq(songs.profileId, profile.profileId));
      }
      if (profile.results.length) {
        await tx.insert(exerciseResults).values(profile.results.slice(-500).map((result) => ({
          id: result.id, profileId: profile.profileId, lessonId: result.lessonId, levelId: result.levelId, errors: result.errors,
          durationSec: result.durationSec, attempts: result.attempts, stars: result.stars, xp: result.xp, accuracy: result.accuracy,
          completedAt: new Date(result.completedAt),
        }))).onConflictDoNothing();
      }
      if (profile.assessments.length) {
        await tx.insert(assessmentResults).values(profile.assessments.slice(-200).map((result) => ({
          id: result.id, profileId: profile.profileId, levelId: result.levelId, grade: result.grade, accuracy: result.accuracy,
          sequenceScore: result.sequenceScore, changeScore: result.changeScore, timingScore: result.timingScore,
          errors: result.errors, durationSec: result.durationSec, passed: result.passed ? 1 : 0, completedAt: new Date(result.completedAt),
        }))).onConflictDoNothing();
      }
      if (profile.achievements.length) {
        await tx.insert(achievements).values(profile.achievements.map((id) => ({ id: `${profile.profileId}:${id}`, profileId: profile.profileId, unlockedAt: timestamp }))).onConflictDoNothing();
      }
      if (profile.customSongs.length) {
        await tx.insert(songs).values(profile.customSongs.slice(-100).map((song) => ({
          id: song.id, profileId: profile.profileId, title: song.title.slice(0, 120), artist: song.artist.slice(0, 120),
          bpm: Math.max(30, Math.min(260, song.bpm)), data: song, createdAt: new Date(song.createdAt),
        }))).onConflictDoNothing();
      }
    });
    return NextResponse.json({ ok: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Progress sync failed", error);
    return NextResponse.json({ error: "Não foi possível sincronizar agora" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) return NextResponse.json({ error: "profileId obrigatório" }, { status: 400 });
  await db.delete(profiles).where(and(eq(profiles.id, profileId)));
  return NextResponse.json({ ok: true });
}
