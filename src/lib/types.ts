export type Language = "pt-BR" | "en";
export type ThemeName = "nebula" | "midnight" | "contrast";
export type InputMode = "auto" | "midi" | "microphone" | "touch";
export type Screen = "splash" | "home" | "levels" | "lesson" | "songs" | "progress" | "settings" | "assessment" | "theory";

export interface Settings {
  language: Language;
  theme: ThemeName;
  inputMode: InputMode;
  masterVolume: number;
  metronomeVolume: number;
  micSensitivity: number;
  noiseGate: number;
  sustainMs: number;
  showNoteNames: boolean;
  showFingerNumbers: boolean;
  reducedMotion: boolean;
  username: string;
}

export interface ExerciseResult {
  id: string;
  lessonId: string;
  levelId: number;
  errors: number;
  durationSec: number;
  attempts: number;
  stars: 1 | 2 | 3;
  xp: number;
  accuracy: number;
  completedAt: string;
}

export interface AssessmentResult {
  id: string;
  levelId: number;
  grade: number;
  accuracy: number;
  sequenceScore: number;
  changeScore: number;
  timingScore: number;
  errors: number;
  durationSec: number;
  passed: boolean;
  completedAt: string;
}

export interface SongSection {
  name: string;
  chords: string[];
  bars: number;
}

export interface CustomSong {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  sections: SongSection[];
  createdAt: string;
  imported: boolean;
  description?: string;
  level?: number;
}

export interface ProfileState {
  profileId: string;
  settings: Settings;
  xp: number;
  results: ExerciseResult[];
  assessments: AssessmentResult[];
  achievements: string[];
  customSongs: CustomSong[];
  lastLessonId: string | null;
  practiceSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFeedback {
  expected: number[];
  detected: number[];
  missing: number[];
  incorrect: number[];
  correct: number[];
}

export interface AudioStatus {
  state: "idle" | "requesting" | "listening" | "calibrating" | "denied" | "unsupported" | "error";
  message?: string;
  inputLevel: number;
  detectedFrequency?: number;
}

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  connected: boolean;
}
