import localFont from "next/font/local";

/*
  Self-hosted fonts (SIL Open Font License, from Fontsource).
  next/font preloads them and sizes a matching fallback, so nothing shifts.
*/

export const uiFont = localFont({
  src: "../fonts/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-ui-face",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const readingFont = localFont({
  src: "../fonts/source-serif-4-latin-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-reading-face",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const monoFont = localFont({
  src: "../fonts/ibm-plex-mono-latin-500-normal.woff2",
  weight: "500",
  variable: "--font-mono-face",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["ui-monospace", "Menlo", "monospace"],
});
