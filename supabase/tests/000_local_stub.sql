-- ============================================================================
-- APENAS PARA TESTES LOCAIS — NUNCA EXECUTAR EM PRODUÇÃO
-- ----------------------------------------------------------------------------
-- Emula o mínimo do ambiente Supabase (papéis, schema auth, auth.uid(),
-- tabelas e políticas originais) para poder executar a migração de segurança
-- e os respetivos testes num Postgres descartável, sem tocar em dados reais.
--
-- Este ficheiro NÃO faz parte da aplicação.
-- ============================================================================

-- ── Papéis do Supabase ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOLOGIN;
  END IF;
END $$;

GRANT anon, authenticated, service_role TO CURRENT_USER;

-- ── Schema auth ────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id          UUID PRIMARY KEY,
  email       TEXT UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Equivalente ao auth.uid() do Supabase: lê o claim `sub` do pedido.
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
           COALESCE(
             current_setting('request.jwt.claim.sub', TRUE),
             (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'sub')
           ),
           ''
         )::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
           current_setting('request.jwt.claim.role', TRUE),
           (NULLIF(current_setting('request.jwt.claims', TRUE), '')::jsonb ->> 'role')
         );
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;

-- ── Tabelas de produção (estado ANTES da migração) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  plan_type       TEXT DEFAULT 'free',
  credits_balance INTEGER DEFAULT 50,
  is_admin        BOOLEAN DEFAULT FALSE,
  is_banned       BOOLEAN DEFAULT FALSE,
  full_name       TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email     TEXT,
  plan_type      TEXT NOT NULL,
  amount         TEXT NOT NULL DEFAULT '0',
  payment_method TEXT NOT NULL DEFAULT 'mcx',
  proof_url      TEXT,
  status         TEXT NOT NULL DEFAULT 'pending',
  admin_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL DEFAULT 'Novo Atendimento',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  image_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_error_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      TEXT NOT NULL,
  model         TEXT,
  error_message TEXT NOT NULL,
  status_code   INTEGER DEFAULT 500,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Privilégios de tabela como no Supabase ─────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- ── RLS e políticas ORIGINAIS (estado antes do hardening) ──────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT USING ( auth.uid() = id );

-- Política vulnerável: sem WITH CHECK (é substituída pela migração)
CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING ( auth.uid() = id );

-- Em produção esta política usa public.is_current_user_admin(), criada em
-- supabase_admin.sql. Aqui usa-se um equivalente local: tem de ser SECURITY
-- DEFINER, senão a leitura a `profiles` dentro da própria política de
-- `profiles` entra em recursão infinita.
CREATE FUNCTION public.stub_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), FALSE);
$$;

GRANT EXECUTE ON FUNCTION public.stub_is_admin() TO anon, authenticated, service_role;

CREATE POLICY "Admins can view and manage all profiles"
  ON public.profiles FOR ALL USING ( public.stub_is_admin() );

CREATE POLICY "Usuários podem visualizar seus próprios comprovativos"
  ON public.payment_proofs FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Usuários podem enviar seus próprios comprovativos"
  ON public.payment_proofs FOR INSERT WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Usuários podem ver suas próprias conversas"
  ON public.conversations FOR SELECT USING ( auth.uid() = user_id );

CREATE POLICY "Usuários podem atualizar suas conversas"
  ON public.conversations FOR UPDATE USING ( auth.uid() = user_id );

CREATE POLICY "Usuários podem ver mensagens das suas conversas"
  ON public.messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
       WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- A política irrestrita original dos logs (é substituída pela migração)
CREATE POLICY "Sistema pode inserir logs de erros"
  ON public.api_error_logs FOR INSERT WITH CHECK (TRUE);
