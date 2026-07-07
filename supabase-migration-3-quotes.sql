-- ============================================
-- Voice Diary Memo - TRACK B「ノウアスフィアの隣人」
-- ============================================
-- ✅ 適用済み 2026-07-08（本番 jkcmqxytixtdlipulylk / Supabase migration:
--    track_b_quotes_echoes_match_quotes）。冪等（IF NOT EXISTS / CREATE OR REPLACE）なので再実行しても無害。
-- ============================================
-- 目的: メモの埋め込みに最も近い「名言・古典」を、メモ詳細ページの下部に静かに提示する
-- （ambient なセレンディピティ）。出典は全てパブリックドメインの古典に限定し、
-- LLM が“それっぽい名言”を捏造することは誤帰属リスクのため一切しない。
--
-- テーブル方針: 既存4テーブル（memos/insights/fusions/api_usage）と同じく
--   「RLS 有効・anon 用ポリシーなし」= service_role でのみアクセス可。
--   これらの新テーブルにも anon 用ポリシーは足さないこと（穴が開く）。
--
-- 使い方: Supabase SQL Editor に貼り付けて Run（または MCP apply_migration）。
--   適用後、コーパス投入は  POST /api/quotes/seed  （x-api-key ヘッダー付き）で行う。
-- ============================================

-- 名言・古典コーパス
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  text_ja text not null,
  gloss text,                                   -- 現代語の一言（読みの補助＋埋め込みの橋渡し）
  author text not null,
  source text not null,
  license text not null default 'Public Domain',
  next_step text,                               -- 「隣人の一歩」＝アプリ自身の前向きな問いかけ（著者の言葉ではない）
  embedding vector(768),
  created_at timestamptz default now()
);
create unique index if not exists quotes_text_ja_key on public.quotes (text_ja);

-- メモ→最近傍quoteのキャッシュ（将来の最適化用。MVPでは未使用だが定義だけ用意）。
create table if not exists public.echoes (
  id uuid primary key default gen_random_uuid(),
  memo_id uuid not null,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  similarity double precision not null,
  rank int not null,
  created_at timestamptz default now(),
  unique (memo_id, quote_id)
);
create index if not exists echoes_memo_id_idx on public.echoes (memo_id);

-- RLS: 有効化・ポリシーなし（service_role運用）
alter table public.quotes enable row level security;
alter table public.echoes enable row level security;

-- メモの埋め込みに最も近いquoteを返す（cosine類似度 = 1 - cosine距離）。
-- security invoker + search_path固定でadvisor警告(function_search_path_mutable)を回避。
-- service_roleはRLSをバイパスして全件参照可。anonが直接叩いてもRLSで0件になりcorpusは漏れない。
create or replace function public.match_quotes(
  query_embedding vector(768),
  match_count int default 3
)
returns table (
  id uuid,
  text_ja text,
  gloss text,
  author text,
  source text,
  license text,
  next_step text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    q.id, q.text_ja, q.gloss, q.author, q.source, q.license, q.next_step,
    1 - (q.embedding <=> query_embedding) as similarity
  from public.quotes q
  where q.embedding is not null
  order by q.embedding <=> query_embedding
  limit match_count;
$$;

-- 確認:
--   select count(*) from public.quotes;                 -- コーパス件数
--   select count(*) from public.quotes where embedding is not null; -- 埋め込み済み件数
