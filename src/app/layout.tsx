import type { Metadata, Viewport } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  weight: ["300", "400", "700"],
  subsets: ["latin"],
  variable: "--font-merriweather",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Exam Solver AI — resolva qualquer exame, passo a passo",
    template: "%s · Exam Solver AI",
  },
  description:
    "Fotografe o exercício ou envie o PDF e receba a resolução completa, explicada passo a passo, com fórmulas formatadas. Matemática, Física, Química e Biologia.",
  applicationName: "Exam Solver AI",
  authors: [{ name: "Exam Solver AI" }],
  openGraph: {
    title: "Exam Solver AI",
    description:
      "Resoluções de exames STEM passo a passo, a partir de uma fotografia ou de um PDF.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111114" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <body className={`${inter.variable} ${merriweather.variable} min-h-screen font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
