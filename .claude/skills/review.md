---
name: review
description: Voice Diary Memo のコード変更後のテスト・レビューを実行する
user_invocable: true
---

# Voice Diary Memo — テスト＆レビュー

コード変更後に以下のチェックを順番に実行してください。

## 1. TypeScriptビルドチェック
```bash
cd /c/Users/zunov/.homepage/voice-diary-memo && npx next build 2>&1 | tail -30
```
- 型エラーがないことを確認
- ビルドが成功することを確認
- 失敗した場合は原因を特定して修正

## 2. プレビューサーバー確認
preview_start で `voice-diary` サーバーを起動（または既存のものを使用）し、以下を確認:

### 2a. コンソールエラーチェック
- `preview_console_logs` でエラーがないことを確認
- `preview_logs` でサーバーサイドエラーがないことを確認

### 2b. 変更された画面のスクリーンショット確認
- 変更に関連するページのスクリーンショットを撮影
- UIが正しく表示されていることを確認
- レイアウト崩れがないこと

### 2c. APIエンドポイントテスト（API変更がある場合）
curlで変更したAPIエンドポイントを叩いてレスポンスを確認:
```bash
curl -s http://localhost:3001/api/[endpoint] 2>&1
```

## 3. コードレビューチェックリスト

### セキュリティ
- [ ] APIキーがクライアントサイドに漏洩していないか
- [ ] ユーザー入力のサニタイズは適切か
- [ ] RLSポリシーは適切か

### パフォーマンス
- [ ] 不必要なAPI呼び出しはないか
- [ ] useEffectの依存配列は正しいか
- [ ] 大量データの場合のページネーションは考慮されているか

### Next.js 16 互換性
- [ ] paramsは必ずawaitしているか
- [ ] searchParamsは必ずawaitしているか
- [ ] サーバーコンポーネントとクライアントコンポーネントの区別は正しいか

### shadcn/ui (base-ui) 互換性
- [ ] Button に asChild を使っていないか
- [ ] Slider の onValueChange は Array.isArray チェックをしているか

### Gemini API
- [ ] モデル名は `gemini-2.5-flash` か（2.0-flashは廃止）
- [ ] API使用量のトラッキングが実装されているか
- [ ] エラーメッセージが具体的に返されているか

### 一般的な品質
- [ ] TypeScriptの型エラーはないか
- [ ] console.logのデバッグ出力が残っていないか
- [ ] ハードコードされた値がないか

## 4. 結果レポート
レビュー結果を以下の形式でユーザーに報告:

```
## レビュー結果

### ビルド: ✅ / ❌
### UI表示: ✅ / ❌
### API: ✅ / ❌ / ⏭️ (変更なし)
### コードレビュー: ✅ / ⚠️ 指摘あり

### 指摘事項（あれば）
1. ...
2. ...
```
