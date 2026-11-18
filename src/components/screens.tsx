"use client";

import { useMemo, useState } from "react";
import { Activity, ArrowRight, Award, BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, Clock3, Cloud, CloudOff, Download, Gauge, Globe2, GraduationCap, Headphones, KeyboardMusic, Languages, LockKeyhole, Medal, Music2, Palette, Play, RotateCcw, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Star, Trophy, Usb, Volume2, Waves, X } from "lucide-react";
import { ACHIEVEMENTS, completedLessonIds, isLevelUnlocked, isLessonUnlocked, overallAverage, resultForLesson } from "@/lib/scoring";
import { ALL_LESSONS, LEVELS, type Lesson, local } from "@/lib/curriculum";
import type { Language, ProfileState, Screen, Settings } from "@/lib/types";
import { CHORD_TYPES, NOTE_NAMES, buildChord, harmonicField, parseChord, pitchClassLabel, transposeSymbol } from "@/lib/music";
import type { usePerformanceInput } from "@/hooks/use-performance-input";
import { InputPanel } from "./input-panel";
import { Piano } from "./piano";
import { LevelPill, Locked, ProgressRing, ScreenHeading, Stars } from "./ui";

export function findNextLesson(profile: ProfileState): Lesson {
  const completed = completedLessonIds(profile);
  for (const level of LEVELS) {
    if (!isLevelUnlocked(profile, level.id)) continue;
    const next = level.lessons.find((lesson, index) => !completed.has(lesson.id) && isLessonUnlocked(profile, lesson.id, level.id, lesson.order, level.lessons[index - 1]?.id));
    if (next) return next;
    const chapterPassed = profile.assessments.some((assessment) => assessment.levelId === level.id && assessment.passed);
    if (!chapterPassed) return level.lessons[level.lessons.length - 1];
  }
  return LEVELS[LEVELS.length - 1].lessons[5];
}

export function HomeScreen({ profile, navigate, onLesson, onAssessment }: { profile: ProfileState; navigate: (screen: Screen) => void; onLesson: (id: string) => void; onAssessment: (level: number) => void }) {
  const language = profile.settings.language;
  const pt = language === "pt-BR";
  const completed = completedLessonIds(profile);
  const next = findNextLesson(profile);
  const nextLevel = LEVELS[next.levelId - 1];
  const totalStars = profile.results.reduce((sum, result) => sum + result.stars, 0);
  const progress = completed.size / ALL_LESSONS.length;
  const allCurrentDone = nextLevel.lessons.every((lesson) => completed.has(lesson.id));
  return (
    <div className="home-screen page-enter">
      <section className="home-hero">
        <div className="home-hero-image" />
        <div className="home-hero-glow" />
        <div className="home-hero-copy">
          <span className="eyebrow"><span className="live-dot" />{pt ? "SUA JORNADA MUSICAL" : "YOUR MUSICAL JOURNEY"}</span>
          <h1>{pt ? "Olá" : "Hello"}, <span>{profile.settings.username || (pt ? "Músico" : "Musician")}!</span></h1>
          <p>{pt ? "Continue sua jornada musical!" : "Continue your musical journey!"}</p>
          <div className="home-progress-row"><span>{pt ? "Seu progresso" : "Your progress"}</span><div className="linear-progress"><i style={{ width: `${progress * 100}%` }} /></div><strong>{Math.round(progress * 100)}%</strong></div>
          <button className="primary-button hero-continue" onClick={() => allCurrentDone ? onAssessment(next.levelId) : onLesson(next.id)}><Play size={22} fill="currentColor" /><span>{pt ? "Continuar Aprendendo" : "Continue Learning"}<small>{allCurrentDone ? (pt ? `Avaliação · Nível ${next.levelId}` : `Assessment · Level ${next.levelId}`) : `${next.levelId}.${next.order} · ${local(next.title, language)}`}</small></span><ArrowRight size={22} /></button>
        </div>
        <div className="hero-stat"><Star size={17} fill="currentColor" /><strong>{totalStars}</strong><span>{pt ? "estrelas" : "stars"}</span></div>
      </section>

      <div className="home-shortcuts">
        <button className="shortcut-card blue" onClick={() => navigate("levels")}><span><BarChart3 /></span><strong>{pt ? "Escolher Nível" : "Choose Level"}</strong><small>{completed.size}/{ALL_LESSONS.length} {pt ? "aulas" : "lessons"}</small><ChevronRight size={18} /></button>
        <button className="shortcut-card purple" onClick={() => navigate("songs")}><span><Music2 /></span><strong>{pt ? "Aprender Músicas" : "Learn Songs"}</strong><small>{pt ? "Palco e cifras" : "Stage and chords"}</small><ChevronRight size={18} /></button>
        <button className="shortcut-card orange" onClick={() => navigate("progress")}><span><Trophy /></span><strong>{pt ? "Meu Progresso" : "My Progress"}</strong><small>{profile.xp.toLocaleString()} XP</small><ChevronRight size={18} /></button>
      </div>

      <div className="home-content-grid">
        <section className="next-lesson-card">
          <div className="section-title"><div><span className="eyebrow">{pt ? "PRÓXIMO DESAFIO" : "NEXT CHALLENGE"}</span><h2>{local(nextLevel.title, language)}</h2></div><LevelPill level={next.levelId} label={pt ? "Nível" : "Level"} /></div>
          <div className="next-lesson-body"><div className="lesson-index">{next.levelId}.{next.order}</div><div><h3>{allCurrentDone ? (pt ? "Avaliação do capítulo" : "Chapter assessment") : local(next.title, language)}</h3><p>{allCurrentDone ? (pt ? "Demonstrе suas habilidades e libere a próxima etapa." : "Demonstrate your skills and unlock the next stage.") : local(next.subtitle, language)}</p><div className="lesson-tags"><span><Clock3 size={14} />{Math.round(next.estimatedSec / 60)} {pt ? "min" : "min"}</span><span><TargetIcon />{next.steps.length} {pt ? "etapas" : "steps"}</span><span><KeyboardMusic size={14} />{next.bpm} BPM</span></div></div><button className="round-arrow" onClick={() => allCurrentDone ? onAssessment(next.levelId) : onLesson(next.id)}><ArrowRight /></button></div>
        </section>
        <section className="practice-quote"><span className="quote-icon"><Headphones size={22} /></span><div><span className="eyebrow">{pt ? "SESSÃO DE HOJE" : "TODAY'S SESSION"}</span><h3>{pt ? "Preciso antes de rápido." : "Accurate before fast."}</h3><p>{pt ? "Uma prática curta e consciente vale mais que velocidade sem controle. Ouça a tônica e prepare a próxima mudança." : "A short, mindful practice is worth more than uncontrolled speed. Hear the root and prepare the next change."}</p></div></section>
      </div>

      <section className="level-journey">
        <div className="section-title"><div><span className="eyebrow">{pt ? "TRILHA COMPLETA" : "COMPLETE PATH"}</span><h2>{pt ? "Do primeiro Dó ao improviso" : "From first C to improvisation"}</h2></div><button className="text-button" onClick={() => navigate("levels")}>{pt ? "Ver trilha" : "View path"}<ArrowRight size={16} /></button></div>
        <div className="journey-track">{LEVELS.map((level) => { const done = level.lessons.filter((lesson) => completed.has(lesson.id)).length; const unlocked = isLevelUnlocked(profile, level.id); return <button key={level.id} onClick={() => unlocked && navigate("levels")} className={`${unlocked ? "" : "locked"}`}><span className="journey-number" style={{ "--level-color": level.color } as React.CSSProperties}>{unlocked ? level.id : <LockKeyhole size={17} />}</span><div><strong>{local(level.title, language)}</strong><span>{done}/6 {pt ? "aulas" : "lessons"}</span></div><div className="mini-progress"><i style={{ width: `${done / 6 * 100}%`, background: level.color }} /></div></button>; })}</div>
      </section>
      <button className="lab-banner" onClick={() => navigate("theory")}><span><Waves /></span><div><small>{pt ? "EXPLORAÇÃO LIVRE" : "FREE EXPLORATION"}</small><strong>{pt ? "Laboratório de Acordes" : "Chord Lab"}</strong><p>{pt ? "Construa, ouça, inverta e transporte qualquer cifra." : "Build, hear, invert and transpose any chord symbol."}</p></div><ArrowRight /></button>
    </div>
  );
}

function TargetIcon() { return <Activity size={14} />; }

export function LevelsScreen({ profile, selectedLevel, onSelectedLevel, onLesson, onAssessment }: { profile: ProfileState; selectedLevel: number; onSelectedLevel: (level: number) => void; onLesson: (id: string) => void; onAssessment: (level: number) => void }) {
  const language = profile.settings.language;
  const pt = language === "pt-BR";
  const completed = completedLessonIds(profile);
  const level = LEVELS[selectedLevel - 1];
  const unlocked = isLevelUnlocked(profile, selectedLevel);
  const allDone = level.lessons.every((lesson) => completed.has(lesson.id));
  const assessments = profile.assessments.filter((item) => item.levelId === selectedLevel);
  const bestGrade = assessments.length ? Math.max(...assessments.map((item) => item.grade)) : null;
  return (
    <div className="levels-screen page-enter">
      <ScreenHeading eyebrow={pt ? "APRENDIZADO PROGRESSIVO" : "PROGRESSIVE LEARNING"} title={pt ? "Sua trilha de aprendizado" : "Your learning path"} subtitle={pt ? "Cinco capítulos, trinta aulas e avaliações práticas obrigatórias." : "Five chapters, thirty lessons and mandatory practical assessments."} />
      <div className="levels-layout">
        <div className="level-selector">{LEVELS.map((item) => { const done = item.lessons.filter((lesson) => completed.has(lesson.id)).length; const isUnlocked = isLevelUnlocked(profile, item.id); const passed = profile.assessments.some((result) => result.levelId === item.id && result.passed); return <button key={item.id} className={`${selectedLevel === item.id ? "selected" : ""} ${!isUnlocked ? "locked" : ""}`} onClick={() => onSelectedLevel(item.id)}><span className="level-selector-number" style={{ background: item.color }}>{passed ? <Check size={20} /> : isUnlocked ? item.id : <LockKeyhole size={17} />}</span><div><strong>{pt ? "Nível" : "Level"} {item.id} — {local(item.title, language)}</strong><span>{isUnlocked ? `${done}/6 ${pt ? "aulas concluídas" : "lessons completed"}` : (pt ? "Capítulo bloqueado" : "Chapter locked")}</span></div>{selectedLevel === item.id ? <ChevronRight size={18} /> : passed ? <CheckCircle2 className="success-icon" size={19} /> : null}</button>; })}</div>
        <section className="chapter-panel">
          <div className="chapter-header" style={{ "--level-color": level.color } as React.CSSProperties}><div><LevelPill level={level.id} label={pt ? "Capítulo" : "Chapter"} /><h2>{local(level.title, language)}</h2><p>{local(level.subtitle, language)}</p></div><div className="chapter-ring"><strong>{level.lessons.filter((lesson) => completed.has(lesson.id)).length}</strong><span>/ 6</span></div></div>
          {!unlocked ? <div className="locked-chapter"><LockKeyhole size={36} /><h3>{pt ? "Este capítulo ainda está bloqueado" : "This chapter is still locked"}</h3><p>{pt ? `Obtenha nota 7,0 ou maior na avaliação do Nível ${level.id - 1} para liberar.` : `Earn a grade of 7.0 or higher in the Level ${level.id - 1} assessment to unlock.`}</p><button className="secondary-button" onClick={() => onSelectedLevel(level.id - 1)}>{pt ? "Ver capítulo anterior" : "View previous chapter"}</button></div> : <>
            <div className="lesson-list">{level.lessons.map((lesson, index) => {
              const result = resultForLesson(profile.results, lesson.id);
              const lessonUnlocked = isLessonUnlocked(profile, lesson.id, level.id, lesson.order, level.lessons[index - 1]?.id);
              return <button key={lesson.id} className={`lesson-row ${result ? "completed" : ""}`} disabled={!lessonUnlocked} onClick={() => onLesson(lesson.id)}><span className="lesson-row-index">{result ? <Check size={18} /> : lessonUnlocked ? `${level.id}.${lesson.order}` : <LockKeyhole size={15} />}</span><div className="lesson-row-copy"><strong>{local(lesson.title, language)}</strong><span>{local(lesson.subtitle, language)}</span><small>{lesson.steps.slice(0, 5).map((step) => step.replace("note:", "").replace(":bass", "")).join(" · ")}{lesson.steps.length > 5 ? " …" : ""}</small></div><div className="lesson-row-meta">{result ? <Stars count={result.stars} size={14} /> : <span>{Math.ceil(lesson.estimatedSec / 60)} min</span>}<ChevronRight size={17} /></div></button>;
            })}</div>
            <button className={`chapter-assessment-card ${allDone ? "unlocked" : ""}`} disabled={!allDone} onClick={() => onAssessment(level.id)}><span className="assessment-mini-icon"><Trophy size={25} /></span><div><span className="eyebrow">{pt ? "AVALIAÇÃO OBRIGATÓRIA" : "MANDATORY ASSESSMENT"}</span><strong>{pt ? "Avaliação do capítulo" : "Chapter assessment"}</strong><p>{allDone ? (pt ? "Precisão 40% · sequência 25% · trocas 20% · tempo 15%" : "Accuracy 40% · sequence 25% · changes 20% · timing 15%") : (pt ? "Conclua as 6 aulas para liberar" : "Complete all 6 lessons to unlock")}</p></div><div className="assessment-grade">{bestGrade !== null ? <><strong>{bestGrade.toFixed(1).replace(".", pt ? "," : ".")}</strong><span>{pt ? "melhor nota" : "best grade"}</span></> : allDone ? <Play size={22} /> : <LockKeyhole size={20} />}</div></button>
          </>}
        </section>
      </div>
    </div>
  );
}

export function ProgressScreen({ profile, onNext, onLevel }: { profile: ProfileState; onNext: () => void; onLevel: (level: number) => void }) {
  const language = profile.settings.language;
  const pt = language === "pt-BR";
  const completed = completedLessonIds(profile);
  const average = overallAverage(profile);
  const totalStars = profile.results.reduce((sum, result) => sum + result.stars, 0);
  const passed = new Set(profile.assessments.filter((result) => result.passed).map((result) => result.levelId));
  const next = findNextLesson(profile);
  const history = [...profile.assessments].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  return (
    <div className="progress-screen page-enter"><ScreenHeading eyebrow={pt ? "EVOLUÇÃO REAL" : "REAL EVOLUTION"} title={pt ? "Seu Progresso" : "Your Progress"} subtitle={pt ? "Cada número vem das suas práticas e avaliações." : "Every number comes from your practice and assessments."} />
      <div className="progress-overview"><section className="evolution-card"><ProgressRing value={average / 10} label={average ? average.toFixed(1).replace(".", pt ? "," : ".") : "—"} sublabel={pt ? "Média Geral" : "Overall Average"} size={158} /><div><span className="eyebrow">{pt ? "SUA EVOLUÇÃO" : "YOUR EVOLUTION"}</span><h2>{passed.size ? (pt ? `${passed.size} de 5 capítulos aprovados` : `${passed.size} of 5 chapters passed`) : (pt ? "Sua jornada começou" : "Your journey has begun")}</h2><p>{pt ? "A média usa sua melhor nota em cada capítulo avaliado." : "The average uses your best grade in each assessed chapter."}</p><Stars count={Math.min(3, Math.round(average / 10 * 3))} size={22} /></div></section><div className="progress-stat-grid"><div><GraduationCap /><strong>{completed.size}</strong><span>{pt ? "Aulas" : "Lessons"}</span></div><div><Star /><strong>{totalStars}</strong><span>{pt ? "Estrelas" : "Stars"}</span></div><div><Clock3 /><strong>{Math.floor(profile.practiceSeconds / 3600)}h{Math.floor(profile.practiceSeconds % 3600 / 60).toString().padStart(2, "0")}</strong><span>{pt ? "Tempo" : "Time"}</span></div><div><Trophy /><strong>{passed.size}</strong><span>{pt ? "Capítulos" : "Chapters"}</span></div><div className="xp-stat"><Sparkles /><strong>{profile.xp.toLocaleString()}</strong><span>XP</span></div></div></div>
      <div className="progress-main-grid"><section className="progress-levels"><div className="section-title"><h2>{pt ? "Capítulos" : "Chapters"}</h2><span>{completed.size}/30</span></div>{LEVELS.map((level) => { const count = level.lessons.filter((lesson) => completed.has(lesson.id)).length; const unlocked = isLevelUnlocked(profile, level.id); const best = profile.assessments.filter((result) => result.levelId === level.id).reduce((max, result) => Math.max(max, result.grade), 0); return <button key={level.id} onClick={() => onLevel(level.id)}><span className="level-selector-number" style={{ background: level.color }}>{passed.has(level.id) ? <Check size={18} /> : unlocked ? level.id : <LockKeyhole size={15} />}</span><div><strong>{local(level.title, language)}</strong><span>{count}/6 {pt ? "aulas" : "lessons"}</span><div className="mini-progress"><i style={{ width: `${count / 6 * 100}%`, background: level.color }} /></div></div><div className="level-progress-grade">{best > 0 ? best.toFixed(1) : unlocked ? <ChevronRight size={17} /> : <Locked label={pt ? "Bloqueado" : "Locked"} />}</div></button>; })}</section><section className="achievements-panel"><div className="section-title"><h2>{pt ? "Conquistas" : "Achievements"}</h2><span>{profile.achievements.length}/{ACHIEVEMENTS.length}</span></div><div className="achievement-grid">{ACHIEVEMENTS.map((achievement) => { const unlocked = profile.achievements.includes(achievement.id); return <div key={achievement.id} className={unlocked ? "unlocked" : ""}><span>{unlocked ? <Medal size={23} /> : <LockKeyhole size={18} />}</span><strong>{pt ? achievement.titlePt : achievement.titleEn}</strong><p>{pt ? achievement.descriptionPt : achievement.descriptionEn}</p><small>+{achievement.xp} XP</small></div>; })}</div></section></div>
      <section className="assessment-history"><div className="section-title"><h2>{pt ? "Histórico de avaliações" : "Assessment history"}</h2><span>{history.length} {pt ? "registros" : "records"}</span></div>{history.length ? <div className="history-table"><div className="history-head"><span>{pt ? "Capítulo" : "Chapter"}</span><span>{pt ? "Data" : "Date"}</span><span>{pt ? "Precisão" : "Accuracy"}</span><span>{pt ? "Erros" : "Errors"}</span><span>{pt ? "Nota" : "Grade"}</span></div>{history.slice(0, 10).map((result) => <div key={result.id}><span>{pt ? "Nível" : "Level"} {result.levelId}</span><span>{new Intl.DateTimeFormat(language, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(result.completedAt))}</span><span>{Math.round(result.accuracy * 100)}%</span><span>{result.errors}</span><strong className={result.passed ? "grade-pass" : "grade-fail"}>{result.grade.toFixed(1)}</strong></div>)}</div> : <div className="empty-state"><BarChart3 size={30} /><p>{pt ? "Sua primeira avaliação ainda está esperando." : "Your first assessment is still waiting."}</p></div>}</section>
      <button className="next-challenge-banner" onClick={onNext}><Trophy size={30} /><div><span>{pt ? "PRÓXIMO DESAFIO" : "NEXT CHALLENGE"}</span><strong>{next.levelId}.{next.order} · {local(next.title, language)}</strong></div><ArrowRight /></button>
    </div>
  );
}

export function SettingsScreen({ profile, input, syncStatus, onSettings, onReset }: { profile: ProfileState; input: ReturnType<typeof usePerformanceInput>; syncStatus: string; onSettings: (patch: Partial<Settings>) => void; onReset: () => void }) {
  const { settings } = profile;
  const language = settings.language;
  const pt = language === "pt-BR";
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="settings-screen page-enter"><ScreenHeading eyebrow={pt ? "PREFERÊNCIAS" : "PREFERENCES"} title={pt ? "Ajustes" : "Settings"} subtitle={pt ? "Configure seu aprendizado sem perder nenhum resultado." : "Configure your learning without losing any results."} />
      <div className="settings-grid">
        <section className="settings-card language-card"><div className="settings-card-title"><Languages /><div><h2>{pt ? "Idioma do aplicativo" : "App language"}</h2><p>{pt ? "Menus, aulas e avaliações seguem sua escolha." : "Menus, lessons and assessments follow your choice."}</p></div></div><div className="language-options"><button className={settings.language === "pt-BR" ? "selected" : ""} onClick={() => onSettings({ language: "pt-BR" })}><span>PT</span><div><strong>Português (Brasil)</strong><small>{pt ? "Idioma padrão" : "Default language"}</small></div>{settings.language === "pt-BR" && <CheckCircle2 />}</button><button className={settings.language === "en" ? "selected" : ""} onClick={() => onSettings({ language: "en" })}><span>EN</span><div><strong>English</strong><small>International</small></div>{settings.language === "en" && <CheckCircle2 />}</button></div><p className="settings-note"><ShieldCheck size={15} />{pt ? "A troca preserva notas, estrelas, XP e progresso." : "Changing preserves grades, stars, XP and progress."}</p><label className="field-label">{pt ? "Nome do músico" : "Musician name"}<input value={settings.username} maxLength={40} onChange={(event) => onSettings({ username: event.target.value })} placeholder={pt ? "Como quer ser chamado?" : "What should we call you?"} /></label></section>
        <section className="settings-card"><div className="settings-card-title"><SlidersHorizontal /><div><h2>{pt ? "Áudio e reconhecimento" : "Audio and recognition"}</h2><p>{pt ? "Microfone real, MIDI nativo do navegador e prioridade automática." : "Real microphone, native browser MIDI and automatic priority."}</p></div></div><InputPanel input={input} settings={settings} language={language} onInputMode={(inputMode) => onSettings({ inputMode })} onCalibrate={input.calibrate} /><RangeSetting label={pt ? "Sensibilidade do microfone" : "Microphone sensitivity"} value={settings.micSensitivity} onChange={(micSensitivity) => onSettings({ micSensitivity })} /><RangeSetting label={pt ? "Filtro de ruído" : "Noise gate"} value={settings.noiseGate} onChange={(noiseGate) => onSettings({ noiseGate })} /><RangeSetting label={pt ? "Sustentação da detecção" : "Detection sustain"} value={settings.sustainMs / 500} display={`${settings.sustainMs} ms`} onChange={(value) => onSettings({ sustainMs: Math.round(value * 500) })} /><RangeSetting label={pt ? "Volume do teclado" : "Keyboard volume"} value={settings.masterVolume} onChange={(masterVolume) => onSettings({ masterVolume })} /><RangeSetting label={pt ? "Volume do metrônomo" : "Metronome volume"} value={settings.metronomeVolume} onChange={(metronomeVolume) => onSettings({ metronomeVolume })} /></section>
        <section className="settings-card"><div className="settings-card-title"><Palette /><div><h2>{pt ? "Interface e acessibilidade" : "Interface and accessibility"}</h2><p>{pt ? "Tema escuro, contraste e movimento sob controle." : "Dark theme, contrast and motion under your control."}</p></div></div><span className="field-label">{pt ? "Tema" : "Theme"}</span><div className="theme-options">{(["nebula", "midnight", "contrast"] as const).map((theme) => <button key={theme} className={`${theme} ${settings.theme === theme ? "selected" : ""}`} onClick={() => onSettings({ theme })}><i /><span>{theme === "nebula" ? "Nebula" : theme === "midnight" ? "Midnight" : (pt ? "Alto contraste" : "High contrast")}</span>{settings.theme === theme && <Check size={15} />}</button>)}</div><ToggleSetting label={pt ? "Mostrar nomes nas teclas" : "Show note names on keys"} value={settings.showNoteNames} onChange={(showNoteNames) => onSettings({ showNoteNames })} /><ToggleSetting label={pt ? "Mostrar digitação sugerida" : "Show suggested fingering"} value={settings.showFingerNumbers} onChange={(showFingerNumbers) => onSettings({ showFingerNumbers })} /><ToggleSetting label={pt ? "Reduzir animações" : "Reduce motion"} value={settings.reducedMotion} onChange={(reducedMotion) => onSettings({ reducedMotion })} /></section>
        <section className="settings-card data-card"><div className="settings-card-title">{syncStatus === "offline" ? <CloudOff /> : <Cloud />}<div><h2>{pt ? "Dados e sincronização" : "Data and sync"}</h2><p>{pt ? "Progresso local imediato e cópia segura no PostgreSQL quando online." : "Immediate local progress and a safe PostgreSQL copy when online."}</p></div></div><div className={`sync-status ${syncStatus}`}><span className="live-dot" /><strong>{syncStatus === "saving" ? (pt ? "Sincronizando..." : "Syncing...") : syncStatus === "offline" ? (pt ? "Offline · alterações salvas neste dispositivo" : "Offline · changes saved on this device") : syncStatus === "error" ? (pt ? "Sincronização pendente" : "Sync pending") : (pt ? "Progresso salvo e sincronizado" : "Progress saved and synced")}</strong></div><div className="native-deliverable"><KeyboardMusic size={24} /><div><strong>TECLADO MASTER · Android</strong><p>{pt ? "Documentação do projeto nativo Kotlin, Compose, Room, AudioRecord e USB MIDI." : "Native Kotlin, Compose, Room, AudioRecord and USB MIDI project documentation."}</p></div><a href="/docs/INSTALACAO-ANDROID.md" target="_blank" rel="noreferrer"><Download size={17} />{pt ? "Guia" : "Guide"}</a></div><div className="danger-zone">{confirmReset ? <><p>{pt ? "Esta ação apaga resultados, notas, XP e músicas importadas. O idioma e as preferências serão mantidos." : "This erases results, grades, XP and imported songs. Language and preferences are kept."}</p><div><button className="secondary-button" onClick={() => setConfirmReset(false)}><X size={16} />{pt ? "Cancelar" : "Cancel"}</button><button className="danger-button" onClick={() => { onReset(); setConfirmReset(false); }}><RotateCcw size={16} />{pt ? "Confirmar exclusão" : "Confirm deletion"}</button></div></> : <button className="text-button danger-text" onClick={() => setConfirmReset(true)}><RotateCcw size={15} />{pt ? "Apagar todo o progresso" : "Erase all progress"}</button>}</div></section>
      </div>
    </div>
  );
}

function RangeSetting({ label, value, display, onChange }: { label: string; value: number; display?: string; onChange: (value: number) => void }) {
  return <label className="range-setting"><span>{label}<strong>{display ?? `${Math.round(value * 100)}%`}</strong></span><input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ "--range-progress": `${value * 100}%` } as React.CSSProperties} /></label>;
}
function ToggleSetting({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-setting"><span>{label}</span><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><i><b /></i></label>;
}

export function TheoryScreen({ settings, input, onInputMode }: { settings: Settings; input: ReturnType<typeof usePerformanceInput>; onInputMode: (mode: Settings["inputMode"]) => void }) {
  const language = settings.language;
  const pt = language === "pt-BR";
  const [root, setRoot] = useState(0);
  const [suffix, setSuffix] = useState("");
  const [inversion, setInversion] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [mode, setMode] = useState<"major" | "minor">("major");
  const baseSymbol = `${NOTE_NAMES[root]}${suffix}`;
  const symbol = transposeSymbol(baseSymbol, semitones);
  const chord = parseChord(symbol);
  const notes = buildChord(symbol, 4, inversion);
  const type = CHORD_TYPES.find((item) => item.suffix === suffix) ?? CHORD_TYPES[CHORD_TYPES.length - 1];
  const field = useMemo(() => harmonicField(chord.root, mode), [chord.root, mode]);
  const setQuality = (value: string) => { setSuffix(value); setInversion(0); };
  return (
    <div className="theory-screen page-enter"><ScreenHeading eyebrow={pt ? "HARMONIA SEM PARTITURA" : "HARMONY WITHOUT SHEET MUSIC"} title={pt ? "Laboratório de Acordes" : "Chord Lab"} subtitle={pt ? "Explore a construção, inverta, transporte e ouça qualquer cifra." : "Explore construction, invert, transpose and hear any chord symbol."} />
      <div className="theory-lab-grid"><section className="chord-builder-card"><div className="builder-controls"><label>{pt ? "Tônica" : "Root"}<select value={root} onChange={(event) => { setRoot(Number(event.target.value)); setSemitones(0); }}>{NOTE_NAMES.map((name, index) => <option key={name} value={index}>{name} · {pitchClassLabel(index, language)}</option>)}</select></label><label>{pt ? "Qualidade" : "Quality"}<select value={suffix} onChange={(event) => setQuality(event.target.value)}>{CHORD_TYPES.map((item) => <option key={item.suffix || "major"} value={item.suffix}>{item.suffix || (pt ? "Maior" : "Major")} · {pt ? item.pt : item.en}</option>)}</select></label></div><div className="lab-chord-display"><div className="chord-symbol-tile">{symbol}</div><div><span className="eyebrow">{pt ? "CIFRA ATUAL" : "CURRENT SYMBOL"}</span><h2>{symbol} — {pt ? type.pt : type.en}</h2><p>{pt ? type.descriptionPt : type.descriptionEn}</p></div></div><div className="lab-chord-notes">{chord.intervals.map((interval, index) => { const pc = (chord.root + interval) % 12; return <span key={`${interval}-${index}`} className={index === 0 ? "root" : ""}><strong>{pitchClassLabel(pc, "en")}</strong><small>{type.formula.split("–")[index]?.trim() ?? interval}</small></span>; })}</div><div className="inversion-control"><span>{pt ? "Inversão" : "Inversion"}</span><div>{notes.map((_, index) => <button key={index} className={inversion === index ? "selected" : ""} onClick={() => setInversion(index)}>{index === 0 ? (pt ? "Fundamental" : "Root position") : `${index}ª`}</button>)}</div></div><label className="transpose-control"><span><Globe2 size={16} />{pt ? "Transpor" : "Transpose"}<strong>{semitones > 0 ? "+" : ""}{semitones} {pt ? "semitons" : "semitones"}</strong></span><input type="range" min="-6" max="6" value={semitones} onChange={(event) => setSemitones(Number(event.target.value))} /></label><button className="primary-button hear-chord" onClick={() => input.playChord(notes, 1300)}><Volume2 size={19} />{pt ? "Ouvir acorde no teclado" : "Hear chord on keyboard"}<Play size={17} fill="currentColor" /></button></section>
        <section className="theory-keyboard-card"><div className="formula-banner"><span>{pt ? "Fórmula" : "Formula"}</span><strong>{type.formula}</strong><small>{notes.map((note) => NOTE_NAMES[note % 12] + (Math.floor(note / 12) - 1)).join(" · ")}</small></div><Piano expectedNotes={notes} detectedNotes={input.activeNotes} chordSymbol={symbol} onNoteOn={input.touchNoteOn} onNoteOff={input.touchNoteOff} language={language} showNames={settings.showNoteNames} showFingers={settings.showFingerNumbers} reducedMotion={settings.reducedMotion} /><InputPanel input={input} settings={settings} language={language} onInputMode={onInputMode} onCalibrate={input.calibrate} compact /></section></div>
      <section className="harmonic-field"><div className="section-title"><div><span className="eyebrow">{pt ? "FUNÇÕES DOS GRAUS" : "SCALE DEGREE FUNCTIONS"}</span><h2>{pt ? "Campo harmônico de" : "Harmonic field of"} {NOTE_NAMES[chord.root]} {mode === "major" ? (pt ? "maior" : "major") : (pt ? "menor" : "minor")}</h2></div><div className="segmented-control"><button className={mode === "major" ? "selected" : ""} onClick={() => setMode("major")}>{pt ? "Maior" : "Major"}</button><button className={mode === "minor" ? "selected" : ""} onClick={() => setMode("minor")}>{pt ? "Menor" : "Minor"}</button></div></div><div className="field-chords">{field.map((item) => <button key={item.degree} onClick={() => { const parsed = parseChord(item.symbol); setRoot(parsed.root); setSuffix(parsed.type.suffix); setSemitones(0); setInversion(0); }}><span>{item.degree}</span><strong>{item.symbol}</strong><small>{parseChord(item.symbol).intervals.map((interval) => pitchClassLabel((parseChord(item.symbol).root + interval) % 12, "en")).join(" · ")}</small></button>)}</div></section>
    </div>
  );
}
