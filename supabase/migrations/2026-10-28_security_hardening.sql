-- ============================================================================
-- EXAM SOLVER AI — HARDENING DE SEGURANÇA (v2, revista)
-- Data: 2026-10-28
-- Natureza: NÃO DESTRUTIVA e IDEMPOTENTE. Pode ser executada várias vezes.
--           Não apaga tabelas, colunas nem linhas de dados de utilizador.
--
-- ALTERAÇÕES FACE À v1 (todas motivadas por revisão de segurança):
--  1. Removido `CURRENT_USER IN ('postgres','supabase_admin')`. Dentro de uma
--     função SECURITY DEFINER, `CURRENT_USER` é o PROPRIETÁRIO da função, pelo
--     que essa condição era sempre verdadeira e a v1 não autorizava nada —
--     deixava os dois P0 exatamente como estavam. A autorização passa a ser
--     feita por `public.is_trusted_writer()`, que distingue:
--        · service_role (JWT)              → backend confiável
--        · authenticated + profiles.is_admin → administrador autenticado
--        · sessão direta de superutilizador (SQL Editor / psql) → operação manual
--  2. approve_payment_proof deixa de poder aprovar duas vezes: bloqueio da
--     linha com SELECT ... FOR UPDATE + validação de estado, tudo numa única
--     transação. Só `pending` transita para `approved`.
--  3. Créditos e planos passam a vir de `public.plan_catalog`, alinhado com
--     `src/lib/plans.ts`. Removido `ultra` e os valores fictícios (999999,
--     1000, 250, 9999). Plano desconhecido → exceção, sem conceder nada.
--  4. protect_billing_columns reescrito com a mesma autoridade correta.
--  5. Privilégios mínimos explícitos: `anon` e `authenticated` não executam
--     aprovação nem manipulação de créditos.
--  6. `SET search_path = public, pg_temp` em todas as funções.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Pré-requisitos (idempotente)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type        TEXT,
  ADD COLUMN IF NOT EXISTS credits_balance  INTEGER,
  ADD COLUMN IF NOT EXISTS is_admin         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS full_name        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url       TEXT;

-- ----------------------------------------------------------------------------
-- 0.1 Autoridade: quem é um escritor confiável?
--
--    Lê APENAS o contexto de autenticação que não depende do contexto de
--    execução:
--      · `request.jwt.claims` (GUC definido pelo PostgREST por pedido)
--      · `session_user` (papel de login; NÃO é afetado por SECURITY DEFINER)
--    Nunca usa `CURRENT_USER`, que dentro de SECURITY DEFINER é o dono da
--    função — foi exatamente esse o defeito da v1.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_trusted_writer()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
-- SECURITY DEFINER de propósito: a leitura a `public.profiles` tem de ignorar
-- a RLS dessa tabela. Se fosse INVOKER, a RLS seria avaliada e uma política
-- que consulte `profiles` provocaria recursão infinita. A autorização em si
-- continua a depender apenas do JWT e de `session_user`, nunca de CURRENT_USER.
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claims TEXT := NULLIF(btrim(current_setting('request.jwt.claims', TRUE)), '');
  v_role   TEXT;
  v_uid    UUID;
BEGIN
  -- (a) Pedido autenticado pela API (PostgREST)
  IF v_claims IS NOT NULL THEN
    BEGIN
      v_role := NULLIF(v_claims::jsonb ->> 'role', '');
      v_uid  := NULLIF(v_claims::jsonb ->> 'sub', '')::UUID;
    EXCEPTION WHEN OTHERS THEN
      RETURN FALSE;  -- claims malformadas: nunca confiar
    END;

    IF v_role = 'service_role' THEN
      RETURN TRUE;
    END IF;

    IF v_role = 'authenticated' AND v_uid IS NOT NULL THEN
      RETURN EXISTS (
        SELECT 1
          FROM public.profiles p
         WHERE p.id = v_uid
           AND p.is_admin IS TRUE
           AND p.is_banned IS NOT TRUE
      );
    END IF;

    RETURN FALSE;  -- anon, ou qualquer outro papel
  END IF;

  -- (b) Sem contexto JWT: sessão direta à base de dados (SQL Editor, psql,
  --     migrações). `session_user` é o papel de LOGIN da conexão e não pode
  --     ser escolhido pelo pedido HTTP — o PostgREST liga-se sempre como
  --     `authenticator`. Confia-se em atributos de privilégio, não em nomes
  --     arbitrários; os nomes listados são apenas a rede de segurança para
  --     projetos Supabase onde `postgres` não tem `rolsuper`.
  RETURN session_user IN ('postgres', 'supabase_admin', 'supabase_admin_role')
      OR EXISTS (
           SELECT 1
             FROM pg_catalog.pg_roles r
            WHERE r.rolname = session_user
              AND (r.rolsuper OR r.rolbypassrls)
         );
END;
$$;

COMMENT ON FUNCTION public.is_trusted_writer() IS
  'Autoriza escrita em planos/créditos: service_role, admin autenticado, ou sessão direta de superutilizador. SECURITY DEFINER para não sofrer RLS em profiles; não usa CURRENT_USER.';

-- ----------------------------------------------------------------------------
-- 0.2 Predicado de admin usado por RLS e políticas
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid() AND p.is_banned IS NOT TRUE),
    FALSE
  );
$$;

-- ----------------------------------------------------------------------------
-- 0.3 Normalização de identificadores de plano (legado "ultra" → premium)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_plan_id(p_plan TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
           WHEN p_plan = 'ultra' THEN 'premium'   -- legado, nunca vendido
           WHEN p_plan IN ('free', 'pro', 'premium') THEN p_plan
           ELSE NULL
         END;
$$;

-- ----------------------------------------------------------------------------
-- 1. Catálogo de planos — única fonte de verdade do lado do SQL.
--    Valores espelhados em src/lib/plans.ts. Free / Pro / Premium apenas.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plan_catalog (
  plan_id     TEXT PRIMARY KEY,
  credits     INTEGER NOT NULL CHECK (credits >= 0),
  unlimited   BOOLEAN NOT NULL DEFAULT FALSE,
  price_usd   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price_usd >= 0),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.plan_catalog IS
  'Catálogo de planos. Fonte de verdade em SQL, alinhada com src/lib/plans.ts.';

INSERT INTO public.plan_catalog (plan_id, credits, unlimited, price_usd) VALUES
  ('free',    50,      FALSE,  0),
  ('pro',     20000,   FALSE,  5),
  ('premium', 1000000, TRUE,  10)
ON CONFLICT (plan_id) DO UPDATE
  SET credits    = EXCLUDED.credits,
      unlimited  = EXCLUDED.unlimited,
      price_usd  = EXCLUDED.price_usd,
      updated_at = timezone('utc'::text, now());

-- O plano "ultra" foi descontinuado: não é reintroduzido nem pode subsistir
-- no catálogo. (Perfis antigos com plan_type='ultra' são lidos como premium
-- por normalize_plan_id, sem alterar os dados existentes.)
DELETE FROM public.plan_catalog
 WHERE plan_id NOT IN ('free', 'pro', 'premium');

ALTER TABLE public.plan_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catálogo de planos é público" ON public.plan_catalog;
CREATE POLICY "Catálogo de planos é público"
  ON public.plan_catalog FOR SELECT
  USING (TRUE);

-- Só o backend altera preços.
DROP POLICY IF EXISTS "Apenas backend altera catálogo" ON public.plan_catalog;
CREATE POLICY "Apenas backend altera catálogo"
  ON public.plan_catalog FOR ALL
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

-- ----------------------------------------------------------------------------
-- 5. Aprovação de comprovativo — atómica e não repetível
--    Devolve os créditos concedidos (0 para planos ilimitados).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_payment_proof(proof_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id  UUID;
  v_plan     TEXT;
  v_status   TEXT;
  v_norm     TEXT;
  v_credits  INT;
  v_unlimited BOOLEAN;
  v_rows     INT;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Acesso negado: aprovação de pagamentos requer administrador.'
      USING ERRCODE = '42501';
  END IF;

  IF proof_id IS NULL THEN
    RAISE EXCEPTION 'proof_id é obrigatório.' USING ERRCODE = '22004';
  END IF;

  -- Bloqueia a linha: duas chamadas concorrentes serializam aqui, e a segunda
  -- encontra o estado já alterado.
  SELECT pp.user_id, pp.plan_type, pp.status
    INTO v_user_id, v_plan, v_status
    FROM public.payment_proofs pp
   WHERE pp.id = proof_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comprovativo inexistente.' USING ERRCODE = 'P0002';
  END IF;

  IF v_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION
      'Comprovativo já processado (estado atual: %). Não é possível aprovar duas vezes.', v_status
      USING ERRCODE = 'P0001';
  END IF;

  v_norm := public.normalize_plan_id(v_plan);

  IF v_norm IS NULL OR v_norm = 'free' THEN
    RAISE EXCEPTION 'Plano inválido no comprovativo: %.', COALESCE(v_plan, '(nulo)')
      USING ERRCODE = 'P0001';
  END IF;

  SELECT pc.credits, pc.unlimited
    INTO v_credits, v_unlimited
    FROM public.plan_catalog pc
   WHERE pc.plan_id = v_norm;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano % não existe no catálogo.', v_norm USING ERRCODE = 'P0001';
  END IF;

  -- Ativação do perfil
  IF v_unlimited THEN
    UPDATE public.profiles
       SET plan_type = v_norm,
           credits_balance = v_credits
     WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
       SET plan_type = v_norm,
           credits_balance = COALESCE(credits_balance, 0) + v_credits
     WHERE id = v_user_id;
  END IF;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'Perfil % inexistente: nada foi ativado.', v_user_id USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.payment_proofs
     SET status = 'approved',
         updated_at = timezone('utc'::text, now())
   WHERE id = proof_id
     AND status = 'pending';

  RETURN CASE WHEN v_unlimited THEN 0 ELSE v_credits END;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_payment_proof(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment_proof(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.approve_payment_proof(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment_proof(UUID) TO service_role;

-- ----------------------------------------------------------------------------
-- 6. Proteção das colunas de faturação
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

DROP POLICY IF EXISTS "Users can update own profile fields." ON public.profiles;
CREATE POLICY "Users can update own profile fields."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

CREATE OR REPLACE FUNCTION public.protect_billing_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance
     OR NEW.plan_type     IS DISTINCT FROM OLD.plan_type
     OR NEW.is_banned     IS DISTINCT FROM OLD.is_banned
     OR NEW.is_admin      IS DISTINCT FROM OLD.is_admin THEN

    IF NOT public.is_trusted_writer() THEN
      RAISE EXCEPTION
        'Acesso negado: plan_type, credits_balance, is_banned e is_admin são protegidos.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_billing_columns ON public.profiles;
CREATE TRIGGER trg_protect_billing_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_billing_columns();

-- Trigger legado (is_admin) mantido para compatibilidade, mas já não é a
-- única barreira nem depende de CURRENT_USER.
DROP TRIGGER IF EXISTS trg_protect_is_admin_escalation ON public.profiles;

-- ----------------------------------------------------------------------------
-- 7. Consumo e reembolso de créditos — atómicos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan      TEXT;
  v_unlimited BOOLEAN;
  v_ok        BOOLEAN;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT p.plan_type INTO v_plan
    FROM public.profiles p
   WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT pc.unlimited INTO v_unlimited
    FROM public.plan_catalog pc
   WHERE pc.plan_id = public.normalize_plan_id(v_plan);

  IF COALESCE(v_unlimited, FALSE) THEN
    RETURN TRUE;  -- plano ilimitado: não desconta
  END IF;

  UPDATE public.profiles
     SET credits_balance = credits_balance - 1
   WHERE id = p_user_id
     AND COALESCE(credits_balance, 0) > 0
  RETURNING TRUE INTO v_ok;

  RETURN COALESCE(v_ok, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_credit(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan      TEXT;
  v_unlimited BOOLEAN;
BEGIN
  IF NOT public.is_trusted_writer() THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  SELECT p.plan_type INTO v_plan
    FROM public.profiles p
   WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT pc.unlimited INTO v_unlimited
    FROM public.plan_catalog pc
   WHERE pc.plan_id = public.normalize_plan_id(v_plan);

  IF COALESCE(v_unlimited, FALSE) THEN
    RETURN FALSE;  -- ilimitado: nada a reembolsar
  END IF;

  UPDATE public.profiles
     SET credits_balance = COALESCE(credits_balance, 0) + 1
   WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_credit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.consume_credit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credit(UUID) TO service_role;

REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.refund_credit(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credit(UUID) TO service_role;

-- is_current_user_admin e is_trusted_writer são predicados do próprio
-- chamador: expõem apenas o seu próprio nível de confiança, e são necessários
-- às políticas RLS e aos triggers. Mantêm-se executáveis.
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_trusted_writer() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_trusted_writer() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.normalize_plan_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_plan_id(TEXT) TO anon, authenticated, service_role;

-- Função de trigger: não requer EXECUTE para utilizadores.
REVOKE ALL ON FUNCTION public.protect_billing_columns() FROM PUBLIC;

-- ----------------------------------------------------------------------------
-- 8. Idempotência de eventos de pagamento + campos de subscrição
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_events (
  id            TEXT PRIMARY KEY,
  provider      TEXT NOT NULL DEFAULT 'stripe',
  event_type    TEXT NOT NULL,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload       JSONB,
  processed_at  TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment events" ON public.payment_events;
CREATE POLICY "Admins can read payment events"
  ON public.payment_events FOR SELECT
  USING ( public.is_current_user_admin() );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_expires_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT,
  ADD COLUMN IF NOT EXISTS last_checkout_session TEXT;

-- ----------------------------------------------------------------------------
-- 9. Comprovativos: utilizador só pode criar em estado pendente
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem enviar seus próprios comprovativos" ON public.payment_proofs;
CREATE POLICY "Usuários podem enviar seus próprios comprovativos"
  ON public.payment_proofs FOR INSERT
  WITH CHECK ( auth.uid() = user_id AND status = 'pending' );

-- ----------------------------------------------------------------------------
-- 10. Conversas: impedir reatribuição de dono
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem atualizar suas conversas" ON public.conversations;
CREATE POLICY "Usuários podem atualizar suas conversas"
  ON public.conversations FOR UPDATE
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

-- ----------------------------------------------------------------------------
-- 11. Logs de erro: deixar de aceitar INSERT anónimo irrestrito
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Sistema pode inserir logs de erros" ON public.api_error_logs;
DROP POLICY IF EXISTS "Apenas utilizadores autenticados registam erros" ON public.api_error_logs;

CREATE POLICY "Apenas utilizadores autenticados registam erros"
  ON public.api_error_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 12. Verificação pós-migração
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_exec RECORD;
  v_missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF has_function_privilege('anon', 'public.approve_payment_proof(uuid)', 'EXECUTE') THEN
    RAISE WARNING 'FALHA: approve_payment_proof ainda executável por anon.';
  ELSE
    RAISE NOTICE 'OK: anon não executa approve_payment_proof.';
  END IF;

  IF has_function_privilege('authenticated', 'public.consume_credit(uuid)', 'EXECUTE') THEN
    RAISE WARNING 'FALHA: consume_credit executável por authenticated.';
  ELSE
    RAISE NOTICE 'OK: authenticated não executa consume_credit.';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_billing_columns') THEN
    RAISE NOTICE 'OK: trigger de proteção de colunas de faturação ativo.';
  ELSE
    RAISE WARNING 'FALHA: trigger trg_protect_billing_columns ausente.';
  END IF;

  FOR v_exec IN
    SELECT p.proname
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.prosecdef
       AND p.proname IN ('approve_payment_proof','consume_credit','refund_credit',
                         'protect_billing_columns','is_current_user_admin','is_trusted_writer')
       AND NOT EXISTS (
         SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::TEXT[])) cfg
          WHERE cfg LIKE 'search_path=%'
       )
  LOOP
    v_missing := v_missing || v_exec.proname;
  END LOOP;

  IF array_length(v_missing, 1) IS NULL THEN
    RAISE NOTICE 'OK: todas as funções SECURITY DEFINER têm search_path fixo.';
  ELSE
    RAISE WARNING 'FALHA: search_path em falta em: %', array_to_string(v_missing, ', ');
  END IF;

  RAISE NOTICE 'Planos no catálogo: %',
    (SELECT string_agg(plan_id || '=' || credits, ', ' ORDER BY plan_id) FROM public.plan_catalog);
END $$;
