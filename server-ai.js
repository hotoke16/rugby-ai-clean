import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from 'url';
import fetch from "node-fetch"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ★GASのURLを1つに統合
const GAS_URL = "https://script.google.com/macros/s/AKfycbyTTXhAUUk5UXAanUdcY_E6vswJ2yIMXnWe7tm0ca6QFK5fHpmOu1nG4AMnjUGco1NqqA/exec";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const knowledge = fs.readFileSync(path.join(__dirname, "knowledge.txt"), "utf-8");

const systemPrompt = `あなたはラグビー解説AIです。
以下の<知識ベース>を絶対的な事実として、初心者にもわかりやすく300文字程度で回答してください。

<知識ベース>
${knowledge}
</知識ベース>

<絶対命令: 画像出力システム>
ユーザーの質問やあなたの回答内容が、以下の【トリガー】に該当する場合、あなたは解説文の末尾に**必ず**対応する【出力タグ】をそのまま出力しなければなりません。
「言葉だけで伝わる」という自己判断や、出力の省略は絶対に許されません。

【トリガー】 -> 【出力タグ】
ノックオン、ノックフォワード -> [IMG:knock-forward-01.jpg]
スローフォワード -> [IMG:throw-forward-01.jpg]
ラグビーの人数やポジション（全体） -> [IMG:position-all]
ラグビーの人数（15人） -> [IMG:players.jpg]
フォワード(FW) -> [IMG:forward.jpg]
バックス(BK) -> [IMG:backs.jpg]
セットプレー（全体） -> [IMG:setplay-all]
スクラム -> [IMG:setplay-01.jpg]
ラインアウト -> [IMG:setplay-02.jpg]
キックオフ -> [IMG:setplay-03.jpg]
スピア、ショルダーチャージ、ノーバインド -> [IMG:dangerous-tackle-01.jpg]
空中のプレーヤーへのタックル -> [IMG:dangerous-tackle-02.jpg]
ノーボールタックル -> [IMG:dangerous-tackle-03.jpg]
得点の入り方（トライ、ゴール等） -> [IMG:score.jpg]
タックルの基本 -> [IMG:takcle.jpg]
ペナルティキックのオプション（全体） -> [IMG:penalty-option-all]
ペナルティキックからの再開（キック） -> [IMG:penaltykick-option (1).jpg]
ペナルティキックからの再開（スクラム） -> [IMG:penaltykick-option (2).jpg]
ペナルティキックからの再開（クイックスタート） -> [IMG:penaltykick-option (3).jpg]
ペナルティキックからの再開（ペナルティゴール） -> [IMG:penaltykick-option (4).jpg]
タックル後のリリース -> [IMG:release.jpg]
スチールの基本 -> [IMG:steal (1).jpg]
ノットリリースザボールを得るスチール -> [IMG:steal (2).jpg]
ボールを奪い取るスチール -> [IMG:steal (3).jpg]
キックの出し方と再開場所（全体） -> [IMG:kick-area-all]
キックをする理由 -> [IMG:kick-all]
22mライン内側からのキック -> [IMG:22m in.jpg]
22mライン外側からのダイレクトタッチ -> [IMG:22m out (1).jpg]
22mライン外側からのワンバウンド -> [IMG:22m out (2).jpg]
50-22（フィフティートゥエンティトゥ） -> [IMG:50 22.jpg]
アクシデンタルオフサイド -> [IMG:Accidental offside.jpg]
オブストラクション（※ラインアウト以外） -> [IMG:Obstruction.jpg]
ラインアウトでのオブストラクション -> [IMG:lineout_Obstruction.jpg]
アドバンテージ（全体・体系的な解説） -> [IMG:advantage-all]
ノックフォワードアドバンテージ -> [IMG:advantage-knock-all]
ペナルティアドバンテージ -> [IMG:advantage-penalty-all]
ノットロールアウェイ -> [IMG:not roll-away-all]
ラックでのオフサイド -> [IMG:ruck-offside-all]
22mラインドロップアウトになる事象 -> [IMG:22mline dropout-all]
トライラインドロップアウトになる事象 -> [IMG:tri-line dropout-all]
フェアキャッチ・マーク -> [IMG:mark-all]
キックオフ -> [IMG:kick off-all]
ハイタックル -> [IMG:high-tackle-all]
レフリーの基本的なシグナル -> [IMG:signal-basic]
レフリーのよくある反則のシグナル -> [IMG:signal-common Fouls]
タックルボックス・オフザゲート・サイドエントリー -> [IMG:tackle-box-all]

[出力のルール]
解説文を作り終わった後、改行して一番最後に、該当する【出力タグ】を書いてください。
例：
...となります。
[IMG:advantage-all]
</絶対命令>
（全体・体系的な解説）など、複数の画像をまとめた「全体用タグ（例：[IMG:kick-area-all] や [IMG:advantage-all]）」を出力する場合、そのグループに含まれる個別の画像タグは絶対に出力しないでください。
キックやアドバンテージなど【すべての項目】において、1回の回答内で同じ意味の画像が重複しないよう厳格に判定してください。
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ★処理を1つに統合した /ask エンドポイント
app.post("/ask", async (req, res) => {
    const { question, userId } = req.body;

    if (!userId || !userId.startsWith("U")) {
        return res.status(403).json({ answer: "【認証エラー】LINEアプリ内から開くか、LINEログインを行ってください。" });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
        // 1. まずGASから現在の利用回数（count）を取得
        let count = 0;
        const dbResponse = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get", userId: userId, month: currentMonth })
        });
        const dbData = await dbResponse.json();
        count = dbData.count || 0;

        // 2. 月100回制限のチェック
        const MONTHLY_LIMIT = 5;
        if (count >= MONTHLY_LIMIT) {
            return res.json({ answer: "今月の無料ご利用回数（100回）に達しました。来月またご利用ください！" });
        }

        // 3. Gemini API 呼び出し (シンプルに質問を投げる)
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash-lite',
            contents: question,
            config: {
                systemInstruction: systemPrompt
            }
        });

        let answer = response.text;

        // 4. 画像タグの変換処理
        answer = answer.replace("[IMG:position-all]", "[IMG:players.jpg][IMG:forward.jpg][IMG:backs.jpg]");
        answer = answer.replace("[IMG:kick-all]", "[IMG:kick-01.jpg][IMG:kick-02.jpg]");
        answer = answer.replace("[IMG:setplay-all]", "[IMG:setplay-01.jpg][IMG:setplay-02.jpg][IMG:setplay-03.jpg]");
        answer = answer.replace("[IMG:penalty-option-all]", "[IMG:penaltykick-option (1).jpg][IMG:penaltykick-option (2).jpg][IMG:penaltykick-option (3).jpg][IMG:penaltykick-option (4).jpg]");
        answer = answer.replace("[IMG:kick-area-all]", "[IMG:22m in.jpg][IMG:22m out (1).jpg][IMG:22m out (2).jpg][IMG:50 22.jpg]");
        answer = answer.replace("[IMG:advantage-all]", "[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg][IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg][IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
        answer = answer.replace("[IMG:advantage-knock-all]", "[IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg]");
        answer = answer.replace("[IMG:advantage-penalty-all]", "[IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
        answer = answer.replace("[IMG:kick off-all]", "[IMG:kick off (1).jpg][IMG:kick off (2).jpg][IMG:kick off (3).jpg]");
        answer = answer.replace("[IMG:mark-all]", "[IMG:mark (1).jpg][IMG:mark (2).jpg][IMG:mark (3).jpg][IMG:mark (4).jpg]");
        answer = answer.replace("[IMG:not roll-away-all]", "[IMG:not roll-away (1).jpg][IMG:not roll-away (2).jpg][IMG:not roll-away (3).jpg][IMG:not roll-away (4).jpg]");
        answer = answer.replace("[IMG:ruck-offside-all]", "[IMG:ruck-offside (1).jpg][IMG:ruck-offside (2).jpg][IMG:ruck-offside (3).jpg]");
        answer = answer.replace("[IMG:high-tackle-all]", "[IMG:high-tackle (1).jpg][IMG:high-tackle (2).jpg][IMG:high-tackle (3).jpg]");
        answer = answer.replace("[IMG:22mline dropout-all]", "[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg][IMG:goal-dead (2).jpg][IMG:goal-dead (3).jpg]");
        answer = answer.replace("[IMG:tri-line dropout-all]", "[IMG:knock-forward in the try area.jpg][IMG:held up.jpg][IMG:touchdown (1).jpg][IMG:touchdown (2).jpg][IMG:defensive dead (1).jpg][IMG:defensive dead (2).jpg][IMG:ball-dead (1).jpg][IMG:ball-dead (2).jpg]");
        answer = answer.replace("[IMG:signal-basic]", "[IMG:signal (1).jpg][IMG:signal (2).jpg][IMG:signal (3).jpg][IMG:signal (4).jpg]");
        answer = answer.replace("[IMG:signal-common Fouls]", "[IMG:signal (5).jpg][IMG:signal (6).jpg][IMG:signal (7).jpg][IMG:signal (8).jpg]");
        answer = answer.replace("[IMG:tackle-box-all]", "[IMG:tackle-box (1).jpg][IMG:tackle-box (2).jpg][IMG:tackle-box (3).jpg][IMG:tackle-box (4).jpg]");

        // 画像の重複削除
        const uniqueImages = [];
        answer = answer.replace(/\[IMG:[^\]]+\]/g, (match) => {
            if (uniqueImages.includes(match)) {
                return ""; 
            } else {
                uniqueImages.push(match);
                return match; 
            }
        });

        await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "save", 
                userId: userId, 
                month: currentMonth, 
                user: question, 
                ai: answer 
            })
        }).catch(err => console.error("GAS Save Error:", err));

        res.json({ answer: answer, remaining: MONTHLY_LIMIT - (count + 1) });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AIの処理中にエラーが発生しました。。" });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});