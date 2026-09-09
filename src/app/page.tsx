"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Sparkles, ArrowRight, CheckCircle2, UploadCloud } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/50 bg-zinc-950/50 backdrop-blur-md">
        <div className="container flex h-16 max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-400" />
            <span className="font-sans font-bold tracking-tight text-zinc-100">Exam Solver AI</span>
          </div>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-full">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-full bg-indigo-500 hover:bg-indigo-400 text-white border-0">
                Começar Grátis
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container max-w-6xl py-24 md:py-32 lg:py-40 flex flex-col items-center text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-300 mb-8 backdrop-blur-sm"
          >
            <Sparkles className="h-4 w-4 text-indigo-400" />
            O Motor Neural de Alta Performance
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl max-w-4xl font-sans"
          >
            Inteligência
            <span className="bg-gradient-to-r from-indigo-400 to-violet-500 bg-clip-text text-transparent"> Absoluta.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-8 max-w-[42rem] text-lg text-zinc-400 sm:text-xl font-serif"
          >
            Faça o upload da sua prova e veja a solução ser construída em tempo real. Uma experiência fluida, profunda e impulsionada pelo melhor modelo de IA.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col gap-4 sm:flex-row"
          >
            <Link href="/login">
              <Button size="lg" className="rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 h-14 px-8 text-base font-medium transition-all hover:scale-105">
                Experimente o Solver <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Visual Storytelling Grid */}
          <div className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md"
            >
              <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center mb-6">
                <UploadCloud className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Input Visual</h3>
              <p className="text-zinc-400 text-sm">Arraste fotos complexas de provas. O motor extrai o texto, gráficos e entrelinhas instantaneamente.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md"
            >
              <div className="h-10 w-10 bg-violet-500/20 rounded-xl flex items-center justify-center mb-6">
                <BrainCircuit className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Raciocínio Profundo</h3>
              <p className="text-zinc-400 text-sm">O modelo processa cenários de alta complexidade seguindo lógicas rigorosas, sem alucinações.</p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-6 rounded-3xl bg-zinc-900/40 border border-zinc-800 backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent" />
              <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 relative z-10">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2 relative z-10">Resposta Estruturada</h3>
              <p className="text-zinc-400 text-sm relative z-10">Acompanhe a resposta surgir em tempo real, dividida metodicamente por etapas didáticas.</p>
            </motion.div>
          </div>

        </section>
      </main>

      <footer className="border-t border-zinc-800/50 bg-zinc-950 py-8">
        <div className="container max-w-6xl flex items-center justify-between">
          <p className="text-sm text-zinc-500 font-sans">
            © 2026 Exam Solver AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
