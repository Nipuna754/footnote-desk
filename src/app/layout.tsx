import type { Metadata } from "next";
import "./globals.css";
import { monoFont, readingFont, uiFont } from "./fonts";
import { SiteNav } from "@/components/SiteNav/SiteNav";

export const metadata: Metadata = {
  title: {
    default: "Footnote Desk: a support bot that shows its sources",
    template: "%s | Footnote Desk",
  },
  description:
    "Upload your manuals and policies. Footnote Desk answers customer questions from them, cites the exact page, and tells you what your documents don't cover.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${uiFont.variable} ${readingFont.variable} ${monoFont.variable}`}
    >
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
