-- ==========================================================
-- EXAM SOLVER AI - ADMIN COMMAND CENTER & SECURITY HARDENING (V1.4)
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Colunas de Segurança e Auditoria na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
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

-- Habilitar RLS em api_error_logs
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

-- 3. Atualizar permissões de profiles para Administradores
DROP POLICY IF EXISTS "Admins podem visualizar e gerenciar todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem visualizar e gerenciar todos os perfis"
  ON public.profiles FOR ALL
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- 4. Atualizar permissões de payment_proofs para Administradores
DROP POLICY IF EXISTS "Admins podem gerenciar todos os comprovativos" ON public.payment_proofs;
CREATE POLICY "Admins podem gerenciar todos os comprovativos"
  ON public.payment_proofs FOR ALL
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = TRUE
    )
  );

-- 5. BLINDAGEM DE BANCO: Trava Contra Escalada de Privilégios (Anti-Privilege Escalation)
-- Impede categoricamente que qualquer requisição vinda com chave pública/anon ou token de usuário comum altere 'is_admin'
CREATE OR REPLACE FUNCTION public.protect_is_admin_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_current_role TEXT;
  v_is_requester_admin BOOLEAN;
BEGIN
  -- Se o campo is_admin foi alterado
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    v_current_role := current_setting('role', true);
    
    -- Permitir caso venha de service_role (chave do backend interna)
    IF v_current_role = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Verificar se o usuário autenticado que tenta alterar é um admin confirmado
    SELECT is_admin INTO v_is_requester_admin
    FROM public.profiles
    WHERE id = auth.uid();

    -- Se não for service_role e não for admin confirmado, abortar a transação
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

-- 6. Função para tornar um usuário Admin com facilidade
-- Exemplo: SELECT public.make_user_admin('seu-email@gmail.com');
CREATE OR REPLACE FUNCTION public.make_user_admin(target_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email;
  IF v_user_id IS NULL THEN
    RETURN 'Usuário não encontrado com o e-mail fornecido.';
  END IF;

  UPDATE public.profiles
  SET is_admin = TRUE
  WHERE id = v_user_id;

  RETURN 'Usuário ' || target_email || ' promovido a Administrador com sucesso!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
