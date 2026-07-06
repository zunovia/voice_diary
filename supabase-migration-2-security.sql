-- ============================================
-- Voice Diary Memo - セキュリティマイグレーション
-- ============================================
-- 旧バージョンの supabase-setup.sql が作成していた「全操作許可」の
-- RLSポリシーを削除する。
--
-- 背景: 全許可ポリシーがあると、公開されている anon key を使って
-- 誰でも全テーブルを読み書き・削除できてしまう。
-- アプリのDBアクセスは全てサーバー側の service role key
-- （RLSをバイパス）経由のため、ポリシー削除によるアプリへの影響はない。
--
-- ⚠️ 実行前の必須条件（2026-07-07追記・実地で確認済み）:
-- Vercel の環境変数 SUPABASE_SERVICE_ROLE_KEY に「本物の service_role キー」が
-- 入っていることを必ず確認すること。歴史的経緯で anon key が入っている場合、
-- このマイグレーションを実行するとアプリが全件0件を返すようになる
-- （2026-07-07に実際に発生し、ロールバックした）。
-- 確認方法: Vercel → Project → Settings → Environment Variables →
-- SUPABASE_SERVICE_ROLE_KEY の値と、Supabase → Settings → API → service_role を照合。
--
-- 使い方: 上記確認の後、Supabase SQL Editor に貼り付けて「Run」
-- ============================================

DROP POLICY IF EXISTS "Allow all on memos" ON public.memos;
DROP POLICY IF EXISTS "Allow all on insights" ON public.insights;
DROP POLICY IF EXISTS "Allow all on api_usage" ON public.api_usage;
DROP POLICY IF EXISTS "Allow all fusions" ON public.fusions;

-- RLSは有効のまま維持（ポリシーなし = anon/authenticated ロールは全操作拒否）
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fusions ENABLE ROW LEVEL SECURITY;

-- 確認: 実行後、以下が0行になればOK
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
