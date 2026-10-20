import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { BarraInferior } from "@/components/BarraInferior";
import "./globals.css";

const fonteCorpo = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--fonte-corpo",
});

const fonteMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--fonte-mono",
});

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda pessoal: tarefas, eventos e hábitos.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f4f4f1",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteCorpo.variable} ${fonteMono.variable}`}>
      <body>
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
          <div className="flex flex-1 flex-col pb-20">{children}</div>
          <BarraInferior />
        </div>
      </body>
    </html>
  );
}
