/**
 * Testes estáticos das guardas de aplicação.
 *
 * O que estes testes cobrem: regressões na camada TypeScript e no SQL, lendo os
 * ficheiros reais e verificando invariantes de segurança. Não substituem testes
 * de integração contra o Supabase, mas impedem que uma correção de segurança
 * seja removida silenciosamente num commit futuro.
 *
 *   node --test tests/security/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), "utf8");

function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, entry);
    const full = join(ROOT, rel);
    if (statSync(full).isDirectory()) walk(rel, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(relative(ROOT, full));
  }
  return out;
}

const MIGRATION = "supabase/migrations/2026-10-28_security_hardening.sql";

/** Remove comentários — as asserções olham para código, não para prosa. */
const stripSql = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
const stripTs = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/[^\n]*/g, "$1");
/** Comentários + literais de texto (para procurar tokens em código a sério). */
const stripSqlDeep = (s) => stripSql(s).replace(/'(?:[^']|'')*'/g, "''");

/** Bloco de um plano dentro de PLANS. */
function planBlock(src, id) {
  const start = src.indexOf(`  ${id}: {`);
  assert.ok(start !== -1, `plano ${id} não encontrado em plans.ts`);
  const end = src.indexOf("\n  },", start);
  return src.slice(start, end === -1 ? src.length : end);
}

/** Ordem de duas ocorrências: a guarda tem de vir antes do acesso. */
function assertBefore(haystack, first, second, message) {
  const a = haystack.indexOf(first);
  const b = haystack.indexOf(second);
  assert.ok(a !== -1, `${message}: "${first}" não encontrado`);
  assert.ok(b !== -1, `${message}: "${second}" não encontrado`);
  assert.ok(a < b, `${message}: "${first}" aparece depois de "${second}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Isolamento de dados (IDOR)
// ─────────────────────────────────────────────────────────────────────────────

test("chat/messages valida a propriedade da conversa antes de ler mensagens", () => {
  const src = read("src/app/api/chat/messages/route.ts");
  assert.match(src, /ownsConversation/, "falta ownsConversation");
  assertBefore(src, "ownsConversation", '.from("messages")', "mensagens lidas sem guarda");
});

test("notebooks/ai-tool valida caderno e conversa antes de qualquer leitura", () => {
  const src = read("src/app/api/notebooks/ai-tool/route.ts");
  assert.match(src, /ownsNotebook/);
  assert.match(src, /ownsConversation/);
  assertBefore(src, "ownsNotebook", '.from("notebooks")', "caderno lido sem guarda");
  assertBefore(src, "ownsConversation", '.from("messages")', "histórico lido sem guarda");
});

test("notebooks/analytics valida o caderno em GET e em POST", () => {
  const src = read("src/app/api/notebooks/analytics/route.ts");
  const guards = src.match(/ownsNotebook/g) ?? [];
  assert.ok(guards.length >= 2, `esperadas 2 guardas, encontradas ${guards.length}`);
});

test("DELETE /api/notebooks valida o dono ANTES das eliminações em cascata", () => {
  const src = read("src/app/api/notebooks/route.ts");
  assertBefore(
    src,
    "ownsNotebook",
    '.from("notebook_materials").delete()',
    "eliminação em cascata antes de confirmar o dono"
  );
});

test("api/chat valida conversation_id e notebook_id recebidos do cliente", () => {
  const src = read("src/app/api/chat/route.ts");
  assert.match(src, /isUuid\(conversationId\)/);
  assertBefore(src, "ownsConversation", '.from("messages")\n        .select("role, content")', "histórico carregado sem validar dono");
  assert.match(src, /ownsNotebook/);
});

// ─────────────────────────────────────────────────────────────────────────────
// Custo de IA, diagnóstico e créditos
// ─────────────────────────────────────────────────────────────────────────────

test("system-check-ai exige administrador e não expõe fragmentos da chave", () => {
  const src = stripTs(read("src/app/api/system-check-ai/route.ts"));
  assert.match(src, /verifyAdmin/, "rota de diagnóstico sem verificação de admin");
  assert.doesNotMatch(src, /slice\(0,\s*4\)/, "volta a expor prefixo da chave");
  assert.doesNotMatch(src, /apiKey\s*\.\s*slice/, "volta a expor fragmento da chave");
});

test("o consumo de crédito acontece ANTES da chamada ao modelo", () => {
  const src = read("src/app/api/chat/route.ts");
  assertBefore(src, "consumeCredit", "api.cerebras.ai", "chamada ao modelo antes de cobrar");
  assert.match(src, /refundCredit/, "sem reembolso quando o modelo falha");
});

test("a quota de convidado é aplicada no servidor", () => {
  const src = read("src/app/api/chat/route.ts");
  assert.match(src, /readGuestUsage/);
  assert.match(src, /guestLimitReached/);
  assert.match(src, /guestUsageCookie/);
});

test("as rotas de IA têm limitação de pedidos", () => {
  for (const file of ["src/app/api/chat/route.ts", "src/app/api/solve/route.ts"]) {
    assert.match(read(file), /\bhit\(/, `${file} sem limitador`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Administração e configuração
// ─────────────────────────────────────────────────────────────────────────────

test("nenhum UUID administrativo está fixo no código", () => {
  const offenders = walk("src").filter((f) => /604c5dee-7dd6|07167607-a59a/.test(read(f)));
  assert.deepEqual(offenders, [], `UUID administrativo fixo em: ${offenders.join(", ")}`);
});

test("os ficheiros de autorização não comparam com um e-mail fixo", () => {
  // O e-mail pode aparecer como contacto público (landing page); o que não pode
  // existir é uma comparação de autorização com um endereço literal.
  const authFiles = [
    "src/lib/admin-auth.ts",
    "src/lib/admin-config.ts",
    "src/middleware.ts",
    "src/app/api/user/profile/route.ts",
  ];
  for (const file of authFiles) {
    const src = stripTs(read(file));
    assert.doesNotMatch(src, /@gmail\.com|@[a-z0-9.-]+\.(com|net|org)/i, `${file} compara com e-mail literal`);
  }
});

test("as rotas de API não devolvem mensagens de erro internas", () => {
  const offenders = walk("src/app/api").filter((f) => /error:\s*(error|err|insertError|updateError)\.message/.test(read(f)));
  assert.deepEqual(offenders, [], `fuga de erro interno em: ${offenders.join(", ")}`);
});

test("next.config define cabeçalhos de segurança", () => {
  const src = read("next.config.mjs");
  for (const header of ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"]) {
    assert.match(src, new RegExp(header), `falta ${header}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SQL: autoridade, privilégios e alinhamento com o código
// ─────────────────────────────────────────────────────────────────────────────

test("a migração não usa CURRENT_USER como autorização", () => {
  // Remove comentários e literais: a prosa pode (e deve) explicar o problema.
  assert.doesNotMatch(
    stripSqlDeep(read(MIGRATION)),
    // \b evita falsos positivos dentro de `is_current_user_admin`.
    /\bCURRENT_USER\b/i,
    "CURRENT_USER dentro de SECURITY DEFINER é o dono da função, não o chamador"
  );
});

test("a migração autoriza por JWT e session_user", () => {
  const sql = stripSql(read(MIGRATION));
  assert.match(sql, /request\.jwt\.claims/);
  assert.match(sql, /session_user/);
  assert.match(sql, /rolsuper/);
});

test("anon e authenticated não executam aprovação nem créditos", () => {
  const sql = stripSql(read(MIGRATION));
  for (const fn of ["approve_payment_proof", "consume_credit", "refund_credit"]) {
    const blocks = sql.split(`REVOKE ALL ON FUNCTION public.${fn}`);
    assert.ok(blocks.length >= 2, `${fn}: falta REVOKE`);
    assert.match(sql, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO service_role`), `${fn}: sem GRANT a service_role`);
  }
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.approve_payment_proof\(UUID\) FROM anon/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.approve_payment_proof\(UUID\) FROM authenticated/);
});

test("toda função SECURITY DEFINER na migração tem search_path fixo", () => {
  const sql = stripSql(read(MIGRATION));
  const definitions = sql.split(/CREATE OR REPLACE FUNCTION/i).slice(1);
  const offenders = definitions.filter((block) => /SECURITY DEFINER/i.test(block) && !/SET search_path/i.test(block));
  assert.equal(offenders.length, 0, `${offenders.length} função(ões) SECURITY DEFINER sem search_path`);
});

test("a aprovação exige estado pendente e não é repetível", () => {
  const sql = stripSql(read(MIGRATION));
  assert.match(sql, /FOR UPDATE/);
  assert.match(sql, /v_status IS DISTINCT FROM 'pending'/);
  assert.match(sql, /AND status = 'pending'|WHERE id = proof_id\s*\n\s*AND status = 'pending'/);
});

test("não há 'ultra' no catálogo SQL nem créditos fictícios", () => {
  const sql = stripSql(read(MIGRATION));
  assert.doesNotMatch(sql, /999999|9999999|999999999/, "voltaram valores fictícios");
  assert.match(sql, /WHERE plan_id NOT IN \('free', 'pro', 'premium'\)/);
});

test("planos e créditos do SQL coincidem com src/lib/plans.ts", () => {
  const plans = read("src/lib/plans.ts");
  const sql = stripSql(read(MIGRATION));

  const num = (src, pattern, label) => {
    const match = src.match(pattern);
    assert.ok(match, `não encontrei ${label}`);
    return Number(match[1].replace(/_/g, ""));
  };

  const signup = num(plans, /SIGNUP_CREDITS = ([\d_]+)/, "SIGNUP_CREDITS");
  const premiumCredits = num(plans, /PREMIUM_CREDITS = ([\d_]+)/, "PREMIUM_CREDITS");

  const freeBlock = planBlock(plans, "free");
  const proBlock = planBlock(plans, "pro");
  const premiumBlock = planBlock(plans, "premium");

  const freeCredits = /credits: SIGNUP_CREDITS/.test(freeBlock)
    ? signup
    : num(freeBlock, /credits: ([\d_]+)/, "créditos free");
  const proCredits = num(proBlock, /credits: ([\d_]+)/, "créditos pro");
  const premiumCreditsResolved = /credits: PREMIUM_CREDITS/.test(premiumBlock)
    ? premiumCredits
    : num(premiumBlock, /credits: ([\d_]+)/, "créditos premium");

  const proUsd = num(proBlock, /priceUsd: ([\d_]+)/, "preço pro");
  const premiumUsd = num(premiumBlock, /priceUsd: ([\d_]+)/, "preço premium");
  const freeUsd = num(freeBlock, /priceUsd: ([\d_]+)/, "preço free");

  assert.match(sql, new RegExp(`\\('free',\\s*${freeCredits},\\s*FALSE,\\s*${freeUsd}\\)`), "SQL: free divergente");
  assert.match(sql, new RegExp(`\\('pro',\\s*${proCredits},\\s*FALSE,\\s*${proUsd}\\)`), "SQL: pro divergente");
  assert.match(
    sql,
    new RegExp(`\\('premium',\\s*${premiumCreditsResolved},\\s*TRUE,\\s*${premiumUsd}\\)`),
    "SQL: premium divergente"
  );
});

test("a migração é idempotente (sem CREATE POLICY sem DROP IF EXISTS)", () => {
  const sql = stripSql(read(MIGRATION));
  const created = sql.match(/CREATE POLICY "[^"]+"/g) ?? [];
  const dropped = sql.match(/DROP POLICY IF EXISTS "[^"]+"/g) ?? [];
  assert.ok(created.length > 0, "nenhuma política criada");
  assert.ok(
    dropped.length >= created.length,
    `políticas criadas=${created.length}, DROP IF EXISTS=${dropped.length}`
  );
});

test("a migração não destrói dados de utilizador", () => {
  const sql = stripSql(read(MIGRATION));
  assert.doesNotMatch(sql, /DROP TABLE/i, "DROP TABLE não autorizado");
  assert.doesNotMatch(sql, /TRUNCATE/i, "TRUNCATE não autorizado");
  assert.doesNotMatch(sql, /DELETE FROM public\.(profiles|payment_proofs|conversations|messages)/i, "delete de dados de utilizador");
});
