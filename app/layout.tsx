import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilgangsstyring",
  description:
    "Internt verktøy for dokumentasjon og revisjon av systemtilganger.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nb" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
