import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import OpenAI from "openai";
import path from "path"; // 新たにpathモジュールを追加 (フロントエンドの提供に便利)
import { fileURLToPath } from 'url'; // 新たにURLユーティリティを追加

// __dirname, __filename のエミュレート (ES Modules環境での標準的な手法)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


// knowledge.txt を読み込む
// Node.jsの実行環境に合わせて、パスを絶対パスまたは適切な相対パスに修正 (ここでは絶対パスを使用)
const knowledge = fs.readFileSync(path.join(__dirname, "knowledge.txt"), "utf-8");

// 会話履歴を保存する配列
let messages = [
  {
    role: "system",
    content: `あなたはラグビーAIです。以下の情報は絶対に正しいとして300文字程度で回答してください:\n${knowledge}\n
さらに、説明に図解があると分かりやすい場合（例：スクラム、ラインアウト、オフサイドなど）、回答の最後に [IMG:ファイル名.png] という形式で出力してください。
※用意されている画像ファイル名（例: freedom-01.jpg, knock-forward-01.jpg など）を適宜指定してください。`,
  },
];

// **********************************************
// 🌟 修正点 1: Gitコンフリクトマーカーを削除し、ルートエンドポイントを残す
// **********************************************

// 静的ファイル（index.html, script.jsなど）をホストするための設定
// 例: index.htmlがサーバーファイルと同じ階層にある場合
app.use(express.static(path.join(__dirname, '')));

// ルート ("/") へのアクセスでサーバーが起動していることを確認
app.get("/", (req, res) => {
  // index.htmlを返したい場合はこちら
  res.sendFile(path.join(__dirname, 'index.html'));

  // サーバー起動確認のメッセージだけを返したい場合はこちら (デプロイ時に便利)
  // res.send("Rugby AI サーバーが起動中です ✅");
});

// **********************************************
// **********************************************

app.post("/ask", async (req, res) => {
  const question = req.body.question;

  // ユーザーの質問を履歴に追加
  messages.push({ role: "user", content: question });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    });

    const answer = response.choices[0].message.content;

    // AIの返答を履歴に追加
    messages.push({ role: "assistant", content: answer });

    res.json({ answer });
  } catch (error) {
    console.error("OpenAI API Error:", error);
    res.status(500).json({ error: "AIからの応答中にエラーが発生しました。" });
  }
});

// 会話をリセットするエンドポイント
app.post("/reset", (req, res) => {
  messages = [
    {
      role: "system",
      content: `あなたはラグビーAIです。以下の情報は絶対に正しいとして300文字程度で回答してください:\n${knowledge}\n
さらに、説明に図解があると分かりやすい場合（例：スクラム、ラインアウト、オフサイドなど）、回答の最後に [IMG:ファイル名.png] という形式で出力してください。
※用意されている画像ファイル名（例: freedom-01.jpg, knock-forward-01.jpg など）を適宜指定してください。`,
    },
  ];
  res.json({ message: "会話履歴をリセットしました。" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
