"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  X, Check, Sparkles, Zap, Crown, 
  CreditCard, Smartphone, Upload, CheckCircle2, 
  AlertCircle, ArrowRight, Loader2, Copy 
} from "lucide-react";
import { motion } from "framer-motion";

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

  if (!isOpen) return null;

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

    const amount = selectedPlan === 'ultra' ? '19.000 Kz' : '39.000 Kz';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="max-w-5xl w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative my-8 overflow-hidden"
      >
        {/* Ambient Lights */}
        <div className="absolute top-[-15%] left-[10%] w-[40%] h-[40%] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[10%] w-[40%] h-[40%] rounded-full bg-amber-500/15 blur-[120px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => { onClose(); setPaymentMethod(null); setSelectedPlan(null); }}
          className="absolute top-6 right-6 p-2.5 text-zinc-400 hover:text-white rounded-full bg-zinc-900 border border-zinc-800 transition z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Planos de Alto Desempenho Acadêmico
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Evolua para o Próximo Nível
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base mt-2">
            Desbloqueie o poder supremo do Gemini 1.5 Pro, créditos ilimitados e prioridade máxima nos servidores de inteligência artificial.
          </p>
          {userEmail && (
            <p className="text-xs text-indigo-400/90 mt-2 font-mono">
              Conta ativa: {userEmail}
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
            
            {/* 1. PLANO PRO (Base / Atual) */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:border-zinc-700 relative">
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
                <p className="text-xs text-zinc-400 mt-1">Ideal para estudos diários e dúvidas gerais de exames.</p>

                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">Grátis</span>
                  <span className="text-zinc-500 text-xs ml-2">/ no onboarding</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> 50 Créditos de resolução
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Modelos Instantâneos (Gemini Flash)
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Protocolo Safe-Charge Ativo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Organização em Cadernos
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  disabled 
                  variant="outline" 
                  className="w-full h-12 rounded-xl text-xs font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-500/5 cursor-default"
                >
                  ✓ Ativo na sua Conta
                </Button>
              </div>
            </div>

            {/* 2. PLANO ULTRA (Mais Popular - Neon Violeta) */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border-2 border-violet-500/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:scale-105 shadow-[0_0_50px_rgba(139,92,246,0.25)] hover:shadow-[0_0_70px_rgba(139,92,246,0.4)] relative">
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
                </div>

                <h3 className="text-xl font-bold text-white">Plano Ultra</h3>
                <p className="text-xs text-zinc-400 mt-1">Para estudantes de Engenharia, Medicina e Concursos pesados.</p>

                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">19.000 Kz</span>
                  <span className="text-zinc-500 text-xs ml-1.5">ou $19 /mês</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> <strong>250 Créditos</strong> mensais
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> <strong>Acesso Total ao Gemini 1.5 Pro</strong>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Raciocínio Matemático Passo a Passo
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Prioridade Máxima no Rodízio de IA
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-violet-400 shrink-0" /> Upload de Provas em Alta Resolução
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => setSelectedPlan('ultra')}
                  className="w-full h-12 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-500/30 transition-all hover:scale-[1.02]"
                >
                  Fazer Upgrade para Ultra <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>

            {/* 3. PLANO PREMIUM (VIP Gold / Âmbar) */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 backdrop-blur-xl border border-amber-500/40 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:scale-105 shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:shadow-[0_0_70px_rgba(245,158,11,0.35)] relative">
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
                </div>

                <h3 className="text-xl font-bold text-white">Plano Premium</h3>
                <p className="text-xs text-zinc-400 mt-1">Acesso ilimitado e direto com a liderança técnica da IA.</p>

                <div className="my-6">
                  <span className="text-3xl sm:text-4xl font-black text-white">39.000 Kz</span>
                  <span className="text-zinc-500 text-xs ml-1.5">ou $39 /mês</span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-200">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> <strong>Créditos Ilimitados</strong>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Acesso irrestrito a todas as IAs
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Suporte VIP 24/7 direto com o Criador
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Exportação de Cadernos em PDF
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-amber-400 shrink-0" /> Validação de Provas por Agentes Múltiplos
                  </li>
                </ul>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={() => setSelectedPlan('premium')}
                  className="w-full h-12 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-zinc-950 shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02]"
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
              className="text-xs text-zinc-400 hover:text-white mb-6 flex items-center gap-1.5"
            >
              ← Voltar aos planos
            </button>

            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-xl text-center mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Plano Selecionado</span>
              <h3 className="text-2xl font-bold text-white mt-1">
                {selectedPlan === 'ultra' ? 'Plano Ultra (250 Créditos + Gemini Pro)' : 'Plano Premium VIP (Ilimitado)'}
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Valor: <strong>{selectedPlan === 'ultra' ? '19.000 Kz ($19 USD)' : '39.000 Kz ($39 USD)'}</strong>
              </p>
            </div>

            <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3 text-center">
              Escolha o Método de Pagamento
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
                <p className="text-xs text-zinc-400 mt-1">Pagamento local em Kwanzas (Kz) via IBAN ou Telefone.</p>
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

        {/* ---------------- MULTICAIXA EXPRESS (MCX) INSTRUCTIONS & PROOF UPLOAD ---------------- */}
        {selectedPlan && paymentMethod === 'mcx' && (
          <div className="max-w-xl mx-auto py-2 relative z-10">
            <button 
              onClick={() => setPaymentMethod(null)}
              className="text-xs text-zinc-400 hover:text-white mb-4 flex items-center gap-1.5"
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
                  <p className="text-xs text-zinc-400">Transfira o valor exato e anexe o comprovativo abaixo.</p>
                </div>
              </div>

              {/* Bank Details Card */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Valor a Transferir:</span>
                  <span className="font-bold text-white text-sm">
                    {selectedPlan === 'ultra' ? '19.000 Kz' : '39.000 Kz'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">Multicaixa Express (Telefone):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold">+244 930 339 436</span>
                    <button onClick={() => copyToClipboard('+244930339436', 'tel')} className="text-zinc-400 hover:text-white">
                      {copiedField === 'tel' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">Titular da Conta:</span>
                  <span className="font-semibold text-zinc-200">José Escrivão Silvestre</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <span className="text-zinc-500">IBAN (BFA / BAI):</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-zinc-300 text-[11px]">AO06.0040.0000.9303.3943.1012.3</span>
                    <button onClick={() => copyToClipboard('AO06004000009303394310123', 'iban')} className="text-zinc-400 hover:text-white">
                      {copiedField === 'iban' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Upload Proof Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                  Anexar Print do Comprovativo
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
                      <span className="text-xs font-medium text-emerald-400">{proofFile.name} (Pronto)</span>
                    ) : (
                      <>
                        <span className="text-xs font-medium text-zinc-300">Clique para selecionar o print do comprovativo</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Formatos suportados: PNG, JPG ou PDF</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleMCXSubmit}
                  disabled={isSubmitting || !proofBase64}
                  className="w-full h-12 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processando Comprovativo...</>
                  ) : (
                    "Enviar Comprovativo e Concluir"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
