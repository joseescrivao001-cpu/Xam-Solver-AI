"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  X, Check, Sparkles, Zap, Crown, 
  CreditCard, Smartphone, Upload, CheckCircle2, 
  AlertCircle, ArrowRight, Loader2, Copy, ArrowLeft, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";

interface PaymentSettingsData {
  bank_name: string;
  account_holder: string;
  express_phone: string;
  iban: string;
  notes: string;
  usd_to_aoa_rate: number;
  plans: {
    ultra: { usd: number; aoa: number; formatted_aoa: string };
    premium: { usd: number; aoa: number; formatted_aoa: string };
  };
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan?: string;
  userEmail?: string;
  onPlanUpdated?: () => void;
}

export default function PricingModal({
  isOpen,
  onClose,
  currentPlan = "pro",
  userEmail,
  onPlanUpdated
}: PricingModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'ultra' | 'premium' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mcx' | 'stripe' | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofBase64, setProofBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettingsData | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoadingSettings(true);
      fetch("/api/payment-settings")
        .then(res => res.json())
        .then(data => {
          if (data && data.plans) setPaymentSettings(data);
        })
        .catch(err => console.warn("Erro ao carregar payment settings:", err))
        .finally(() => setIsLoadingSettings(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ultraAoaFormatted = paymentSettings?.plans?.ultra?.formatted_aoa || "19.000 Kz";
  const premiumAoaFormatted = paymentSettings?.plans?.premium?.formatted_aoa || "39.000 Kz";
  const exchangeRate = paymentSettings?.usd_to_aoa_rate || 950;
  const bankName = paymentSettings?.bank_name || "BFA / BAI";
  const accountHolder = paymentSettings?.account_holder || "José Escrivão Silvestre";
  const expressPhone = paymentSettings?.express_phone || "+244 930 339 436";
  const iban = paymentSettings?.iban || "AO06.0040.0000.0000.0000.0000.0";

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProofBase64(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleStripeCheckout = async (plan: 'ultra' | 'premium') => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: plan })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Erro ao gerar checkout.");
      }
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao processar Stripe. Tente usar Multicaixa Express.",
        type: 'error'
      });
      setIsSubmitting(false);
    }
  };

  const handleMCXSubmit = async () => {
    if (!selectedPlan || !proofBase64) {
      setFeedback({ text: "Anexe o print do comprovativo para validação.", type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const amount = selectedPlan === 'ultra' ? ultraAoaFormatted : premiumAoaFormatted;

    try {
      const res = await fetch("/api/checkout/mcx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_type: selectedPlan,
          amount,
          proof_base64: proofBase64
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no envio.");

      setFeedback({
        text: "Comprovativo enviado com sucesso! Seus créditos e plano serão atualizados em instantes.",
        type: 'success'
      });

      setTimeout(() => {
        if (onPlanUpdated) onPlanUpdated();
        setPaymentMethod(null);
        setSelectedPlan(null);
        onClose();
      }, 3000);
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao enviar comprovativo.",
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="max-w-5xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-10 shadow-2xl relative my-6 overflow-hidden"
      >
        {/* Ambient Lights */}
        <div className="absolute top-[-15%] left-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[10%] w-[40%] h-[40%] rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />

        {/* Top Navigation Bar: Voltar ao Chat + Fechar */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-zinc-800/80 relative z-20">
          <button
            onClick={() => { onClose(); setPaymentMethod(null); setSelectedPlan(null); }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Chat
          </button>
          
          <div className="flex items-center gap-3">
            {isLoadingSettings && (
              <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin" /> Atualizando câmbio...
              </span>
            )}
            <button
              onClick={() => { onClose(); setPaymentMethod(null); setSelectedPlan(null); }}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 transition cursor-pointer"
              title="Fechar Janela"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Motor Multi-IA Híbrido (Groq LPU + DeepMind)
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Escolha o Plano Ideal para Seus Estudos
          </h2>
          <p className="text-zinc-400 text-xs sm:text-sm mt-2">
            Acesso ao cluster de inteligência artificial com Meta LLaMA 3.3 70B, Google DeepMind e Roteador Neural Indestrutível com Failover automático.
          </p>
          {userEmail && (
            <p className="text-[11px] text-indigo-400/90 mt-1.5 font-mono">
              Conta conectada: {userEmail}
            </p>
          )}
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-3 ${
            feedback.type === 'error' 
              ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400' 
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}>
            {feedback.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* ---------------- PRICING CARDS VIEW ---------------- */}
        {!paymentMethod && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 items-stretch">
            
            {/* 1. PLANO PRO (1.000 Créditos) */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-zinc-700 relative">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  {currentPlan === 'pro' && (
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Seu Plano Atual
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-bold text-white">Plano Pro</h3>
                <p className="text-xs text-zinc-400 mt-1">Para estudos do dia a dia, exercícios e dúvidas em exames.</p>

                <div className="my-5">
                  <span className="text-3xl sm:text-4xl font-black text-white">0 Kz</span>
                  <span className="text-zinc-500 text-xs ml-2">/ plano base</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> <strong>1.000 Créditos</strong> de resolução
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Motor IA de Resolução Instantânea
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Leitura OCR de Imagens e Provas
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Protocolo Safe-Charge Ativo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Gestão Completa por Cadernos
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  disabled 
                  variant="outline" 
                  className="w-full h-11 rounded-xl text-xs font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/5 cursor-default"
                >
                  ✓ Ativo na sua Conta
                </Button>
              </div>
            </div>

            {/* 2. PLANO ULTRA (1.000.000 Créditos - Mais Popular) */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border-2 border-violet-500/60 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-105 shadow-[0_0_50px_rgba(139,92,246,0.25)] hover:shadow-[0_0_70px_rgba(139,92,246,0.4)] relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-black tracking-wider uppercase px-4 py-1 rounded-full shadow-lg shadow-violet-500/40 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Mais Popular
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-violet-400 font-mono font-medium">Câmbio em tempo real</span>
                </div>

                <h3 className="text-xl font-bold text-white">Plano Ultra</h3>
                <p className="text-xs text-zinc-400 mt-1">Para estudantes universitários, exames difíceis e vestibulares.</p>

                <div className="my-5">
                  <span className="text-3xl sm:text-4xl font-black text-white">{ultraAoaFormatted}</span>
                  <span className="text-zinc-500 text-xs ml-1.5">ou $19 USD</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> <strong className="text-violet-300">1.000.000 Créditos</strong> (1 Milhão)
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> <strong>Multi-LLM: Meta LLaMA 3.3 + DeepMind Pro</strong>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Resolução de Cálculo, Física e Engenharia
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Groq LPU de Ultra-Velocidade
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Prioridade Máxima no Roteador de Failover
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => setSelectedPlan('ultra')}
                  className="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  Fazer Upgrade para Ultra <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* 3. PLANO PREMIUM (VIP Gold / Ilimitado) */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:scale-105 shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:shadow-[0_0_70px_rgba(245,158,11,0.35)] relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-zinc-950 text-[11px] font-black tracking-wider uppercase px-4 py-1 rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> VIP Ilimitado
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-1">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Crown className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-amber-400 font-mono font-medium">Câmbio em tempo real</span>
                </div>

                <h3 className="text-xl font-bold text-white">Plano Premium</h3>
                <p className="text-xs text-zinc-400 mt-1">Poder total sem limites com suporte direto do desenvolvedor.</p>

                <div className="my-5">
                  <span className="text-3xl sm:text-4xl font-black text-white">{premiumAoaFormatted}</span>
                  <span className="text-zinc-500 text-xs ml-1.5">ou $39 USD</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> <strong className="text-amber-300">Créditos Ilimitados</strong> (Sem restrições)
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Cluster Completo: LLaMA 3.3 + DeepMind Pro + Groq
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Suporte VIP 24/7 direto com José Escrivão
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Validação Cruzada Multi-Agente em Provas
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Exportação Completa dos Estudos em PDF
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => setSelectedPlan('premium')}
                  className="w-full h-11 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  Assinar Premium VIP <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- CHECKOUT & GATEWAY SELECTION ---------------- */}
        {selectedPlan && !paymentMethod && (
          <div className="max-w-xl mx-auto py-4 relative z-10">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="text-xs text-zinc-400 hover:text-white mb-6 flex items-center gap-1.5 cursor-pointer"
            >
              ← Voltar à seleção de planos
            </button>

            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Plano Selecionado</span>
              <h3 className="text-2xl font-bold text-white mt-1">
                {selectedPlan === 'ultra' ? 'Plano Ultra (1.000.000 Créditos)' : 'Plano Premium VIP (Ilimitado)'}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Valor Oficial: <strong>{selectedPlan === 'ultra' ? `${ultraAoaFormatted} ($19 USD)` : `${premiumAoaFormatted} ($39 USD)`}</strong>
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                * Conversão cambial em tempo real: 1 USD ≈ {exchangeRate} Kz
              </p>
            </div>

            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 text-center">
              Escolha Como Deseja Efetuar o Pagamento
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option: Multicaixa Express */}
              <button
                onClick={() => setPaymentMethod('mcx')}
                className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-indigo-500/60 hover:bg-zinc-800/80 transition flex flex-col items-center text-center group cursor-pointer shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h5 className="font-bold text-white text-base">Multicaixa Express</h5>
                <p className="text-xs text-zinc-400 mt-1">Pagamento local em Kwanzas via IBAN ou Telefone.</p>
              </button>

              {/* Option: Stripe */}
              <button
                onClick={() => handleStripeCheckout(selectedPlan)}
                disabled={isSubmitting}
                className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-violet-500/60 hover:bg-zinc-800/80 transition flex flex-col items-center text-center group cursor-pointer shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-110 transition">
                  {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
                </div>
                <h5 className="font-bold text-white text-base">Cartão Internacional</h5>
                <p className="text-xs text-zinc-400 mt-1">Visa, Mastercard e American Express via Stripe.</p>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- MULTICAIXA EXPRESS (MCX) INSTRUCTIONS (DINÂMICAS DO BANCO DE DADOS) ---------------- */}
        {selectedPlan && paymentMethod === 'mcx' && (
          <div className="max-w-xl mx-auto py-2 relative z-10">
            <button 
              onClick={() => setPaymentMethod(null)}
              className="text-xs text-zinc-400 hover:text-white mb-4 flex items-center gap-1.5 cursor-pointer"
            >
              ← Escolher outro método de pagamento
            </button>

            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">Instruções de Pagamento (MCX)</h4>
                  <p className="text-xs text-zinc-400">Dados bancários obtidos com segurança do sistema.</p>
                </div>
              </div>

              {/* Bank Details Card Dinâmico */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Valor em Kwanza:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {selectedPlan === 'ultra' ? ultraAoaFormatted : premiumAoaFormatted}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">Banco:</span>
                  <span className="font-semibold text-zinc-200">{bankName}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">Multicaixa Express (Telefone):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold">{expressPhone}</span>
                    <button onClick={() => copyToClipboard(expressPhone.replace(/\s+/g, ''), 'tel')} className="text-zinc-400 hover:text-white cursor-pointer" title="Copiar Telefone">
                      {copiedField === 'tel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">Titular da Conta:</span>
                  <span className="font-semibold text-zinc-200">{accountHolder}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">IBAN:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[200px]">{iban}</span>
                    <button onClick={() => copyToClipboard(iban.replace(/[^a-zA-Z0-9]/g, ''), 'iban')} className="text-zinc-400 hover:text-white cursor-pointer" title="Copiar IBAN">
                      {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Proof Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Anexar Comprovativo de Pagamento
                </label>
                <div className="relative border-2 border-dashed border-zinc-700 hover:border-indigo-500 rounded-2xl p-4 text-center cursor-pointer transition bg-zinc-950/50">
                  <input 
                    type="file" 
                    accept="image/*,.pdf" 
                    onChange={handleProofChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  />
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                    {proofFile ? (
                      <span className="text-xs font-medium text-emerald-400">{proofFile.name} (Anexado com Sucesso)</span>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-zinc-300">Clique para anexar o print ou PDF do comprovativo</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Formatos: PNG, JPG, PDF (Validação automática)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleMCXSubmit}
                  disabled={isSubmitting || !proofBase64}
                  className="w-full h-12 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando Comprovativo...</>
                  ) : (
                    "Enviar Comprovativo e Ativar Plano"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer com Câmbio e Botão de Voltar ao Chat */}
        <div className="mt-8 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 relative z-10">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Câmbio comercial em tempo real: 1 USD ≈ {exchangeRate} Kz
          </span>
          <button
            onClick={() => { onClose(); setPaymentMethod(null); setSelectedPlan(null); }}
            className="text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer flex items-center gap-1"
          >
            ← Voltar ao Chat e Continuar Estudando
          </button>
        </div>

      </motion.div>
    </div>
  );
}
