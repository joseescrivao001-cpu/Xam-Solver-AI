"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, BrainCircuit, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Verificar se o usuário está com uma sessão válida de recuperação
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
    };
    checkSession();
  }, [supabase]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ text: "A senha deve conter no mínimo 6 caracteres.", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: "As senhas digitadas não coincidem.", type: "error" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setMessage({ text: "Senha atualizada com sucesso! Redirecionando para o login...", type: "success" });
      setTimeout(() => {
        router.push("/login?message=password-updated");
      }, 2000);
    } catch (err) {
      setMessage({ 
        text: err instanceof Error ? err.message : "Erro ao redefinir a senha. Tente solicitar um novo link.", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-zinc-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-zinc-950 to-zinc-950 relative overflow-hidden font-sans">
      
      {/* Back to Login Button */}
      <button 
        onClick={() => router.push("/login")}
        className="absolute top-6 left-6 z-50 text-white/70 hover:text-white flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all border border-white/10 shadow-lg text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar ao login</span>
      </button>

      {/* Background Floating Orbs (Deep Space Aura) */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full bg-violet-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Main Glass Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-zinc-900/80 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-[0_0_60px_-15px_rgba(79,70,229,0.3)] relative z-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ExamSolver AI</h1>
            <p className="text-xs text-zinc-400">Segurança de Conta</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Criar Nova Senha</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Escolha uma senha forte e segura para proteger seus cadernos e créditos de estudo.
          </p>
        </div>

        {message && (
          <div className={`mb-6 rounded-2xl p-4 text-sm font-medium flex items-start gap-3 ${message.type === "error" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
            {message.type === "error" ? <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
            <span>{message.text}</span>
          </div>
        )}

        {hasSession === false && !message && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Nenhuma sessão ativa de recuperação detectada. Se o seu link expirou, solicite uma nova redefinição na tela de login.</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nova Senha</label>
            <div className="relative flex items-center bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-3.5 focus-within:border-indigo-500 transition-colors">
              <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent border-none py-3 px-3 text-sm text-white placeholder:text-zinc-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-zinc-400 hover:text-zinc-200 transition p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
            <div className="relative flex items-center bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-3.5 focus-within:border-indigo-500 transition-colors">
              <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Digite a senha novamente"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-transparent border-none py-3 px-3 text-sm text-white placeholder:text-zinc-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-3">
            <Button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.01]"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ATUALIZAR SENHA"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
