@AGENTS.md

# Voice Diary Memo - プロジェクトガイド

## プロジェクト概要
音声メモ → AI要約 → ナレッジグラフ可視化 → 思考フレームワークでアイデア生成するWebアプリ。
Next.js 16 + Supabase + Gemini API + D3.js + shadcn/ui (base-ui)

## 技術スタック
- **Next.js 16** (App Router, Turbopack) — params/searchParamsは必ずawaitする
- **Supabase** — PostgreSQL + pgvector。RLS有効・ポリシーなし（=anon keyでは操作不可）。DBアクセスは全てサーバー側の service role key 経由
- **録音・文字起こし** — ブラウザの MediaRecorder（webm/opus、iOSは audio/mp4 フォールバック）→ /api/transcribe → Groq Whisper large-v3-turbo（Gemini直接文字起こしフォールバック付き）
- **Gemini 2.5 Flash** — 文字起こし整形 + 要約 + Embedding
- **Claude API** — 深い分析（インサイトページ）
- **D3.js** — ナレッジグラフ（Obsidian風）
- **shadcn/ui (base-ui版)** — UIコンポーネント

## 重要な注意点

### Next.js 16 の破壊的変更
- `params` は `Promise<{...}>` — 必ず `await params` する
- `searchParams` も `Promise<{...}>`
- `cookies()`, `headers()` も async
- GETルートはデフォルトでキャッシュされない

### shadcn/ui (base-ui版) の注意
- `Button` に `asChild` プロパティは存在しない — `<a><Button>text</Button></a>` の形で使う
- `Slider` の `onValueChange` は `(value: number | readonly number[])` を返す
  - 必ず `(v) => setter(Array.isArray(v) ? v[0] : v)` で値を取り出す
- Radixベースではなく `@base-ui/react` ベース

### Gemini API
- モデル名: `gemini-2.5-flash`（`gemini-2.0-flash`は廃止済み）
- 無料枠にはレート制限あり（429エラー）— Pay-as-you-go有効化済み
- ライブラリ初期化はモジュールレベルではなく関数内で行う（ビルド時のenv未設定対策）

### Supabase
- URL: https://jkcmqxytixtdlipulylk.supabase.co （⚠️ このプロジェクトは他アプリともテーブル共有: cv_*, ve_*, subscriptions 等が同居）
- テーブル: memos, insights, api_usage, fusions
- ✅ RLS強化完了（2026-07-07）: SUPABASE_SERVICE_ROLE_KEY を本物の service_role キーに差し替え済み（ユーザーが実施）→ supabase-migration-2-security.sql 適用済み（4テーブルの「全許可」ポリシー削除・RLSは有効維持）。
  アプリは service_role でRLSをバイパスして全件アクセス可、anon key での直REST（SELECT/INSERT）は遮断済みを実測確認。以後この4テーブルに anon 用ポリシーを足さないこと（穴が再び開く）
- ⚠️ 過去の教訓: 以前は SERVICE_ROLE_KEY に anon key が入っていた。差し替え前にポリシーを消すとアプリが全件0件になる（2026-07-07に一度発生→ロールバック→鍵差し替え後に再実行で解決）
- 無料プランは7日間無アクセスで自動休止 → zunovia/voice-diary-backup の GitHub Actions（火木土 6:00 JST）が keep-alive＋自動バックアップを実施

### アクセスキー保護
- `src/proxy.ts`（Next.js 16では middleware ではなく proxy）が全ページ・全APIを保護
- Vercel 環境変数 `APP_ACCESS_KEY` を設定すると有効化（未設定ならフェイルオープン=無保護）
- 認証方法: `/login` でキー入力（Cookie 1年）または `x-api-key` ヘッダー（自動化用）
- PWA関連アセット（manifest/sw.js/アイコン）と /login は認証不要

## ディレクトリ構成
```
src/
├── app/
│   ├── page.tsx              # TOP = ナレッジグラフ
│   ├── record/               # 録音ページ
│   ├── list/                 # メモ一覧
│   ├── memo/[id]/            # メモ詳細
│   ├── archive/              # 月別アーカイブ
│   ├── thinking/             # Thinking Lab（9フレームワーク）
│   ├── insights/             # Claude AI分析
│   ├── usage/                # API使用量ダッシュボード
│   └── api/
│       ├── transcribe/       # Gemini音声→テキスト
│       ├── summarize/        # Gemini要約 + Supabase保存
│       ├── analyze/          # Claude接続分析
│       ├── thinking/         # 思考フレームワークAPI
│       ├── memos/            # メモCRUD + similar
│       ├── storage/          # DB容量取得
│       └── usage/            # API使用量取得
├── components/
│   ├── KnowledgeGraph.tsx    # Obsidian風グラフ（D3.js）
│   ├── VoiceRecorder.tsx     # Web Speech API録音
│   ├── StorageIndicator.tsx  # 容量表示
│   ├── thinking/             # 9つの思考フレームワークViz
│   └── ui/                   # shadcn/uiコンポーネント
└── lib/
    ├── supabase.ts           # Supabaseクライアント
    ├── gemini.ts             # Gemini APIヘルパー
    ├── claude.ts             # Claude APIヘルパー
    └── usage-tracker.ts      # API使用量記録
```

## デプロイ
- GitHub: https://github.com/zunovia/voice_diary
- ブランチ: main（pushでVercelが自動デプロイ）
- Vercel: デプロイ済み https://voice-diary-mu.vercel.app （project: voice-diary）
- Git user: zunovia / zunovia@users.noreply.github.com

## 実装後のテスト・レビュー必須ルール
コード変更後は必ず /review スキルを実行すること。
