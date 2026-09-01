import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { clientEnv } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-src",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${clientEnv.NEXT_PUBLIC_APP_NAME} — Inteligência de anúncios da Meta`,
    template: `%s · ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    "Mineração, análise e monitoramento de anúncios públicos da Meta Ad Library para gestores de tráfego e agências.",
  applicationName: clientEnv.NEXT_PUBLIC_APP_NAME,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#080b10",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <TooltipProvider delayDuration={250}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
