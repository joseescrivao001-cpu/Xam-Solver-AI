-- ==========================================================
-- EXAM SOLVER AI - MONETIZATION ENTERPRISE (V1.2)
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Adicionar colunas plan_type e credits_balance na tabela profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'pro';

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 50;

-- Atualizar perfis existentes sem plano para 'pro' com 50 créditos
UPDATE public.profiles 
SET plan_type = 'pro' 
WHERE plan_type IS NULL;

UPDATE public.profiles 
SET credits_balance = 50 
WHERE credits_balance IS NULL OR credits_balance < 5;

-- 2. Criar tabela de Comprovativos de Pagamento (Multicaixa Express & Stripe)
CREATE TABLE IF NOT EXISTS public.payment_proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT,
  plan_type TEXT NOT NULL, -- 'ultra', 'premium'
  amount TEXT NOT NULL, -- ex: '19.000 Kz' ou '$19'
  payment_method TEXT DEFAULT 'mcx' NOT NULL, -- 'mcx', 'stripe'
  proof_url TEXT, -- Imagem do comprovativo / print (data URL ou URL externa)
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar Row Level Security (RLS) para payment_proofs
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar seus próprios comprovativos"
  ON public.payment_proofs FOR SELECT
  USING ( auth.uid() = user_id );

CREATE POLICY "Usuários podem enviar seus próprios comprovativos"
  ON public.payment_proofs FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

-- 4. Função para aprovar pagamento e conceder plano/créditos automaticamente
CREATE OR REPLACE FUNCTION public.approve_payment_proof(proof_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_plan TEXT;
  v_credits INT;
BEGIN
  SELECT user_id, plan_type INTO v_user_id, v_plan FROM public.payment_proofs WHERE id = proof_id;
  
  IF v_plan = 'ultra' THEN
    v_credits := 250;
  ELSIF v_plan = 'premium' THEN
    v_credits := 9999;
  ELSE
    v_credits := 50;
  END IF;

  -- Atualizar perfil com o novo plano e créditos
  UPDATE public.profiles
  SET plan_type = v_plan,
      credits_balance = credits_balance + v_credits
  WHERE id = v_user_id;

  -- Marcar comprovativo como aprovado
  UPDATE public.payment_proofs
  SET status = 'approved',
      updated_at = now()
  WHERE id = proof_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
