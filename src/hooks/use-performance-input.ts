"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioStatus, MidiDeviceInfo, Settings } from "@/lib/types";
import { frequencyToMidi, midiToFrequency } from "@/lib/music";



type Voice = { oscillators: OscillatorNode[]; gain: GainNode };

const notesKey = (notes: Set<number>) => [...notes].sort((a, b) => a - b).join(",");

export function usePerformanceInput(settings: Settings) {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [midiNotes, setMidiNotes] = useState<Set<number>>(new Set());
  const [touchNotes, setTouchNotes] = useState<Set<number>>(new Set());
  const [micNotes, setMicNotes] = useState<Set<number>>(new Set());
  const [velocities, setVelocities] = useState<Record<number, number>>({});
  const [devices, setDevices] = useState<MidiDeviceInfo[]>([]);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>({ state: "idle", inputLevel: 0 });
  const [midiError, setMidiError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef<number | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const voicesRef = useRef<Map<number, Voice>>(new Map());
  const noiseProfileRef = useRef<Float32Array | null>(null);
  const micLastSeenRef = useRef<Map<number, number>>(new Map());
  const lastMicKeyRef = useRef("");
  const lastLevelUpdateRef = useRef(0);
  const lastFrequencyUpdateRef = useRef(0);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      contextRef.current = new AudioContextClass({ latencyHint: "interactive" });
    }
    if (contextRef.current.state === "suspended") void contextRef.current.resume();
    return contextRef.current;
  }, []);

  const stopSynthNote = useCallback((note: number) => {
    const context = contextRef.current;
    const voice = voicesRef.current.get(note);
    if (!context || !voice) return;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0.0001, now, 0.045);
    voice.oscillators.forEach((oscillator) => { try { oscillator.stop(now + 0.3); } catch { /* already stopped */ } });
    voicesRef.current.delete(note);
  }, []);

  const startSynthNote = useCallback((note: number, velocity = 0.82) => {
    const context = getContext();
    if (!context || voicesRef.current.has(note)) return;
    const gain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    filter.Q.value = 0.4;
    const now = context.currentTime;
    const volume = Math.max(0, Math.min(1, settingsRef.current.masterVolume)) * velocity;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.18), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.11), now + 0.22);
    filter.connect(gain);
    gain.connect(context.destination);
    const frequency = midiToFrequency(note);
    const oscillators = [
      { type: "triangle" as OscillatorType, ratio: 1, level: 1 },
      { type: "sine" as OscillatorType, ratio: 2, level: 0.24 },
    ].map(({ type, ratio, level }) => {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency * ratio;
      partial.gain.value = level;
      oscillator.connect(partial);
      partial.connect(filter);
      oscillator.start(now);
      return oscillator;
    });
    voicesRef.current.set(note, { oscillators, gain });
  }, [getContext]);

  const touchNoteOn = useCallback((note: number) => {
    startSynthNote(note);
    setTouchNotes((previous) => new Set(previous).add(note));
    setVelocities((previous) => ({ ...previous, [note]: 100 }));
  }, [startSynthNote]);

  const touchNoteOff = useCallback((note: number) => {
    stopSynthNote(note);
    setTouchNotes((previous) => { const next = new Set(previous); next.delete(note); return next; });
  }, [stopSynthNote]);

  const playChord = useCallback((notes: number[], durationMs = 850) => {
    notes.forEach((note) => {
      startSynthNote(note);
      setTouchNotes((previous) => new Set(previous).add(note));
      window.setTimeout(() => {
        stopSynthNote(note);
        setTouchNotes((previous) => { const next = new Set(previous); next.delete(note); return next; });
      }, durationMs);
    });
  }, [startSynthNote, stopSynthNote]);

  const metronomeClick = useCallback((accent = false) => {
    const context = getContext();
    if (!context || settingsRef.current.metronomeVolume <= 0) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(accent ? 1320 : 880, now);
    oscillator.frequency.exponentialRampToValueAtTime(accent ? 820 : 620, now + 0.035);
    gain.gain.setValueAtTime(settingsRef.current.metronomeVolume * 0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
  }, [getContext]);

  const refreshDevices = useCallback(() => {
    const access = midiAccessRef.current;
    if (!access) { setDevices([]); return; }
    const list = [...access.inputs.values()].map((input) => ({
      id: input.id, name: input.name || "MIDI Keyboard", manufacturer: input.manufacturer || "USB / MIDI",
      connected: input.state !== "disconnected",
    }));
    setDevices(list);
  }, []);

  const connectMidi = useCallback(async () => {
    setMidiError(null);
    if (!navigator.requestMIDIAccess) {
      setMidiError("Web MIDI não está disponível neste navegador. No Android, use Chrome com um adaptador USB OTG.");
      return;
    }
    try {
      const access = await navigator.requestMIDIAccess({ sysex: false });
      midiAccessRef.current = access;
      const bindInputs = () => {
        for (const input of access.inputs.values()) {
          input.onmidimessage = (event) => {
            const data = event.data;
            if (!data) return;
            const status = data[0] ?? 0;
            const note = data[1] ?? 0;
            const velocity = data[2] ?? 0;
            const command = status & 0xf0;
            if (command === 0x90 && velocity > 0) {
              setMidiNotes((previous) => new Set(previous).add(note));
              setVelocities((previous) => ({ ...previous, [note]: velocity }));
              startSynthNote(note, Math.max(0.12, velocity / 127));
            } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
              setMidiNotes((previous) => { const next = new Set(previous); next.delete(note); return next; });
              stopSynthNote(note);
            } else if (command === 0xb0 && note === 123) {
              setMidiNotes(new Set());
              voicesRef.current.forEach((_, activeNote) => stopSynthNote(activeNote));
            }
          };
        }
        refreshDevices();
      };
      access.onstatechange = () => {
        setMidiNotes(new Set());
        voicesRef.current.forEach((_, activeNote) => stopSynthNote(activeNote));
        bindInputs();
      };
      bindInputs();
    } catch (error) {
      setMidiError(error instanceof Error ? error.message : "Não foi possível acessar o dispositivo MIDI.");
    }
  }, [refreshDevices, startSynthNote, stopSynthNote]);

  const stopMicrophone = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
    micLastSeenRef.current.clear();
    lastMicKeyRef.current = "";
    setMicNotes(new Set());
    setAudioStatus({ state: "idle", inputLevel: 0 });
  }, []);

  const analyse = useCallback(() => {
    const analyser = analyserRef.current;
    const context = contextRef.current;
    if (!analyser || !context) return;
    const spectrum = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(spectrum);
    const timeDomain = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(timeDomain);
    let sumSquares = 0;
    for (let i = 0; i < timeDomain.length; i += 4) sumSquares += timeDomain[i] ** 2;
    const rms = Math.sqrt(sumSquares / Math.ceil(timeDomain.length / 4));
    const now = performance.now();
    if (now - lastLevelUpdateRef.current > 90) {
      lastLevelUpdateRef.current = now;
      setAudioStatus((previous) => ({ ...previous, inputLevel: Math.min(1, rms * 9) }));
    }

    const sampleRate = context.sampleRate;
    const binWidth = sampleRate / analyser.fftSize;
    const noise = noiseProfileRef.current;
    const gate = settingsRef.current.noiseGate;
    const sensitivity = settingsRef.current.micSensitivity;
    const minRms = 0.003 + gate * 0.035;
    const detected = new Map<number, number>();
    let strongestFrequency = 0;
    let strongestMagnitude = 0;

    if (rms >= minRms) {
      const magnitude = (frequency: number) => {
        if (frequency < 45 || frequency > 4200) return 0;
        const position = frequency / binWidth;
        const left = Math.max(0, Math.floor(position));
        const right = Math.min(spectrum.length - 1, left + 1);
        const blend = position - left;
        const db = spectrum[left] * (1 - blend) + spectrum[right] * blend;
        const ambient = noise ? noise[left] * (1 - blend) + noise[right] * blend : -105;
        const cleanedDb = Math.max(-120, db, ambient - 120);
        const aboveNoise = Math.max(0, db - Math.max(ambient + 5 + gate * 14, -92 + gate * 24));
        return (10 ** (cleanedDb / 20)) * Math.min(1, aboveNoise / 22);
      };

      const candidates: { midi: number; salience: number; fundamental: number }[] = [];
      for (let midi = 36; midi <= 88; midi += 1) {
        const frequency = midiToFrequency(midi);
        const fundamental = magnitude(frequency);
        const h2 = magnitude(frequency * 2);
        const h3 = magnitude(frequency * 3);
        const h4 = magnitude(frequency * 4);
        const subharmonicPenalty = midi > 48 ? magnitude(frequency / 2) * 0.12 : 0;
        const salience = fundamental + h2 * 0.34 + h3 * 0.18 + h4 * 0.09 - subharmonicPenalty;
        if (fundamental > 0.00008 && salience > 0) candidates.push({ midi, salience, fundamental });
      }
      candidates.sort((a, b) => b.salience - a.salience);
      const maxSalience = candidates[0]?.salience ?? 0;
      const relativeThreshold = 0.34 - sensitivity * 0.22;
      for (const candidate of candidates) {
        if (detected.size >= 6 || candidate.salience < maxSalience * relativeThreshold) continue;
        const isWeakHarmonic = [...detected.keys()].some((lowerMidi) => {
          const ratio = midiToFrequency(candidate.midi) / midiToFrequency(lowerMidi);
          return [2, 3, 4].some((harmonic) => Math.abs(ratio - harmonic) < 0.025) && candidate.fundamental < candidate.salience * 0.34;
        });
        if (!isWeakHarmonic) {
          detected.set(candidate.midi, candidate.salience);
          if (candidate.fundamental > strongestMagnitude) {
            strongestMagnitude = candidate.fundamental;
            strongestFrequency = midiToFrequency(candidate.midi);
          }
        }
      }
    }

    const lastSeen = micLastSeenRef.current;
    detected.forEach((_, midi) => lastSeen.set(midi, now));
    const sustain = settingsRef.current.sustainMs;
    const sustained = new Set<number>();
    lastSeen.forEach((seen, midi) => {
      if (now - seen <= sustain) sustained.add(midi);
      else lastSeen.delete(midi);
    });
    const key = notesKey(sustained);
    if (key !== lastMicKeyRef.current) {
      lastMicKeyRef.current = key;
      setMicNotes(sustained);
    }
    if (strongestFrequency && now - lastFrequencyUpdateRef.current > 140) {
      lastFrequencyUpdateRef.current = now;
      const midi = frequencyToMidi(strongestFrequency);
      setAudioStatus((previous) => ({ ...previous, state: "listening", detectedFrequency: strongestFrequency, message: `${midi}` }));
    }
    frameRef.current = requestAnimationFrame(analyse);
  }, []);

  const startMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setAudioStatus({ state: "unsupported", inputLevel: 0, message: "Microfone requer HTTPS e um navegador compatível." });
      return;
    }
    stopMicrophone();
    setAudioStatus({ state: "requesting", inputLevel: 0 });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 }, video: false,
      });
      const context = getContext();
      if (!context) throw new Error("Áudio não suportado");
      streamRef.current = stream;
      const source = context.createMediaStreamSource(stream);
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 48;
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 4200;
      const analyser = context.createAnalyser();
      analyser.fftSize = 8192;
      analyser.smoothingTimeConstant = 0.35;
      analyser.minDecibels = -110;
      analyser.maxDecibels = -12;
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(analyser);
      analyserRef.current = analyser;
      noiseProfileRef.current = null;
      setAudioStatus({ state: "listening", inputLevel: 0 });
      frameRef.current = requestAnimationFrame(analyse);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setAudioStatus({ state: denied ? "denied" : "error", inputLevel: 0, message: error instanceof Error ? error.message : "Falha ao acessar o microfone" });
    }
  }, [analyse, getContext, stopMicrophone]);

  const calibrate = useCallback(async () => {
    let analyser = analyserRef.current;
    if (!analyser) {
      await startMicrophone();
      analyser = analyserRef.current;
    }
    const context = contextRef.current;
    if (!analyser || !context) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    setAudioStatus({ state: "calibrating", inputLevel: 0, message: "Fique em silêncio por 1,5 segundo" });
    const samples: Float32Array[] = [];
    const started = performance.now();
    await new Promise<void>((resolve) => {
      const collect = () => {
        const current = analyserRef.current;
        if (!current) { resolve(); return; }
        const data = new Float32Array(current.frequencyBinCount);
        current.getFloatFrequencyData(data);
        samples.push(data);
        if (performance.now() - started < 1500) requestAnimationFrame(collect);
        else resolve();
      };
      collect();
    });
    if (!samples.length) return;
    const profile = new Float32Array(samples[0].length);
    for (let bin = 0; bin < profile.length; bin += 1) {
      const column = samples.map((sample) => sample[bin]).sort((a, b) => a - b);
      profile[bin] = column[Math.floor(column.length * 0.65)];
    }
    noiseProfileRef.current = profile;
    setAudioStatus({ state: "listening", inputLevel: 0, message: "Calibração concluída" });
    frameRef.current = requestAnimationFrame(analyse);
  }, [analyse, startMicrophone]);

  useEffect(() => () => {
    stopMicrophone();
    voicesRef.current.forEach((_, note) => stopSynthNote(note));
    if (midiAccessRef.current) midiAccessRef.current.onstatechange = null;
  }, [stopMicrophone, stopSynthNote]);

  const hasConnectedMidi = devices.some((device) => device.connected);
  const midiPriority = settings.inputMode === "midi" || (settings.inputMode === "auto" && hasConnectedMidi);
  const micEnabled = settings.inputMode === "microphone" || (settings.inputMode === "auto" && !hasConnectedMidi);
  let activeNotes = new Set<number>([...touchNotes]);
  let source: "midi" | "microphone" | "touch" = touchNotes.size ? "touch" : "touch";
  if (midiPriority) {
    activeNotes = new Set([...touchNotes, ...midiNotes]);
    if (midiNotes.size) source = "midi";
  } else if (micEnabled && audioStatus.state === "listening") {
    activeNotes = new Set([...touchNotes, ...micNotes]);
    if (micNotes.size) source = "microphone";
  }

  return {
    activeNotes, velocities, source, devices, hasConnectedMidi, audioStatus, midiError,
    touchNoteOn, touchNoteOff, playChord, metronomeClick, connectMidi, startMicrophone, stopMicrophone, calibrate,
  };
}
