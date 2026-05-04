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

## ビルド確認

```bash
npm run build && npx tsc --noEmit
```
