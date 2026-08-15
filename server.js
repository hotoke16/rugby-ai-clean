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
【重要】あなたの回答内容が以下のリストのテーマに関連する場合は、説明を補足するために**必ず**対応する図解を出力してください。「文字だけで伝わる」と自己判断せず、関連画像がある場合は絶対に省略してはいけません。
図解を使う場合は、回答の最後に [IMG:ファイル名] の形式で出力してください。複数使う場合は [IMG:forward.jpg][IMG:backs.jpg] のように並べて出力します。
- freedom-01.jpg : ラグビーは自由なスポーツであり、ラン（ボールを持って走る）・パス（ボールを投げる）・キック（ボールを蹴る）のイラストが表現されている図。
- freedom-02.jpg : ラグビーは自由なスポーツであり、ヒット（ボールをもって相手に当たる）・ハンドオフ（ボールをもって相手の肩を手で押さえる）のイラストが表現されている図。
- knock-forward-01.jpg : ボールを前に落とすノックフォワードの反則を表している図。【必須キーワード: 反則】どんな反則があるか聞かれたら必ず出力すること。
- throw-forward-01.jpg : ボールを前に投げるスローフォワードの反則を表している図。【必須キーワード: 反則】どんな反則があるか聞かれたら必ず出力すること。
- players.jpg : ラグビーが15人で行うことを表している図。【必須キーワード: 人数, 15人】ラグビーの人数構成を説明する際は必ず出力すること。
- forward.jpg : フォワードがどのようなことをするポジションなのかを表している図。【必須キーワード: フォワード, FW】これらのポジションを説明する際は必ず出力すること。
- backs.jpg : バックスがどのようなことをするポジションなのかを表している図。【必須キーワード: バックス, BK】これらのポジションを説明する際は必ず出力すること。
- setplay-01.jpg : セットプレーの１つであるスクラムを表している図。【必須キーワード: スクラム, セットプレー】スクラムやセットプレーが何かを説明する際は必ず出力すること。
- setplay-02.jpg : セットプレーの１つであるラインアウトを表している図。【必須キーワード: ラインアウト, セットプレー】ラインアウトやセットプレーが何かを説明する際は必ず出力すること。
- setplay-03.jpg : セットプレーの１つであるキックオフを表している図。【必須キーワード: キックオフ, セットプレー】キックオフやセットプレーが何かを説明する際は必ず出力すること。
- dangerous-tackle-01.jpg : スピアタックル（相手を持ち上げて頭から落とす）、ショルダーチャージ（バインドをしないノーバインドタックル）の図。【必須キーワード: 危険，カード対象】危険・禁止されているプレーが何かを説明する際は必ず出力すること。
- dangerous-tackle-02.jpg : ハイタックル（胸より上に入るタックル）、空中でのタックルの図。【必須キーワード: 危険，カード対象】】危険・禁止されているプレーが何かを説明する際は必ず出力すること。
- dangerous-tackle-03.jpg : ノーボールタックル（ボールを持っていない人へ入るタックル）、スライディングで相手を転ばそうとする図。【必須キーワード: 危険，カード対象】】危険・禁止されているプレーが何かを説明する際は必ず出力すること。
- score.jpg : 得点の入り方（トライ・コンバージョンゴール・ペナルティゴール・ドロップゴール）を表している図。【必須キーワード: 得点，スコア】】得点の入り方を説明する際は必ず出力すること。
- takcle.jpg : タックルを説明している図。【必須キーワード: タックル，止め方】ラグビーの基本的なところを説明する際は必ず出力すること。

※上記リストにない画像は絶対に使用しないでください。`,
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
