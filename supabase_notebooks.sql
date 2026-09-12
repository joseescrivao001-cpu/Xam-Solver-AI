-- ==========================================================
-- EXAM SOLVER AI - AMBIENTES ATIVOS DE ESTUDO (NOTEBOOKS)
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Tabela de Cadernos de Estudo
CREATE TABLE IF NOT EXISTS public.notebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'indigo' NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vincular Conversas aos Cadernos
ALTER TABLE public.conversations 
  ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;

-- 3. Tabela de Materiais de Estudo (PDFs, Imagens, Documentos)
CREATE TABLE IF NOT EXISTS public.notebook_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'document', -- 'pdf', 'image', 'document'
  file_size INTEGER DEFAULT 0,
  extracted_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Anotações Inteligentes do Aluno
CREATE TABLE IF NOT EXISTS public.notebook_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova Anotação',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Diagnóstico de Domínio e IA Analytics
CREATE TABLE IF NOT EXISTS public.notebook_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_report JSONB NOT NULL DEFAULT '{"green":[],"yellow":[],"red":[],"overall_score":0,"summary":""}'::jsonb,
  overall_score INTEGER DEFAULT 0,
  last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Índices para Alta Performance
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON public.notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_notebook_id ON public.conversations(notebook_id);
CREATE INDEX IF NOT EXISTS idx_materials_notebook_id ON public.notebook_materials(notebook_id);
CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON public.notebook_notes(notebook_id);
CREATE INDEX IF NOT EXISTS idx_analytics_notebook_id ON public.notebook_analytics(notebook_id);

-- 7. Habilitar Row Level Security (RLS)
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebook_analytics ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS: Usuário acessa apenas seus próprios dados
DROP POLICY IF EXISTS "Usuários gerenciam seus próprios cadernos" ON public.notebooks;
CREATE POLICY "Usuários gerenciam seus próprios cadernos"
  ON public.notebooks FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários gerenciam materiais dos seus cadernos" ON public.notebook_materials;
CREATE POLICY "Usuários gerenciam materiais dos seus cadernos"
  ON public.notebook_materials FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários gerenciam notas dos seus cadernos" ON public.notebook_notes;
CREATE POLICY "Usuários gerenciam notas dos seus cadernos"
  ON public.notebook_notes FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Usuários gerenciam analytics dos seus cadernos" ON public.notebook_analytics;
CREATE POLICY "Usuários gerenciam analytics dos seus cadernos"
  ON public.notebook_analytics FOR ALL
  USING ( auth.uid() = user_id )
  WITH CHECK ( auth.uid() = user_id );
