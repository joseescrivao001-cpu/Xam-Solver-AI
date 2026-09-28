import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

interface SolutionProcessProps {
  thoughts: string;
}

export function SolutionProcess({ thoughts }: SolutionProcessProps) {
  if (!thoughts) return null;

  return (
    <details className="mb-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 group">
      <summary className="p-3 cursor-pointer text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
        <span>🔎 Processo de Raciocínio (AI Thought Process)</span>
        <ChevronDownIcon className="w-4 h-4 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 font-mono whitespace-pre-wrap">
        {thoughts}
      </div>
    </details>
  );
}
