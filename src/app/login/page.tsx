"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BrainCircuit, Sparkles, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({
          text: "Conta criada! Verifique sua caixa de entrada.",
          type: "success",
        });
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "Ocorreu um erro.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setMessage(null);
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback` 
        : 'https://xam-solver-ai.vercel.app/auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { 
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setMessage({ 
        text: error instanceof Error ? error.message : "Erro ao conectar com o Google. Verifique a configuração do Google Auth no Supabase.", 
        type: "error" 
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-8 bg-zinc-950 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-zinc-950 to-zinc-950 relative overflow-hidden">
      
      {/* Back to Home Button */}
      <button 
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 z-50 text-white/70 hover:text-white flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all border border-white/10 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Voltar ao site</span>
      </button>
      
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-violet-600/20 blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Main Split Container */}
      <div className="max-w-5xl w-full min-h-[600px] bg-white rounded-[2rem] shadow-[0_0_60px_-15px_rgba(79,70,229,0.4)] flex flex-col-reverse lg:flex-row overflow-hidden relative z-10">
        
        {/* Left Side: Form (White) */}
        <div className="w-full lg:w-[45%] bg-white p-10 sm:p-14 flex flex-col justify-center relative z-20">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight mb-2 uppercase">
              {isLogin ? "Entrar" : "Criar Conta"}
            </h2>
            <div className="w-12 h-1 bg-indigo-600 rounded-full mb-8"></div>

            {message && (
              <div className={`mb-6 rounded-xl p-4 text-sm font-medium ${message.type === "error" ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1">
                <div className="relative flex items-center border-b-2 border-zinc-200 focus-within:border-indigo-600 transition-colors pb-2">
                  <Mail className="absolute left-1 w-5 h-5 text-zinc-400" />
                  <input
                    type="email"
                    placeholder="Endereço de e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="relative flex items-center border-b-2 border-zinc-200 focus-within:border-indigo-600 transition-colors pb-2">
                  <Lock className="absolute left-1 w-5 h-5 text-zinc-400" />
                  <input
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 bg-transparent outline-none text-zinc-800 placeholder:text-zinc-400 font-medium text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs font-medium text-zinc-500 hover:text-zinc-700">Lembrar-me</span>
                </label>
                {isLogin && (
                  <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition">Esqueceu a senha?</a>
                )}
              </div>

              <div className="pt-4">
                <Button type="submit" className="w-full h-12 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 hover:from-indigo-600 hover:to-indigo-800 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02]" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "ENTRAR AGORA" : "REGISTRAR-SE")}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-200"></div>
                <span className="flex-shrink mx-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">ou</span>
                <div className="flex-grow border-t border-zinc-200"></div>
              </div>
              
              <button 
                type="button"
                onClick={handleGoogleLogin} 
                disabled={isLoading}
                className="w-full mt-2 h-12 rounded-xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center gap-3 text-zinc-700 font-semibold text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span>Continuar com Google</span>
              </button>
            </div>

            <p className="text-center text-xs font-semibold text-zinc-500 mt-8">
              {isLogin ? "Ainda não tem conta?" : "Já possui uma conta?"}{" "}
              <button onClick={() => { setIsLogin(!isLogin); setMessage(null); }} className="text-indigo-600 hover:text-indigo-800 ml-1">
                {isLogin ? "Cadastre-se" : "Faça Login"}
              </button>
            </p>
          </div>
        </div>

        {/* Right Side: Branding (Indigo/Violet Gradient with Waves/Circles) */}
        <div className="w-full lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-800 to-violet-900 flex flex-col justify-center items-center p-12 text-center">
          
          {/* Decorative shapes to simulate the "Wavy" cut and floating orbs */}
          <div className="hidden lg:block absolute -left-32 top-[-10%] w-[300px] h-[120%] bg-white rounded-[50%] blur-[2px]" style={{ clipPath: 'ellipse(40% 50% at 0% 50%)' }} />
          
          <div className="absolute top-12 right-12 w-32 h-32 bg-pink-500/30 rounded-full blur-2xl animate-pulse" />
          <div className="absolute bottom-20 left-20 w-40 h-40 bg-blue-500/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 shadow-xl border border-white/20">
              <BrainCircuit className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">
              {isLogin ? "Que bom ver você!" : "Junte-se à Revolução"}
            </h1>
            
            <p className="text-indigo-100 text-sm md:text-base max-w-sm leading-relaxed font-medium mb-10">
              O Exam Solver AI analisa imagens de provas, reconhece equações e fornece resoluções com <strong>Precisão Absoluta</strong>. 
              {isLogin ? " Entre para continuar de onde parou." : " Cadastre-se e ganhe 5 créditos iniciais gratuitos."}
            </p>
            
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 shadow-lg">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span className="text-xs font-semibold text-white tracking-wide uppercase">Desenvolvido com Tecnologia Gemini</span>
            </div>
          </div>
          
          <div className="absolute bottom-6 text-xs font-medium text-indigo-300/60 z-10">
            © {new Date().getFullYear()} Exam Solver AI by José Escrivão
          </div>
        </div>

      </div>
    </div>
  );
}
