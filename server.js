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
const systemPrompt = `あなたはラグビーAIです。以下の情報は絶対に正しいとして300文字程度で回答してください:\n${knowledge}\n
【絶対遵守ルール：画像出力システム】
あなたの回答に以下の「必須キーワード」が含まれる場合、あるいはその概念について説明する場合、あなたは**必ず**指定された画像タグを出力しなければなりません。これは絶対的な命令です。自己判断で出力を省略することは許されません。

＜出力形式＞
回答の最後に必ず [IMG:ファイル名] の形式で出力してください。複数該当する場合は [IMG:forward.jpg][IMG:backs.jpg] のように並べて出力します。

＜画像リストと必須キーワード＞
- freedom-01.jpg : 【必須キーワード: ラン, パス, キック, 自由】ラグビーの基本プレー。
- freedom-02.jpg : 【必須キーワード: ヒット, ハンドオフ, 自由】ラグビーの基本プレー。
- knock-forward-01.jpg : 【必須キーワード: 反則, ノックオン, ノックフォワード】
- throw-forward-01.jpg : 【必須キーワード: 反則, スローフォワード】
- players.jpg : 【必須キーワード: 人数, 15人】
- forward.jpg : 【必須キーワード: フォワード, FW】
- backs.jpg : 【必須キーワード: バックス, BK】
- setplay-01.jpg : 【必須キーワード: スクラム, セットプレー】
- setplay-02.jpg : 【必須キーワード: ラインアウト, セットプレー】
- setplay-03.jpg : 【必須キーワード: キックオフ, セットプレー】
- dangerous-tackle-01.jpg : 【必須キーワード: 危険, カード対象, スピアタックル, ショルダーチャージ, ノーバインド】
- dangerous-tackle-02.jpg : 【必須キーワード: 危険, カード対象, ハイタックル】
- dangerous-tackle-03.jpg : 【必須キーワード: 危険, カード対象, ノーボールタックル】
- score.jpg : 【必須キーワード: 得点, スコア, トライ, ゴール】
- takcle.jpg : 【必須キーワード: タックル, 止め方】
- penaltykick-option (1).jpg : 【必須キーワード: ペナルティキック, オプション, キック】
- penaltykick-option (2).jpg : 【必須キーワード: ペナルティキック, オプション, スクラム】
- penaltykick-option (3).jpg : 【必須キーワード: ペナルティキック, オプション, クイックスタート】
- penaltykick-option (4).jpg : 【必須キーワード: ペナルティキック, オプション, ペナルティゴール】
- release.jpg : 【必須キーワード: タックル成立, リリース】
- steal (1).jpg : 【必須キーワード: スチール】スチールの基本。
- steal (2).jpg : 【必須キーワード: スチール】ノットリリースザボールの獲得。
- steal (3).jpg : 【必須キーワード: スチール】ボール奪取。
- 22m in.jpg : 【必須キーワード: エリア, 22m】内側からのキック。
- 22m out (1).jpg : 【必須キーワード: エリア, ダイレクトタッチ】外側からのダイレクト。
- 22m out (2).jpg : 【必須キーワード: エリア, 22m】外側からのワンバウンド。
- 50 22.jpg : 【必須キーワード: エリア, 50 22, フィフティートゥエンティトゥ】
- Accidental offside.jpg : 【必須キーワード: アクシデンタルオフサイド】味方との衝突。
- Obstruction.jpg : 【必須キーワード: オブストラクション, 邪魔】※ただし「ラインアウト」に関する説明の時は絶対に出力しないこと。
- lineout_Obstruction.jpg : 【必須キーワード: オブストラクション, ラインアウト】
- advantage (1).jpg : 【必須キーワード: アドバンテージ】※ただし「解消」「オーバー」の説明の時は絶対に出力しないこと。
- advantage (2).jpg : 【必須キーワード: アドバンテージ】※ただし「解消」「オーバー」の説明の時は絶対に出力しないこと。
- advantage (3).jpg : 【必須キーワード: アドバンテージ】※ただし「解消」「オーバー」の説明の時は絶対に出力しないこと。
- Knock-forward advantage (1).jpg : 【必須キーワード: ノックフォワードアドバンテージ, アドバンテージオーバー, アドバンテージ解消】
- Knock-forward advantage (2).jpg : 【必須キーワード: ノックフォワードアドバンテージ, アドバンテージオーバー, アドバンテージ解消】
- Penalty Advantage (1).jpg : 【必須キーワード: ペナルティアドバンテージ, アドバンテージ解消, アドバンテージ継続】
- Penalty Advantage (2).jpg : 【必須キーワード: ペナルティアドバンテージ, アドバンテージ解消, アドバンテージ継続】

※上記リストにない画像（存在しないファイル名）は絶対に出力しないでください。`;

// 会話履歴を保存する配列（定数に入れたプロンプトを使う）
let messages = [
  {
    role: "system",
    content: systemPrompt,
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
  // ★追加: フロントから送られてきた userId を受け取る
  const userId = req.body.userId || "unknown";

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

    // ==========================================
    // ★追加：スプレッドシートへログを送信する処理
    // ==========================================
    // 先ほどコピーした「ウェブアプリの URL」をここに貼ります
    const gasUrl = "https://script.google.com/macros/s/AKfycbxCr8UtGI4pdP1zuSgGDXKHN9IKvpcEbpbpPHiWnuFNToXE6xFTy7qAL1Y3pXdOiPk/exec";
    
    // サーバーの裏側でこっそりスプレッドシートへ送信（結果は待たない）
    fetch(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: userId, // ★追加: GASへ userId を渡す
        user: question,
        ai: answer
      })
    }).catch(err => console.error("スプレッドシートへの送信エラー:", err));
    // ==========================================

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
