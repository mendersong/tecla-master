"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, AudioWaveform, BookOpen, CheckCircle2, Cloud, CloudOff, Music2, Play, Settings2, Sparkles, Star, Trophy, WifiOff } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { usePerformanceInput } from "@/hooks/use-performance-input";
import { DEFAULT_SETTINGS } from "@/lib/i18n";
import { ALL_LESSONS, ASSESSMENTS, LEVELS } from "@/lib/curriculum";
import type { Language, Screen } from "@/lib/types";
import { AppNavigation, Logo } from "./ui";
import { HomeScreen, LevelsScreen, ProgressScreen, SettingsScreen, TheoryScreen, findNextLesson } from "./screens";
import { PracticeView } from "./practice-view";
import { SongStudio } from "./song-studio";

export default function TecladoMaster() {
  const { profile, syncStatus, updateSettings, recordExercise, recordAssessment, recordSongPractice, addCustomSong, setLastLesson, resetProgress } = useProfile();
  const settings = profile?.settings ?? DEFAULT_SETTINGS;
  const input = usePerformanceInput(settings);
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedLessonId, setSelectedLessonId] = useState("l1-mapa");
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [assessmentLevel, setAssessmentLevel] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const navigate = useCallback((destination: Screen) => {
    setScreen(destination);
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? "auto" : "smooth" });
  }, [settings.reducedMotion]);

  const openLesson = useCallback((lessonId: string) => {
    const lesson = ALL_LESSONS.find((item) => item.id === lessonId);
    if (!lesson) return;
    setSelectedLessonId(lessonId);
    setSelectedLevel(lesson.levelId);
    setLastLesson(lessonId);
    setScreen("lesson");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [setLastLesson]);

  const openAssessment = useCallback((levelId: number) => {
    setAssessmentLevel(levelId);
    setSelectedLevel(levelId);
    setScreen("assessment");
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion);
    document.documentElement.lang = settings.language;
  }, [settings.theme, settings.reducedMotion, settings.language]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  if (!profile || screen === "splash") return <Splash profileLoaded={!!profile} language={settings.language} reducedMotion={settings.reducedMotion} onLanguage={(language) => updateSettings({ language })} onStart={() => setScreen("home")} />;

  const lesson = ALL_LESSONS.find((item) => item.id === selectedLessonId) ?? ALL_LESSONS[0];
  const assessment = ASSESSMENTS.find((item) => item.levelId === assessmentLevel) ?? ASSESSMENTS[0];
  const totalStars = profile.results.reduce((sum, result) => sum + result.stars, 0);
  const pt = settings.language === "pt-BR";

  return (
    <div className={`app-shell theme-${settings.theme}`}>
      <div className="ambient-background" aria-hidden="true"><i /><i /><i /></div>
      <header className="topbar">
        <button className="logo-button" onClick={() => navigate("home")}><Logo compact /></button>
        <nav className="desktop-nav" aria-label="Navegação principal">
          <button className={screen === "home" ? "active" : ""} onClick={() => navigate("home")}>{pt ? "Início" : "Home"}</button>
          <button className={["levels", "lesson", "assessment"].includes(screen) ? "active" : ""} onClick={() => navigate("levels")}>{pt ? "Aprender" : "Learn"}</button>
          <button className={screen === "songs" ? "active" : ""} onClick={() => navigate("songs")}>{pt ? "Músicas" : "Songs"}</button>
          <button className={screen === "theory" ? "active" : ""} onClick={() => navigate("theory")}>{pt ? "Acordes" : "Chords"}</button>
          <button className={screen === "progress" ? "active" : ""} onClick={() => navigate("progress")}>{pt ? "Progresso" : "Progress"}</button>
        </nav>
        <div className="topbar-actions"><span className="sync-indicator" title={pt ? "Estado da sincronização" : "Sync status"}>{syncStatus === "offline" ? <CloudOff size={15} /> : <Cloud size={15} />}<i className={syncStatus} /></span><span className="topbar-stat gold"><Star size={17} fill="currentColor" /><strong>{totalStars}</strong></span><span className="topbar-stat xp"><small>XP</small><strong>{profile.xp.toLocaleString()}</strong></span><button className={`icon-button ${screen === "settings" ? "active" : ""}`} onClick={() => navigate("settings")} aria-label={pt ? "Ajustes" : "Settings"}><Settings2 size={20} /></button></div>
      </header>
      <main className={`app-main screen-${screen}`}>
        {screen === "home" && <HomeScreen profile={profile} navigate={navigate} onLesson={openLesson} onAssessment={openAssessment} />}
        {screen === "levels" && <LevelsScreen profile={profile} selectedLevel={selectedLevel} onSelectedLevel={setSelectedLevel} onLesson={openLesson} onAssessment={openAssessment} />}
        {screen === "lesson" && <PracticeView key={lesson.id} lesson={lesson} settings={settings} input={input} onInputMode={(inputMode) => updateSettings({ inputMode })} onExerciseComplete={(result) => { recordExercise(result, lesson.id); setToast(pt ? `Prática salva · +${result.xp} XP` : `Practice saved · +${result.xp} XP`); }} onAssessmentComplete={recordAssessment} onExit={() => navigate("levels")} onContinue={openAssessment} />}
        {screen === "assessment" && <PracticeView key={`assessment-${assessment.levelId}`} assessment={assessment} settings={settings} input={input} onInputMode={(inputMode) => updateSettings({ inputMode })} onExerciseComplete={() => undefined} onAssessmentComplete={(result) => { recordAssessment(result); setToast(result.passed ? (pt ? "Capítulo aprovado e progresso salvo!" : "Chapter passed and progress saved!") : (pt ? "Avaliação salva. Revise e tente novamente." : "Assessment saved. Review and try again.")); }} onExit={() => navigate("levels")} onContinue={(level) => { setSelectedLevel(Math.min(5, level + 1)); navigate("levels"); }} />}
        {screen === "songs" && <SongStudio songs={profile.customSongs} settings={settings} input={input} onInputMode={(inputMode) => updateSettings({ inputMode })} onImport={addCustomSong} onPractice={recordSongPractice} />}
        {screen === "progress" && <ProgressScreen profile={profile} onNext={() => openLesson(findNextLesson(profile).id)} onLevel={(level) => { setSelectedLevel(level); navigate("levels"); }} />}
        {screen === "settings" && <SettingsScreen profile={profile} input={input} syncStatus={syncStatus} onSettings={updateSettings} onReset={() => { resetProgress(); setToast(pt ? "Progresso apagado. Preferências preservadas." : "Progress erased. Preferences preserved."); }} />}
        {screen === "theory" && <TheoryScreen settings={settings} input={input} onInputMode={(inputMode) => updateSettings({ inputMode })} />}
      </main>
      <AppNavigation screen={screen} navigate={navigate} labels={{ home: pt ? "Início" : "Home", levels: pt ? "Níveis" : "Levels", songs: pt ? "Músicas" : "Songs", progress: pt ? "Progresso" : "Progress", settings: pt ? "Ajustes" : "Settings" }} />
      {toast && <div className="toast" role="status"><CheckCircle2 size={19} /><span>{toast}</span></div>}
    </div>
  );
}

function Splash({ profileLoaded, language, reducedMotion, onLanguage, onStart }: { profileLoaded: boolean; language: Language; reducedMotion: boolean; onLanguage: (language: Language) => void; onStart: () => void }) {
  const pt = language === "pt-BR";
  return (
    <main className={`splash-screen ${reducedMotion ? "reduced" : ""}`}>
      <div className="splash-art" /><div className="splash-noise" /><div className="splash-orb orb-one" /><div className="splash-orb orb-two" />
      <div className="splash-top"><Logo /><div className="splash-language"><GlobeIcon /><button className={language === "pt-BR" ? "active" : ""} onClick={() => onLanguage("pt-BR")}>PT</button><button className={language === "en" ? "active" : ""} onClick={() => onLanguage("en")}>EN</button></div></div>
      <section className="splash-content">
        <div className="splash-kicker"><span><AudioWaveform size={16} /></span>{pt ? "SEU TECLADO. SEU RITMO. SUA EVOLUÇÃO." : "YOUR KEYBOARD. YOUR PACE. YOUR EVOLUTION."}</div>
        <h1><span>TECLADO</span><strong>MASTER</strong></h1>
        <p className="splash-tagline">{pt ? "Aprenda" : "Learn"} <i /> {pt ? "Pratique" : "Practise"} <i /> {pt ? "Evolua" : "Evolve"}</p>
        <p className="splash-description">{pt ? "Seu professor particular de teclado, na palma da sua mão. Aprenda por cifras, toque de verdade e evolua com feedback em tempo real." : "Your personal keyboard teacher, in the palm of your hand. Learn through chord symbols, play for real and evolve with real-time feedback."}</p>
        <button className="splash-start" disabled={!profileLoaded} onClick={onStart}><span className="splash-play"><Play size={24} fill="currentColor" /></span><strong>{profileLoaded ? (pt ? "Começar Agora" : "Start Now") : (pt ? "Preparando seu estúdio..." : "Preparing your studio...")}</strong><ArrowRight size={22} /></button>
        <div className="splash-features"><span><Music2 size={17} />{pt ? "30 aulas por cifras" : "30 chord-symbol lessons"}</span><span><AudioWaveform size={17} />{pt ? "Microfone + USB MIDI" : "Microphone + USB MIDI"}</span><span><Trophy size={17} />{pt ? "Progresso por desempenho" : "Performance-based progress"}</span></div>
      </section>
      <div className="splash-floating-note note-one"><Music2 /></div><div className="splash-floating-note note-two"><Sparkles /></div>
      <footer className="splash-footer"><span><WifiOff size={14} />{pt ? "Núcleo de aprendizagem disponível offline" : "Core learning available offline"}</span><span>v1.0 · PT-BR / EN</span></footer>
    </main>
  );
}

function GlobeIcon() { return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>; }
