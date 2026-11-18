"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssessmentResult, CustomSong, ExerciseResult, ProfileState, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/i18n";
import { ACHIEVEMENTS, newlyUnlocked } from "@/lib/scoring";

const STORAGE_KEY = "teclado-master-profile-v1";
const ID_KEY = "teclado-master-profile-id";

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function freshProfile(profileId = makeId()): ProfileState {
  const now = new Date().toISOString();
  return { profileId, settings: { ...DEFAULT_SETTINGS }, xp: 0, results: [], assessments: [], achievements: [], customSongs: [], lastLessonId: null, practiceSeconds: 0, createdAt: now, updatedAt: now };
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saving" | "saved" | "offline" | "error">("loading");
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const localId = localStorage.getItem(ID_KEY) || makeId();
    localStorage.setItem(ID_KEY, localId);
    let localProfile: ProfileState | null = null;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as ProfileState;
        if (parsed.profileId === localId) localProfile = { ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      }
    } catch { localProfile = null; }
    const initial = localProfile ?? freshProfile(localId);
    setProfile(initial);
    hydratedRef.current = true;
    fetch(`/api/progress?profileId=${encodeURIComponent(localId)}`)
      .then((response) => response.ok ? response.json() as Promise<{ profile: ProfileState | null }> : Promise.reject(new Error("sync")))
      .then(({ profile: remote }) => {
        if (cancelled || !remote) return;
        const merged = { ...remote, settings: { ...DEFAULT_SETTINGS, ...remote.settings } };
        const useRemote = new Date(merged.updatedAt).getTime() > new Date(initial.updatedAt).getTime();
        if (useRemote) setProfile(merged);
        setSyncStatus("saved");
      })
      .catch(() => { if (!cancelled) setSyncStatus(navigator.onLine ? "error" : "offline"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profile || !hydratedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(ID_KEY, profile.profileId);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (!navigator.onLine) { setSyncStatus("offline"); return; }
      setSyncStatus("saving");
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile, reset: resetRef.current }) })
        .then((response) => { if (!response.ok) throw new Error("sync"); resetRef.current = false; setSyncStatus("saved"); })
        .catch(() => setSyncStatus(navigator.onLine ? "error" : "offline"));
    }, 850);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [profile]);

  const commit = useCallback((updater: (current: ProfileState) => ProfileState) => {
    setProfile((current) => current ? { ...updater(current), updatedAt: new Date().toISOString() } : current);
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    commit((current) => ({ ...current, settings: { ...current.settings, ...patch } }));
  }, [commit]);

  const applyAchievements = useCallback((current: ProfileState): ProfileState => {
    const unlocked = newlyUnlocked(current);
    if (!unlocked.length) return current;
    const bonus = unlocked.reduce((sum, id) => sum + (ACHIEVEMENTS.find((achievement) => achievement.id === id)?.xp ?? 0), 0);
    return { ...current, achievements: [...current.achievements, ...unlocked], xp: current.xp + bonus };
  }, []);

  const recordExercise = useCallback((result: ExerciseResult, lessonId: string) => {
    commit((current) => applyAchievements({
      ...current, results: [...current.results, result], xp: current.xp + result.xp, lastLessonId: lessonId,
      practiceSeconds: current.practiceSeconds + Math.round(result.durationSec),
    }));
  }, [applyAchievements, commit]);

  const recordAssessment = useCallback((result: AssessmentResult) => {
    commit((current) => applyAchievements({
      ...current, assessments: [...current.assessments, result], xp: current.xp + (result.passed ? result.levelId * 120 : 25),
      practiceSeconds: current.practiceSeconds + Math.round(result.durationSec),
    }));
  }, [applyAchievements, commit]);

  const addCustomSong = useCallback((song: CustomSong) => {
    commit((current) => ({ ...current, customSongs: [...current.customSongs.filter((item) => item.id !== song.id), song] }));
  }, [commit]);

  const recordSongPractice = useCallback((seconds: number, xp: number) => {
    commit((current) => ({ ...current, xp: current.xp + Math.max(0, Math.round(xp)), practiceSeconds: current.practiceSeconds + Math.max(0, Math.round(seconds)) }));
  }, [commit]);

  const setLastLesson = useCallback((lessonId: string) => commit((current) => ({ ...current, lastLessonId: lessonId })), [commit]);

  const resetProgress = useCallback(() => {
    resetRef.current = true;
    commit((current) => ({ ...freshProfile(current.profileId), settings: current.settings, createdAt: current.createdAt }));
  }, [commit]);

  return { profile, syncStatus, updateSettings, recordExercise, recordAssessment, recordSongPractice, addCustomSong, setLastLesson, resetProgress };
}
