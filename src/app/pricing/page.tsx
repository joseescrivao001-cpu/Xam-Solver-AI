"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Check, Sparkles, Zap, Crown, Shield, 
  CreditCard, Smartphone, ArrowLeft,
  GraduationCap, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import PricingModal from "@/components/pricing-modal";

export default function PricingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("pro");
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email });
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan_type")
          .eq("id", user.id)
          .single();
        if (profile?.plan_type) {
          setCurrentPlan(profile.plan_type);
        }
      }
    };
    fetchUser();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Deep Space Background Lighting */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="h-20 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              ExamSolver AI
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white rounded-xl text-xs h-9">
              Voltar ao Dashboard
            </Button>
          </Link>
          {!user && (
            <Link href="/login">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-9 px-4">
                Iniciar Sessão
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-6xl mx-auto px-6 py-16 lg:py-24 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Planos &amp; Moeda Local Angola + Cartões Globais
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Eleve sua preparação com o <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">poder da IA de Elite</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Resolva questões complexas, provas inteiras e equações passo a passo com modelos avançados do Google DeepMind, redundância total e suporte contínuo.
          </p>
        </div>

        {/* 3 Monumental Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          
          {/* 1. PLANO PRO */}
          <div className="relative rounded-3xl p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:shadow-black/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Iniciante</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                  {currentPlan === 'pro' ? '✓ Seu Plano Atual' : 'Base'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Pro</h3>
              <p className="text-xs text-zinc-400 mb-6">Ideal para estudos diários e questões rápidas.</p>
              
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-4xl font-extrabold text-white">0 Kz</span>
                <span className="text-xs text-zinc-500">/ grátis inicial</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800/80 pt-6 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>50 Créditos de Resolução</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Modelos Gemini Flash Rápidos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Suporte a Imagens e Fotos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Cadernos de Estudos</span>
                </div>
              </div>
            </div>

            <Button 
              disabled={currentPlan === 'pro'}
              onClick={() => setIsPricingModalOpen(true)}
              variant="outline" 
              className="w-full mt-8 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl h-12"
            >
              {currentPlan === 'pro' ? 'Plano Ativo' : 'Selecionar'}
            </Button>
          </div>

          {/* 2. PLANO ULTRA (POPULAR - NEON VIOLET) */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border-2 border-violet-500/80 flex flex-col justify-between shadow-2xl shadow-violet-500/20 transform md:-translate-y-4 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Mais Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Avançado</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Alta Potência
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Ultra</h3>
              <p className="text-xs text-zinc-400 mb-6">Para vestibulandos, concurseiros e universitários.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-extrabold text-white">19.000 Kz</span>
                <span className="text-xs text-zinc-400 font-medium">/ $19 USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800 pt-6 text-sm text-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-semibold text-white">250 Créditos Mensais</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-semibold text-violet-300">Acesso ao Gemini 1.5 Pro</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Raciocínio Passo a Passo Rigoroso</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Resolução Instantânea de Imagens</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Roteamento com Groq de Backup</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full mt-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-2xl h-12 shadow-lg shadow-violet-600/30 cursor-pointer"
            >
              {currentPlan === 'ultra' ? 'Plano Ativo (Recarregar)' : 'Fazer Upgrade para Ultra'}
            </Button>
          </div>

          {/* 3. PLANO PREMIUM (VIP GOLD) */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-amber-500/50 flex flex-col justify-between hover:border-amber-400 transition-all duration-300 group hover:shadow-2xl hover:shadow-amber-500/10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Exclusivo</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> VIP
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Premium</h3>
              <p className="text-xs text-zinc-400 mb-6">Poder irrestrito com canal direto ao criador.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-extrabold text-white">39.000 Kz</span>
                <span className="text-xs text-zinc-400 font-medium">/ $39 USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800 pt-6 text-sm text-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="font-semibold text-amber-300">Créditos Ilimitados</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Máxima Prioridade nos Servidores</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Modelos Gemini Pro + Groq Tier Nuclear</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Suporte Prioritário 24/7 via WhatsApp</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-xs text-zinc-400">Atendimento direto com José Escrivão</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => setIsPricingModalOpen(true)}
              className="w-full mt-8 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 font-bold rounded-2xl h-12 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {currentPlan === 'premium' ? 'Plano Ativo' : 'Adquirir Premium VIP'}
            </Button>
          </div>

        </div>

        {/* Payment Methods Banner */}
        <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-8 sm:p-10 mb-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Métodos de Pagamento Seguros
              </h3>
              <p className="text-sm text-zinc-400 max-w-xl">
                Suportamos transferência bancária e express instantânea para Angola via Multicaixa Express (MCX) com validação de comprovativo, além de cartões de crédito internacionais via Stripe.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-sm font-semibold text-emerald-400">
                <Smartphone className="w-4 h-4" /> Multicaixa Express
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-sm font-semibold text-indigo-400">
                <CreditCard className="w-4 h-4" /> Cartão Internacional
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-10 flex items-center justify-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-400" /> Perguntas Frequentes
          </h2>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <h4 className="font-semibold text-white text-base mb-1.5">Como funciona a ativação via Multicaixa Express?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Ao selecionar o Multicaixa Express no modal de pagamento, você visualiza o número de telefone e dados de José Escrivão Silvestre (+244 930 339 436). Basta transferir o valor do plano e anexar o comprovativo. Nossa equipe valida e libera seus créditos quase que imediatamente.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <h4 className="font-semibold text-white text-base mb-1.5">Qual a diferença entre o Gemini Flash e o Gemini Pro?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                O modelo Flash é ultra-rápido para questões diretas e memorização. O modelo Gemini Pro possui capacidade avançada de raciocínio lógico, solucionando equações universitárias, provas de cálculo, física quântica e demonstrações matemáticas com rigor absoluto.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <h4 className="font-semibold text-white text-base mb-1.5">Os créditos expiram se eu não usar no mesmo mês?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Não! Seus créditos adquiridos permanecem na sua conta até serem utilizados, permitindo que você estude no seu próprio ritmo durante todo o ano acadêmico.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8 px-6 text-center text-xs text-zinc-500">
        <p>© {new Date().getFullYear()} ExamSolver AI — Desenvolvido com excelência por José Escrivão Silvestre (PANDA TECH).</p>
      </footer>

      {/* Modal de Checkout / Upgrade */}
      <PricingModal 
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentPlan={currentPlan}
        userEmail={user?.email}
        onPlanUpdated={() => {
          supabase.from("profiles").select("plan_type").eq("id", user?.id || "").single().then(({ data }) => {
            if (data?.plan_type) setCurrentPlan(data.plan_type);
          });
        }}
      />
    </div>
  );
}
