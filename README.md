# Rugby AI (ラグビーAI)

ラグビーのルールとゲームプレイに関する専門知識を提供する特化型チャットAIアプリケーションです。Node.js、Express、OpenAIのGPT-4o-miniモデルを使用して構築されており、ラグビーに関する質問を日本語で行い、詳細な回答を受け取ることができるインタラクティブな日本語インターフェースを提供します。

## 機能

- 🤖 **AI搭載のラグビー知識**: 包括的なラグビーのルールと規制について訓練された専門AI
- 💬 **インタラクティブなチャットインターフェース**: タイピングアニメーション付きのクリーンで使いやすいチャットインターフェース
- 📚 **知識ベース**: ラグビーのルール、ペナルティ、ゲームプレイなどをカバーする詳細な知識ベース（`knowledge.txt`）を使用
- 🔄 **会話管理**: 会話履歴を維持し、リセット機能を含む
- ⚡ **リアルタイム応答**: スムーズなタイピングアニメーション付きの高速AI応答

## 技術スタック

- **バックエンド**: Node.js、Express.js
- **フロントエンド**: HTML5、CSS3（SASS）、Vanilla JavaScript
- **AI**: OpenAI API（GPT-4o-mini）
- **依存関係**:
  - `express`: Webサーバーフレームワーク
  - `openai`: OpenAI APIクライアント
  - `cors`: クロスオリジンリソース共有
  - `dotenv`: 環境変数管理

## プロジェクト構造

```
RUGBY-EXPRESS/
├── assets/                 # ファビコンとアイコン
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
├── css/                    # コンパイル済みCSSスタイル
│   └── style.css
├── sass/                   # SASSソースファイル
│   └── style.scss
├── index.html              # メインHTMLファイル（日本語インターフェース）
├── script.js               # フロントエンドJavaScript（チャット機能）
├── server.js               # Expressサーバー（OpenAI統合）
├── knowledge.txt           # AI用ラグビー知識ベース
├── package.json            # Node.js依存関係とスクリプト
├── .gitignore              # Git無視ルール
└── README.md               # このファイル
```

## インストール

1. **リポジトリをクローン**
   ```bash
   git clone <repository-url>
   cd RUGBY-EXPRESS
   ```

2. **依存関係をインストール**
   ```bash
   npm install
   ```

3. **環境変数を設定**
   
   ルートディレクトリに`.env`ファイルを作成：
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=10000
   ```

   > **注意**: OpenAI APIキーが必要です。[OpenAI](https://platform.openai.com/)でサインアップしてAPIキーを取得してください。

## 使用方法

1. **サーバーを起動**
   ```bash
   npm start
   ```

2. **アプリケーションにアクセス**
   
   ブラウザを開いて以下のURLにアクセス：
   ```
   http://localhost:10000
   ```

3. **質問する**
   
   入力ボックスにラグビーに関する質問を日本語で入力し、「送信」をクリックするかEnterキーを押してください。

## APIエンドポイント

### `GET /`
メインHTMLページを提供します。

### `POST /ask`
AIに質問を送信し、回答を受け取ります。

**リクエストボディ:**
```json
{
  "question": "ラグビーのルールについて教えてください"
}
```

**レスポンス:**
```json
{
  "answer": "ラグビーは15人制が基本で..."
}
```

### `POST /reset`
会話履歴をリセットします。

**レスポンス:**
```json
{
  "message": "会話履歴をリセットしました。"
}
```

## 設定

AIは以下のように設定されています：
- 約300文字（詳細な説明が要求された場合は500文字以上）で回答を提供
- `knowledge.txt`の知識ベースを信頼できる情報源として使用
- 適切な改行（1行30文字）でレスポンスをフォーマット
- 技術的な質問にはルール参照を含める

## 開発

### スクリプト

- `npm start`: Expressサーバーを起動
- `npm test`: テストスクリプトのプレースホルダー

### 主要ファイル

- **`server.js`**: APIルートとOpenAI統合を処理するメインサーバーファイル
- **`script.js`**: チャットUIとAPI呼び出しを管理するフロントエンドJavaScript
- **`knowledge.txt`**: AI応答を訓練するために使用される包括的なラグビー知識ベース
- **`index.html`**: 日本語インターフェースを含むメインHTML構造

## 環境変数

| 変数 | 説明 | 必須 |
|------|------|------|
| `OPENAI_API_KEY` | OpenAI APIキー | はい |
| `PORT` | サーバーポート番号（デフォルト: 10000） | いいえ |

---

**注意**: このアプリケーションは日本語ユーザー向けに設計されており、ラグビーの知識を日本語で提供します。AIの応答は`knowledge.txt`の包括的な知識ベースに基づいており、ラグビーのルール、ペナルティ、ゲームプレイメカニクス、用語の更新（例：2025年4月1日より「ノックオン」→「ノックフォワード」）が含まれています。
