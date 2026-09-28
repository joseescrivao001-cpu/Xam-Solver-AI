import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

// Fallback visualmente limpo para quando uma equação falhar no parsing
const MathFallback = ({ resetErrorBoundary }: FallbackProps) => (
  <div className="text-red-500 font-mono text-sm border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-3 rounded my-2">
    ⚠️ <strong>Erro na renderização da fórmula.</strong>
    <p className="mt-1 text-xs text-red-400">O motor matemático encontrou uma sintaxe LaTeX inválida.</p>
    <button 
      onClick={resetErrorBoundary}
      className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded text-xs transition-colors"
    >
      Tentar recarregar bloco
    </button>
  </div>
);

// Sanitização robusta para evitar que [ ] matemáticos ou fragmentos quebrem o KaTeX
function sanitizeIncompleteMath(content: string): string {
  if (!content) return "";
  let c = content;
  // Converte colchetes e parênteses escapados (padrão LaTeX comum) para cifrões padrão
  c = c.replace(/\\\[/g, "$$").replace(/\\\]/g, "$$").replace(/\\\(/g, "$").replace(/\\\)/g, "$");
  return c;
}

interface SafeMarkdownProps {
  content: string;
  isAiRole?: boolean;
}

export function SafeMarkdown({ content, isAiRole = false }: SafeMarkdownProps) {
  const safeContent = sanitizeIncompleteMath(content);

  return (
    <ErrorBoundary FallbackComponent={MathFallback}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        className={`prose dark:prose-invert prose-sm max-w-none font-serif math-renderer ${isAiRole ? 'leading-relaxed' : ''}`}
      >
        {safeContent}
      </ReactMarkdown>
    </ErrorBoundary>
  );
}
