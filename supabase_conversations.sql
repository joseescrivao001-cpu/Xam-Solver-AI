-- ==========================================================
-- EXAM SOLVER AI - CONVERSATIONS & MESSAGES PERSISTENCE & RLS
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Criar Tabela de Conversas (Sessões de Chat)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Novo Atendimento',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Criar Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Índices para Alta Performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para Conversations
DROP POLICY IF EXISTS "Usuários podem ver suas próprias conversas" ON public.conversations;
CREATE POLICY "Usuários podem ver suas próprias conversas"
  ON public.conversations FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários podem criar suas conversas" ON public.conversations;
CREATE POLICY "Usuários podem criar suas conversas"
  ON public.conversations FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários podem atualizar suas conversas" ON public.conversations;
CREATE POLICY "Usuários podem atualizar suas conversas"
  ON public.conversations FOR UPDATE
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários podem deletar suas conversas" ON public.conversations;
CREATE POLICY "Usuários podem deletar suas conversas"
  ON public.conversations FOR DELETE
  USING ( auth.uid() = user_id );

-- 6. Políticas RLS para Messages
DROP POLICY IF EXISTS "Usuários podem ver mensagens das suas conversas" ON public.messages;
CREATE POLICY "Usuários podem ver mensagens das suas conversas"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem inserir mensagens nas suas conversas" ON public.messages;
CREATE POLICY "Usuários podem inserir mensagens nas suas conversas"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Usuários podem deletar mensagens das suas conversas" ON public.messages;
CREATE POLICY "Usuários podem deletar mensagens das suas conversas"
  ON public.messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );
