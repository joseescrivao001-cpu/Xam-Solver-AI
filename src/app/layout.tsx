import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const merriweather = Merriweather({ 
  weight: ["300", "400", "700"],
  subsets: ["latin"], 
  variable: "--font-merriweather" 
});

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Exam Solver AI - Lovable Edition",
  description: "A inteligência artificial acadêmica mais avançada do mercado.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${merriweather.variable} font-sans min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50 bg-white text-zinc-900`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
