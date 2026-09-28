import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

interface SolutionProcessProps {
  thoughts: string;
}

export function SolutionProcess({ thoughts }: SolutionProcessProps) {
  if (!thoughts) return null;

  return (
    <details className="mb-4 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 group overflow-hidden backdrop-blur-sm transition-all duration-300">
      <summary className="p-3.5 cursor-pointer text-[13px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2 select-none">
        <span className="flex-1">🔎 Processo de Raciocínio Profundo</span>
        <ChevronDownIcon className="w-4 h-4 group-open:rotate-180 transition-transform duration-300 ease-out" />
      </summary>
      <div className="p-4 pt-2 border-t border-zinc-200 dark:border-zinc-800/50 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap">
        {thoughts}
      </div>
    </details>
  );
}
