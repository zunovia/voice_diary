<p align="center">
  <img src="public/logo.png" alt="Voice Diary Memo" width="120" />
</p>

<h1 align="center">Voice Diary Memo</h1>

<p align="center">
  音声で記録し、AIが接続するナレッジダイアリー
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzunovia%2Fvoice_diary&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,GEMINI_API_KEY&envDescription=Supabase%E3%81%A8Gemini%E3%81%AEAPI%E3%82%AD%E3%83%BC%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%A7%E3%81%99&envLink=https%3A%2F%2Fgithub.com%2Fzunovia%2Fvoice_diary%23-%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97%E6%89%8B%E9%A0%86&project-name=voice-diary-memo">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

---

## 主な機能

- **音声メモ** — スマホで録音 → AIが自動で文字起こし・要約・タグ付け
- **ナレッジグラフ** — Obsidian風のグラフでメモ同士のつながりを可視化
- **ノード融合** — 2つのメモをドラッグで重ねるとAIが新アイデアを生成（星・三角・ダイヤモンド形で表示）
- **意味の自己増殖** — メモの交差点からAIが新しい問いを自動生成
- **9つの思考フレームワーク** — 弁証法、SCAMPER、BMC、SWOT、マンダラなどでアイデア拡張
- **AI分析** — Gemini AIがメモ群を横断分析しインサイトを発見
- **エクスポート** — Google Docs / Word形式で書き出し

---

## セットアップ手順

> わからないことがあれば、この手順書をそのままAI（ChatGPTやClaudeなど）に貼り付けて聞いてください！

### ステップ1: Supabase（データベース）の準備

1. **[supabase.com](https://supabase.com)** にアクセスしてアカウント作成（無料）
2. 「New Project」でプロジェクトを作成
   - プロジェクト名: 好きな名前（例: `voice-diary`）
   - Database Password: 覚えておく
   - Region: `Northeast Asia (Tokyo)` を推奨
3. プロジェクトが起動したら **左メニュー「SQL Editor」** を開く
4. 下記ファイルの中身をすべてコピーして貼り付け → **「Run」** を押す

   📄 **[supabase-setup.sql](./supabase-setup.sql)**

5. 「Success」と表示されればOK！
6. **APIキーを取得**: 左メニュー「Settings」→「API」を開き、以下をメモ:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` キー → `SUPABASE_SERVICE_ROLE_KEY`

### ステップ2: Gemini API キーの取得

1. **[aistudio.google.com/apikey](https://aistudio.google.com/apikey)** にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」でキーを作成 → メモしておく
4. ※無料枠（1分あたり15リクエスト）がありますが、快適に使うには「Pay-as-you-go」の有効化を推奨（月数百円程度）

### ステップ3: Vercelにデプロイ

**一番簡単な方法:** 下のボタンをクリック！

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzunovia%2Fvoice_diary&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,GEMINI_API_KEY&envDescription=Supabase%E3%81%A8Gemini%E3%81%AEAPI%E3%82%AD%E3%83%BC%E3%81%8C%E5%BF%85%E8%A6%81%E3%81%A7%E3%81%99&envLink=https%3A%2F%2Fgithub.com%2Fzunovia%2Fvoice_diary%23-%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97%E6%89%8B%E9%A0%86&project-name=voice-diary-memo)

1. Vercelアカウントがなければ作成（GitHubアカウントで登録可能）
2. 環境変数の入力画面が出るので、ステップ1・2でメモした値を入力:

   | 変数名 | 入力する値 |
   |--------|-----------|
   | `NEXT_PUBLIC_SUPABASE_URL` | SupabaseのProject URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabaseのanon publicキー |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのservice_roleキー |
   | `GEMINI_API_KEY` | Google AI StudioのAPIキー |

3. 「Deploy」を押して数分待つ
4. 完了！表示されたURLを開くとアプリが使えます

### ステップ4: スマホで使う

1. スマホのブラウザ（Chrome/Safari）でデプロイしたURLを開く
2. **iPhone**: 共有ボタン → 「ホーム画面に追加」
3. **Android**: メニュー(⋮) → 「ホーム画面に追加」
4. アプリのようにホーム画面から起動できます！

---

## 使い方

### 基本の流れ

1. 🎙️ **録音** — 下部の赤い録音ボタンをタップして話す
2. 📝 **自動処理** — AIが文字起こし → 要約 → タグ付け → ベクトル化を自動で実行
3. 🕸️ **グラフ確認** — トップページで自分のメモがグラフとして表示される
4. 🔍 **分析** — 「分析」タブでAIがメモ群のつながりを分析

### 特殊操作

- **ノード融合**: グラフ上で2つのノードをドラッグして重ねる → AIが融合アイデアを生成
- **ダブルクリック**: ピン留めしたノードを解放
- **設定（⚙️）**: フォース、表示、回転などの調整

---

## アップデート方法

新機能が追加されたときに、あなたのアプリを最新版に更新する方法です。

### 手順（2ステップ・1分で完了）

**ステップ1: GitHubでコードを同期**

1. **[github.com](https://github.com)** にログイン
2. 自分のリポジトリ（`あなたのユーザー名/voice_diary`）を開く
3. ページ上部に **「This branch is X commits behind zunovia:main」** と表示されていたら更新があります
4. **「Sync fork」** ボタンをクリック → **「Update branch」** を押す

<p align="center">
  <img src="https://docs.github.com/assets/cb-74638/mw-1440/images/help/repository/sync-fork-dropdown.webp" alt="Sync fork" width="400" />
</p>

**ステップ2: 自動デプロイ**

- Sync forkすると**Vercelが自動で再デプロイ**します
- 2〜3分待つだけで最新版に更新完了！
- ※データ（メモ、融合ノード等）はSupabaseに保存されているので消えません

### 更新があるか確認するには

- このページ（[zunovia/voice_diary](https://github.com/zunovia/voice_diary)）の最新コミットの日付を見てください
- 自分のリポジトリの日付より新しければ、Sync forkで更新できます

---

## ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/zunovia/voice_diary.git
cd voice_diary

# 依存パッケージをインストール
npm install

# 環境変数を設定
cp .env.local.example .env.local
# .env.local を編集してAPIキーを入力

# 開発サーバーを起動
npm run dev
```

http://localhost:3000 でアクセスできます。

---

## 技術スタック

| 技術 | 用途 |
|------|------|
| [Next.js 16](https://nextjs.org/) | フレームワーク（App Router） |
| [Supabase](https://supabase.com/) | データベース（PostgreSQL + pgvector） |
| [Gemini 2.5 Flash](https://ai.google.dev/) | AI要約・分析・Embedding |
| [D3.js](https://d3js.org/) | ナレッジグラフ可視化 |
| [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) | ブラウザ音声認識 |
| [shadcn/ui](https://ui.shadcn.com/) | UIコンポーネント |
| [Vercel](https://vercel.com/) | ホスティング |

---

## トラブルシューティング

| 症状 | 対処法 |
|------|--------|
| 録音ボタンが動かない | HTTPSが必要です。VercelデプロイURL or `localhost`で使用してください |
| 文字起こし失敗 | ブラウザがWeb Speech APIに対応しているか確認（Chrome推奨） |
| Gemini API 429エラー | 無料枠の制限です。[Google AI Studio](https://aistudio.google.com/)でPay-as-you-goを有効化 |
| グラフが表示されない | メモが1件以上必要です。まず録音してください |
| Supabase接続エラー | プロジェクトが一時停止していないか確認（無料プランは7日放置で停止） |

**解決しない場合**: このREADMEの内容とエラーメッセージをAI（ChatGPT, Claude等）に貼り付けて質問してください！

---

## ライセンス

MIT License

---

<p align="center">
  Created by <a href="https://github.com/zunovia">zunovia</a>
</p>
