-- ============================================================================
-- TESTES DE SEGURANÇA — HARDENING 2026-10-28
-- ----------------------------------------------------------------------------
-- APENAS PARA BASE DE DADOS DESCARTÁVEL. Não executar em produção: cria
-- funções auxiliares de teste.
--
-- Pré-requisitos, por esta ordem:
--   1. 000_local_stub.sql                          (emula o Supabase)
--   2. migrations/2026-10-28_security_hardening.sql (executar DUAS vezes)
--   3. este ficheiro
--
-- Corre inteiro dentro de uma transação e termina com ROLLBACK: não deixa
-- dados para trás. A última instrução devolve uma linha por teste no formato
-- `ESTADO|NOME|DETALHE`.
-- ============================================================================

BEGIN;

-- ── Infraestrutura de teste ────────────────────────────────────────────────
CREATE TABLE public.t_results (
  seq    BIGSERIAL PRIMARY KEY,
  name   TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT
);

CREATE FUNCTION public.t_record(p_name TEXT, p_status TEXT, p_detail TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.t_results (name, status, detail) VALUES (p_name, p_status, p_detail);
END;
$$;

CREATE FUNCTION public.t_assert(p_name TEXT, p_ok BOOLEAN, p_detail TEXT DEFAULT '')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_ok THEN
    PERFORM public.t_record(p_name, 'PASS', p_detail);
  ELSE
    PERFORM public.t_record(p_name, 'FALHOU', p_detail);
    RAISE EXCEPTION 'FALHOU %: %', p_name, p_detail;
  END IF;
END;
$$;

-- Executa SQL **com os privilégios do chamador** (SECURITY INVOKER, de
-- propósito) e exige um SQLSTATE específico.
CREATE FUNCTION public.t_expect_error(p_name TEXT, p_expected_state TEXT, p_sql TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state TEXT;
  v_msg   TEXT;
BEGIN
  BEGIN
    EXECUTE p_sql;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;

    IF v_state = p_expected_state THEN
      PERFORM public.t_record(p_name, 'PASS', p_expected_state || ' · ' || left(v_msg, 100));
    ELSE
      PERFORM public.t_record(p_name, 'FALHOU',
        format('esperado %s, obtido %s · %s', p_expected_state, v_state, v_msg));
      RAISE EXCEPTION 'FALHOU %', p_name;
    END IF;
    RETURN;
  END;

  PERFORM public.t_record(p_name, 'FALHOU', 'nenhum erro (esperado ' || p_expected_state || ')');
  RAISE EXCEPTION 'FALHOU %', p_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.t_record(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.t_assert(TEXT, BOOLEAN, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.t_expect_error(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;

-- ── Dados de teste ─────────────────────────────────────────────────────────
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aluno-a@teste.local'),
  ('22222222-2222-2222-2222-222222222222', 'aluno-b@teste.local'),
  ('33333333-3333-3333-3333-333333333333', 'admin@teste.local'),
  ('44444444-4444-4444-4444-444444444444', 'sem-perfil@teste.local'),
  ('55555555-5555-5555-5555-555555555555', 'aluno-e@teste.local'),
  ('66666666-6666-6666-6666-666666666666', 'aluno-f@teste.local');

INSERT INTO public.profiles (id, email, plan_type, credits_balance, is_admin) VALUES
  ('11111111-1111-1111-1111-111111111111', 'aluno-a@teste.local', 'free',    50,      FALSE),
  ('22222222-2222-2222-2222-222222222222', 'aluno-b@teste.local', 'free',    10,      FALSE),
  ('33333333-3333-3333-3333-333333333333', 'admin@teste.local',   'premium', 1000000, TRUE),
  ('55555555-5555-5555-5555-555555555555', 'aluno-e@teste.local', 'free',    3,       FALSE),
  ('66666666-6666-6666-6666-666666666666', 'aluno-f@teste.local', 'free',    0,       FALSE);
-- 4444… fica deliberadamente sem registo em profiles.

INSERT INTO public.payment_proofs (id, user_id, plan_type, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pro',     'pending'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'premium', 'pending'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'pro',     'rejected'),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'gold',    'pending'),
  ('a0000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'free',    'pending'),
  ('a0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'pro',     'pending'),
  ('a0000000-0000-0000-0000-000000000007', '44444444-4444-4444-4444-444444444444', 'pro',     'pending'),
  ('a0000000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'ultra',   'pending');

INSERT INTO public.conversations (id, user_id, title) VALUES
  ('c0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Conversa do A'),
  ('c0000000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', 'Conversa do B');

INSERT INTO public.messages (conversation_id, role, content) VALUES
  ('c0000000-0000-0000-0000-00000000000a', 'user', 'pergunta privada do A'),
  ('c0000000-0000-0000-0000-00000000000b', 'user', 'pergunta privada do B');


-- ============================================================================
-- GRUPO 1 · anon não aprova pagamentos nem mexe em créditos
-- ============================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT public.t_expect_error('T01_anon_nao_aprova', '42501',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000001')$$);

SELECT public.t_expect_error('T02_anon_nao_consome_creditos', '42501',
  $$SELECT public.consume_credit('55555555-5555-5555-5555-555555555555')$$);

SELECT public.t_assert('T03_anon_nao_e_confiavel',
  public.is_trusted_writer() IS FALSE,
  'is_trusted_writer() = ' || public.is_trusted_writer()::text);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);


-- ============================================================================
-- GRUPO 2 · utilizador comum autenticado (não-admin)
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT public.t_assert('T04_nao_admin_nao_e_confiavel',
  public.is_trusted_writer() IS FALSE,
  'is_trusted_writer() = ' || public.is_trusted_writer()::text);

SELECT public.t_expect_error('T05_nao_admin_nao_aprova', '42501',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000001')$$);

SELECT public.t_expect_error('T06_nao_aprova_via_sql_direto_no_perfil', '42501',
  $$UPDATE public.profiles SET plan_type = 'premium'
     WHERE id = '11111111-1111-1111-1111-111111111111'$$);

SELECT public.t_expect_error('T07_nao_altera_creditos', '42501',
  $$UPDATE public.profiles SET credits_balance = 999999
     WHERE id = '11111111-1111-1111-1111-111111111111'$$);

SELECT public.t_expect_error('T08_nao_se_promove_a_admin', '42501',
  $$UPDATE public.profiles SET is_admin = TRUE
     WHERE id = '11111111-1111-1111-1111-111111111111'$$);

SELECT public.t_expect_error('T09_nao_se_desbane', '42501',
  $$UPDATE public.profiles SET is_banned = FALSE, is_admin = TRUE
     WHERE id = '11111111-1111-1111-1111-111111111111'$$);

SELECT public.t_expect_error('T10_nao_aproveita_update_em_lote', '42501',
  $$UPDATE public.profiles SET full_name = 'x', credits_balance = 999999
     WHERE id IN ('11111111-1111-1111-1111-111111111111',
                  '22222222-2222-2222-2222-222222222222')$$);

-- Campo de perfil legítimo continua editável pelo dono
UPDATE public.profiles SET full_name = 'Aluno A Renomeado'
 WHERE id = '11111111-1111-1111-1111-111111111111';
SELECT public.t_assert('T11_dono_edita_perfil_legitimo',
  (SELECT full_name FROM public.profiles
    WHERE id = '11111111-1111-1111-1111-111111111111') = 'Aluno A Renomeado',
  'full_name atualizado');

-- Perfil de terceiro inacessível (0 linhas, sem erro)
UPDATE public.profiles SET full_name = 'invadido'
 WHERE id = '22222222-2222-2222-2222-222222222222';
SELECT public.t_assert('T12_perfil_de_terceiro_intacto',
  (SELECT full_name FROM public.profiles
    WHERE id = '22222222-2222-2222-2222-222222222222') IS DISTINCT FROM 'invadido',
  'UPDATE alheio não produziu efeito');

SELECT public.t_expect_error('T13_nao_consome_creditos_por_rpc', '42501',
  $$SELECT public.consume_credit('11111111-1111-1111-1111-111111111111')$$);

SELECT public.t_expect_error('T14_nao_escreve_na_conversa_de_outro', '42501',
  $$INSERT INTO public.messages (conversation_id, role, content)
    VALUES ('c0000000-0000-0000-0000-00000000000b', 'user', 'injetado por A')$$);

SELECT public.t_expect_error('T15_nao_cria_comprovativo_ja_aprovado', '42501',
  $$INSERT INTO public.payment_proofs (user_id, plan_type, amount, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'premium', '0', 'approved')$$);

-- Isolamento de leitura via RLS
SELECT public.t_assert('T16_ve_apenas_as_suas_conversas',
  (SELECT count(*) FROM public.conversations) = 1,
  'conversas visíveis = ' || (SELECT count(*) FROM public.conversations)::text);

SELECT public.t_assert('T17_ve_apenas_as_suas_mensagens',
  (SELECT count(*) FROM public.messages) = 1,
  'mensagens visíveis = ' || (SELECT count(*) FROM public.messages)::text);

SELECT public.t_assert('T18_ve_apenas_o_proprio_perfil',
  (SELECT count(*) FROM public.profiles) = 1
  AND (SELECT full_name FROM public.profiles
        WHERE id = '22222222-2222-2222-2222-222222222222') IS NULL,
  'perfis visíveis = ' || (SELECT count(*) FROM public.profiles)::text);

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);


-- ============================================================================
-- GRUPO 3 · service_role: fluxo legítimo de pagamento e créditos
-- ============================================================================
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);

SELECT public.t_assert('T19_service_role_e_confiavel',
  public.is_trusted_writer() IS TRUE, 'backend reconhecido');

CREATE TEMP TABLE t_approve (seq serial, proof uuid, credits int);
CREATE TEMP TABLE t_consume (seq serial, ok boolean);
GRANT ALL ON t_approve, t_consume TO anon, authenticated, service_role;
GRANT ALL ON SEQUENCE t_approve_seq_seq, t_consume_seq_seq TO anon, authenticated, service_role;

INSERT INTO t_approve (proof, credits)
  SELECT 'a0000000-0000-0000-0000-000000000001', public.approve_payment_proof('a0000000-0000-0000-0000-000000000001');

SELECT public.t_assert('T20_aprovacao_pro_concede_20000',
  (SELECT credits FROM t_approve ORDER BY seq DESC LIMIT 1) = 20000,
  'créditos devolvidos = ' || (SELECT credits FROM t_approve ORDER BY seq DESC LIMIT 1)::text);

SELECT public.t_assert('T21_aprovacao_pro_ativa_plano',
  (SELECT plan_type FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') = 'pro'
  AND (SELECT credits_balance FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') = 20050
  AND (SELECT status FROM public.payment_proofs WHERE id = 'a0000000-0000-0000-0000-000000000001') = 'approved',
  'plano=pro · saldo=50+20000=20050 · estado=approved');

SELECT public.t_expect_error('T22_aprovacao_repetida_recusada', 'P0001',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000001')$$);

SELECT public.t_assert('T23_repeticao_nao_concede_creditos',
  (SELECT credits_balance FROM public.profiles WHERE id = '11111111-1111-1111-1111-111111111111') = 20050,
  'saldo inalterado = 20050');

SELECT public.t_expect_error('T24_rejeitado_nao_reaprova', 'P0001',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000003')$$);

SELECT public.t_expect_error('T25_plano_desconhecido_recusado', 'P0001',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000004')$$);

SELECT public.t_assert('T26_plano_invalido_nao_altera_estado',
  (SELECT status FROM public.payment_proofs WHERE id = 'a0000000-0000-0000-0000-000000000004') = 'pending',
  'comprovativo continua pending (atomicidade)');

SELECT public.t_expect_error('T27_plano_free_nao_ativavel', 'P0001',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000005')$$);

SELECT public.t_expect_error('T28_perfil_inexistente_falha', 'P0002',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000007')$$);

SELECT public.t_assert('T29_rollback_total_sem_perfil',
  (SELECT status FROM public.payment_proofs WHERE id = 'a0000000-0000-0000-0000-000000000007') = 'pending',
  'aprovação revertida por inteiro');

SELECT public.t_expect_error('T30_comprovativo_inexistente', 'P0002',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-0000000000ff')$$);

-- Consumo de créditos (E começa com 3)
INSERT INTO t_consume (ok) VALUES (public.consume_credit('55555555-5555-5555-5555-555555555555'));
INSERT INTO t_consume (ok) VALUES (public.consume_credit('55555555-5555-5555-5555-555555555555'));
INSERT INTO t_consume (ok) VALUES (public.consume_credit('55555555-5555-5555-5555-555555555555'));
INSERT INTO t_consume (ok) VALUES (public.consume_credit('55555555-5555-5555-5555-555555555555'));

SELECT public.t_assert('T31_consumo_respeita_saldo',
  (SELECT count(*) FROM t_consume) = 4
  AND (SELECT ok FROM t_consume ORDER BY seq LIMIT 1) IS TRUE
  AND (SELECT ok FROM t_consume ORDER BY seq DESC LIMIT 1) IS FALSE
  AND (SELECT credits_balance FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555') = 0,
  'E: 3 → 0 após 3 consumos; o 4.º recusado');

SELECT public.refund_credit('55555555-5555-5555-5555-555555555555');
SELECT public.t_assert('T32_reembolso_repõe_credito',
  (SELECT credits_balance FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555') = 1,
  'saldo após reembolso = 1');

SELECT public.consume_credit('33333333-3333-3333-3333-333333333333');
SELECT public.t_assert('T33_premium_ilimitado_nao_desconta',
  (SELECT credits_balance FROM public.profiles WHERE id = '33333333-3333-3333-3333-333333333333') = 1000000,
  'saldo premium inalterado');

-- Premium: 1.000.000 de créditos, ilimitado, sem 'ultra'
SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000002');
SELECT public.t_assert('T33b_premium_concede_ilimitado',
  (SELECT plan_type FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222') = 'premium'
  AND (SELECT credits_balance FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222') = 1000000,
  'B promovido a premium (1000000, ilimitado)');

-- Caminho do webhook do Stripe e do painel admin: UPDATE direto a profiles
-- feito pelo backend. Não pode ser bloqueado pelo trigger.
UPDATE public.profiles
   SET plan_type = 'pro', credits_balance = 20000, last_checkout_session = 'cs_test_123'
 WHERE id = '66666666-6666-6666-6666-666666666666';

SELECT public.t_assert('T33c_backend_ativa_plano_diretamente',
  (SELECT plan_type FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666') = 'pro'
  AND (SELECT credits_balance FROM public.profiles WHERE id = '66666666-6666-6666-6666-666666666666') = 20000,
  'webhook/admin (service_role) escreve em profiles');

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);


-- ============================================================================
-- GRUPO 4 · administrador autenticado (via API, sem service_role)
--         Distinção entre PERMISSÃO DE EXECUÇÃO e AUTORIZAÇÃO INTERNA.
-- ============================================================================
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT public.t_assert('T34_admin_autenticado_e_confiavel',
  public.is_trusted_writer() IS TRUE, 'admin reconhecido pelo perfil');

-- Camada 1 (permissões): a RPC é backend-only, mesmo para um admin. O painel
-- administrativo opera com service_role.
SELECT public.t_expect_error('T35_admin_tambem_sem_execute_na_rpc', '42501',
  $$SELECT public.approve_payment_proof('a0000000-0000-0000-0000-000000000008')$$);

-- Camada 2 (autorização interna): o trigger deixa um admin autenticado mexer
-- em colunas de faturação de terceiros — é este o ramo que valida o papel.
UPDATE public.profiles SET credits_balance = 123 WHERE id = '55555555-5555-5555-5555-555555555555';
SELECT public.t_assert('T35b_admin_altera_creditos_de_terceiro',
  (SELECT credits_balance FROM public.profiles WHERE id = '55555555-5555-5555-5555-555555555555') = 123,
  'trigger autorizou admin autenticado');

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);


-- ============================================================================
-- GRUPO 5 · acesso direto à base (SQL Editor) e planos legados
-- ============================================================================
SELECT public.t_assert('T36_sessao_direta_superuser_e_confiavel',
  public.is_trusted_writer() IS TRUE,
  'session_user = ' || session_user);

INSERT INTO t_approve (proof, credits)
  SELECT 'a0000000-0000-0000-0000-000000000006', public.approve_payment_proof('a0000000-0000-0000-0000-000000000006');
SELECT public.t_assert('T37_aprovacao_manual_no_sql_editor_funciona',
  (SELECT credits FROM t_approve ORDER BY seq DESC LIMIT 1) = 20000,
  'aprovação manual concedeu 20000');

SELECT public.t_assert('T38_ultra_legado_lido_como_premium',
  public.normalize_plan_id('ultra') = 'premium'
  AND (SELECT count(*) FROM public.plan_catalog WHERE plan_id = 'ultra') = 0,
  'normalize_plan_id(ultra) = ' || COALESCE(public.normalize_plan_id('ultra'), 'null'));

SELECT public.t_assert('T39_catalogo_alinhado_com_plans_ts',
  (SELECT count(*) FROM public.plan_catalog) = 3
  AND (SELECT credits FROM public.plan_catalog WHERE plan_id = 'free') = 50
  AND (SELECT credits FROM public.plan_catalog WHERE plan_id = 'pro') = 20000
  AND (SELECT credits FROM public.plan_catalog WHERE plan_id = 'premium') = 1000000
  AND (SELECT unlimited FROM public.plan_catalog WHERE plan_id = 'premium') IS TRUE
  AND (SELECT price_usd FROM public.plan_catalog WHERE plan_id = 'pro') = 5
  AND (SELECT price_usd FROM public.plan_catalog WHERE plan_id = 'premium') = 10,
  'free=50/$0 · pro=20000/$5 · premium=1000000+ilimitado/$10');

SELECT public.t_assert('T40_todas_as_definer_com_search_path',
  NOT EXISTS (
    SELECT 1 FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND p.proname IN ('approve_payment_proof','consume_credit','refund_credit',
                         'protect_billing_columns','is_current_user_admin','is_trusted_writer')
       AND NOT EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) cfg
          WHERE cfg LIKE 'search_path=%')
  ),
  'nenhuma função SECURITY DEFINER sem search_path fixo');

SELECT public.t_assert('T41_trigger_de_faturacao_ativo',
  EXISTS (SELECT 1 FROM pg_trigger
           WHERE tgname = 'trg_protect_billing_columns' AND NOT tgisinternal),
  'trigger presente');

-- T42: uma conexão direta com papel sem privilégios NÃO é confiável.
-- (Garante que o ramo "sem JWT" não é um bypass para qualquer sessão SQL.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role_sem_privilegios') THEN
    CREATE ROLE app_role_sem_privilegios NOLOGIN;
  END IF;
END $$;

-- Concede-se apenas o predicado (de leitura) para poder observar a resposta;
-- o que se está a testar é a decisão, não a permissão.
GRANT EXECUTE ON FUNCTION public.is_trusted_writer() TO app_role_sem_privilegios;

SET SESSION AUTHORIZATION app_role_sem_privilegios;
SELECT public.t_assert('T42_sessao_direta_sem_privilegios_nao_e_confiavel',
  public.is_trusted_writer() IS FALSE,
  'session_user = ' || session_user);
RESET SESSION AUTHORIZATION;


-- ── Resultado final (último result set lido pelo runner) ───────────────────
SELECT status || '|' || name || '|' || COALESCE(detail, '') AS linha
  FROM public.t_results
 ORDER BY seq;

ROLLBACK;
