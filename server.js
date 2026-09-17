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

// ★GASの最新のウェブアプリURL
const GAS_URL = "https://script.google.com/macros/s/AKfycbyTTXhAUUk5UXAanUdcY_E6vswJ2yIMXnWe7tm0ca6QFK5fHpmOu1nG4AMnjUGco1NqqA/exec";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '')));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ==========================================
// 1. テキストファイルの事前読み込み（分割版）
// ==========================================
const textGeneral = fs.readFileSync(path.join(__dirname, "general.txt"), "utf-8");
const textBreakdown = fs.readFileSync(path.join(__dirname, "breakdown.txt"), "utf-8");
const textSetplay = fs.readFileSync(path.join(__dirname, "setplay.txt"), "utf-8");
const textFoul = fs.readFileSync(path.join(__dirname, "foul.txt"), "utf-8");
const textKick = fs.readFileSync(path.join(__dirname, "kick.txt"), "utf-8");
const textReferee = fs.readFileSync(path.join(__dirname, "referee.txt"), "utf-8");

// ==========================================
// 2. 共通のシステムプロンプト設定
// ==========================================
const baseSystemPrompt = `あなたはラグビー解説AIです。
以下の<知識ベース>を絶対的な事実として、初心者にもわかりやすく300文字程度で回答してください。

【説明方法】
・原則300文字程度とする。段落ごとに空行を入れ、箇条書きは必ず改行すること。
・以下の「知識テキスト」を唯一の正解とする。記載のない内容はGeminiの一般知識や推測で補わず「この内容は本AIの知識範囲外です」と回答すること。
・質問が曖昧な場合も範囲外とせず、関連するルールを網羅して解説すること。

【回答のスタンスと対象範囲】
・本AIは、レフリーの経験に基づく「初心者にも分かりやすい実践的な解説」を目的とする。競技規則の文章をそのまま転記せず、分かりやすく噛み砕いて説明すること。
・基本的な質問に対し、競技規則の「第何条」まで答える必要はない（根拠を聞かれたら答えてよい）。
・成人ラグビーの15人制のルール解説に特化しており、7人制やミニラグビー、またプレーヤーとしての技術的アドバイスは対象外とする。

【略語】
*ペナルティキック：PK
*フリーキック：FK
*スクラム：SC
*ラインアウト：LO
*アドバンテージ：AD
*アタック：AT
*ディフェンス：DF
*タックル：TK
*ラック：RC
*モール：ML
*ボールキャリアー：BC
*オフサイド：OF
*ノックフォワード：KF
*スローフォワード：SF
*ユーザーへの説明時は、略語は使用しないこと。
◎競技規則に基づく説明
〇競技規則に基づいて作成された実践的な解説・判断

【回答フォーマット】
回答は必ず以下の構成にすること。これ以外の構成は一切認めない。最初に必ず関連する画像タグを（または [IMG:NONE] ）出力し、改行してから解説文を書くこと。

[IMG:該当する画像タグ、またはNONE]
（ここに300文字程度の解説文を書く）

<絶対命令: 画像出力システム>
以下の【出力ルール】に沿って **該当する画像タグを必要な数だけすべて出力** してください（複数可）。

【出力ルール】
1. 読み込まれた<知識ベース>内に【画像出力トリガー】が存在し、回答内容が合致する場合：
   -> 該当する【出力タグ】をすべて出力してください。（例： [IMG:signal (1).jpg][IMG:signal (7).jpg] ）
   ★重要：特定のプレーや反則について聞かれた場合は、安易に「全体用タグ（例: signal-common Fouls）」で済ませず、必ず個別のピンポイントなタグを出力すること。

2. 知識ベースを隅々まで確認し、該当する画像トリガーが「絶対に1つも存在しない」場合のみ：
   -> [IMG:NONE] と出力してください。

[IMG:xxx] または [IMG:NONE] の出力がない回答は失敗とみなします。必ず回答の「先頭」につけてください。
</絶対命令>
`;

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// ★ AIを消費しない！回数確認用の専用窓口
// ==========================================
app.post("/get-count", async (req, res) => {
    const { userId } = req.body;
    if (!userId || !userId.startsWith("U")) {
        return res.status(403).json({ error: "認証エラー" });
    }
    const now = new Date();
    const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    try {
        const dbResponse = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "count_check", userId: userId, month: currentMonth })
        });
        const text = await dbResponse.text();
        const dbData = JSON.parse(text);
        const count = dbData.count || 0;
        res.json({ count: count, remaining: 50 - count });
    } catch (e) {
        console.error("Count Check Error:", e);
        res.status(500).json({ error: "エラー" });
    }
});

// ==========================================
// ★ AIに質問を投げるメイン処理
// ==========================================
app.post("/ask", async (req, res) => {
    let { question, userId } = req.body;

    question = question.replace(/蹴る/g, "キックする").replace(/蹴った/g, "キックした").replace(/蹴って/g, "キックして").replace(/蹴られた/g, "キックされた").replace(/ける/g, "キックする").replace(/けった/g, "キックした").replace(/けって/g, "キックして").replace(/けられた/g, "キックされた");

    const now = new Date();
    const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {

        // --- 2. 質問からキーワードを判定し、必要なテキストだけを選ぶ ---
        let knowledgeList = [];

        if (question.includes("タックル") || question.includes("ラック") || question.includes("モール") || question.includes("倒れ") || question.includes("ジャッカル") || question.includes("スチール") || question.includes("ヒット") || question.includes("ノットロ") || question.includes("ノットリ") || question.includes("サイド") || question.includes("オフザ") || question.includes("オーバー")) {
            knowledgeList.push(textBreakdown);
        }
        if (question.includes("スクラム") || question.includes("ラインアウト") || question.includes("タッチ") || question.includes("スローイン") || question.includes("投入") || question.includes("SC") || question.includes("マークオブタッチ")) {
            knowledgeList.push(textSetplay);
        }
        if (question.includes("タックル") || question.includes("反則") || question.includes("ペナルティ") || question.includes("オフサイド") || question.includes("ノッ") || question.includes("スローフォワード") || question.includes("アドバンテージ") || question.includes("落とし") || question.includes("笛") || question.includes("PK") || question.includes("危険") || question.includes("オブスト") || question.includes("邪魔")) {
            knowledgeList.push(textFoul);
        }
        if (question.includes("キック") || question.includes("ドロップアウト") || question.includes("インゴール") || question.includes("トライライン") || question.includes("50 22") || question.includes("FK") || question.includes("タッチダウン") || question.includes("デッド") || question.includes("タッチ") || question.includes("タップ")) {
            knowledgeList.push(textKick);
        }
        if (question.includes("レフリ") || question.includes("審判") || question.includes("シグナル") || question.includes("ジェスチャー")) {
            knowledgeList.push(textReferee);
        }

        if (knowledgeList.length === 0) {
            knowledgeList.push(textGeneral);
        }

        const combinedKnowledge = knowledgeList.join("\n\n");

        // 【修正箇所1】バッククォートとセミコロンで確実に閉じる
        const finalSystemPrompt = `${baseSystemPrompt}

<知識ベース>
${combinedKnowledge}
</知識ベース>
`;

        // --- 3. Gemini API 呼び出し ---
        let response;
        let answer = "";
        let retryCount = 3; // 最大3回まで粘る
        
        for (let i = 0; i < retryCount; i++) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash-lite', 
                    contents: question,
                    config: {
                        systemInstruction: finalSystemPrompt,
                    }
                });
                answer = response.text;

                // ★ あなたのアイデア：JSによる確実性チェック
                // 回答の中に「[IMG:」という文字が含まれていない場合、AIの出力忘れとみなす
                if (!answer.includes("[IMG:") || answer.includes("[IMG:NONE]")) {
                    throw new Error("タグの出力忘れ、または [IMG:NONE] を検知したためリトライします"); // 意図的にエラーを発生させてリトライへ飛ばす
                }

                // 無事にタグが含まれていたらループを抜ける
                break; 

            } catch (apiError) {
                if (i < retryCount - 1) {
                    console.log(`[リトライ ${i + 1}/${retryCount}] エラー発生: ${apiError.message}。2秒後に再挑戦します...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // 3回粘ってもダメだった場合の最終手段（エラーにはせず、回答だけは返す）
                    console.log("3回リトライしましたが、AIがタグを出力しませんでした。");
                    if (!answer) throw apiError; // 完全な通信エラーの場合は外に投げる
                }
            }
        }

        answer = answer.replace(/\[IMG:NONE\]/g, "").trim();

        // ラグビーは15人、フォワード8人、バックス7人と説明する話題
        answer = answer.replace("[IMG:position-all]", "[IMG:players.jpg][IMG:forward.jpg][IMG:backs.jpg]");

        answer = answer.replace("[IMG:kick-all]", "[IMG:kick-01.jpg][IMG:kick-02.jpg]");

        answer = answer.replace("[IMG:setplay-all]", "[IMG:setplay-01.jpg][IMG:setplay-02.jpg][IMG:setplay-03.jpg]");

        answer = answer.replace("[IMG:penalty-option-all]", "[IMG:penaltykick-option (1).jpg][IMG:penaltykick-option (2).jpg][IMG:penaltykick-option (3).jpg][IMG:penaltykick-option (4).jpg]");

        answer = answer.replace("[IMG:kick-area-all]", "[IMG:22m in.jpg][IMG:22m out (1).jpg][IMG:22m out (2).jpg][IMG:50 22.jpg]");
        // アドバンテージの詳細を説明する話題
        answer = answer.replace("[IMG:advantage-all]", "[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg][IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg][IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
        // アドバンテージの基礎を説明する話題
        answer = answer.replace("[IMG:advantage-basic-all]", "[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg]");
        // ノックフォワードアドバンテージの説明
        answer = answer.replace("[IMG:advantage-knock-all]", "[IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg]");
        // ペナルティアドバンテージの説明
        answer = answer.replace("[IMG:advantage-penalty-all]", "[IMG:advantage (7).jpg][IMG:advantage (8).jpg]");

        answer = answer.replace("[IMG:kick off-all]", "[IMG:kick off (1).jpg][IMG:kick off (2).jpg][IMG:kick off (3).jpg]");

        answer = answer.replace("[IMG:mark-all]", "[IMG:mark (1).jpg][IMG:mark (2).jpg][IMG:mark (3).jpg][IMG:mark (4).jpg]");

        answer = answer.replace("[IMG:not roll-away-all]", "[IMG:not roll-away (1).jpg][IMG:not roll-away (2).jpg][IMG:not roll-away (3).jpg][IMG:not roll-away (4).jpg]");

        answer = answer.replace("[IMG:ruck-offside-all]", "[IMG:ruck-offside (1).jpg][IMG:ruck-offside (2).jpg][IMG:ruck-offside (3).jpg]");

        answer = answer.replace("[IMG:high-tackle-all]", "[IMG:high-tackle (1).jpg][IMG:high-tackle (2).jpg][IMG:high-tackle (3).jpg]");

        answer = answer.replace("[IMG:22mline dropout-all]", "[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg][IMG:goal-dead (2).jpg][IMG:goal-dead (3).jpg]");
        // トライラインドロップアウトになるパターン（ノックフォワード・ヘルドアップ・タッチダウン・DFのデッド・ボールデッド）
        answer = answer.replace("[IMG:tri-line dropout-all]", "[IMG:knock-forward in the try area.jpg][IMG:held up.jpg][IMG:touchdown (1).jpg][IMG:touchdown (2).jpg][IMG:defensive dead (1).jpg][IMG:defensive dead (2).jpg][IMG:ball-dead (1).jpg][IMG:ball-dead (2).jpg]");

        answer = answer.replace("[IMG:signal-basic]", "[IMG:signal (1).jpg][IMG:signal (2).jpg][IMG:signal (3).jpg][IMG:signal (4).jpg]");

        answer = answer.replace("[IMG:signal-common Fouls]", "[IMG:signal (5).jpg][IMG:signal (6).jpg][IMG:signal (7).jpg][IMG:signal (8).jpg]");

        answer = answer.replace("[IMG:tackle-box-all]", "[IMG:tackle-box (1).jpg][IMG:tackle-box (2).jpg][IMG:tackle-box (3).jpg][IMG:tackle-box (4).jpg]");
        // よくある反則
        answer = answer.replace("[IMG:common fouls-all]", "[IMG:knock-forward-01.jpg][IMG:throw-forward-01.jpg][IMG:steal (2).jpg][IMG:ruck-offside (2).jpg]");



        // 画像の重複削除 (すでに同じタグがある場合は消去)
        const logUserId = userId || `Guest_${Date.now()}`;
        
        fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "save", 
                userId: logUserId, 
                month: currentMonth, 
                user: question, 
                ai: answer 
            })
        }).catch(err => console.error("GAS Save Error:", err));

        res.json({ answer: answer });

    } catch (error) {
        console.error("Gemini API Error (3回リトライ失敗):", error);
        res.status(500).json({ error: "AIが一時的に混み合っているか、エラーが発生しました。もう一度送信してください。" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});