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

interface PaymentSettingsData {
  bank_name: string;
  account_holder: string;
  express_phone: string;
  iban: string;
  usd_to_aoa_rate: number;
  plans: {
    ultra: { usd: number; aoa: number; formatted_aoa: string };
    premium: { usd: number; aoa: number; formatted_aoa: string };
  };
}

export default function PricingPage() {
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("pro");
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentSettingsData | null>(null);

  useEffect(() => {
    const fetchUserAndSettings = async () => {
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

      fetch("/api/payment-settings")
        .then(res => res.json())
        .then(data => {
          if (data?.plans) setPaymentData(data);
        })
        .catch(err => console.warn("Erro ao buscar configurações de pagamento:", err));
    };
    fetchUserAndSettings();
  }, [supabase]);

  const ultraAoa = paymentData?.plans?.ultra?.formatted_aoa || "19.000 Kz";
  const premiumAoa = paymentData?.plans?.premium?.formatted_aoa || "39.000 Kz";
  const exchangeRate = paymentData?.usd_to_aoa_rate || 950;
  const accountHolder = paymentData?.account_holder || "José Escrivão Silvestre";
  const expressPhone = paymentData?.express_phone || "+244 930 339 436";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Deep Space Background Lighting */}
      <div className="absolute top-[-10%] left-[20%] w-[60%] h-[50%] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

      {/* Header com botão em destaque para Voltar ao Chat */}
      <header className="h-20 border-b border-zinc-800/60 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-500/20 transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Chat
          </Link>
          <div className="hidden sm:flex items-center gap-2 ml-2">
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
              Meu Dashboard
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
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 lg:py-20 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" /> Câmbio Comercial em Tempo Real (1 USD ≈ {exchangeRate} Kz)
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Poder de Elite com <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">Multi-LLM Engine</span>
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
            Resolva exames, provas complexas e cálculos avançados com o cluster que integra Meta LLaMA 3.3 70B via Groq LPU, Google DeepMind e Roteador Neural Indestrutível com Failover automático.
          </p>
        </div>

        {/* 3 Monumental Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-20">
          
          {/* 1. PLANO PRO (1.000 Créditos) */}
          <div className="relative rounded-3xl p-8 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition-all duration-300 group hover:shadow-xl hover:shadow-black/40">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Iniciante</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-300">
                  {currentPlan === 'pro' ? '✓ Seu Plano Atual' : 'Base'}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Pro</h3>
              <p className="text-xs text-zinc-400 mb-6">Ideal para estudos diários e dúvidas comuns de matérias.</p>
              
              <div className="flex items-baseline gap-1.5 mb-8">
                <span className="text-4xl font-extrabold text-white">0 Kz</span>
                <span className="text-xs text-zinc-500">/ grátis inicial</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800/80 pt-6 text-sm text-zinc-300">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span className="font-semibold text-white">1.000 Créditos de Resolução</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Motor IA de Alta Velocidade</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Leitura OCR de Imagens e Provas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-zinc-400" />
                  </div>
                  <span>Organização em Cadernos de Matérias</span>
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

          {/* 2. PLANO ULTRA (1.000.000 Créditos - Mais Popular) */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border-2 border-violet-500/80 flex flex-col justify-between shadow-2xl shadow-violet-500/20 transform md:-translate-y-4 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Mais Popular
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Avançado</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Câmbio Comercial
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Ultra</h3>
              <p className="text-xs text-zinc-400 mb-6">Para vestibulandos, concurseiros e estudantes universitários.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-extrabold text-white">{ultraAoa}</span>
                <span className="text-xs text-zinc-400 font-medium">/ $19 USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800 pt-6 text-sm text-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-bold text-white text-base">1.000.000 de Créditos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span className="font-semibold text-violet-300">Multi-LLM: Meta LLaMA 3.3 + DeepMind</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Groq LPU de Ultra-Baixa Latência</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Raciocínio Matemático e Provas Rigorosas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-violet-400" />
                  </div>
                  <span>Prioridade Máxima no Roteador com Failover</span>
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

          {/* 3. PLANO PREMIUM (VIP Gold / Ilimitado) */}
          <div className="relative rounded-3xl p-8 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-amber-500/50 flex flex-col justify-between hover:border-amber-400 transition-all duration-300 group hover:shadow-2xl hover:shadow-amber-500/10">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Exclusivo</span>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> VIP
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">Plano Premium</h3>
              <p className="text-xs text-zinc-400 mb-6">Poder total irrestrito com canal de atendimento prioritário.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-4xl font-extrabold text-white">{premiumAoa}</span>
                <span className="text-xs text-zinc-400 font-medium">/ $39 USD</span>
              </div>

              <div className="space-y-3.5 border-t border-zinc-800 pt-6 text-sm text-zinc-200">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="font-bold text-amber-300 text-base">Créditos Ilimitados (Sem Limites)</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Cluster Completo: Meta LLaMA 3.3 + DeepMind Pro + Groq</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Suporte VIP 24/7 direto com José Escrivão</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span>Validação Cruzada Multi-Agente em Provas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-amber-400" />
                  </div>
                  <span className="text-xs text-zinc-400">Atendimento prioritário via WhatsApp</span>
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

        {/* Botão de Retorno Rápido ao Chat no Meio da Página */}
        <div className="text-center mb-16">
          <Link href="/dashboard">
            <Button size="lg" className="bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 px-8 py-6 rounded-2xl text-sm font-semibold shadow-lg transition">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Chat e Continuar Estudando
            </Button>
          </Link>
        </div>

        {/* Payment Methods Banner Dinâmico */}
        <div className="rounded-3xl bg-zinc-900/40 border border-zinc-800/80 p-8 sm:p-10 mb-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" /> Métodos de Pagamento Seguros &amp; Câmbio Oficial
              </h3>
              <p className="text-sm text-zinc-400 max-w-xl">
                Pagamentos locais em Kwanzas (Kz) via Multicaixa Express com dados gerenciados pelo sistema (titular {accountHolder}, telefone {expressPhone}), ou cartões internacionais.
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
              <h4 className="font-semibold text-white text-base mb-1.5">Como é calculada a cotação em Kwanzas (Kz)?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Os valores dos planos Ultra ($19 USD) e Premium ($39 USD) são convertidos automaticamente utilizando a taxa de câmbio comercial da internet em tempo real, garantindo total transparência e precisão.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <h4 className="font-semibold text-white text-base mb-1.5">Como funciona a ativação via Multicaixa Express?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Ao selecionar Multicaixa Express, o sistema exibe os dados bancários e o telefone do titular configurados no sistema. Basta realizar a transferência e anexar o comprovativo na tela. Nossa equipe valida e libera seus créditos em instantes.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
              <h4 className="font-semibold text-white text-base mb-1.5">Quais inteligências artificiais compõem o sistema?</h4>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Utilizamos uma infraestrutura Multi-LLM corporativa que inclui Meta LLaMA 3.3 70B executado nos processadores Groq LPU de ultra-velocidade, Google DeepMind para raciocínio lógico avançado e um roteador inteligente de failover com redundância total.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* Footer com link de retorno */}
      <footer className="border-t border-zinc-800/60 py-8 px-6 text-center text-xs text-zinc-500 space-y-2">
        <p>© {new Date().getFullYear()} ExamSolver AI — Desenvolvido por José Escrivão Silvestre (PANDA TECH).</p>
        <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 underline font-medium">
          ← Voltar para o Chat
        </Link>
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
