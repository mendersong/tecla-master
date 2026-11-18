"use client";

import { Activity, AudioWaveform, Bluetooth, Mic, MicOff, Radio, SlidersHorizontal, Usb } from "lucide-react";
import type { usePerformanceInput } from "@/hooks/use-performance-input";
import type { Language, Settings } from "@/lib/types";

export function InputPanel({ input, settings, language, onInputMode, onCalibrate, compact = false }: {
  input: ReturnType<typeof usePerformanceInput>;
  settings: Settings;
  language: Language;
  onInputMode: (mode: Settings["inputMode"]) => void;
  onCalibrate: () => void;
  compact?: boolean;
}) {
  const pt = language === "pt-BR";
  const status = input.audioStatus;
  return (
    <section className={`input-panel ${compact ? "input-panel-compact" : ""}`} aria-label="Entrada musical">
      <div className="input-status-orb">
        {input.source === "midi" ? <Usb size={21} /> : input.source === "microphone" ? <AudioWaveform size={21} /> : <Radio size={21} />}
        <span className={status.state === "listening" || input.hasConnectedMidi ? "live-dot" : ""} />
      </div>
      <div className="input-panel-copy">
        <strong>{input.hasConnectedMidi && settings.inputMode === "auto" ? (pt ? "MIDI conectado · prioridade ativa" : "MIDI connected · priority active") : status.state === "listening" && settings.inputMode !== "touch" ? (pt ? "Análise espectral em tempo real" : "Real-time spectral analysis") : (pt ? "Aguardando você tocar..." : "Waiting for you to play...")}</strong>
        <span>{input.source === "midi" ? "USB MIDI · Note On / Off" : input.source === "microphone" ? `${status.detectedFrequency ? `${status.detectedFrequency.toFixed(1)} Hz · ` : ""}${pt ? "Microfone" : "Microphone"}` : (pt ? "Teclado de toque disponível" : "Touch keyboard available")}</span>
      </div>
      <div className="input-level" aria-label="Nível de entrada"><i style={{ width: `${Math.round(status.inputLevel * 100)}%` }} /></div>
      <div className="input-actions">
        <button className={`input-action ${settings.inputMode === "microphone" || status.state === "listening" ? "active" : ""}`} onClick={status.state === "listening" ? input.stopMicrophone : input.startMicrophone} title={pt ? "Microfone" : "Microphone"}>
          {status.state === "listening" ? <MicOff size={17} /> : <Mic size={17} />}<span>{status.state === "listening" ? (pt ? "Parar" : "Stop") : (pt ? "Microfone" : "Microphone")}</span>
        </button>
        <button className={`input-action ${input.hasConnectedMidi ? "active" : ""}`} onClick={input.connectMidi} title="USB MIDI"><Usb size={17} /><span>MIDI</span></button>
        {!compact && <button className="input-action" onClick={onCalibrate} disabled={status.state === "calibrating"}><SlidersHorizontal size={17} /><span>{status.state === "calibrating" ? (pt ? "Ouvindo..." : "Listening...") : (pt ? "Calibrar" : "Calibrate")}</span></button>}
      </div>
      <select className="input-mode-select" aria-label={pt ? "Modo de entrada" : "Input mode"} value={settings.inputMode} onChange={(event) => onInputMode(event.target.value as Settings["inputMode"])}>
        <option value="auto">{pt ? "Automática" : "Automatic"}</option><option value="midi">MIDI</option><option value="microphone">{pt ? "Microfone" : "Microphone"}</option><option value="touch">{pt ? "Toque" : "Touch"}</option>
      </select>
      {(input.midiError || status.message && ["denied", "error", "unsupported"].includes(status.state)) && <p className="input-error"><Activity size={14} />{input.midiError || status.message}</p>}
      {input.devices.length > 0 && <div className="midi-device-list">{input.devices.map((device) => <span key={device.id}><Bluetooth size={12} />{device.name} · {device.manufacturer}</span>)}</div>}
    </section>
  );
}
