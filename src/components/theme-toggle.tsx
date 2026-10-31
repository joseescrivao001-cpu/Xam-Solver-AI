"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "cn";

/**
 * Seletor de tema acessível com as três preferências reais:
 * `system`, `light` e `dark`.
 *
 * - `role="radiogroup"` com setas do teclado herdadas do padrão de radio;
 * - rótulos acessíveis (não depende apenas do ícone);
 * - só renderiza o estado ativo depois da hidratação, para não provocar
 *   mismatch entre servidor e cliente.
 */

const OPTIONS = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-1 p-0.5",
        className
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.value as ThemeValue)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-fast",
              "text-muted-foreground hover:text-foreground hover:bg-secondary",
              active && "bg-background text-foreground shadow-sm"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
