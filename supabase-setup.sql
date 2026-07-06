-- ============================================
-- Voice Diary Memo - Supabase 完全セットアップ
-- ============================================
-- Supabaseプロジェクト作成後、SQL Editorにこのファイルの
-- 内容をすべて貼り付けて「Run」を押してください。
-- ============================================

-- 1. pgvector拡張を有効化（ベクトル検索に必要）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. メモテーブル（音声メモの保存先）
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

-- 3. インサイトテーブル（AI分析結果）
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_ids UUID[],
  insight TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. API使用量テーブル（コスト管理）
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_name TEXT NOT NULL,
  model TEXT,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  estimated_cost FLOAT DEFAULT 0,
  endpoint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 融合テーブル（ノード融合の結果）
CREATE TABLE IF NOT EXISTS public.fusions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_memo_ids UUID[] NOT NULL,
  title TEXT NOT NULL,
  insight TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],
  category TEXT,
  shape TEXT NOT NULL DEFAULT 'diamond',
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. DB容量取得関数
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS FLOAT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database()) / (1024.0 * 1024.0);
$$;

-- 7. インデックス（検索高速化）
CREATE INDEX IF NOT EXISTS memos_embedding_idx ON public.memos
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS memos_category_idx ON public.memos (category);
CREATE INDEX IF NOT EXISTS memos_created_at_idx ON public.memos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fusions_parent_memo_ids ON public.fusions USING GIN (parent_memo_ids);

-- 8. Row Level Security（全テーブル有効化）
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusions ENABLE ROW LEVEL SECURITY;

-- 9. アクセスポリシー
-- ポリシーは意図的に作成しない（RLS有効・ポリシーなし = anon keyでは一切操作不可）。
-- アプリのDBアクセスは全てサーバー側の service role key（RLSをバイパス）経由のため、
-- ポリシーがなくてもアプリは正常に動作する。
-- 過去バージョンの全許可ポリシーが残っている場合は supabase-migration-2-security.sql を実行すること。

-- ============================================
-- セットアップ完了！
-- 次はVercelにデプロイして環境変数を設定してください。
-- ============================================
