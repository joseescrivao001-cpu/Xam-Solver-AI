'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Atom, Calculator, FlaskConical, Dna } from 'lucide-react';

interface WelcomeScreenProps {
  notebookName?: string | null;
  onSuggestionClick: (text: string) => void;
  children?: React.ReactNode;
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
export function WelcomeScreen({ notebookName, onSuggestionClick, children }: WelcomeScreenProps) {
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
      className="flex flex-col items-center justify-center max-w-3xl mx-auto w-full pt-12 pb-24 px-4 gap-8"
    >
      {/* Logo & Headline */}
      <motion.div variants={itemVariants} className="text-center w-full">
        <div className="relative inline-block mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 dark:border-indigo-500/30">
            <BrainCircuit className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          {notebookName
            ? `Ambiente: ${notebookName}`
            : <>Como posso ajudar nos <span className="text-indigo-500 dark:text-indigo-400">teus estudos?</span></>}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base max-w-md mx-auto leading-relaxed">
          {notebookName
            ? 'Resoluções e imagens enviadas aqui são associadas automaticamente a este caderno.'
            : 'Resolva, estude e compreenda qualquer questão. Respostas analisadas e explicadas passo a passo.'}
        </p>
      </motion.div>

      {/* COMPOSER INJECTED HERE IN EMPTY STATE */}
      {children ? (
        <motion.div variants={itemVariants} className="w-full z-20">
          {children}
        </motion.div>
      ) : (
        <div className="h-28 w-full" />
      )}

      {/* Suggestion Chips - Minimal Outline */}
      <motion.div variants={itemVariants} className="w-full mt-2">
        <div className="flex items-center justify-center gap-2 mb-4 text-xs font-medium text-zinc-400">
          Sugestões
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              onClick={() => onSuggestionClick(s.text)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors text-sm"
            >
              <div className="text-indigo-500">{s.icon}</div>
              {s.label}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
