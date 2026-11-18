"use client";

import type { ReactNode } from "react";
import { ArrowLeft, LockKeyhole, Star } from "lucide-react";
import type { Screen } from "@/lib/types";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`} aria-label="TECLADO MASTER">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 68 58" role="img"><path d="M8 5h52l5 46H3z" fill="currentColor" opacity=".14"/><path d="M12 7h10l-2 32H7zm12 0h10v32H20zm12 0h10l2 32H36zm12 0h9l6 32H50z" fill="#f4f8ff"/><path d="M19 7h8l-2 20h-8zm15 0h8l1 20h-8zm16 0h7l3 20h-8z" fill="#071126"/><path d="M7 39h14l-1 10H5zm14 0h14v10H20zm15 0h15l2 10H36zm16 0h9l3 10H53z" fill="#dceaff"/></svg>
      </span>
      <span className="brand-type"><strong>TECLADO</strong><b>MASTER</b></span>
    </div>
  );
}

export function Stars({ count, size = 18 }: { count: number; size?: number }) {
  return <span className="stars" aria-label={`${count} / 3 estrelas`}>{[1, 2, 3].map((star) => <Star key={star} size={size} fill={star <= count ? "currentColor" : "none"} className={star <= count ? "star-on" : "star-off"} />)}</span>;
}

export function ProgressRing({ value, label, sublabel, size = 132 }: { value: number; label: string; sublabel: string; size?: number }) {
  const normalized = Math.max(0, Math.min(1, value));
  return (
    <div className="progress-ring" style={{ width: size, height: size, background: `conic-gradient(var(--green) 0 ${normalized * 55}%, var(--cyan) ${normalized * 55}% ${normalized * 100}%, rgba(105,135,190,.18) ${normalized * 100}% 100%)` }}>
      <div className="progress-ring-inner"><strong>{label}</strong><span>{sublabel}</span></div>
    </div>
  );
}

export function ScreenHeading({ eyebrow, title, subtitle, action, onBack }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode; onBack?: () => void }) {
  return (
    <div className="screen-heading">
      <div className="screen-heading-copy">
        {onBack && <button className="icon-button back-button" onClick={onBack} aria-label="Voltar"><ArrowLeft size={20} /></button>}
        <div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}

export function Locked({ label }: { label: string }) {
  return <span className="locked-label"><LockKeyhole size={13} />{label}</span>;
}

export function LevelPill({ level, label }: { level: number; label: string }) {
  return <span className={`level-pill level-${level}`}>{label} {level}</span>;
}

export function AppNavigation({ screen, navigate, labels }: { screen: Screen; navigate: (screen: Screen) => void; labels: { home: string; levels: string; songs: string; progress: string; settings: string } }) {
  const items = [
    { id: "home" as const, label: labels.home, icon: <svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg> },
    { id: "levels" as const, label: labels.levels, icon: <svg viewBox="0 0 24 24"><path d="M4 19h4v-6H4zm6 0h4V9h-4zm6 0h4V4h-4z"/></svg> },
    { id: "songs" as const, label: labels.songs, icon: <svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13h-2V6.7L11 8.3V18zm-3 3a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm12-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg> },
    { id: "progress" as const, label: labels.progress, icon: <svg viewBox="0 0 24 24"><path d="M7 3h10v3h4v4a5 5 0 0 1-5 5h-.4a6 6 0 0 1-3.6 3.8V20H16v2H8v-2h4v-1.2A6 6 0 0 1 8.4 15H8a5 5 0 0 1-5-5V6h4zm0 5H5v2a3 3 0 0 0 2 2.8zm10 4.8A3 3 0 0 0 19 10V8h-2z"/></svg> },
    { id: "settings" as const, label: labels.settings, icon: <svg viewBox="0 0 24 24"><path d="m10 2-1 3-2 .8-2.6-1.3L2 8l2 2.2v2.6L2 15l2.4 3.5L7 17.2l2 .8 1 3h4l1-3 2-.8 2.6 1.3L22 15l-2-2.2v-2.6L22 8l-2.4-3.5L17 5.8l-2-.8-1-3zm2 7a4 4 0 1 1 0 8 4 4 0 0 1 0-8"/></svg> },
  ];
  return <nav className="bottom-nav" aria-label="Navegação principal">{items.map((item) => <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => navigate(item.id)}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>;
}
