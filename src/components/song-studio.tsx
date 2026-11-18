"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, CircleAlert, Clock3, FileMusic, FolderOpen, Gauge, Import, ListMusic, Music2, Pause, Play, Repeat2, RotateCcw, Sparkles, TimerReset, XCircle } from "lucide-react";
import { ORIGINAL_SONGS, targetToNotes } from "@/lib/curriculum";
import { CHORD_TYPES, identifyChord, parseChord, pitchClassLabel } from "@/lib/music";
import type { CustomSong, Language, Settings, SongSection } from "@/lib/types";
import type { usePerformanceInput } from "@/hooks/use-performance-input";
import { type PracticeSummary, usePracticeSession } from "@/hooks/use-practice-session";
import { InputPanel } from "./input-panel";
import { Piano } from "./piano";
import { ProgressRing, ScreenHeading } from "./ui";

const sectionTranslations: Record<string, string> = { "Introdução": "Introduction", "Tema A": "Theme A", "Tema B": "Theme B", "Órbita": "Orbit", "Ascensão": "Ascent", "Retorno": "Return", "Margem": "Shore", "Correnteza": "Current", "Porto": "Harbour", "Passo I": "Step I", "Passo II": "Step II", "Reflexo": "Reflection", "Névoa": "Mist", "Clareira": "Clearing", "Horizonte": "Horizon", "Plataforma": "Platform", "Partida": "Departure", "Destino": "Destination" };
const descriptionEn: Record<string, string> = {
  "song-amanhecer": "An eight-bar pop study for clean changes between I, V, vi and IV.",
  "song-orbita": "An A minor groove with steady bass and a bright resolution into C major.",
  "song-cais": "A D major ballad contrasting major chords with the relative minor.",
  "song-vidro": "An E minor rhythm study designed for accents and changes on beat one.",
  "song-horizonte": "A suspended texture alternating suspense and resolution over a steady pulse.",
  "song-estacao": "An original harmonic miniature with sevenths, ninths and ii–V–I voice leading.",
};

function validChord(symbol: string) {
  const match = symbol.match(/^([A-G](?:#|b)?)(.*)$/);
  return !!match && CHORD_TYPES.some((type) => type.suffix === match[2]);
}

function parseImportedSong(text: string, filename: string): CustomSong {
  const baseId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`;
  if (filename.toLowerCase().endsWith(".json")) {
    const data = JSON.parse(text) as { title?: string; artist?: string; bpm?: number; sections?: SongSection[]; chords?: string[]; progression?: string[] };
    const rawSections = data.sections?.length ? data.sections : [{ name: "Progressão", chords: data.chords ?? data.progression ?? [], bars: (data.chords ?? data.progression ?? []).length }];
    const sections = rawSections.map((section, index) => ({ name: String(section.name || `Seção ${index + 1}`).slice(0, 50), chords: section.chords.map(String).filter(validChord).slice(0, 64), bars: section.chords.length })).filter((section) => section.chords.length);
    if (!sections.length) throw new Error("Nenhuma cifra válida encontrada no JSON.");
    return { id: `import-${baseId}`, title: String(data.title || filename.replace(/\.json$/i, "")).slice(0, 100), artist: String(data.artist || "Importação local").slice(0, 100), bpm: Math.max(35, Math.min(240, Number(data.bpm) || 80)), sections, createdAt: new Date().toISOString(), imported: true, description: "Progressão importada do seu dispositivo." };
  }
  let title = filename.replace(/\.(txt|crd|chordpro)$/i, "");
  let artist = "Importação local";
  let bpm = 80;
  const sections: SongSection[] = [];
  let current: SongSection = { name: "Progressão", chords: [], bars: 0 };
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const titleMatch = line.match(/^(?:#?\s*)(?:title|título|titulo)\s*:\s*(.+)$/i);
    const artistMatch = line.match(/^(?:#?\s*)(?:artist|artista)\s*:\s*(.+)$/i);
    const bpmMatch = line.match(/^(?:#?\s*)bpm\s*:\s*(\d{2,3})/i);
    if (titleMatch) { title = titleMatch[1].slice(0, 100); continue; }
    if (artistMatch) { artist = artistMatch[1].slice(0, 100); continue; }
    if (bpmMatch) { bpm = Math.max(35, Math.min(240, Number(bpmMatch[1]))); continue; }
    const sectionMatch = line.match(/^\[([^\]]{1,50})\]$/);
    if (sectionMatch) {
      if (current.chords.length) sections.push(current);
      current = { name: sectionMatch[1], chords: [], bars: 0 };
      continue;
    }
    const tokens = line.split(/\s+|\||,|>/).map((token) => token.trim()).filter(Boolean);
    const chords = tokens.filter(validChord);
    if (chords.length) current.chords.push(...chords);
  }
  if (current.chords.length) sections.push(current);
  if (!sections.length) throw new Error("Nenhuma cifra válida encontrada. Use linhas como: C | G | Am | F");
  sections.forEach((section) => { section.chords = section.chords.slice(0, 64); section.bars = section.chords.length; });
  return { id: `import-${baseId}`, title, artist, bpm, sections, createdAt: new Date().toISOString(), imported: true, description: "Progressão importada do seu dispositivo." };
}

export function SongStudio({ songs, settings, input, onInputMode, onImport, onPractice }: {
  songs: CustomSong[];
  settings: Settings;
  input: ReturnType<typeof usePerformanceInput>;
  onInputMode: (mode: Settings["inputMode"]) => void;
  onImport: (song: CustomSong) => void;
  onPractice: (seconds: number, xp: number) => void;
}) {
  const language = settings.language;
  const pt = language === "pt-BR";
  const library = [...ORIGINAL_SONGS, ...songs];
  const [selectedId, setSelectedId] = useState(library[0].id);
  const selected = library.find((song) => song.id === selectedId) ?? library[0];
  const [sectionIndex, setSectionIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [repeat, setRepeat] = useState(false);
  const [runId, setRunId] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const section = selected.sections[Math.min(sectionIndex, selected.sections.length - 1)];

  const chooseSong = (id: string) => {
    setSelectedId(id); setSectionIndex(0); setPlaying(false); setSummary(null); setRunId((value) => value + 1);
  };
  const chooseSection = (index: number) => {
    setSectionIndex(index); setPlaying(false); setSummary(null); setRunId((value) => value + 1);
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    setImportMessage(null);
    try {
      if (file.size > 512_000) throw new Error(pt ? "Arquivo muito grande. Limite de 512 KB." : "File too large. 512 KB limit.");
      const song = parseImportedSong(await file.text(), file.name);
      onImport(song);
      setSelectedId(song.id); setSectionIndex(0); setSummary(null); setPlaying(false);
      setImportMessage({ type: "success", text: pt ? `“${song.title}” importada: ${song.sections.reduce((sum, item) => sum + item.chords.length, 0)} acordes.` : `“${song.title}” imported: ${song.sections.reduce((sum, item) => sum + item.chords.length, 0)} chords.` });
    } catch (error) {
      setImportMessage({ type: "error", text: error instanceof Error ? error.message : (pt ? "Não foi possível importar." : "Could not import.") });
    } finally { if (fileRef.current) fileRef.current.value = ""; }
  };
  const complete = useCallback((practice: PracticeSummary) => {
    setPlaying(false); setSummary(practice);
    onPractice(practice.durationSec, Math.round(25 + practice.accuracy * 75));
  }, [onPractice]);
  const description = selected.imported ? (pt ? selected.description : "Chord progression imported from your device.") : language === "en" ? descriptionEn[selected.id] : selected.description;
  const sectionName = (name: string) => pt ? name : sectionTranslations[name] ?? name;

  return (
    <div className="songs-screen page-enter"><ScreenHeading eyebrow={pt ? "CIFRAS EM MOVIMENTO" : "CHORDS IN MOTION"} title={pt ? "Palco de músicas" : "Song stage"} subtitle={pt ? "Estudos originais e suas próprias progressões, sem depender de partitura." : "Original studies and your own progressions, with no sheet music required."} action={<button className="secondary-button import-button" onClick={() => fileRef.current?.click()}><Import size={17} />{pt ? "Importar cifras" : "Import chords"}</button>} />
      <input ref={fileRef} type="file" accept=".txt,.json,.crd,.chordpro,text/plain,application/json" hidden onChange={(event) => importFile(event.target.files?.[0])} />
      {importMessage && <div className={`import-message ${importMessage.type}`}>{importMessage.type === "success" ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}<span>{importMessage.text}</span><button onClick={() => setImportMessage(null)}>×</button></div>}
      <div className="songs-layout">
        <aside className="song-library"><div className="section-title"><h2><ListMusic size={19} />{pt ? "Biblioteca" : "Library"}</h2><span>{library.length}</span></div><div className="song-list">{library.map((song) => <button key={song.id} className={selected.id === song.id ? "selected" : ""} onClick={() => chooseSong(song.id)}><span className="song-cover"><Music2 size={21} /></span><div><strong>{song.title}</strong><span>{song.imported ? (pt ? "Minha importação" : "My import") : (pt ? "Estudo autoral" : "Original study")}</span><small>{song.bpm} BPM · {song.sections.length} {pt ? "seções" : "sections"}</small></div>{!song.imported && <b>N{song.level}</b>}<ChevronRight size={16} /></button>)}</div><button className="library-import" onClick={() => fileRef.current?.click()}><FolderOpen size={22} /><strong>{pt ? "Traga sua progressão" : "Bring your progression"}</strong><span>.TXT · .JSON · .CRD</span></button><p className="rights-note">{pt ? "Somente cifras e metadados são lidos. Letras, áudio e arranjos protegidos não são incluídos." : "Only chord symbols and metadata are read. Lyrics, audio and protected arrangements are not included."}</p></aside>
        <main className="song-stage">
          <div className="song-stage-heading"><div><span className="eyebrow">{selected.imported ? (pt ? "MINHA BIBLIOTECA" : "MY LIBRARY") : (pt ? "ESTUDO ORIGINAL TECLADO MASTER" : "TECLADO MASTER ORIGINAL STUDY")}</span><h2>{selected.title}</h2><p>{description}</p></div><div className="song-bpm"><Gauge size={19} /><strong>{Math.round(selected.bpm * speed)}</strong><span>BPM</span></div></div>
          <div className="section-tabs">{selected.sections.map((item, index) => <button key={`${item.name}-${index}`} className={sectionIndex === index ? "selected" : ""} onClick={() => chooseSection(index)}><span>{String(index + 1).padStart(2, "0")}</span>{sectionName(item.name)}<small>{item.chords.length} {pt ? "acordes" : "chords"}</small></button>)}</div>
          <div className="song-transport"><label><span>{pt ? "Velocidade" : "Speed"}<strong>{Math.round(speed * 100)}%</strong></span><input type="range" min="0.5" max="1.5" step="0.05" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></label><button className={`loop-button ${repeat ? "active" : ""}`} onClick={() => { setRepeat(!repeat); setPlaying(false); setSummary(null); setRunId((value) => value + 1); }}><Repeat2 size={18} /><span>{pt ? "Repetir seção" : "Loop section"}</span><strong>{repeat ? "4×" : (pt ? "Desativado" : "Off")}</strong></button></div>
          {playing && !summary ? <SongPractice key={`${selected.id}-${sectionIndex}-${repeat}-${runId}`} song={selected} section={section} sectionLabel={sectionName(section.name)} speed={speed} repeat={repeat} settings={settings} input={input} onInputMode={onInputMode} onComplete={complete} /> : summary ? <SongResult summary={summary} language={language} onRetry={() => { setSummary(null); setPlaying(true); setRunId((value) => value + 1); }} onBack={() => setSummary(null)} /> : <section className="song-ready"><div className="ready-progression">{section.chords.map((chord, index) => <div key={`${chord}-${index}`}><span>{index + 1}</span><strong>{chord}</strong><small>{parseChord(chord).intervals.map((interval) => pitchClassLabel((parseChord(chord).root + interval) % 12, "en")).join(" · ")}</small>{index < section.chords.length - 1 && <ArrowRight size={16} />}</div>)}</div><div className="ready-info"><span><Clock3 size={16} />{section.chords.length * 4} {pt ? "pulsos por volta" : "beats per round"}</span><span><Repeat2 size={16} />{repeat ? (pt ? "4 voltas nesta seção" : "4 rounds of this section") : (pt ? "1 volta nesta seção" : "1 round of this section")}</span></div><button className="primary-button song-play" onClick={() => { setSummary(null); setPlaying(true); }}><Play size={21} fill="currentColor" />{pt ? "Iniciar prática" : "Start practice"}<ArrowRight size={18} /></button><small>{pt ? "O metrônomo inicia imediatamente. Toque cada acorde por um compasso de 4/4." : "The metronome starts immediately. Play each chord for one 4/4 bar."}</small></section>}
        </main>
      </div>
    </div>
  );
}

function SongPractice({ song, section, sectionLabel, speed, repeat, settings, input, onInputMode, onComplete }: { song: CustomSong; section: SongSection; sectionLabel: string; speed: number; repeat: boolean; settings: Settings; input: ReturnType<typeof usePerformanceInput>; onInputMode: (mode: Settings["inputMode"]) => void; onComplete: (summary: PracticeSummary) => void }) {
  const pt = settings.language === "pt-BR";
  const steps = useMemo(() => Array.from({ length: repeat ? 4 : 1 }, () => section.chords).flat(), [repeat, section.chords]);
  const sessionKey = useMemo(() => `${song.id}-${section.name}-${Date.now()}`, [song.id, section.name]);
  const session = usePracticeSession({ steps, bpm: Math.round(song.bpm * speed), beatsPerStep: 4, activeNotes: input.activeNotes, sessionKey, onComplete, metronomeClick: input.metronomeClick });
  const current = session.currentTarget;
  const next = steps[session.index + 1] ? targetToNotes(steps[session.index + 1]) : null;
  const detected = identifyChord([...input.activeNotes]);
  return <div className="song-practice"><div className="song-live-heading"><div><span>{sectionLabel} · {pt ? "Acorde atual" : "Current chord"}</span><strong>{current.symbol}</strong><small>{parseChord(current.symbol).intervals.map((interval) => pitchClassLabel((parseChord(current.symbol).root + interval) % 12, "en")).join(" · ")}</small></div><ArrowRight size={26} /><div className="song-next"><span>{pt ? "Próximo acorde" : "Next chord"}</span><strong>{next?.symbol ?? "—"}</strong><small>{next ? (pt ? "Prepare a mudança" : "Prepare the change") : (pt ? "Final da seção" : "End of section")}</small></div><button className="icon-button" onClick={() => session.setPaused(!session.paused)} aria-label={session.paused ? (pt ? "Continuar" : "Resume") : (pt ? "Pausar" : "Pause")}>{session.paused ? <Play size={20} /> : <Pause size={20} />}</button></div><div className="song-chord-track">{steps.map((step, index) => <span key={`${step}-${index}`} className={`${index === session.index ? "current" : ""} ${index < session.index ? "done" : ""}`}>{step}</span>)}</div><Piano expectedNotes={current.notes} detectedNotes={input.activeNotes} chordSymbol={current.symbol} onNoteOn={input.touchNoteOn} onNoteOff={input.touchNoteOff} language={settings.language} showNames={settings.showNoteNames} showFingers={settings.showFingerNumbers} reducedMotion={settings.reducedMotion} compact /><div className={`song-feedback ${session.status}`}><span>{session.paused ? <Pause size={19} /> : session.status === "correct" ? <CheckCircle2 size={19} /> : session.status === "incorrect" ? <XCircle size={19} /> : <Music2 size={19} />}</span><div><strong>{session.paused ? (pt ? "Pausado" : "Paused") : session.status === "correct" ? (pt ? "Acorde confirmado" : "Chord confirmed") : session.status === "incorrect" ? (pt ? "Confira as notas" : "Check the notes") : detected ? `${pt ? "Detectado" : "Detected"}: ${detected.symbol}` : (pt ? "Toque o acorde atual" : "Play the current chord")}</strong><small>{session.feedback.missing.length ? `${pt ? "Faltando" : "Missing"}: ${session.feedback.missing.map((pc) => pitchClassLabel(pc, "en")).join(" ")}` : `${session.index + 1}/${steps.length} · ${session.errors} ${pt ? "erros" : "errors"}`}</small></div><div className="pulse-dots">{[0, 1, 2, 3].map((beat) => <i key={beat} className={session.beat === beat ? "active" : ""} />)}</div></div>{session.paused && <button className="primary-button full-width" onClick={() => session.setPaused(false)}><Play size={18} />{pt ? "Continuar" : "Resume"}</button>}<InputPanel input={input} settings={settings} language={settings.language} onInputMode={onInputMode} onCalibrate={input.calibrate} compact /></div>;
}

function SongResult({ summary, language, onRetry, onBack }: { summary: PracticeSummary; language: Language; onRetry: () => void; onBack: () => void }) {
  const pt = language === "pt-BR";
  return <section className="song-result"><ProgressRing value={summary.accuracy} label={`${Math.round(summary.accuracy * 100)}%`} sublabel={pt ? "Precisão" : "Accuracy"} size={144} /><div><span className="eyebrow">{pt ? "SESSÃO CONCLUÍDA" : "SESSION COMPLETE"}</span><h2>{summary.accuracy > 0.85 ? (pt ? "Performance sólida!" : "Solid performance!") : (pt ? "Mais uma volta?" : "One more round?")}</h2><p>{pt ? "O resultado foi calculado pelos acordes detectados nesta seção." : "The result was calculated from chords detected in this section."}</p><div className="song-result-stats"><span><XCircle size={16} /><strong>{summary.errors}</strong>{pt ? "erros" : "errors"}</span><span><TimerReset size={16} /><strong>{Math.round(summary.durationSec)}s</strong>{pt ? "de prática" : "practice"}</span><span><Sparkles size={16} /><strong>{Math.round(summary.timingScore * 100)}%</strong>{pt ? "regularidade" : "regularity"}</span></div><div className="result-actions"><button className="secondary-button" onClick={onBack}><Music2 size={17} />{pt ? "Ajustar seção" : "Adjust section"}</button><button className="primary-button" onClick={onRetry}><RotateCcw size={17} />{pt ? "Tocar novamente" : "Play again"}</button></div></div></section>;
}
