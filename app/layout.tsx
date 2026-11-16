import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Free Website Report Card | Banner 61",
  description: "A free, automated website audit for Christian schools, graded against the same standards Banner 61 uses in its full audits.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Figtree:wght@400;600;700&family=IBM+Plex+Mono&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
