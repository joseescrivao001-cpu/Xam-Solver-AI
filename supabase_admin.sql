-- ==========================================================
-- EXAM SOLVER AI - ADMIN COMMAND CENTER (V1.2)
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

-- Permitir inserção de logs pelo sistema
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

-- 5. Função para tornar um usuário Admin com facilidade
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
