# FateDecoder ローカル版

Claude Code をバックエンドに使う API 課金ゼロのローカル専用版です。

## 前提条件

- Claude Code インストール済み（`claude --version` で確認）
- `claude login` でログイン済み（Anthropicサブスクリプションのセッション）

## 起動

```bash
# リポジトリルートで実行
npm run local
```

ブラウザで http://localhost:3001 を開く。

## 仕組み

- `LOCAL_CLAUDE_CODE=true` 環境変数が設定された状態で Next.js が 3001 番ポートで起動する
- AI 生成時に Anthropic/Gemini API を呼ばず、`claude -p` コマンドを子プロセスとして起動する
- Claude Code の認証セッション（`~/.claude/` 配下）をそのまま利用するため API キー不要

## 注意事項

- 本番版（app/）とは完全に独立している。Vercel デプロイには影響しない
- 生成に 30〜90 秒かかる場合がある（Claude Code の起動オーバーヘッド）
- Notion への結果保存はスキップされる（NOTION_API_KEY 未設定のため）
