import type { Metadata } from "next";
import "./globals.css";
import { monoFont, readingFont, uiFont } from "./fonts";
import { SiteNav } from "@/components/SiteNav/SiteNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://footnote-desk.vercel.app"),
  // Link previews (Upwork, Slack, LinkedIn). The image is app/opengraph-image.png.
  openGraph: {
    type: "website",
    siteName: "Footnote Desk",
    title: "Footnote Desk: a support bot that shows its sources",
    description: "Answers customer questions only from your documents, cites the exact page, and says when it doesn't know.",
  },
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
