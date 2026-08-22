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

【画像タグ出力ルール】
ユーザーの質問に対し、以下のリストに該当する話題を説明する場合は、文章の最後に必ず指定の画像タグを出力してください。
例: [IMG:ファイル名.jpg]

＜出力条件リスト＞
・ラン、パス、キックの話題 -> [IMG:freedom-01.jpg]
・ヒット、ハンドオフの話題 -> [IMG:freedom-02.jpg]
・ノックオン、ノックフォワードの話題 -> [IMG:knock-forward-01.jpg]
・スローフォワードの話題 -> [IMG:throw-forward-01.jpg]
・ラグビーの人数（15人）の話題 -> [IMG:players.jpg]
・フォワード(FW)の話題 -> [IMG:forward.jpg]
・バックス(BK)の話題 -> [IMG:backs.jpg]
・スクラムの話題 -> [IMG:setplay-01.jpg]
・ラインアウトの話題 -> [IMG:setplay-02.jpg]
・キックオフの話題 -> [IMG:setplay-03.jpg]
・危険なタックル（スピア、ショルダーチャージ、ノーバインド）の話題 -> [IMG:dangerous-tackle-01.jpg]
・危険なタックル（ハイタックルなど）の話題 -> [IMG:dangerous-tackle-02.jpg]
・危険なタックル（ノーボールタックルなど）の話題 -> [IMG:dangerous-tackle-03.jpg]
・得点の入り方（トライ、ゴール等）の話題 -> [IMG:score.jpg]
・タックルの基本の話題 -> [IMG:takcle.jpg]
・ペナルティキックからの再開（キック）の話題 -> [IMG:penaltykick-option (1).jpg]
・ペナルティキックからの再開（スクラム）の話題 -> [IMG:penaltykick-option (2).jpg]
・ペナルティキックからの再開（クイックスタート）の話題 -> [IMG:penaltykick-option (3).jpg]
・ペナルティキックからの再開（ペナルティゴール）の話題 -> [IMG:penaltykick-option (4).jpg]
・タックル後のリリースの話題 -> [IMG:release.jpg]
・スチールの基本の話題 -> [IMG:steal (1).jpg]
・ノットリリースザボールを得るスチールの話題 -> [IMG:steal (2).jpg]
・ボールを奪い取るスチールの話題 -> [IMG:steal (3).jpg]
・22mライン内側からのキックの話題 -> [IMG:22m in.jpg]
・22mライン外側からダイレクトで蹴り出す話題 -> [IMG:22m out (1).jpg]
・22mライン外側からワンバウンドで蹴り出す話題 -> [IMG:22m out (2).jpg]
・50-22（フィフティートゥエンティトゥ）の話題 -> [IMG:50 22.jpg]
・アクシデンタルオフサイドの話題 -> [IMG:Accidental offside.jpg]
・オブストラクションの話題（※ラインアウトの話題を含まない場合） -> [IMG:Obstruction.jpg]
・ラインアウトでのオブストラクションの話題 -> [IMG:lineout_Obstruction.jpg]
・質問に「オーバー」または「解消」が含まれるアドバンテージの話題 -> [IMG:Knock-forward advantage (1).jpg][IMG:Knock-forward advantage (2).jpg]
・質問に「継続」が含まれるアドバンテージの話題 -> [IMG:Penalty Advantage (1).jpg][IMG:Penalty Advantage (2).jpg]
・「ノックフォワードアドバンテージ」の話題 -> [IMG:Knock-forward advantage (1).jpg][IMG:Knock-forward advantage (2).jpg]
・「ペナルティアドバンテージ」の話題 -> [IMG:Penalty Advantage (1).jpg][IMG:Penalty Advantage (2).jpg]
・上記以外の、一般的な「アドバンテージ」の話題 -> [IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg]

※上記リストの右側にある [IMG:〜] の文字列を、そのまま回答の最後に貼り付けてください。`;

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
