import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TECLADO MASTER — Aprenda • Pratique • Evolua", template: "%s · TECLADO MASTER" },
  description: "Aprenda teclado por cifras com aulas práticas, reconhecimento por microfone e USB MIDI, músicas, avaliações e progresso real.",
  applicationName: "TECLADO MASTER",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "TECLADO MASTER", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1, viewportFit: "cover", themeColor: "#07132f", colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="pt-BR" data-theme="nebula"><body>{children}</body></html>;
}
