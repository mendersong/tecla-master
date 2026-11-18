"use client";

import { useEffect, useMemo, useRef } from "react";
import { FINGERINGS, NOTE_NAMES, WHITE_PCS, midiLabel, parseChord } from "@/lib/music";
import type { Language } from "@/lib/types";

interface PianoProps {
  expectedNotes: number[];
  detectedNotes: Set<number>;
  chordSymbol?: string;
  onNoteOn: (note: number) => void;
  onNoteOff: (note: number) => void;
  language: Language;
  showNames?: boolean;
  showFingers?: boolean;
  reducedMotion?: boolean;
  compact?: boolean;
}

const START = 36;
const END = 84;
const WHITE_WIDTH = 48;
const BLACK_WIDTH = 30;

export function Piano({ expectedNotes, detectedNotes, chordSymbol, onNoteOn, onNoteOff, language, showNames = true, showFingers = true, reducedMotion = false, compact = false }: PianoProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const expectedNotesRef = useRef(expectedNotes);
  expectedNotesRef.current = expectedNotes;
  const keyRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const notes = useMemo(() => Array.from({ length: END - START + 1 }, (_, index) => START + index), []);
  const whites = notes.filter((note) => WHITE_PCS.has(note % 12));
  const chord = chordSymbol ? parseChord(chordSymbol) : null;
  const expectedSet = new Set(expectedNotes);
  const expectedKey = expectedNotes.join("-");

  useEffect(() => {
    const expected = expectedNotesRef.current;
    if (!expected.length || !viewportRef.current) return;
    const target = keyRefs.current.get(expected[Math.min(1, expected.length - 1)]) ?? keyRefs.current.get(expected[0]);
    if (!target) return;
    const viewport = viewportRef.current;
    const left = Math.max(0, target.offsetLeft - viewport.clientWidth / 2 + target.clientWidth / 2);
    viewport.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
  }, [expectedKey, reducedMotion]);

  const expectedIndex = (note: number) => expectedNotes.findIndex((item) => item % 12 === note % 12);
  const keyState = (note: number) => {
    const expected = expectedSet.has(note);
    const detected = detectedNotes.has(note);
    const root = expected && chord?.root === note % 12;
    const wrong = detected && !expected && !expectedNotes.some((item) => item % 12 === note % 12);
    return { expected, detected, root, wrong };
  };
  const keyClass = (note: number, black: boolean) => {
    const state = keyState(note);
    return ["piano-key", black ? "black-key" : "white-key", state.expected ? "is-expected" : "", state.root ? "is-root" : "", state.detected ? "is-detected" : "", state.wrong ? "is-wrong" : ""].filter(Boolean).join(" ");
  };
  const bindKey = (note: number) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      onNoteOn(note);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); onNoteOff(note); },
    onPointerCancel: () => onNoteOff(note),
    onLostPointerCapture: () => onNoteOff(note),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });
  const label = (note: number) => {
    if (!showNames) return null;
    const pc = note % 12;
    const fingerIndex = expectedIndex(note);
    const finger = chord && fingerIndex >= 0 ? FINGERINGS[chord.type.suffix]?.[fingerIndex] : undefined;
    return <span className="key-label"><span>{NOTE_NAMES[pc]}</span>{pc === 0 && <small>{Math.floor(note / 12) - 1}</small>}{showFingers && finger && <b className="finger-number">{finger}</b>}</span>;
  };

  return (
    <div className={`piano-shell ${compact ? "is-compact" : ""}`}>
      <div className="piano-topline">
        <span>C2</span><span className="piano-instruction">{language === "pt-BR" ? "Toque e segure as teclas" : "Touch and hold the keys"}</span><span>C6</span>
      </div>
      <div className="piano-viewport" ref={viewportRef}>
        <div className="piano-inner" style={{ width: whites.length * WHITE_WIDTH }}>
          {whites.map((note) => (
            <button
              type="button" key={note} ref={(element) => { if (element) keyRefs.current.set(note, element); }}
              className={keyClass(note, false)} style={{ width: WHITE_WIDTH }} aria-label={midiLabel(note, language)} {...bindKey(note)}
            >{label(note)}</button>
          ))}
          {notes.filter((note) => !WHITE_PCS.has(note % 12)).map((note) => {
            const previousWhites = whites.filter((white) => white < note).length;
            const left = previousWhites * WHITE_WIDTH - BLACK_WIDTH / 2;
            return (
              <button
                type="button" key={note} ref={(element) => { if (element) keyRefs.current.set(note, element); }}
                className={keyClass(note, true)} style={{ width: BLACK_WIDTH, left }} aria-label={midiLabel(note, language)} {...bindKey(note)}
              >{label(note)}</button>
            );
          })}
        </div>
      </div>
      <div className="piano-legend">
        <span><i className="legend-root" />{language === "pt-BR" ? "Tônica" : "Root"}</span>
        <span><i className="legend-chord" />{language === "pt-BR" ? "Notas do acorde" : "Chord tones"}</span>
        <span><i className="legend-detected" />{language === "pt-BR" ? "Detectada" : "Detected"}</span>
        <span><i className="legend-wrong" />{language === "pt-BR" ? "Incorreta" : "Incorrect"}</span>
      </div>
    </div>
  );
}
