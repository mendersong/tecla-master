import type { AssessmentResult, ExerciseResult, ProfileState } from "./types";

export function exerciseStars(errors: number, durationSec: number, estimatedSec: number, attempts: number): 1 | 2 | 3 {
  if (errors === 0 && durationSec <= estimatedSec) return 3;
  if (errors <= Math.max(2, attempts * 0.5) && durationSec <= estimatedSec * 1.65) return 2;
  return 1;
}

export function assessmentAreas(result: Pick<AssessmentResult, "accuracy" | "sequenceScore" | "changeScore" | "timingScore">, language: "pt-BR" | "en") {
  const labels = language === "pt-BR"
    ? { accuracy: "Precisão de notas e acordes", sequence: "Ordem da sequência", changes: "Mudanças de acorde", timing: "Andamento e regularidade" }
    : { accuracy: "Note and chord accuracy", sequence: "Sequence order", changes: "Chord changes", timing: "Timing and regularity" };
  const entries = [
    { key: "accuracy" as const, score: result.accuracy },
    { key: "sequence" as const, score: result.sequenceScore },
    { key: "changes" as const, score: result.changeScore },
    { key: "timing" as const, score: result.timingScore },
  ];
  return {
    mastered: entries.filter((entry) => entry.score >= 0.75).map((entry) => labels[entry.key]),
    improve: entries.filter((entry) => entry.score < 0.75).map((entry) => labels[entry.key]),
  };
}

export const ACHIEVEMENTS = [
  { id: "first-note", titlePt: "Primeira nota", titleEn: "First note", descriptionPt: "Conclua sua primeira aula prática.", descriptionEn: "Complete your first practical lesson.", xp: 50 },
  { id: "clean-chord", titlePt: "Mão limpa", titleEn: "Clean hands", descriptionPt: "Ganhe 3 estrelas sem nenhum erro.", descriptionEn: "Earn 3 stars with no errors.", xp: 100 },
  { id: "chapter-one", titlePt: "A chave de Dó", titleEn: "The key of C", descriptionPt: "Seja aprovado no primeiro capítulo.", descriptionEn: "Pass the first chapter.", xp: 200 },
  { id: "five-stars", titlePt: "Constelação", "titleEn": "Constellation", descriptionPt: "Acumule 15 estrelas.", descriptionEn: "Collect 15 stars.", xp: 150 },
  { id: "dedicated", titlePt: "Dedicação", titleEn: "Dedication", descriptionPt: "Complete dez exercícios práticos.", descriptionEn: "Complete ten practical exercises.", xp: 150 },
  { id: "harmonist", titlePt: "Harmonista", titleEn: "Harmonist", descriptionPt: "Passe na avaliação do Nível 4.", descriptionEn: "Pass the Level 4 assessment.", xp: 300 },
  { id: "master", titlePt: "Teclado Master", titleEn: "Keyboard Master", descriptionPt: "Conclua os cinco capítulos com aprovação.", descriptionEn: "Complete all five chapters with a pass.", xp: 500 },
] as const;

export function newlyUnlocked(profile: ProfileState): string[] {
  const stars = profile.results.reduce((total, result) => total + result.stars, 0);
  const passed = new Set(profile.assessments.filter((assessment) => assessment.passed).map((assessment) => assessment.levelId));
  const checks: Record<string, boolean> = {
    "first-note": profile.results.length >= 1,
    "clean-chord": profile.results.some((result) => result.stars === 3 && result.errors === 0),
    "chapter-one": passed.has(1),
    "five-stars": stars >= 15,
    dedicated: profile.results.length >= 10,
    harmonist: passed.has(4),
    master: [1, 2, 3, 4, 5].every((level) => passed.has(level)),
  };
  return ACHIEVEMENTS.filter((achievement) => checks[achievement.id] && !profile.achievements.includes(achievement.id)).map((achievement) => achievement.id);
}

export function overallAverage(profile: ProfileState): number {
  if (!profile.assessments.length) return 0;
  const best = new Map<number, number>();
  profile.assessments.forEach((assessment) => best.set(assessment.levelId, Math.max(best.get(assessment.levelId) ?? 0, assessment.grade)));
  const grades = [...best.values()];
  return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
}

export function completedLessonIds(profile: ProfileState): Set<string> {
  return new Set(profile.results.map((result) => result.lessonId));
}

export function isLevelUnlocked(profile: ProfileState, levelId: number): boolean {
  if (levelId === 1) return true;
  return profile.assessments.some((assessment) => assessment.levelId === levelId - 1 && assessment.passed);
}

export function isLessonUnlocked(profile: ProfileState, lessonId: string, levelId: number, order: number, previousLessonId?: string): boolean {
  if (!isLevelUnlocked(profile, levelId)) return false;
  if (order === 1) return true;
  return previousLessonId ? completedLessonIds(profile).has(previousLessonId) : profile.results.some((result) => result.lessonId === lessonId);
}

export function resultForLesson(results: ExerciseResult[], lessonId: string): ExerciseResult | undefined {
  return results.filter((result) => result.lessonId === lessonId).sort((a, b) => b.stars - a.stars || a.errors - b.errors)[0];
}
