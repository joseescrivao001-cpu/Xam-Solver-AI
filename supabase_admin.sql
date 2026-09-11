-- ==========================================================
-- EXAM SOLVER AI - ADMIN COMMAND CENTER & ENTERPRISE REPAIR
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Colunas de Perfil, Avatar e Segurança
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Tabela de Logs de Erros e Auditoria de IA
CREATE TABLE IF NOT EXISTS public.api_error_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL,
  model TEXT,
  error_message TEXT NOT NULL,
  status_code INTEGER DEFAULT 500,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.api_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem visualizar logs de erros" ON public.api_error_logs;
CREATE POLICY "Admins podem visualizar logs de erros"
  ON public.api_error_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Sistema pode inserir logs de erros" ON public.api_error_logs;
CREATE POLICY "Sistema pode inserir logs de erros"
  ON public.api_error_logs FOR INSERT
  WITH CHECK (true);

-- 3. Função Helper SECURITY DEFINER para verificar se o usuário é Admin sem recursão RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Políticas RLS limpas em public.profiles (Sem Recursão Infinita)
DROP POLICY IF EXISTS "Admins podem visualizar e gerenciar todos os perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view and manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Usuário autenticado lê e atualiza seu próprio perfil
CREATE POLICY "Users can view their own profile."
  ON public.profiles FOR SELECT
  USING ( auth.uid() = id );

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id );

-- Administrador lê e gerencia todos os perfis
CREATE POLICY "Admins can view and manage all profiles"
  ON public.profiles FOR ALL
  USING ( public.is_current_user_admin() );

-- 5. Políticas RLS limpas em public.payment_proofs
DROP POLICY IF EXISTS "Admins podem gerenciar todos os comprovativos" ON public.payment_proofs;
DROP POLICY IF EXISTS "Admins can manage all proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can view own proofs" ON public.payment_proofs;
DROP POLICY IF EXISTS "Users can insert own proofs" ON public.payment_proofs;

CREATE POLICY "Users can view own proofs"
  ON public.payment_proofs FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own proofs"
  ON public.payment_proofs FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

CREATE POLICY "Admins can manage all proofs"
  ON public.payment_proofs FOR ALL
  USING ( public.is_current_user_admin() );

-- 6. BLINDAGEM DE BANCO: Trava Contra Escalada de Privilégios (Anti-Privilege Escalation)
CREATE OR REPLACE FUNCTION public.protect_is_admin_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_current_role TEXT;
  v_is_requester_admin BOOLEAN;
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    v_current_role := current_setting('role', true);
    
    -- Permitir SQL Editor (postgres/supabase_admin), sem sessão web direta ou backend
    IF v_current_role IN ('service_role', 'postgres', 'supabase_admin') 
       OR CURRENT_USER IN ('postgres', 'supabase_admin')
       OR auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT is_admin INTO v_is_requester_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_is_requester_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'Acesso Negado: A coluna is_admin é estritamente protegida contra escalada de privilégios.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_is_admin_escalation ON public.profiles;
CREATE TRIGGER trg_protect_is_admin_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_is_admin_escalation();

-- 7. Ativar a conta do fundador Jose Escrivao com 1.000.000 créditos e premium
UPDATE public.profiles
SET is_admin = TRUE, credits_balance = 1000000, plan_type = 'premium'
WHERE email = 'joseescrivao001@gmail.com';
