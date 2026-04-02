-- Voice Diary Memo - Supabase Migration
-- Run this in Supabase SQL Editor when the database is available

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memos table
CREATE TABLE IF NOT EXISTS public.memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_text TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  tags TEXT[],
  category TEXT,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create insights table
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_ids UUID[],
  insight TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to get database size in MB
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS FLOAT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database()) / (1024.0 * 1024.0);
$$;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS memos_embedding_idx ON public.memos
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index for category and date filtering
CREATE INDEX IF NOT EXISTS memos_category_idx ON public.memos (category);
CREATE INDEX IF NOT EXISTS memos_created_at_idx ON public.memos (created_at DESC);

-- Enable RLS
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access - add auth later)
CREATE POLICY "Allow all on memos" ON public.memos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on insights" ON public.insights FOR ALL USING (true) WITH CHECK (true);
