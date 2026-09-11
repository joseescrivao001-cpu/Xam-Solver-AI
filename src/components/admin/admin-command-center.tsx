"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Shield, Users, CreditCard, DollarSign, 
  CheckCircle2, XCircle, AlertCircle, RefreshCw, 
  Search, Eye, ArrowLeft, ArrowRight,
  Sparkles, Check, X,
  FileText, Activity, Settings, Smartphone,
  User, Crown, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

type TabType = "overview" | "payments" | "users" | "logs" | "settings";

interface ProofItem {
  id: string;
  user_id: string;
  user_email: string | null;
  plan_type: string;
  amount: string;
  payment_method: string;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  plan_type: string;
  credits_balance: number;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  last_seen_at: string;
}

interface LogItem {
  id: string;
  endpoint: string;
  model: string | null;
  error_message: string;
  status_code: number;
  user_email: string | null;
  created_at: string;
}

interface StatsData {
  totalRevenueKz: string;
  totalUsers: number;
  totalStudents?: number;
  totalStaff?: number;
  activeUsers24h: number;
  pendingProofs: number;
  approvedProofs: number;
  totalConversations: number;
  modelDistribution: { name: string; share: number; color: string }[];
}

export default function AdminCommandCenter() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dados das Abas
  const [stats, setStats] = useState<StatsData | null>(null);
  const [proofs, setProofs] = useState<ProofItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);

  // Filtros & Buscas
  const [proofStatusFilter, setProofStatusFilter] = useState<string>("all");
  const [proofSearch, setProofSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userPlanFilter, setUserPlanFilter] = useState<string>("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "students" | "staff">("all");

  // Modais de Ação
  const [selectedProof, setSelectedProof] = useState<ProofItem | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState("");

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editUserCredits, setEditUserCredits] = useState<number>(0);
  const [editUserPlan, setEditUserPlan] = useState<string>("free");

  // Configurações Bancárias Dinâmicas
  const [bankSettings, setBankSettings] = useState({
    bank_name: "",
    account_holder: "",
    express_phone: "",
    iban: "",
    usd_to_aoa_rate: 950,
    notes: ""
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 1. Carregar Estatísticas
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.metrics);
      }
    } catch (err) {
      console.warn("Erro ao carregar stats:", err);
    }
  }, []);

  // 2. Carregar Comprovativos
  const loadProofs = useCallback(async () => {
    try {
      const url = `/api/admin/payments?status=${proofStatusFilter}&search=${encodeURIComponent(proofSearch)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setProofs(data.proofs || []);
      }
    } catch (err) {
      console.warn("Erro ao carregar comprovativos:", err);
    }
  }, [proofStatusFilter, proofSearch]);

  // 3. Carregar Usuários
  const loadUsers = useCallback(async () => {
    try {
      const url = `/api/admin/users?role=${userRoleFilter}&plan=${userPlanFilter}&search=${encodeURIComponent(userSearch)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.warn("Erro ao carregar usuários:", err);
    }
  }, [userRoleFilter, userPlanFilter, userSearch]);

  // 4. Carregar Logs
  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.warn("Erro ao carregar logs:", err);
    }
  }, []);

  // 5. Carregar Configurações Bancárias
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setBankSettings(data.settings);
      }
    } catch (err) {
      console.warn("Erro ao carregar configurações:", err);
    }
  }, []);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      await Promise.all([loadStats(), loadProofs(), loadUsers(), loadSettings()]);
    };
    init();
  }, [loadStats, loadProofs, loadUsers, loadSettings]);

  // Auto-dismiss de feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Ações de Pagamento (Aprovar / Rejeitar)
  const handlePaymentAction = async (action: "approve" | "reject") => {
    if (!selectedProof) return;
    setIsProcessingAction(true);

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proof_id: selectedProof.id,
          action,
          admin_notes: adminNoteInput.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao processar ação.");

      setFeedback({ text: data.message || "Ação concluída com sucesso!", type: "success" });
      setSelectedProof(null);
      setAdminNoteInput("");
      loadProofs();
      loadStats();
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao processar ação.",
        type: "error"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Ações de Edição de Usuário
  const handleUserSave = async () => {
    if (!selectedUser) return;
    setIsProcessingAction(true);

    try {
      if (editUserCredits !== selectedUser.credits_balance) {
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: selectedUser.id,
            action: "update_credits",
            value: editUserCredits
          })
        });
      }

      if (editUserPlan !== selectedUser.plan_type) {
        await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: selectedUser.id,
            action: "update_plan",
            value: editUserPlan
          })
        });
      }

      setFeedback({ text: "Perfil de usuário atualizado com sucesso!", type: "success" });
      setSelectedUser(null);
      loadUsers();
      loadStats();
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao salvar usuário.",
        type: "error"
      });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleToggleBan = async (user: UserProfile) => {
    try {
      const newStatus = !user.is_banned;
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          action: "toggle_ban",
          value: newStatus
        })
      });
      if (res.ok) {
        setFeedback({
          text: newStatus ? "Usuário suspenso com sucesso." : "Usuário reativado.",
          type: "success"
        });
        loadUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Salvar Configurações Bancárias
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankSettings)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar configurações.");

      setFeedback({ text: "Configurações bancárias atualizadas com sucesso!", type: "success" });
    } catch (err) {
      setFeedback({
        text: err instanceof Error ? err.message : "Erro ao salvar configurações.",
        type: "error"
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">Admin Command Center</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Vault Ativo
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">ExamSolver AI — Enterprise Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-semibold text-zinc-200 hover:text-white transition">
            <ArrowLeft className="w-3.5 h-3.5" /> Ir ao Dashboard
          </Link>
          <Button onClick={() => { loadStats(); loadProofs(); loadUsers(); }} variant="ghost" size="sm" className="p-2 text-zinc-400 hover:text-white rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Toast Feedback */}
        {feedback && (
          <div className={`p-4 rounded-2xl text-sm font-medium flex items-center gap-3 shadow-lg ${
            feedback.type === "error" 
              ? "bg-rose-500/15 border border-rose-500/30 text-rose-300" 
              : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
          }`}>
            {feedback.type === "error" ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Tab Navigation Pill */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide border-b border-zinc-800/80">
          {[
            { id: "overview", label: "Visão Geral", icon: Activity },
            { id: "payments", label: `Central de Pagamentos ${stats?.pendingProofs ? `(${stats.pendingProofs})` : ''}`, icon: CreditCard },
            { id: "users", label: "Gestão de Usuários", icon: Users },
            { id: "logs", label: "Logs de IA & Sistema", icon: FileText },
            { id: "settings", label: "Configurações Bancárias", icon: Settings },
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as TabType);
                  if (t.id === "logs") loadLogs();
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  active 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ---------------- 1. ABA: VISÃO GERAL (KPIS & ANALYTICS) ---------------- */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* 4 Cards Monumentais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Faturamento Aprovado</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-white">{stats?.totalRevenueKz || "0 Kz"}</p>
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  ✓ {stats?.approvedProofs || 0} transferências confirmadas
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Estudantes / Alunos</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-2xl font-black text-white">{stats?.totalStudents ?? (stats?.totalUsers || 0)}</p>
                <p className="text-[11px] text-indigo-400 mt-1">Base de estudantes cadastrados</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Equipe & Staff</span>
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-2xl font-black text-white">{stats?.totalStaff ?? 1}</p>
                <p className="text-[11px] text-violet-400 mt-1">Administradores do sistema</p>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl relative overflow-hidden group">
                <div className="flex items-center justify-between text-zinc-400 mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Comprovativos Pendentes</span>
                  <Smartphone className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-2xl font-black text-amber-400">{stats?.pendingProofs || 0}</p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {stats?.pendingProofs ? "Requer validação urgente" : "Nenhum pendente agora"}
                </p>
              </div>

            </div>

            {/* Model Distribution & System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" /> Distribuição de Modelos de IA
                  </h3>
                  <span className="text-xs text-zinc-400">Roteamento Inteligente Multi-LLM</span>
                </div>
                <p className="text-xs text-zinc-400">
                  Uso equilibrado entre Google DeepMind (Flash para questões instantâneas e Pro para raciocínio profundo) e Meta LLaMA 3.3 via Groq Nuclear.
                </p>

                <div className="space-y-3 pt-2">
                  {stats?.modelDistribution.map((m) => (
                    <div key={m.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-300">{m.name}</span>
                        <span className="font-mono text-zinc-400">{m.share}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            m.color === "emerald" ? "bg-emerald-500" : m.color === "violet" ? "bg-violet-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${m.share}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Status da Infraestrutura
                  </h3>
                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-400">Edge Streaming (Vercel)</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> 100% Ativo
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-400">Safe-Charge Protocol</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Ativo
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                      <span className="text-zinc-400">Roteador Failover</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Blindado
                      </span>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setActiveTab("payments")} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-10">
                  Ver Comprovativos ({stats?.pendingProofs || 0}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

            </div>
          </div>
        )}

        {/* ---------------- 2. ABA: CENTRAL DE PAGAMENTOS & VALIDADOR ---------------- */}
        {activeTab === "payments" && (
          <div className="space-y-4">
            
            {/* Header & Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {["all", "pending", "approved", "rejected"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setProofStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer ${
                      proofStatusFilter === s
                        ? "bg-zinc-800 text-white border border-zinc-700"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s === "all" ? "Todos" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : "Rejeitados"}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={proofSearch}
                  onChange={(e) => setProofSearch(e.target.value)}
                  placeholder="Buscar por e-mail ou plano..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tabela de Comprovativos */}
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Data / Hora</th>
                      <th className="p-3.5">Usuário (E-mail)</th>
                      <th className="p-3.5">Plano</th>
                      <th className="p-3.5">Valor</th>
                      <th className="p-3.5">Método</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {proofs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-zinc-500">
                          Nenhum comprovativo encontrado nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      proofs.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                          <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                            {new Date(p.created_at).toLocaleString("pt-AO")}
                          </td>
                          <td className="p-3.5 font-medium text-white max-w-[200px] truncate">
                            {p.user_email || p.user_id.slice(0, 12)}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.plan_type === "premium" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                              p.plan_type === "ultra" ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" :
                              "bg-zinc-800 text-zinc-300"
                            }`}>
                              {p.plan_type}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-emerald-400">
                            {p.amount}
                          </td>
                          <td className="p-3.5 text-zinc-300 capitalize">
                            {p.payment_method === "mcx" ? "Multicaixa Express" : p.payment_method}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              p.status === "approved" ? "bg-emerald-500/20 text-emerald-300" :
                              p.status === "rejected" ? "bg-rose-500/20 text-rose-300" :
                              "bg-amber-500/20 text-amber-300 animate-pulse"
                            }`}>
                              {p.status === "approved" ? "Aprovado" : p.status === "rejected" ? "Rejeitado" : "Pendente"}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <Button 
                              onClick={() => { setSelectedProof(p); setAdminNoteInput(p.admin_notes || ""); }}
                              size="sm" 
                              variant="outline"
                              className="rounded-xl text-[11px] h-7 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                            >
                              <Eye className="w-3 h-3 mr-1" /> Examinar
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 3. ABA: GESTÃO DE USUÁRIOS ---------------- */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Role Filter Tabs */}
                <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setUserRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === "all" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Todos ({stats?.totalUsers || users.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("students")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === "students" ? "bg-indigo-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Alunos / Estudantes ({stats?.totalStudents ?? "-"})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("staff")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      userRoleFilter === "staff" ? "bg-amber-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Equipe & Staff ({stats?.totalStaff ?? "-"})
                  </button>
                </div>

                {/* Plan filter */}
                <div className="flex items-center gap-1">
                  {["all", "free", "pro", "ultra", "premium"].map((pl) => (
                    <button
                      key={pl}
                      onClick={() => setUserPlanFilter(pl)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold uppercase transition cursor-pointer ${
                        userPlanFilter === pl
                          ? "bg-zinc-800 text-white border border-zinc-700"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {pl === "all" ? "Planos" : pl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Usuário / Estudante</th>
                      <th className="p-3.5">Tipo de Conta</th>
                      <th className="p-3.5">Plano Ativo</th>
                      <th className="p-3.5">Saldo de Créditos</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          Nenhum usuário encontrado nesta categoria.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-zinc-800/40 transition">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden shrink-0 text-xs font-bold text-white shadow-sm">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  (u.full_name || u.email || "U").slice(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-zinc-100 text-xs truncate max-w-[200px]">
                                  {u.full_name || u.email?.split("@")[0] || "Usuário"}
                                </p>
                                <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[200px]" title={u.email || u.id}>
                                  {u.email || u.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            {u.is_admin ? (
                              <span className="text-amber-300 font-bold text-[10px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" /> Staff / Admin
                              </span>
                            ) : (
                              <span className="text-indigo-300 font-medium text-[10px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <User className="w-3 h-3" /> Estudante
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.plan_type === "premium" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                              u.plan_type === "ultra" ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" :
                              u.plan_type === "pro" ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" :
                              "bg-zinc-800 text-zinc-400 border border-zinc-700"
                            }`}>
                              {u.plan_type || "free"}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-white">
                            {u.plan_type === "premium" ? (
                              <span className="text-amber-400 font-extrabold flex items-center gap-1 text-xs">
                                <Crown className="w-3 h-3" /> Ilimitado
                              </span>
                            ) : (
                              u.credits_balance?.toLocaleString("pt-AO") || 0
                            )}
                          </td>
                          <td className="p-3.5">
                            {u.is_banned ? (
                              <span className="text-rose-400 font-semibold text-[10px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                                Suspenso
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[10px]">Ativo</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5">
                            <Button 
                              onClick={() => {
                                setSelectedUser(u);
                                setEditUserCredits(u.credits_balance || 0);
                                setEditUserPlan(u.plan_type || "free");
                              }}
                              size="sm"
                              variant="outline"
                              className="rounded-xl text-[11px] h-7 border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white"
                            >
                              Editar
                            </Button>
                            <Button 
                              onClick={() => handleToggleBan(u)}
                              size="sm"
                              variant="outline"
                              className={`rounded-xl text-[11px] h-7 ${
                                u.is_banned 
                                  ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" 
                                  : "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                              }`}
                            >
                              {u.is_banned ? "Reativar" : "Banir"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 4. ABA: LOGS DE IA & ERROS EM TEMPO REAL ---------------- */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Auditoria & Logs de IA</h3>
                <p className="text-xs text-zinc-400">Acompanhe requisições de resolução, limites de cota (429) e failover para Groq.</p>
              </div>
              <Button onClick={loadLogs} variant="outline" size="sm" className="rounded-xl text-xs flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar Logs
              </Button>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Endpoint</th>
                      <th className="p-3.5">Modelo IA</th>
                      <th className="p-3.5">Status Code</th>
                      <th className="p-3.5">Mensagem de Erro / Evento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-zinc-500 font-sans">
                          Nenhum erro registrado recentemente. Todos os sistemas e roteadores de IA operando normalmente.
                        </td>
                      </tr>
                    ) : (
                      logs.map((l) => (
                        <tr key={l.id} className="hover:bg-zinc-800/40 transition">
                          <td className="p-3.5 text-zinc-400">
                            {new Date(l.created_at).toLocaleTimeString("pt-AO")}
                          </td>
                          <td className="p-3.5 text-indigo-400">{l.endpoint}</td>
                          <td className="p-3.5 text-zinc-300">{l.model || "Router"}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              l.status_code >= 500 ? "bg-rose-500/20 text-rose-300" :
                              l.status_code === 429 ? "bg-amber-500/20 text-amber-300" :
                              "bg-zinc-800 text-zinc-400"
                            }`}>
                              {l.status_code}
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-300 truncate max-w-[300px]" title={l.error_message}>
                            {l.error_message}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- 5. ABA: CONFIGURAÇÕES BANCÁRIAS DINÂMICAS ---------------- */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 shadow-xl space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" /> Configurações de Pagamento Dinâmicas
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Altere aqui os dados bancários. As mudanças refletem instantaneamente no modal de upgrade de todos os estudantes.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nome do Banco</label>
                <input 
                  type="text"
                  value={bankSettings.bank_name}
                  onChange={(e) => setBankSettings({ ...bankSettings, bank_name: e.target.value })}
                  placeholder="Ex: BFA, BAI, Atlântico..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Titular da Conta</label>
                <input 
                  type="text"
                  value={bankSettings.account_holder}
                  onChange={(e) => setBankSettings({ ...bankSettings, account_holder: e.target.value })}
                  placeholder="Ex: José Escrivão Silvestre"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Telefone Multicaixa Express</label>
                <input 
                  type="text"
                  value={bankSettings.express_phone}
                  onChange={(e) => setBankSettings({ ...bankSettings, express_phone: e.target.value })}
                  placeholder="Ex: +244 930 339 436"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">IBAN (Opcional - Deixe vazio se não quiser exibir)</label>
                <input 
                  type="text"
                  value={bankSettings.iban}
                  onChange={(e) => setBankSettings({ ...bankSettings, iban: e.target.value })}
                  placeholder="Ex: AO06.0040.0000.0000.0000.0000.0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Câmbio Base USD para Kz (Fallback)</label>
                <input 
                  type="number"
                  value={bankSettings.usd_to_aoa_rate}
                  onChange={(e) => setBankSettings({ ...bankSettings, usd_to_aoa_rate: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Usado caso a API de cotação em tempo real esteja temporariamente indisponível.</p>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  disabled={isSavingSettings} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs h-11 font-bold"
                >
                  {isSavingSettings ? "Salvando..." : "Salvar Configurações no Banco"}
                </Button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* ---------------- MODAL DE VALIDAÇÃO DE COMPROVATIVO ---------------- */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative space-y-5 my-6">
            <button
              onClick={() => setSelectedProof(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Validador de Comprovativo</h3>
                <p className="text-xs text-zinc-400">Examine o print da transferência antes de aprovar os créditos.</p>
              </div>
            </div>

            {/* Imagem do Comprovativo com Zoom */}
            <div className="rounded-2xl border border-zinc-800 bg-black/50 overflow-hidden relative aspect-video flex items-center justify-center">
              {selectedProof.proof_url ? (
                <Image 
                  src={selectedProof.proof_url} 
                  alt="Comprovativo" 
                  fill 
                  unoptimized 
                  className="object-contain" 
                />
              ) : (
                <span className="text-zinc-500 text-xs">Nenhuma imagem de comprovativo disponível.</span>
              )}
            </div>

            {/* Dados do Pagamento */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80">
              <div>
                <span className="text-zinc-500">Usuário:</span>
                <p className="font-semibold text-white truncate">{selectedProof.user_email || selectedProof.user_id}</p>
              </div>
              <div>
                <span className="text-zinc-500">Plano Pretendido:</span>
                <p className="font-bold text-indigo-400 uppercase">{selectedProof.plan_type}</p>
              </div>
              <div>
                <span className="text-zinc-500">Valor Declarado:</span>
                <p className="font-bold text-emerald-400">{selectedProof.amount}</p>
              </div>
              <div>
                <span className="text-zinc-500">Método:</span>
                <p className="text-zinc-200 capitalize">{selectedProof.payment_method}</p>
              </div>
            </div>

            {/* Observações Administrativas */}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Notas Administrativas (Opcional):</label>
              <input 
                type="text"
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Ex: Aprovado via Multicaixa BFA..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-indigo-500"
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={() => handlePaymentAction("reject")}
                disabled={isProcessingAction}
                variant="outline"
                className="flex-1 rounded-xl text-xs h-11 border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
              >
                <XCircle className="w-4 h-4 mr-1.5" /> Rejeitar
              </Button>
              <Button
                onClick={() => handlePaymentAction("approve")}
                disabled={isProcessingAction}
                className="flex-1 rounded-xl text-xs h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> {isProcessingAction ? "Aprovando..." : "Aprovar e Creditar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL DE EDIÇÃO DE USUÁRIO ---------------- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Editor de Usuário
            </h3>
            <p className="text-xs text-zinc-400 font-mono truncate">ID: {selectedUser.id}</p>

            <div className="space-y-3 text-xs pt-2">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Nível de Plano</label>
                <select 
                  value={editUserPlan}
                  onChange={(e) => setEditUserPlan(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                >
                  <option value="free">Free (Gratuito)</option>
                  <option value="pro">Pro (2.000 Créditos)</option>
                  <option value="ultra">Ultra (10.000 Créditos)</option>
                  <option value="premium">Premium (VIP Ilimitado)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Saldo de Créditos</label>
                <input 
                  type="number"
                  value={editUserCredits}
                  onChange={(e) => setEditUserCredits(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button onClick={() => setSelectedUser(null)} variant="ghost" className="flex-1 rounded-xl text-xs h-10">
                Cancelar
              </Button>
              <Button onClick={handleUserSave} disabled={isProcessingAction} className="flex-1 rounded-xl text-xs h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
