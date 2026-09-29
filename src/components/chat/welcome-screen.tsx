'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Atom, Calculator, FlaskConical, Dna } from 'lucide-react';

interface WelcomeScreenProps {
  notebookName?: string | null;
  onSuggestionClick: (text: string) => void;
}

const SUGGESTIONS = [
  {
    icon: <Calculator className="w-4 h-4" />,
    label: 'Matemática',
    text: 'Resolva: Uma bola é lançada com velocidade inicial v₀ = 20 m/s a 45°. Calcule o alcance horizontal.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/8 hover:bg-blue-500/14 border-blue-500/15',
  },
  {
    icon: <Atom className="w-4 h-4" />,
    label: 'Física',
    text: 'Um bloco de 5kg está sobre uma superfície com μk = 0,3. Força horizontal F = 40N. Calcule aceleração.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/8 hover:bg-purple-500/14 border-purple-500/15',
  },
  {
    icon: <FlaskConical className="w-4 h-4" />,
    label: 'Química',
    text: 'Balanceie e explique: C₃H₈ + O₂ → CO₂ + H₂O',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/8 hover:bg-emerald-500/14 border-emerald-500/15',
  },
  {
    icon: <Dna className="w-4 h-4" />,
    label: 'Biologia',
    text: 'Explique o ciclo de Krebs e sua importância na respiração celular.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/8 hover:bg-rose-500/14 border-rose-500/15',
  },
];

/**
 * WelcomeScreen — Proprietary Enterprise Design System
 * 
 * Empty-state hero shown before the first message.
 * Staggered Framer Motion entry, suggestion chips with
 * subject-coded color accents, clean glassmorphism.
 */
export function WelcomeScreen({ notebookName, onSuggestionClick }: WelcomeScreenProps) {
  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full pb-24 px-4 gap-8"
    >
      {/* Logo & Headline */}
      <motion.div variants={itemVariants} className="text-center">
        <div className="relative inline-block mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          {/* Glow ring */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 blur-xl opacity-30 -z-10 scale-110" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mb-3">
          {notebookName
            ? `Ambiente: ${notebookName}`
            : 'Como posso te ajudar hoje?'}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          {notebookName
            ? 'Resoluções e imagens enviadas aqui são associadas automaticamente a este caderno.'
            : 'Envie uma imagem de prova ou questão para resolução acadêmica com precisão zero-alucinação.'}
        </p>
      </motion.div>

      {/* Suggestion Chips */}
      <motion.div variants={itemVariants} className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestionClick(s.text)}
            className={`
              group flex items-start gap-3 text-left
              px-4 py-3.5 rounded-2xl border
              bg-white/50 dark:bg-zinc-900/40 backdrop-blur-sm
              ${s.bg}
              transition-all duration-200
              hover:scale-[1.02] hover:shadow-sm
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50
            `}
          >
            <span className={`mt-0.5 shrink-0 ${s.color}`}>{s.icon}</span>
            <div>
              <span className={`block text-[11px] font-bold uppercase tracking-widest mb-0.5 ${s.color}`}>
                {s.label}
              </span>
              <span className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-snug line-clamp-2">
                {s.text}
              </span>
            </div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}
