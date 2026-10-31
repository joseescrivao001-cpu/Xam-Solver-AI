import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ListChecks,
  MessagesSquare,
  Sigma,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { PLANS } from "@/lib/plans";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Exam Solver AI — resolva qualquer exame, passo a passo",
};

const STEPS = [
  {
    icon: Camera,
    title: "Fotografe",
    body: "Aponte a câmara à folha do exame ou carregue o PDF. A imagem é lida por um modelo com visão.",
  },
  {
    icon: Sigma,
    title: "Resolva",
    body: "A resolução é construída passo a passo, com as fórmulas escritas e formatadas — não apenas o resultado.",
  },
  {
    icon: BookOpen,
    title: "Compreenda",
    body: "Guarde a resolução no caderno da disciplina, acrescente notas e volte a ela antes da prova.",
  },
];

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Foto, PDF ou texto",
    body: "JPG, PNG, WEBP e PDF até 4 MB. Se a página estiver torta, o modelo transcreve os dados e resolve na mesma.",
  },
  {
    icon: ListChecks,
    title: "Estrutura de resolução",
    body: "Desconstrução dos dados, desenvolvimento passo a passo e resposta final destacada. Sem saltos de raciocínio.",
  },
  {
    icon: Sigma,
    title: "Fórmulas legíveis",
    body: "Integrais, matrizes e frações renderizados com KaTeX. Equações longas deslizam em vez de quebrar o layout.",
  },
  {
    icon: BookOpen,
    title: "Cadernos de estudo",
    body: "Organize materiais e notas por disciplina e mantenha as conversas ligadas ao caderno certo.",
  },
  {
    icon: Sparkles,
    title: "Ferramentas de estudo",
    body: "A partir do próprio caderno: resumo estruturado, exercícios inéditos, quiz rápido e análise dos erros recorrentes.",
  },
  {
    icon: MessagesSquare,
    title: "Histórico pesquisável",
    body: "Todas as resoluções ficam associadas à conta. Retome uma conversa semanas depois, sem recomeçar.",
  },
];

const FAQ = [
  {
    q: "Como envio a minha questão?",
    a: "No painel, escolha a fotografia, o PDF ou escreva a pergunta. Pode anexar uma imagem e juntar uma nota com o que já tentou.",
  },
  {
    q: "A resolução mostra os passos ou só o resultado?",
    a: "Mostra os passos. A resposta é organizada em três blocos: desconstrução dos dados, resolução justificada e resposta final destacada.",
  },
  {
    q: "Que ficheiros são aceites?",
    a: "JPG, PNG, WEBP e PDF, até 4 MB por ficheiro. Para fotos de telemóvel, reduza a qualidade antes de enviar.",
  },
  {
    q: "Como funcionam os créditos?",
    a: "Cada resolução consome um crédito. Ao criar conta recebe 50; sem conta pode experimentar 5. No plano Premium não há contagem.",
  },
  {
    q: "Existe cobrança automática todos os meses?",
    a: "Não. O pagamento é único e não gera renovação automática. Quando os créditos terminam, decide se recarrega.",
  },
  {
    q: "Em que idioma recebo a resposta?",
    a: "Em português. A explicação é escrita para ser estudada, não apenas consultada.",
  },
];

export default function Home() {
  const paidPlans = [PLANS.pro, PLANS.premium];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Exam Solver AI — início">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sigma className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Exam Solver AI</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Navegação principal">
            <a
              href="#como-funciona"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Recursos
            </a>
            <a
              href="#planos"
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Planos
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Começar
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.10),transparent_70%)]"
          />

          <div className="container relative grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-28">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
                Matemática · Física · Química · Biologia
              </span>

              <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                A prova na sua mão.
                <br />
                <span className="text-primary">A resolução na sua frente.</span>
              </h1>

              <p className="mt-5 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground">
                Fotografe o exercício ou envie o PDF. Receba a resolução completa, explicada
                passo a passo, com as fórmulas escritas como devem ser. Sem saltos, sem adivinhação.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Resolver a minha primeira questão
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="#planos"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Ver planos
                </Link>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                5 resoluções antes de criar conta · {PLANS.free.credits} créditos ao registar · sem
                cobrança automática
              </p>
            </div>

            {/* Demonstração: excerto de uma resolução real no formato do produto */}
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Física · Cinemática
                  </span>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                    exemplo
                  </span>
                </div>

                <div className="space-y-4 px-5 py-5 text-sm">
                  <div className="rounded-lg border border-border bg-surface-1 px-3 py-2 text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground">Pergunta:</span> Um corpo parte do
                    repouso com aceleração constante de 2 m/s². Que distância percorre em 5 s?
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      Desconstrução
                    </p>
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      Dados: v₀ = 0 m/s · a = 2 m/s² · t = 5 s. Pedido: deslocamento Δs. A velocidade
                      inicial nula elimina o termo v₀·t.
                    </p>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      Resolução
                    </p>
                    <div className="rounded-lg border border-border bg-surface-1 px-3 py-2.5 font-serif text-[15px]">
                      Δs = v₀·t + ½·a·t²
                      <br />
                      Δs = 0 + ½ · 2 · (5)²
                      <br />
                      Δs = 25 m
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                      Resposta final
                    </p>
                    <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[13px] font-medium">
                      Δs = 25 m
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Excerto ilustrativo do formato de resposta do produto.
              </p>
            </div>
          </div>
        </section>

        {/* ── Como funciona ────────────────────────────────────────────── */}
        <section id="como-funciona" className="border-t border-border bg-surface-1 py-16 md:py-20">
          <div className="container">
            <div className="max-w-2xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                Três passos, do papel à compreensão
              </h2>
              <p className="mt-3 text-muted-foreground">
                O objetivo não é entregar um resultado para copiar. É ficar a saber fazer.
              </p>
            </div>

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="rounded-xl border border-border bg-card p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        Passo {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-medium">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── Recursos ─────────────────────────────────────────────────── */}
        <section id="recursos" className="py-16 md:py-20">
          <div className="container">
            <div className="max-w-2xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                O que já está no produto
              </h2>
              <p className="mt-3 text-muted-foreground">
                Tudo abaixo existe na aplicação e está ligado ao servidor. Nada aqui é promessa de
                roadmap.
              </p>
            </div>

            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title}>
                    <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="mt-3 text-sm font-medium">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Planos ───────────────────────────────────────────────────── */}
        <section id="planos" className="border-t border-border bg-surface-1 py-16 md:py-20">
          <div className="container">
            <div className="max-w-2xl">
              <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
                Planos simples, sem surpresas
              </h2>
              <p className="mt-3 text-muted-foreground">
                Um crédito por resolução. Pode pagar com cartão ou por transferência. Os valores em
                kwanzas usam o câmbio do dia e aparecem na página de planos.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {/* Free */}
              <div className="flex flex-col rounded-xl border border-border bg-card p-6">
                <h3 className="text-sm font-medium">{PLANS.free.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{PLANS.free.tagline}</p>
                <p className="mt-5 text-3xl font-semibold tracking-tight">Grátis</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {PLANS.free.features.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/dashboard"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Criar conta
                </Link>
              </div>

              {/* Pagos */}
              {paidPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col rounded-xl border bg-card p-6 ${
                    plan.id === "pro" ? "border-primary/60 shadow-md" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">{plan.name}</h3>
                    {plan.id === "pro" && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
                        Mais escolhido
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                  <p className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">${plan.priceUsd}</span>
                    <span className="text-xs text-muted-foreground">USD · pagamento único</span>
                  </p>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/pricing"
                    className={`mt-6 inline-flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-opacity hover:opacity-90 ${
                      plan.id === "pro"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-secondary"
                    }`}
                  >
                    Escolher {plan.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Perguntas frequentes ─────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Perguntas frequentes</h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Se ficar alguma dúvida, escreva para{" "}
                <a className="text-primary underline-offset-4 hover:underline" href="mailto:joseescrivao001@gmail.com">
                  joseescrivao001@gmail.com
                </a>
                .
              </p>
            </div>

            <dl className="divide-y divide-border">
              {FAQ.map((item) => (
                <div key={item.q} className="py-4 first:pt-0 last:pb-0">
                  <dt className="text-sm font-medium">{item.q}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Chamada final ────────────────────────────────────────────── */}
        <section className="border-t border-border bg-surface-1 py-16 md:py-20">
          <div className="container flex flex-col items-center text-center">
            <h2 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              A próxima prova pode ser a primeira que entende por inteiro.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Comece com {PLANS.free.credits} créditos gratuitos. Sem cartão, sem compromisso.
            </p>
            <Link
              href="/dashboard"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Começar agora
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Sigma className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>© {new Date().getFullYear()} Exam Solver AI</span>
          </div>

          <nav className="flex items-center gap-5" aria-label="Navegação do rodapé">
            <Link href="/pricing" className="transition-colors hover:text-foreground">
              Planos
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Painel
            </Link>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Entrar
            </Link>
            <a href="mailto:joseescrivao001@gmail.com" className="transition-colors hover:text-foreground">
              Contacto
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
