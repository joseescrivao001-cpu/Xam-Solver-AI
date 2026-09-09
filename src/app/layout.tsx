import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const merriweather = Merriweather({ 
  weight: ["300", "400", "700"],
  subsets: ["latin"], 
  variable: "--font-merriweather" 
});

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
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${merriweather.variable} font-sans bg-zinc-950 text-zinc-50 min-h-screen selection:bg-indigo-500/30 selection:text-indigo-200`}>
        {children}
      </body>
    </html>
  );
}
