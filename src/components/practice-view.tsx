"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Award, BookOpen, Check, CheckCircle2, ChevronRight, CircleAlert, Clock3, Lightbulb, Pause, Play, RotateCcw, Sparkles, Target, TimerReset, Trophy, XCircle } from "lucide-react";
import type { AssessmentSpec, Lesson } from "@/lib/curriculum";
import { ASSESSMENTS, LEVELS, local, targetToNotes } from "@/lib/curriculum";
import type { AssessmentResult, ExerciseResult, Language, Settings } from "@/lib/types";
import type { usePerformanceInput } from "@/hooks/use-performance-input";
import { type PracticeSummary, usePracticeSession } from "@/hooks/use-practice-session";
import { exerciseStars, assessmentAreas } from "@/lib/scoring";
import { identifyChord, midiLabel, parseChord, pitchClassLabel } from "@/lib/music";
import { Piano } from "./piano";
import { InputPanel } from "./input-panel";
import { LevelPill, ProgressRing, Stars } from "./ui";

interface PracticeViewProps {
  lesson?: Lesson;
  assessment?: AssessmentSpec;
  settings: Settings;
  input: ReturnType<typeof usePerformanceInput>;
  onInputMode: (mode: Settings["inputMode"]) => void;
  onExerciseComplete: (result: ExerciseResult) => void;
  onAssessmentComplete: (result: AssessmentResult) => void;
  onExit: () => void;
  onContinue: (levelId: number) => void;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function PracticeView(props: PracticeViewProps) {
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const language = props.settings.language;
  const pt = language === "pt-BR";
  if (props.assessment && !assessmentStarted) {
    const assessment = props.assessment;
    const level = LEVELS[assessment.levelId - 1];
    return (
      <div className="practice-page assessment-intro page-enter">
        <button className="text-button" onClick={props.onExit}><ArrowLeft size={17} />{pt ? "Voltar ao capítulo" : "Back to chapter"}</button>
        <section className="assessment-intro-hero">
          <div className="assessment-emblem"><Trophy size={42} /><span>{assessment.levelId}</span></div>
          <LevelPill level={assessment.levelId} label={pt ? "Nível" : "Level"} />
          <h1>{local(assessment.title, language)}</h1>
          <p>{local(assessment.description, language)}</p>
          <div className="assessment-rule"><CircleAlert size={19} /><span>{pt ? "Nota de 0 a 10 · aprovação com 7,0. Sua nota vem somente da performance captada nesta sessão." : "Grade from 0 to 10 · pass at 7.0. Your grade comes only from performance captured in this session."}</span></div>
          <div className="assessment-weights">
            {[[40, pt ? "Notas e acordes" : "Notes and chords"], [25, pt ? "Sequência" : "Sequence"], [20, pt ? "Trocas" : "Changes"], [15, pt ? "Andamento" : "Timing"]].map(([weight, label]) => <div key={String(label)}><strong>{weight}%</strong><span>{label}</span></div>)}
          </div>
          <div className="assessment-preview"><span>{assessment.steps.length} {pt ? "etapas práticas" : "practical steps"}</span><span>{assessment.bpm} BPM</span><span>{level.lessons.length} {pt ? "aulas como base" : "lessons as foundation"}</span></div>
          <button className="primary-button assessment-start" onClick={() => setAssessmentStarted(true)}><Play size={20} fill="currentColor" />{pt ? "Iniciar avaliação prática" : "Start practical assessment"}<ArrowRight size={19} /></button>
          <small>{pt ? "Use um teclado MIDI, microfone ou o teclado de toque. O metrônomo começa junto com a avaliação." : "Use a MIDI keyboard, microphone or touch keyboard. The metronome starts with the assessment."}</small>
        </section>
      </div>
    );
  }
  return <PracticeRunner {...props} key={props.lesson?.id ?? `assessment-${props.assessment?.levelId}`} />;
}

function PracticeRunner({ lesson, assessment, settings, input, onInputMode, onExerciseComplete, onAssessmentComplete, onExit, onContinue }: PracticeViewProps) {
  const language = settings.language;
  const pt = language === "pt-BR";
  const steps = lesson?.steps ?? assessment?.steps ?? [];
  const bpm = lesson?.bpm ?? assessment?.bpm ?? 72;
  const beatsPerStep = assessment?.beatsPerStep ?? (lesson?.kind === "rhythm" || lesson?.kind === "notes" ? 2 : 4);
  const [result, setResult] = useState<PracticeSummary | null>(null);
  const [savedResult, setSavedResult] = useState<ExerciseResult | AssessmentResult | null>(null);
  const sessionId = useMemo(() => `${lesson?.id ?? `a${assessment?.levelId}`}-${Date.now()}`, [lesson?.id, assessment?.levelId]);

  const handleComplete = useCallback((summary: PracticeSummary) => {
    setResult(summary);
    const now = new Date().toISOString();
    if (lesson) {
      const stars = exerciseStars(summary.errors, summary.durationSec, lesson.estimatedSec, summary.attempts);
      const exercise: ExerciseResult = {
        id: crypto.randomUUID(), lessonId: lesson.id, levelId: lesson.levelId, errors: summary.errors, durationSec: summary.durationSec,
        attempts: summary.attempts, stars, xp: Math.round(lesson.xp * (0.55 + summary.accuracy * 0.45) + (stars - 1) * 25),
        accuracy: summary.accuracy, completedAt: now,
      };
      setSavedResult(exercise);
      onExerciseComplete(exercise);
    } else if (assessment) {
      const grade = Math.round((summary.accuracy * 0.4 + summary.sequenceScore * 0.25 + summary.changeScore * 0.2 + summary.timingScore * 0.15) * 100) / 10;
      const assessmentResult: AssessmentResult = {
        id: crypto.randomUUID(), levelId: assessment.levelId, grade, accuracy: summary.accuracy, sequenceScore: summary.sequenceScore,
        changeScore: summary.changeScore, timingScore: summary.timingScore, errors: summary.errors, durationSec: summary.durationSec,
        passed: grade >= 7, completedAt: now,
      };
      setSavedResult(assessmentResult);
      onAssessmentComplete(assessmentResult);
    }
  }, [assessment, lesson, onAssessmentComplete, onExerciseComplete]);

  const session = usePracticeSession({ steps, bpm, beatsPerStep, activeNotes: input.activeNotes, sessionKey: sessionId, onComplete: handleComplete, metronomeClick: input.metronomeClick });
  const current = session.currentTarget;
  const nextTarget = steps[session.index + 1] ? targetToNotes(steps[session.index + 1]) : null;
  const currentChord = current.isNote ? null : parseChord(current.symbol);
  const detectedChord = identifyChord([...input.activeNotes]);
  const title = lesson ? local(lesson.title, language) : assessment ? local(assessment.title, language) : "";
  const instruction = lesson ? local(lesson.instruction, language) : assessment ? local(assessment.description, language) : "";
  const levelId = lesson?.levelId ?? assessment?.levelId ?? 1;

  const restart = () => {
    setResult(null);
    setSavedResult(null);
    session.reset();
  };

  if (result) {
    if (lesson && savedResult && "stars" in savedResult) return <LessonResult lesson={lesson} summary={result} result={savedResult} language={language} onRetry={restart} onExit={onExit} />;
    if (assessment && savedResult && "grade" in savedResult) return <AssessmentResultView assessment={assessment} result={savedResult} language={language} onRetry={restart} onReview={onExit} onContinue={() => onContinue(assessment.levelId)} />;
  }

  return (
    <div className="practice-page page-enter">
      <header className="practice-header">
        <button className="icon-button" onClick={onExit} aria-label={pt ? "Voltar" : "Back"}><ArrowLeft size={20} /></button>
        <div><span className="eyebrow">{lesson ? `${pt ? "Aula" : "Lesson"} ${lesson.levelId}.${lesson.order}` : (pt ? "Avaliação prática" : "Practical assessment")}</span><h1>{title}</h1></div>
        <LevelPill level={levelId} label={pt ? "Nível" : "Level"} />
        <button className="icon-button" onClick={() => session.setPaused(!session.paused)} aria-label={session.paused ? "Continuar" : "Pausar"}>{session.paused ? <Play size={19} /> : <Pause size={19} />}</button>
      </header>

      <div className="practice-layout">
        <div className="practice-main">
          <section className="current-chord-card">
            <div className={`chord-symbol-tile ${currentChord ? "" : "single-note"}`}>{current.isNote ? pitchClassLabel(current.notes[0] % 12, "en") : current.symbol}</div>
            <div className="current-chord-copy">
              <span className="eyebrow">{current.isNote ? (pt ? "Nota esperada" : "Expected note") : (pt ? "Cifra atual" : "Current chord")}</span>
              <h2>{current.isNote ? pitchClassLabel(current.notes[0] % 12, language) : `${current.symbol} — ${currentChord?.rootName} ${currentChord ? local({ pt: currentChord.type.pt, en: currentChord.type.en }, language) : ""}`}</h2>
              <p>{instruction}</p>
              <div className="chord-note-chips">
                {[...new Set(current.notes.map((note) => note % 12))].map((pc) => <span key={pc} className={currentChord?.root === pc || current.isNote ? "root-chip" : ""}>{pitchClassLabel(pc, "en")}<small>{pitchClassLabel(pc, language)}</small></span>)}
              </div>
            </div>
            <div className="next-chord-box"><span>{pt ? "Próximo" : "Next"}</span><strong>{nextTarget?.symbol ?? "—"}</strong>{nextTarget && !nextTarget.isNote && <small>{parseChord(nextTarget.symbol).type.intervals.length} {pt ? "notas" : "notes"}</small>}</div>
          </section>

          <div className="step-strip" aria-label={pt ? "Sequência do exercício" : "Exercise sequence"}>
            {steps.map((step, position) => {
              const target = targetToNotes(step);
              return <span key={`${step}-${position}`} className={`${position === session.index ? "current" : ""} ${position < session.index ? "done" : ""}`}>{position < session.index ? <Check size={13} /> : target.symbol}{position === session.index && <i />}</span>;
            })}
          </div>

          <Piano expectedNotes={current.notes} detectedNotes={input.activeNotes} chordSymbol={currentChord?.symbol} onNoteOn={input.touchNoteOn} onNoteOff={input.touchNoteOff} language={language} showNames={settings.showNoteNames} showFingers={settings.showFingerNumbers} reducedMotion={settings.reducedMotion} />

          <section className={`live-feedback ${session.status}`} aria-live="polite">
            <div className="feedback-icon">{session.status === "correct" ? <CheckCircle2 /> : session.status === "incorrect" ? <XCircle /> : <AudioWaveIcon />}</div>
            <div><strong>{session.paused ? (pt ? "Prática pausada" : "Practice paused") : session.status === "correct" ? (pt ? "Perfeito! Próximo passo." : "Perfect! Next step.") : session.status === "incorrect" ? (pt ? "Ajuste as notas destacadas" : "Adjust the highlighted notes") : (pt ? "Aguardando você tocar..." : "Waiting for you to play...")}</strong><span>{detectedChord ? `${pt ? "Acorde identificado" : "Detected chord"}: ${detectedChord.symbol}` : input.activeNotes.size ? [...input.activeNotes].sort((a, b) => a - b).map((note) => midiLabel(note, language)).join(" · ") : (pt ? "Nenhuma nota ativa" : "No active notes")}</span></div>
            <div className="feedback-notes">{session.feedback.missing.length > 0 && <span className="missing"><b>{pt ? "Falta" : "Missing"}</b>{session.feedback.missing.map((pc) => pitchClassLabel(pc, "en")).join(" ")}</span>}{session.feedback.incorrect.length > 0 && <span className="wrong"><b>{pt ? "Incorreta" : "Wrong"}</b>{session.feedback.incorrect.map((pc) => pitchClassLabel(pc, "en")).join(" ")}</span>}</div>
          </section>

          <InputPanel input={input} settings={settings} language={language} onInputMode={onInputMode} onCalibrate={input.calibrate} />
        </div>

        <aside className="practice-sidebar">
          {lesson && <section className="theory-card"><span className="card-icon"><BookOpen size={18} /></span><h3>{pt ? "Entenda a cifra" : "Understand the symbol"}</h3><p>{local(lesson.theory, language)}</p>{currentChord && <div className="formula-row"><span>{pt ? "Fórmula" : "Formula"}</span><strong>{currentChord.type.formula}</strong></div>}<div className="teacher-tip"><Lightbulb size={17} /><p>{local(lesson.tip, language)}</p></div></section>}
          {assessment && <section className="theory-card"><span className="card-icon"><Target size={18} /></span><h3>{pt ? "Medição ao vivo" : "Live measurement"}</h3><p>{pt ? "Cada ataque incorreto é registrado após uma janela de estabilidade. Toque as etapas em ordem e acompanhe o pulso." : "Each incorrect attack is recorded after a stability window. Play steps in order and follow the pulse."}</p><div className="weight-mini"><span>40% {pt ? "precisão" : "accuracy"}</span><span>25% {pt ? "sequência" : "sequence"}</span><span>20% {pt ? "trocas" : "changes"}</span><span>15% {pt ? "tempo" : "timing"}</span></div></section>}
          <section className="session-metrics">
            <div><Clock3 size={18} /><span>{pt ? "Tempo" : "Time"}</span><strong>{formatTime(session.elapsed)}</strong></div>
            <div><XCircle size={18} /><span>{pt ? "Erros" : "Errors"}</span><strong>{session.errors}</strong></div>
            <div><TimerReset size={18} /><span>{pt ? "Tentativas" : "Attempts"}</span><strong>{session.attempts}</strong></div>
            <div><Target size={18} /><span>BPM</span><strong>{bpm}</strong></div>
          </section>
          <section className="pulse-card"><div className="pulse-dots">{[0, 1, 2, 3].map((item) => <i key={item} className={session.beat === item ? "active" : ""} />)}</div><span>{session.beat + 1} / 4 · {pt ? "pulso" : "pulse"}</span></section>
          <div className="session-progress-label"><span>{pt ? "Progresso do exercício" : "Exercise progress"}</span><strong>{session.index + 1}/{steps.length}</strong></div>
          <div className="linear-progress"><i style={{ width: `${(session.index / steps.length) * 100}%` }} /></div>
          {assessment && <button className="secondary-button full-width" onClick={session.finishEarly}><Check size={17} />{pt ? "Encerrar e calcular nota" : "Finish and calculate grade"}</button>}
          <button className="text-button full-width" onClick={restart}><RotateCcw size={15} />{pt ? "Reiniciar prática" : "Restart practice"}</button>
        </aside>
      </div>
      {session.paused && <div className="pause-overlay"><button className="primary-button" onClick={() => session.setPaused(false)}><Play size={20} fill="currentColor" />{pt ? "Continuar prática" : "Resume practice"}</button></div>}
    </div>
  );
}

function AudioWaveIcon() {
  return <span className="audio-wave-icon"><i /><i /><i /><i /></span>;
}

function LessonResult({ lesson, summary, result, language, onRetry, onExit }: { lesson: Lesson; summary: PracticeSummary; result: ExerciseResult; language: Language; onRetry: () => void; onExit: () => void }) {
  const pt = language === "pt-BR";
  return (
    <div className="result-page page-enter"><section className="result-card">
      <div className="result-burst"><Sparkles size={30} /></div><span className="eyebrow">{pt ? "Aula concluída" : "Lesson completed"}</span><h1>{local(lesson.title, language)}</h1>
      <Stars count={result.stars} size={38} /><p>{result.stars === 3 ? (pt ? "Excelente: precisão e controle dentro do tempo estimado." : "Excellent: accurate and controlled within the estimated time.") : result.stars === 2 ? (pt ? "Bom trabalho. Repita para reduzir erros ou ganhar fluidez." : "Good work. Repeat to reduce errors or gain fluency.") : (pt ? "Você concluiu. Uma nova prática ajudará a consolidar os movimentos." : "You completed it. Another practice will help consolidate the movements.")}</p>
      <div className="result-metrics"><div><strong>{Math.round(summary.accuracy * 100)}%</strong><span>{pt ? "Precisão" : "Accuracy"}</span></div><div><strong>{result.errors}</strong><span>{pt ? "Erros" : "Errors"}</span></div><div><strong>{formatTime(result.durationSec)}</strong><span>{pt ? "Tempo" : "Time"}</span></div><div><strong>+{result.xp}</strong><span>XP</span></div></div>
      <div className="result-actions"><button className="secondary-button" onClick={onRetry}><RotateCcw size={17} />{pt ? "Praticar novamente" : "Practise again"}</button><button className="primary-button" onClick={onExit}>{pt ? "Voltar às aulas" : "Back to lessons"}<ChevronRight size={18} /></button></div>
    </section></div>
  );
}

function AssessmentResultView({ assessment, result, language, onRetry, onReview, onContinue }: { assessment: AssessmentSpec; result: AssessmentResult; language: Language; onRetry: () => void; onReview: () => void; onContinue: () => void }) {
  const pt = language === "pt-BR";
  const areas = assessmentAreas(result, language);
  const criteria = [
    { label: pt ? "Precisão de notas e acordes" : "Note and chord accuracy", value: result.accuracy, weight: 40 },
    { label: pt ? "Execução da sequência" : "Sequence execution", value: result.sequenceScore, weight: 25 },
    { label: pt ? "Mudanças de acorde" : "Chord changes", value: result.changeScore, weight: 20 },
    { label: pt ? "Andamento e regularidade" : "Timing and regularity", value: result.timingScore, weight: 15 },
  ];
  return (
    <div className="result-page assessment-result page-enter"><section className="result-card wide">
      <div className={`assessment-result-heading ${result.passed ? "passed" : "failed"}`}><div className="result-burst">{result.passed ? <Award size={32} /> : <BookOpen size={30} />}</div><div><span className="eyebrow">{local(assessment.title, language)}</span><h1>{result.passed ? (pt ? "Capítulo aprovado!" : "Chapter passed!") : (pt ? "Revise e tente novamente" : "Review and try again")}</h1><p>{result.passed ? (pt ? "O próximo capítulo foi liberado pelo seu desempenho." : "The next chapter was unlocked by your performance.") : (pt ? "A nota mínima é 7,0. Revise as áreas indicadas antes de refazer." : "The minimum grade is 7.0. Review the indicated areas before retaking.")}</p></div></div>
      <div className="assessment-score-row"><ProgressRing value={result.grade / 10} label={result.grade.toFixed(1).replace(".", pt ? "," : ".")} sublabel={pt ? "Nota final" : "Final grade"} size={164} /><div className="result-metrics"><div><strong>{Math.round(result.accuracy * 100)}%</strong><span>{pt ? "Precisão geral" : "Overall accuracy"}</span></div><div><strong>{result.errors}</strong><span>{pt ? "Erros" : "Errors"}</span></div><div><strong>{formatTime(result.durationSec)}</strong><span>{pt ? "Tempo" : "Time"}</span></div></div></div>
      <div className="criteria-list">{criteria.map((criterion) => <div key={criterion.label}><div><span>{criterion.label} <small>{criterion.weight}%</small></span><strong>{Math.round(criterion.value * 100)}%</strong></div><div className="linear-progress"><i style={{ width: `${criterion.value * 100}%` }} /></div></div>)}</div>
      <div className="areas-grid"><div><h3><CheckCircle2 size={18} />{pt ? "Áreas dominadas" : "Mastered areas"}</h3>{areas.mastered.length ? areas.mastered.map((area) => <p key={area}>{area}</p>) : <p>{pt ? "Continue praticando para consolidar as competências." : "Keep practising to consolidate skills."}</p>}</div><div><h3><Target size={18} />{pt ? "Áreas para melhorar" : "Areas to improve"}</h3>{areas.improve.length ? areas.improve.map((area) => <p key={area}>{area}</p>) : <p>{pt ? "Nenhuma área crítica nesta avaliação." : "No critical areas in this assessment."}</p>}</div></div>
      <div className="result-actions"><button className="secondary-button" onClick={onReview}><BookOpen size={17} />{pt ? "Revisar capítulo" : "Review chapter"}</button><button className="secondary-button" onClick={onRetry}><RotateCcw size={17} />{pt ? "Refazer avaliação" : "Retake assessment"}</button>{result.passed && assessment.levelId < 5 && <button className="primary-button" onClick={onContinue}>{pt ? "Próximo capítulo" : "Next chapter"}<ArrowRight size={18} /></button>}</div>
    </section></div>
  );
}
