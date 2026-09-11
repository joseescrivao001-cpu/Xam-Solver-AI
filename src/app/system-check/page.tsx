"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Activity, Shield, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Database, Key, Server, Cpu, Globe, ArrowLeft, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiagnosticReport {
  timestamp: string;
  auth: {
    status: string;
    sessionActive: boolean;
    userId: string | null;
    email: string | null;
    cookiesPresentCount: number;
    cookieNames: string[];
    authError: string | null;
    supabaseConnected: boolean;
  };
  database: {
    status: string;
    profilesTableAccessible: boolean;
    profileQueryError: string | null;
    userProfile: {
      id: string;
      email: string;
      is_admin: boolean;
      is_banned: boolean;
      credits_balance: number;
      plan_type: string;
      last_seen_at: string;
    } | null;
    isDbAdmin: boolean;
    creditsBalance: number | null;
    planType: string | null;
    isBanned: boolean;
    triggerProtectionActive: boolean;
    pendingProofsCount: number;
  };
  environment: {
    status: string;
    envAdminUserIdConfigured: boolean;
    envAdminUserIdValue: string;
    currentLoggedUserId: string;
    uuidVerdict: "MATCH" | "MISMATCH" | "NOT_CONFIGURED" | "NOT_LOGGED_IN";
    isMasterEmailMatch: boolean;
    variablesCheck: Record<string, boolean>;
  };
  securityAndRouting: {
    status: string;
    adminRouteAccessible: boolean;
    isSuperAdminVerdict: boolean;
    isDbAdminVerdict: boolean;
    isNotBannedVerdict: boolean;
    blockReason: string;
    expectedHttpStatus: number;
  };
  integrations: {
    status: string;
    geminiAiStatus: string;
    geminiError: string | null;
    googleOAuth: {
      expectedRedirectUri: string;
      status401Reason: string;
    };
  };
}

export default function SystemCheckPage() {
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [clientUser, setClientUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const runDiagnostic = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Checagem no lado do cliente (Navegador)
      const { data: { user: browserUser } } = await supabase.auth.getUser();
      setClientUser(browserUser ? { id: browserUser.id, email: browserUser.email } : null);

      // 2. Checagem no lado do servidor
      const res = await fetch("/api/system-check", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`O servidor respondeu com status HTTP ${res.status}`);
      }
      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.error("[SYSTEM_CHECK_ERROR]", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido ao executar o scanner.");
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    runDiagnostic();
  }, [runDiagnostic]);

  const renderBadge = (status: "PASS" | "FAIL" | "WARN" | string) => {
    if (status === "PASS") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          OPERACIONAL (OK)
        </span>
      );
    }
    if (status === "WARN") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-sm shadow-amber-500/10">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ATENÇÃO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/10">
        <XCircle className="w-3.5 h-3.5 text-rose-400" />
        FALHA / BLOQUEADO
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                System Health & Diagnostic Center
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Live Scanner v1.0
                </span>
              </h1>
              <p className="text-xs text-zinc-400">
                Diagnóstico integral das camadas de Auth, Banco, Vercel, Middleware e APIs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={runDiagnostic}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs h-9 px-4 font-medium flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Executando Varredura..." : "Escanear Novamente"}
            </Button>
            {report?.securityAndRouting.adminRouteAccessible && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              >
                <Shield className="w-4 h-4" />
                Acessar /admin
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Erro ao executar diagnóstico</h3>
              <p className="text-xs text-rose-300/80 mt-1 font-mono">{error}</p>
            </div>
          </div>
        )}

        {/* Global Verdict Banner */}
        {report && (
          <div className={`p-6 rounded-2xl border backdrop-blur-xl transition ${
            report.securityAndRouting.adminRouteAccessible
              ? "bg-emerald-950/20 border-emerald-500/30"
              : "bg-rose-950/20 border-rose-500/30"
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  report.securityAndRouting.adminRouteAccessible
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                    : "bg-rose-500/20 border border-rose-500/40 text-rose-400"
                }`}>
                  {report.securityAndRouting.adminRouteAccessible ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">
                      {report.securityAndRouting.adminRouteAccessible
                        ? "Veredito: PAINEL /ADMIN 100% LIBERADO PARA VOCÊ"
                        : "Veredito: ACESSO AO PAINEL /ADMIN BLOQUEADO (RETORNA 404)"}
                    </h2>
                    {renderBadge(report.securityAndRouting.status)}
                  </div>
                  <p className="text-sm text-zinc-400">
                    <strong className="text-zinc-200">Motivo Detectado:</strong> {report.securityAndRouting.blockReason}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {report.securityAndRouting.adminRouteAccessible ? (
                  <Link
                    href="/admin"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-semibold text-sm shadow-xl shadow-emerald-600/25 flex items-center gap-2 transition"
                  >
                    Entrar no /admin Agora
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : !report.auth.sessionActive ? (
                  <Link
                    href="/login"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center gap-2 transition"
                  >
                    Fazer Login Primeiro
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* 5 Layer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ---------------- 1. CAMADA DE AUTH ---------------- */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">1. Camada de Autenticação (Auth)</h3>
              </div>
              {renderBadge(report?.auth.status || "WARN")}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Sessão no Servidor:</span>
                <span className={`font-mono font-bold ${report?.auth.sessionActive ? "text-emerald-400" : "text-rose-400"}`}>
                  {report?.auth.sessionActive ? "ATIVA (OK)" : "INATIVA / COOKIE AUSENTE"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Sessão no Navegador (Client):</span>
                <span className={`font-mono font-bold ${clientUser ? "text-emerald-400" : "text-amber-400"}`}>
                  {clientUser ? `LOGADO (${clientUser.email})` : "DESLOGADO"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>UUID do Usuário Logado:</span>
                  <span className="text-[10px] text-zinc-500 font-mono">user.id</span>
                </div>
                <p className="font-mono text-indigo-300 font-bold break-all">
                  {report?.auth.userId || clientUser?.id || "(Nenhum usuário logado)"}
                </p>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Cookies de Sessão Detectados:</span>
                <span className="font-mono text-zinc-200">
                  {report?.auth.cookiesPresentCount ?? 0} cookies
                </span>
              </div>
            </div>
          </div>

          {/* ---------------- 2. CAMADA DE BANCO DE DADOS ---------------- */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Database className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">2. Camada de Banco de Dados (Supabase)</h3>
              </div>
              {renderBadge(report?.database.status || "WARN")}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Coluna is_admin no Banco:</span>
                <span className={`font-mono font-bold ${report?.database.isDbAdmin ? "text-emerald-400" : "text-rose-400"}`}>
                  {report?.database.isDbAdmin ? "TRUE (Administrador)" : "FALSE (Usuário Comum)"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Plano Ativo (plan_type):</span>
                <span className="font-mono font-bold text-indigo-400 uppercase">
                  {report?.database.planType || "Desconhecido"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Saldo de Créditos no Banco:</span>
                <span className="font-mono font-bold text-zinc-100">
                  {report?.database.creditsBalance?.toLocaleString() || "0"} Créditos
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Trigger Anti-Escalada (Proteção):</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {report?.database.triggerProtectionActive ? "ATIVO & BLINDADO" : "AVISO: Executar SQL"}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------- 3. CAMADA DE INFRAESTRUTURA (VERCEL) ---------------- */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Server className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">3. Camada de Infraestrutura (Vercel & Env)</h3>
              </div>
              {renderBadge(report?.environment.status || "WARN")}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              {/* Box de Veredito UUID */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                report?.environment.uuidVerdict === "MATCH" || report?.environment.isMasterEmailMatch
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}>
                <div>
                  <span className="font-semibold block">Comparação de Identidade:</span>
                  <span className="text-[11px] opacity-80">
                    {report?.environment.isMasterEmailMatch 
                      ? "Reconhecido como Dono/Fundador pelo e-mail mestre"
                      : "Comparando UUID do usuário com ADMIN_USER_ID"}
                  </span>
                </div>
                <span className="font-mono text-xs font-black px-3 py-1 rounded-lg bg-zinc-950 border border-current">
                  {report?.environment.uuidVerdict === "MATCH" || report?.environment.isMasterEmailMatch ? "MATCH (OK)" : "MISMATCH"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1 font-mono">
                <div className="flex justify-between text-zinc-400">
                  <span>UUID na Vercel (ADMIN_USER_ID):</span>
                  <span>{report?.environment.envAdminUserIdConfigured ? "PRESENTE" : "AUSENTE"}</span>
                </div>
                <p className="text-purple-300 break-all">{report?.environment.envAdminUserIdValue}</p>
              </div>

              {/* Checklist de Variáveis */}
              <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1.5">
                <span className="text-zinc-400 font-medium block">Presença das Variáveis de Ambiente:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  {report?.environment.variablesCheck && Object.entries(report.environment.variablesCheck).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      {v ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      )}
                      <span className={v ? "text-zinc-300" : "text-rose-400"}>{k}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- 4. CAMADA DE ROTAS E BLINDAGEM ---------------- */}
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">4. Camada de Rotas e Blindagem (/admin)</h3>
              </div>
              {renderBadge(report?.securityAndRouting.status || "WARN")}
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Resposta da rota /admin:</span>
                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                  report?.securityAndRouting.expectedHttpStatus === 200 
                    ? "bg-emerald-500/20 text-emerald-400" 
                    : "bg-rose-500/20 text-rose-400"
                }`}>
                  HTTP {report?.securityAndRouting.expectedHttpStatus || 404}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                <span className="text-zinc-400">Regra isSuperAdmin() no Servidor:</span>
                <span className={`font-mono font-bold ${report?.securityAndRouting.isSuperAdminVerdict ? "text-emerald-400" : "text-rose-400"}`}>
                  {report?.securityAndRouting.isSuperAdminVerdict ? "TRUE (Autorizado)" : "FALSE (Rejeitado)"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-1">
                <span className="text-zinc-400 font-medium block">Diagnóstico de Acesso:</span>
                <p className="text-zinc-300 leading-relaxed">
                  {report?.securityAndRouting.blockReason}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* ---------------- 5. CAMADA DE INTEGRAÇÕES EXTERNAS ---------------- */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                <Globe className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-white text-sm">5. Camada de Integrações Externas (Google OAuth & IA)</h3>
            </div>
            {renderBadge(report?.integrations.status || "WARN")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Gemini */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  Conexão Gemini 1.5 API
                </span>
                <span className={`font-mono font-bold ${
                  report?.integrations.geminiAiStatus === "HEALTHY" ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {report?.integrations.geminiAiStatus === "HEALTHY" ? "CONECTADO (OK)" : report?.integrations.geminiAiStatus}
                </span>
              </div>
              {report?.integrations.geminiError && (
                <p className="font-mono text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                  {report.integrations.geminiError}
                </p>
              )}
            </div>

            {/* Google OAuth */}
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Diagnóstico do Google OAuth (Erro 401)
              </span>
              <p className="text-zinc-400 leading-relaxed">
                {report?.integrations.googleOAuth.status401Reason}
              </p>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px] text-blue-300 break-all">
                Redirect URI Obrigatório: {report?.integrations.googleOAuth.expectedRedirectUri}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/40 text-xs text-zinc-500">
          <div>
            <span>Última varredura realizada em: </span>
            <span className="font-mono text-zinc-300">{report?.timestamp ? new Date(report.timestamp).toLocaleString("pt-BR") : "Carregando..."}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-zinc-400 hover:text-white transition">
              ← Ir para o Dashboard
            </Link>
            <Link href="/login" className="text-zinc-400 hover:text-white transition">
              Ir para Tela de Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
