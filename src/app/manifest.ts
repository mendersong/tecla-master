import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TECLADO MASTER — Aprenda • Pratique • Evolua",
    short_name: "TECLADO MASTER",
    description: "Professor particular de teclado por cifras, com microfone, MIDI e progresso real.",
    start_url: "/",
    display: "standalone",
    background_color: "#050b21",
    theme_color: "#07132f",
    orientation: "any",
    lang: "pt-BR",
    categories: ["education", "music"],
    icons: [{ src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
