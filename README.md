# Fate Decoder

AIパーソナルリーディングサービス。最大11占術（マヤ暦・算命学・四柱推命・数秘術・西洋占星術・宿曜・Gene Keys・Human Design・九星気学・易経・蔵干）を組み合わせ、Claude / Gemini APIでレポートを生成する。

## 環境変数

### Vercel デプロイ時に必須
- `ANTHROPIC_API_KEY`: Claude API キー（推奨。レポート生成のメイン経路）
- `GEMINI_API_KEY`: Gemini API キー（フォールバック。Anthropic 未設定時に使用）

両方未設定時はレポート生成が失敗する。Vercel Project Settings → Environment Variables で追加すること。

## 開発

```bash
npm install
npm run dev
```

## ローカル版（API課金なし）

Claude Code がインストール済みで `claude login` 完了している必要があります。

```bash
npm run local
```

ブラウザで http://localhost:3001 を開く。

Anthropic / Gemini API キーは不要。Claude Code のサブスクリプションセッションを使って生成する。
詳細は `local-app/README.md` を参照。

## VOICEVOX を使う（任意・ローカル版のみ）

1. VOICEVOX 公式サイトからアプリをDL: https://voicevox.hiroshiba.jp/
2. アプリを起動（自動でエンジンが localhost:50021 で動く）
3. `npm run local` でローカル版を起動
4. 設定パネルで「VOICEVOX」エンジンを選択 → キャラクターを選んで試聴

VOICEVOX が起動していない場合はエラー表示が出る。アプリを起動してから再度お試しください。

ずんだもん・四国めたん・春日部つむぎ・玄野武宏 など12キャラクター（各スタイル含む）から選択可能。

## ビルド確認

```bash
npm run build && npx tsc --noEmit
```
