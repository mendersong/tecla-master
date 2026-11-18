"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { comparePitchClasses } from "@/lib/music";
import { targetToNotes } from "@/lib/curriculum";

export interface PracticeSummary {
  errors: number;
  attempts: number;
  durationSec: number;
  accuracy: number;
  sequenceScore: number;
  changeScore: number;
  timingScore: number;
  completedSteps: number;
  totalSteps: number;
}

interface Stats {
  stepWrong: number;
  errors: number;
  attempts: number;
  accuracies: number[];
  firstTry: number;
  wrongChanges: number;
  acceptedTimes: number[];
  partialBest: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function usePracticeSession({
  steps, bpm, beatsPerStep = 4, activeNotes, sessionKey, onComplete, metronomeClick,
}: {
  steps: string[];
  bpm: number;
  beatsPerStep?: number;
  activeNotes: Set<number>;
  sessionKey: string;
  onComplete: (summary: PracticeSummary) => void;
  metronomeClick: (accent?: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<"waiting" | "correct" | "incorrect">("waiting");
  const [beat, setBeat] = useState(0);
  const [feedback, setFeedback] = useState({ correct: [] as number[], missing: [] as number[], incorrect: [] as number[], accuracy: 0 });
  const statsRef = useRef<Stats>({ stepWrong: 0, errors: 0, attempts: 0, accuracies: [], firstTry: 0, wrongChanges: 0, acceptedTimes: [], partialBest: 0 });
  const elapsedRef = useRef(0);
  const lastKeyRef = useRef("");
  const acceptedKeyRef = useRef("");
  const wrongKeyRef = useRef("");
  const completedRef = useRef(false);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionRef = useRef(onComplete);
  const activeNotesRef = useRef(activeNotes);
  activeNotesRef.current = activeNotes;
  completionRef.current = onComplete;
  pausedRef.current = paused;
  indexRef.current = index;
  const activeKey = [...activeNotes].sort((a, b) => a - b).join(",");

  const summary = useCallback((finished: boolean): PracticeSummary => {
    const stats = statsRef.current;
    const total = steps.length;
    const done = stats.accuracies.length;
    const completion = total ? done / total : 0;
    const accuracy = average(stats.accuracies) * (finished ? 1 : completion);
    const sequenceScore = clamp((stats.firstTry / Math.max(1, total)) * (finished ? 1 : 1));
    const possibleChanges = Math.max(1, done - 1);
    const changeScore = clamp(1 - stats.wrongChanges / possibleChanges) * (finished ? 1 : completion);
    const expectedInterval = beatsPerStep * 60 / bpm;
    const intervals = stats.acceptedTimes.slice(1).map((time, position) => time - stats.acceptedTimes[position]);
    const timingScores = intervals.map((interval) => clamp(1 - Math.abs(interval - expectedInterval) / expectedInterval * 1.15));
    const meanInterval = average(intervals);
    const variance = intervals.length > 1 ? average(intervals.map((interval) => (interval - meanInterval) ** 2)) : 0;
    const regularity = meanInterval > 0 ? clamp(1 - Math.sqrt(variance) / meanInterval * 1.8) : 0;
    const timingScore = average(timingScores) * 0.65 + regularity * 0.35;
    return {
      errors: stats.errors, attempts: stats.attempts, durationSec: Math.max(0.1, elapsedRef.current), accuracy: clamp(accuracy),
      sequenceScore: clamp(sequenceScore), changeScore: clamp(changeScore), timingScore: clamp(timingScore), completedSteps: done, totalSteps: total,
    };
  }, [beatsPerStep, bpm, steps.length]);

  const finish = useCallback((finished = true) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    setPaused(false);
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    completionRef.current(summary(finished));
  }, [summary]);

  const reset = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    statsRef.current = { stepWrong: 0, errors: 0, attempts: 0, accuracies: [], firstTry: 0, wrongChanges: 0, acceptedTimes: [], partialBest: 0 };
    elapsedRef.current = 0;
    lastKeyRef.current = "";
    acceptedKeyRef.current = "";
    wrongKeyRef.current = "";
    completedRef.current = false;
    setIndex(0);
    setElapsed(0);
    setErrors(0);
    setAttempts(0);
    setCompleted(false);
    setPaused(false);
    setStatus("waiting");
    setFeedback({ correct: [], missing: [], incorrect: [], accuracy: 0 });
  }, []);

  useEffect(() => { reset(); }, [sessionKey, reset]);

  useEffect(() => {
    if (completed || paused) return;
    const timer = setInterval(() => {
      elapsedRef.current += 0.25;
      setElapsed(elapsedRef.current);
    }, 250);
    return () => clearInterval(timer);
  }, [completed, paused]);

  useEffect(() => {
    if (completed || paused) return;
    let count = 0;
    metronomeClick(true);
    setBeat(0);
    const timer = setInterval(() => {
      count += 1;
      metronomeClick(count % 4 === 0);
      setBeat(count % 4);
    }, 60000 / bpm);
    return () => clearInterval(timer);
  }, [bpm, completed, metronomeClick, paused, sessionKey]);

  useEffect(() => {
    if (completed || paused || !activeKey) return;
    const detected = [...activeNotesRef.current];
    const target = targetToNotes(steps[index] ?? steps[0]);
    const comparison = comparePitchClasses(target.notes, detected);
    setFeedback(comparison);
    const isNewAttack = lastKeyRef.current === "";
    if (activeKey !== lastKeyRef.current) {
      if (isNewAttack) {
        statsRef.current.attempts += 1;
        setAttempts(statsRef.current.attempts);
      }
      lastKeyRef.current = activeKey;
      wrongKeyRef.current = "";
      setStatus("waiting");
    }
    if (activeKey === acceptedKeyRef.current) return;
    const correct = comparison.missing.length === 0 && comparison.incorrect.length === 0 && comparison.correct.length > 0;
    const partial = clamp(comparison.accuracy - comparison.incorrect.length * 0.15);
    statsRef.current.partialBest = Math.max(statsRef.current.partialBest, partial);
    let wrongTimer: ReturnType<typeof setTimeout> | undefined;
    let correctTimer: ReturnType<typeof setTimeout> | undefined;

    if (correct) {
      correctTimer = setTimeout(() => {
        if (completedRef.current || pausedRef.current || indexRef.current !== index) return;
        acceptedKeyRef.current = activeKey;
        const stats = statsRef.current;
        const stepAccuracy = clamp(Math.max(stats.partialBest, 1 - stats.stepWrong * 0.2) * (1 - stats.stepWrong * 0.08));
        stats.accuracies.push(stepAccuracy);
        if (stats.stepWrong === 0) stats.firstTry += 1;
        stats.acceptedTimes.push(elapsedRef.current);
        stats.stepWrong = 0;
        stats.partialBest = 0;
        setStatus("correct");
        advanceTimerRef.current = setTimeout(() => {
          if (index >= steps.length - 1) finish(true);
          else {
            setIndex(index + 1);
            setStatus("waiting");
            setFeedback({ correct: [], missing: [], incorrect: [], accuracy: 0 });
          }
        }, 320);
      }, 240);
    } else {
      const shouldCount = comparison.incorrect.length > 0 || new Set(detected.map((note) => ((note % 12) + 12) % 12)).size >= new Set(target.notes.map((note) => ((note % 12) + 12) % 12)).size;
      if (shouldCount) {
        wrongTimer = setTimeout(() => {
          if (wrongKeyRef.current === activeKey || completedRef.current || pausedRef.current) return;
          wrongKeyRef.current = activeKey;
          const stats = statsRef.current;
          stats.errors += 1;
          stats.stepWrong += 1;
          if (index > 0) stats.wrongChanges += 1;
          setErrors(stats.errors);
          setStatus("incorrect");
        }, 520);
      }
    }
    return () => { if (wrongTimer) clearTimeout(wrongTimer); if (correctTimer) clearTimeout(correctTimer); };
  }, [activeKey, completed, finish, index, paused, steps]);

  useEffect(() => {
    if (!activeKey) {
      lastKeyRef.current = "";
      acceptedKeyRef.current = "";
      wrongKeyRef.current = "";
      if (!completed) setStatus("waiting");
    }
  }, [activeKey, completed]);

  return {
    index, elapsed, errors, attempts, completed, paused, status, beat, feedback,
    setPaused, reset, finishEarly: () => finish(false), currentTarget: targetToNotes(steps[index] ?? steps[0]),
  };
}
