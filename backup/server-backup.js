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
回答は必ず以下の構成にすること。これ以外の構成は一切認めない。

（ここに300文字程度の解説文を書く）

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
    const { question, userId } = req.body;

    if (!userId || !userId.startsWith("U")) {
        return res.status(403).json({ answer: "【認証エラー】LINEアプリ内から開くか、LINEログインを行ってください。" });
    }

    const now = new Date();
    const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const MONTHLY_LIMIT = 100; // ★月の制限回数をここで設定

    try {
        // --- 1. GASから利用回数（count）を取得 ---
        let count = 0;
        const dbResponse = await fetch(GAS_URL, {
            method: "POST",
            body: JSON.stringify({ action: "get", userId: userId, month: currentMonth })
        });
        const responseText = await dbResponse.text();
        
        try {
            const dbData = JSON.parse(responseText);
            count = dbData.count || 0;
        } catch (e) {
            console.error("GASが混雑中。回数チェックをスキップします。");
            count = 0; 
        }

        if (count >= MONTHLY_LIMIT) {
            return res.json({ answer: `今月の無料ご利用回数（${MONTHLY_LIMIT}回）に達しました。来月またご利用ください！` });
        }

        // --- 2. 質問からキーワードを判定し、必要なテキストだけを選ぶ ---
        let knowledgeList = [];

        if (question.includes("タックル") || question.includes("ラック") || question.includes("モール") || question.includes("倒れ") || question.includes("ジャッカル") || question.includes("スチール")) {
            knowledgeList.push(textBreakdown);
        }
        if (question.includes("スクラム") || question.includes("ラインアウト") || question.includes("タッチ") || question.includes("スローイン") || question.includes("投入") || question.includes("SC") || question.includes("LO")) {
            knowledgeList.push(textSetplay);
        }
        if (question.includes("反則") || question.includes("ペナルティ") || question.includes("オフサイド") || question.includes("ノック") || question.includes("スローフォワード") || question.includes("アドバンテージ") || question.includes("落とし") || question.includes("笛") || question.includes("PK") || question.includes("AD")) {
            knowledgeList.push(textFoul);
        }
        if (question.includes("キック") || question.includes("ドロップアウト") || question.includes("インゴール") || question.includes("トライライン") || question.includes("50 22") || question.includes("FK")) {
            knowledgeList.push(textKick);
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
        let retryCount = 3; // 最大3回まで粘る
        
        for (let i = 0; i < retryCount; i++) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-3.5-flash-lite', 
                    contents: question,
                    config: {
                        systemInstruction: finalSystemPrompt,
                        maxOutputTokens: 800 
                    }
                });
                break; // 成功したらループ（再挑戦）を終わる
            } catch (apiError) {
                // もし503（混雑エラー）だったら、2秒待ってから再挑戦する
                if (apiError.status === 503 && i < retryCount - 1) {
                    console.log(`Gemini API混雑中(503)。2秒後にリトライします...（残り${retryCount - i - 1}回）`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw apiError; // それ以外の致命的なエラーなら外に投げて終了
                }
            }
        }

        let answer = response.text;

        // ========== ★ここから：JSによる確実な画像タグ付与 ==========
        let imageTags = [];
        const checkText = question + " " + answer; 

        // --- ① 基本プレー・人数 ---
        if (question.includes("ポジション") || question.includes("人数") || question.includes("何人") || question.includes("何名")) {
            imageTags.push("[IMG:players.jpg][IMG:forward.jpg][IMG:backs.jpg]");
        }
        if (checkText.includes("15人")) imageTags.push("[IMG:players.jpg]");
        
        const textForForwardCheck = checkText.replace(/ノックフォワード/g, "").replace(/スローフォワード/g, "");
        if (textForForwardCheck.includes("フォワード") || checkText.includes("FW")) {
            imageTags.push("[IMG:forward.jpg]");
        }
        if (checkText.includes("バックス") || checkText.includes("BK")) imageTags.push("[IMG:backs.jpg]");

        // --- ② 得点 ---
        const textForTryCheck = checkText.replace(/トライライン/g, "").replace(/トライエリア/g, "").replace(/ペナルティトライ/g, "");
        if (textForTryCheck.includes("トライ") || checkText.includes("得点") || checkText.includes("ゴール")) {
            imageTags.push("[IMG:score.jpg]");
        }

        // --- ③ セットプレー ---
        if (question.includes("セットプレー") || checkText.includes("試合再開方法")|| checkText.includes("試合の再開方法")){
            imageTags.push("[IMG:setplay-01.jpg][IMG:setplay-02.jpg][IMG:setplay-03.jpg]");
        }

        // --- ④ タックル・コンタクト ---
        if (checkText.includes("スピア") || checkText.includes("ショルダーチャージ") || checkText.includes("ノーバインド")) {
            imageTags.push("[IMG:dangerous-tackle-01.jpg]");
        }
        if (checkText.includes("空中") && checkText.includes("タックル")) imageTags.push("[IMG:dangerous-tackle-02.jpg]");
        if (checkText.includes("ノーボールタックル")) imageTags.push("[IMG:dangerous-tackle-03.jpg]");
        if (checkText.includes("ハイタックル")) imageTags.push("[IMG:high-tackle (1).jpg][IMG:high-tackle (2).jpg][IMG:high-tackle (3).jpg]");
        if (checkText.includes("タックルボックス") || checkText.includes("オフザゲート") || checkText.includes("サイドエントリー")) {
            imageTags.push("[IMG:tackle-box (1).jpg][IMG:tackle-box (2).jpg][IMG:tackle-box (3).jpg][IMG:tackle-box (4).jpg]");
        }
        if (checkText.includes("タックル")) imageTags.push("[IMG:takcle.jpg]");
        if (checkText.includes("リリース")) imageTags.push("[IMG:release.jpg]");

        // --- ⑤ スチール（ジャッカル） ---
        if (checkText.includes("スチール") || checkText.includes("ジャッカル")) {
            imageTags.push("[IMG:steal (1).jpg]");
            if (checkText.includes("ノットリリース")) imageTags.push("[IMG:steal (2).jpg]");
            if (checkText.includes("奪い取る") || checkText.includes("ターンオーバー")) imageTags.push("[IMG:steal (3).jpg]");
        }

        // --- ⑥ 反則（ペナルティ関連） ---
        if (checkText.includes("ノックフォワード") || checkText.includes("ノックオン") || checkText.includes("KF")) imageTags.push("[IMG:knock-forward-01.jpg]");
        if (checkText.includes("スローフォワード") || checkText.includes("SF")) imageTags.push("[IMG:throw-forward-01.jpg]");
        if (checkText.includes("アクシデンタルオフサイド")) imageTags.push("[IMG:Accidental offside.jpg]");
        if (checkText.includes("ノットロールアウェイ") || checkText.includes("どかない")) {
            imageTags.push("[IMG:not roll-away (1).jpg][IMG:not roll-away (2).jpg][IMG:not roll-away (3).jpg][IMG:not roll-away (4).jpg]");
        }
        if (checkText.includes("オフサイド") && checkText.includes("ラック")) {
            imageTags.push("[IMG:ruck-offside (1).jpg][IMG:ruck-offside (2).jpg][IMG:ruck-offside (3).jpg]");
        }
        if (checkText.includes("オブストラクション")) {
            if (checkText.includes("ラインアウト")) imageTags.push("[IMG:lineout_Obstruction.jpg]");
            else imageTags.push("[IMG:Obstruction.jpg]");
        }

        // --- ⑦ ペナルティの再開オプション ---
        if (question.includes("ペナルティキックの") || checkText.includes("PKの")) {
            if (checkText.includes("オプション") || checkText.includes("選択") || checkText.includes("再開")) {
                imageTags.push("[IMG:penaltykick-option (1).jpg][IMG:penaltykick-option (2).jpg][IMG:penaltykick-option (3).jpg][IMG:penaltykick-option (4).jpg]");
            }
            if (checkText.includes("キック")) imageTags.push("[IMG:penaltykick-option (1).jpg]");
            if (checkText.includes("スクラム")) imageTags.push("[IMG:penaltykick-option (2).jpg]");
            if (checkText.includes("クイックスタート")) imageTags.push("[IMG:penaltykick-option (3).jpg]");
            if (checkText.includes("ペナルティゴール")) imageTags.push("[IMG:penaltykick-option (4).jpg]");
        }

        // --- ⑧ キック・陣地 ---
        if (checkText.includes("キック")) {
            if (checkText.includes("理由") || checkText.includes("なぜ")) {
                imageTags.push("[IMG:kick-01.jpg][IMG:kick-02.jpg]");
            }
            if (checkText.includes("出し方") || checkText.includes("場所")) {
                imageTags.push("[IMG:22m in.jpg][IMG:22m out (1).jpg][IMG:22m out (2).jpg][IMG:50 22.jpg]");
            }
            if (checkText.includes("22m") || checkText.includes("22メートル")) {
                if (checkText.includes("内側")) imageTags.push("[IMG:22m in.jpg]");
                if (checkText.includes("ダイレクト") || checkText.includes("ノーバウンド")) imageTags.push("[IMG:22m out (1).jpg]");
                if (checkText.includes("ワンバウンド") || checkText.includes("間接")) imageTags.push("[IMG:22m out (2).jpg]");
            }
        }
        if (checkText.includes("50-22") || checkText.includes("50 22") || checkText.includes("フィフティ")) imageTags.push("[IMG:50 22.jpg]");

        // --- ⑨ ドロップアウト ---
        if (checkText.includes("ドロップアウト")) {
            if (checkText.includes("22m") || checkText.includes("22メートル")|| checkText.includes("二十二")) {
                imageTags.push("[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg][IMG:goal-dead (2).jpg][IMG:goal-dead (3).jpg]");
            }
            if (checkText.includes("トライライン")) {
                imageTags.push("[IMG:knock-forward in the try area.jpg][IMG:held up.jpg][IMG:touchdown (1).jpg][IMG:touchdown (2).jpg][IMG:defensive dead (1).jpg][IMG:defensive dead (2).jpg][IMG:ball-dead (1).jpg][IMG:ball-dead (2).jpg]");
            }
        }

        // --- ⑩ アドバンテージ ---
        if (checkText.includes("アドバンテージ") || checkText.includes("AD")) {
            imageTags.push("[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg][IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg][IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
        }

        // --- ⑪ マーク・フェアキャッチ ---
        if (checkText.includes("フェアキャッチ") || checkText.includes("マーク")) {
            imageTags.push("[IMG:mark (1).jpg][IMG:mark (2).jpg][IMG:mark (3).jpg][IMG:mark (4).jpg]");
        }

        // --- ⑫ レフリーのシグナル ---
        if (checkText.includes("シグナル") || checkText.includes("ジェスチャー")) {
            if (checkText.includes("反則")) {
                imageTags.push("[IMG:signal (5).jpg][IMG:signal (6).jpg][IMG:signal (7).jpg][IMG:signal (8).jpg]");
            } else {
                imageTags.push("[IMG:signal (1).jpg][IMG:signal (2).jpg][IMG:signal (3).jpg][IMG:signal (4).jpg]");
            }
        }

        // ========== ★最終的な画像の合体と重複削除処理 ==========
        if (imageTags.length > 0) {
            let allTagsString = imageTags.join(""); 
            const uniqueTags = [];
            
            allTagsString = allTagsString.replace(/\[IMG:[^\]]+\]/g, (match) => {
                if (!uniqueTags.includes(match)) {
                    uniqueTags.push(match);
                    return match;
                }
                return ""; 
            });

            answer += "\n\n参考画像はこちら↓\n" + uniqueTags.join("");
        } // 【修正箇所2】ここが閉じていなかったため、これより下の処理がすべて止まってしまっていました。

        // --- 5. GASへの保存処理（非同期リトライ機能付き） ---
        const saveToGAS = async (data, retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const res = await fetch(GAS_URL, {
                        method: "POST",
                        body: JSON.stringify(data)
                    });
                    const text = await res.text();
                    JSON.parse(text); 
                    return; 
                } catch (err) {
                    console.log(`GAS混雑中。3秒後にリトライします...（残り${retries - i - 1}回）`);
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            console.error("GASの混雑が解消されなかったため、保存をスキップしました。");
        };

        saveToGAS({
            action: "save",
            userId: userId,
            month: currentMonth,
            user: question,
            ai: answer
        });

        res.json({ answer: answer, remaining: MONTHLY_LIMIT - (count + 1) });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AIの処理中にエラーが発生しました。" });
    }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});