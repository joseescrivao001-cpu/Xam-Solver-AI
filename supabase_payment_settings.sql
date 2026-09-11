-- ==========================================================
-- EXAM SOLVER AI - CONFIGURAÇÕES DINÂMICAS DE PAGAMENTO (V1.3)
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Tabela de Configurações Bancárias e Pagamentos Dinâmicos
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  bank_name TEXT DEFAULT 'BFA / BAI',
  account_holder TEXT DEFAULT 'José Escrivão Silvestre',
  express_phone TEXT DEFAULT '+244 930 339 436',
  iban TEXT DEFAULT 'AO06.0040.0000.0000.0000.0000.0',
  usd_to_aoa_rate NUMERIC DEFAULT 950,
  notes TEXT DEFAULT 'Envie o comprovativo após a transferência para ativação quase imediata.',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir registro padrão caso não exista
INSERT INTO public.payment_settings (id, bank_name, account_holder, express_phone, iban, usd_to_aoa_rate)
VALUES ('default', 'BFA / BAI', 'José Escrivão Silvestre', '+244 930 339 436', 'AO06.0040.0000.0000.0000.0000.0', 950)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS e permitir leitura pública das configurações de pagamento
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer usuário pode ler configurações de pagamento" ON public.payment_settings;
CREATE POLICY "Qualquer usuário pode ler configurações de pagamento"
  ON public.payment_settings FOR SELECT
  USING (true);

-- 2. Atualizar crédito padrão do Plano Pro para 1.000 créditos
ALTER TABLE public.profiles 
  ALTER COLUMN credits_balance SET DEFAULT 1000;

UPDATE public.profiles
SET credits_balance = 1000
WHERE credits_balance < 1000 AND (plan_type = 'pro' OR plan_type IS NULL);

-- 3. Atualizar função de aprovação de pagamentos com as novas cotas:
-- Plano Ultra: 1.000.000 créditos
-- Plano Pro: 1.000 créditos
-- Plano Premium: 999.999 créditos (Ilimitado)
CREATE OR REPLACE FUNCTION public.approve_payment_proof(proof_id UUID)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_plan TEXT;
  v_credits INT;
BEGIN
  SELECT user_id, plan_type INTO v_user_id, v_plan FROM public.payment_proofs WHERE id = proof_id;
  
  IF v_plan = 'ultra' THEN
    v_credits := 1000000;
  ELSIF v_plan = 'premium' THEN
    v_credits := 999999;
  ELSE
    v_credits := 1000;
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
