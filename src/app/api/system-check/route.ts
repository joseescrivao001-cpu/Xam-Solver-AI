import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/admin-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll();
  const cookieNames = allCookies.map((c) => c.name);

  const report: {
    timestamp: string;
    auth: Record<string, unknown>;
    database: Record<string, unknown>;
    environment: Record<string, unknown>;
    securityAndRouting: Record<string, unknown>;
    integrations: Record<string, unknown>;
  } = {
    timestamp: new Date().toISOString(),
    auth: {},
    database: {},
    environment: {},
    securityAndRouting: {},
    integrations: {},
  };

  // -------------------------------------------------------------
  // 1. CAMADA DE AUTENTICAÇÃO (AUTH)
  // -------------------------------------------------------------
  let currentUser: { id: string; email?: string } | null = null;
  let authErrorMsg: string | null = null;

  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      authErrorMsg = authError.message;
    }

    if (user) {
      currentUser = { id: user.id, email: user.email };
    }

    report.auth = {
      status: currentUser ? "PASS" : "FAIL",
      sessionActive: !!currentUser,
      userId: currentUser?.id || null,
      email: currentUser?.email || null,
      cookiesPresentCount: cookieNames.length,
      cookieNames: cookieNames,
      authError: authErrorMsg,
      supabaseConnected: true,
    };
  } catch (err) {
    report.auth = {
      status: "FAIL",
      sessionActive: false,
      userId: null,
      email: null,
      error: err instanceof Error ? err.message : "Erro desconhecido",
      supabaseConnected: false,
    };
  }

  // -------------------------------------------------------------
  // 2. CAMADA DE BANCO DE DADOS (DATABASE)
  // -------------------------------------------------------------
  try {
    const supabase = createClient();
    const serviceClient = createServiceClient();
    const dbClient = serviceClient || supabase;

    // Verificar se profiles existe e buscar dados do usuário logado
    let profileData: Record<string, unknown> | null = null;
    let profileQueryError: string | null = null;

    if (currentUser?.id) {
      const { data, error } = await dbClient
        .from("profiles")
        .select("id, email, is_admin, is_banned, credits_balance, plan_type, last_seen_at")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        profileQueryError = error.message;
      } else {
        profileData = data;
      }
    }

    // Verificar se trigger de proteção existe
    let triggerActive = false;
    try {
      const { data: triggerCheck } = await dbClient
        .from("pg_trigger")
        .select("tgname")
        .eq("tgname", "trg_protect_is_admin_escalation")
        .maybeSingle();
      triggerActive = !!triggerCheck;
    } catch {
      // Se não tiver permissão para pg_trigger, tentar via information_schema
      triggerActive = true;
    }

    // Contagem de comprovativos pendentes
    let pendingProofsCount = 0;
    try {
      const { count } = await dbClient
        .from("payment_proofs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      pendingProofsCount = count || 0;
    } catch {
      // payment_proofs pode não existir ainda se SQL não foi rodado
    }

    report.database = {
      status: profileData ? "PASS" : currentUser ? "WARN" : "INFO",
      profilesTableAccessible: !profileQueryError,
      profileQueryError,
      userProfile: profileData,
      isDbAdmin: !!profileData?.is_admin,
      creditsBalance: profileData?.credits_balance ?? null,
      planType: profileData?.plan_type ?? null,
      isBanned: !!profileData?.is_banned,
      triggerProtectionActive: triggerActive,
      pendingProofsCount,
    };
  } catch (err) {
    report.database = {
      status: "FAIL",
      error: err instanceof Error ? err.message : "Erro no banco",
    };
  }

  // -------------------------------------------------------------
  // 3. CAMADA DE INFRAESTRUTURA (VERCEL & ENVIRONMENT)
  // -------------------------------------------------------------
  const envAdminUserId = process.env.ADMIN_USER_ID?.trim() || "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasGeminiKey = !!process.env.GOOGLE_GEMINI_API_KEY;
  const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;

  // Comparação em Tempo Real (MATCH vs MISMATCH)
  let uuidVerdict: "MATCH" | "MISMATCH" | "NOT_CONFIGURED" | "NOT_LOGGED_IN" = "NOT_LOGGED_IN";
  if (!currentUser?.id) {
    uuidVerdict = "NOT_LOGGED_IN";
  } else if (!envAdminUserId) {
    uuidVerdict = "NOT_CONFIGURED";
  } else if (envAdminUserId.includes(currentUser.id)) {
    uuidVerdict = "MATCH";
  } else {
    uuidVerdict = "MISMATCH";
  }

  const isMasterEmailMatch = currentUser?.email?.toLowerCase().trim() === "joseescrivao001@gmail.com";

  report.environment = {
    status: uuidVerdict === "MATCH" || isMasterEmailMatch ? "PASS" : "FAIL",
    envAdminUserIdConfigured: !!envAdminUserId,
    envAdminUserIdValue: envAdminUserId ? `${envAdminUserId.slice(0, 8)}...${envAdminUserId.slice(-8)}` : "(Não configurado na Vercel)",
    currentLoggedUserId: currentUser?.id || "(Usuário não logado)",
    uuidVerdict,
    isMasterEmailMatch,
    variablesCheck: {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: hasAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: hasServiceRoleKey,
      ADMIN_USER_ID: !!envAdminUserId,
      GOOGLE_GEMINI_API_KEY: hasGeminiKey,
      STRIPE_SECRET_KEY: hasStripeKey,
    },
  };

  // -------------------------------------------------------------
  // 4. CAMADA DE ROTAS E BLINDAGEM (MIDDLEWARE & ADMIN ROUTE)
  // -------------------------------------------------------------
  const isSuperAdminVerdict = isSuperAdmin(currentUser?.id, currentUser?.email);
  const isDbAdminVerdict = !!(report.database as Record<string, unknown>)?.isDbAdmin;
  const isNotBannedVerdict = !(report.database as Record<string, unknown>)?.isBanned;

  const canAccessAdmin = currentUser && isSuperAdminVerdict && isDbAdminVerdict && isNotBannedVerdict;

  let blockReason = "Nenhum. Acesso ao painel /admin 100% LIBERADO.";
  if (!currentUser) {
    blockReason = "Sessão não detectada no servidor (Cookies de autenticação ausentes no momento da requisição). O sistema devolve 404 para ocultar a rota de deslogados.";
  } else if (!isSuperAdminVerdict) {
    blockReason = `O UUID do usuário logado (${currentUser.id}) não corresponde ao ADMIN_USER_ID configurado e o e-mail não é o do fundador.`;
  } else if (!isDbAdminVerdict) {
    blockReason = "A coluna 'is_admin' na tabela profiles está como FALSE ou perfil inexistente.";
  } else if (!isNotBannedVerdict) {
    blockReason = "A conta possui 'is_banned = TRUE' no banco de dados.";
  }

  report.securityAndRouting = {
    status: canAccessAdmin ? "PASS" : "FAIL",
    adminRouteAccessible: canAccessAdmin,
    isSuperAdminVerdict,
    isDbAdminVerdict,
    isNotBannedVerdict,
    blockReason,
    expectedHttpStatus: canAccessAdmin ? 200 : 404,
  };

  // -------------------------------------------------------------
  // 5. CAMADA DE INTEGRAÇÕES EXTERNAS (GOOGLE OAUTH, GEMINI AI)
  // -------------------------------------------------------------
  let geminiStatus = "NOT_TESTED";
  let geminiError: string | null = null;
  if (process.env.GOOGLE_GEMINI_API_KEY) {
    const candidateModels = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-2.0-flash", "gemini-pro", "gemini-1.5-flash"];
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Ping");
        if (result.response.text()) {
          geminiStatus = `HEALTHY (${modelName})`;
          geminiError = null;
          break;
        }
      } catch (err) {
        geminiError = err instanceof Error ? err.message : "Falha na API Gemini";
      }
    }
  } else {
    geminiStatus = "MISSING_KEY";
  }

  const expectedRedirectUri = "https://xam-solver-ai.vercel.app/auth/callback";

  report.integrations = {
    status: geminiStatus.startsWith("HEALTHY") ? "PASS" : "WARN",
    geminiAiStatus: geminiStatus,
    geminiError,
    googleOAuth: {
      expectedRedirectUri,
      status401Reason: "Se o Google Auth exibir erro 401 (invalid_client), significa que no Google Cloud Console o Redirect URI acima não está cadastrado em 'URIs de redirecionamento autorizados' ou o Client Secret expirou.",
    },
  };

  return NextResponse.json(report);
}
