@AGENTS.md

# Voice Diary Memo - プロジェクトガイド

## プロジェクト概要
音声メモ → AI要約 → ナレッジグラフ可視化 → 思考フレームワークでアイデア生成するWebアプリ。
Next.js 16 + Supabase + Gemini API + D3.js + shadcn/ui (base-ui)

## 技術スタック
- **Next.js 16** (App Router, Turbopack) — params/searchParamsは必ずawaitする
- **Supabase** — PostgreSQL + pgvector, RLSは全許可（anon keyで操作可能）
- **Gemini 2.5 Flash** — 音声認識（Web Speech API）+ 要約 + Embedding
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
- URL: https://jkcmqxytixtdlipulylk.supabase.co
- テーブル: memos, insights, api_usage
- Service Role Keyの代わりにAnon Keyを使用中（RLS全許可のため）

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
- ブランチ: main
- Vercel: 未デプロイ（予定）
- Git user: zunovia / zunovia@users.noreply.github.com

## 実装後のテスト・レビュー必須ルール
コード変更後は必ず /review スキルを実行すること。
