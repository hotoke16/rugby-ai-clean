import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
<<<<<<< HEAD
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from 'url';
import fetch from "node-fetch"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ★GASの最新のウェブアプリURL
const GAS_URL = "https://script.google.com/macros/s/AKfycbyTTXhAUUk5UXAanUdcY_E6vswJ2yIMXnWe7tm0ca6QFK5fHpmOu1nG4AMnjUGco1NqqA/exec";
=======
import OpenAI from "openai";
import path from "path"; // 新たにpathモジュールを追加 (フロントエンドの提供に便利)
import { fileURLToPath } from 'url'; // 新たにURLユーティリティを追加

// __dirname, __filename のエミュレート (ES Modules環境での標準的な手法)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();
>>>>>>> 465b6e0336712385a0221c6424c88499693e6c72

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
<<<<<<< HEAD
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
    let { question, userId } = req.body;

    question = question.replace(/蹴る/g, "キックする").replace(/蹴った/g, "キックした").replace(/蹴って/g, "キックして").replace(/蹴られた/g, "キックされた").replace(/ける/g, "キックする").replace(/けった/g, "キックした").replace(/けって/g, "キックして").replace(/けられた/g, "キックされた");

    const now = new Date();
    const currentMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {

        // --- 2. 質問からキーワードを判定し、必要なテキストだけを選ぶ ---
        let knowledgeList = [];

        if (question.includes("タックル") || question.includes("ラック") || question.includes("モール") || question.includes("倒れ") || question.includes("ジャッカル") || question.includes("スチール") || question.includes("ヒット") || question.includes("ノットロ") || question.includes("ノットリ") || question.includes("サイド") || question.includes("オフザ")) {
            knowledgeList.push(textBreakdown);
        }
        if (question.includes("スクラム") || question.includes("ラインアウト") || question.includes("タッチ") || question.includes("スローイン") || question.includes("投入") || question.includes("SC") || question.includes("LO")) {
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

        const needsAll = question.includes("すべて") || question.includes("全て") || question.includes("全部") || question.includes("詳しく");
        // ★ユーザーが「条件（どうなったらなるか）」を聞いているかを判定するフラグ
        const asksSituation = question.includes("になる") || question.includes("条件") || question.includes("再開") || question.includes("スタート") || question.includes("開始");
        const askingDetails = question.includes("とは") || question.includes("について") || question.includes("教えて") || question.includes("何");

        const isCommonFouls = question.includes("よくある反則") || question.includes("主な反則") || question.includes("代表的な反則");
        
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
        if (question.includes("得点") || question.includes("点数") || question.includes("何点") || question.includes("スコア")) {
            imageTags.push("[IMG:score.jpg]");
        }

        // --- ③ セットプレー ---
        if (question.includes("セットプレー") || question.includes("試合再開方法")|| question.includes("試合の再開方法")){
            imageTags.push("[IMG:setplay-01.jpg][IMG:setplay-02.jpg][IMG:setplay-03.jpg]");
        }

        if (isCommonFouls) {
        // まとめ用の画像セットだけをドカンと出す
            imageTags.push("[IMG:knock-forward-01.jpg][IMG:throw-forward-01.jpg][IMG:dangerous-tackle-02.jpg][IMG:release.jpg][IMG:dangerous-tackle-02.jpg][IMG:ruck-offside (2).jpg]"); 
        }

        // --- 〇 ラック ---
        
        // パターン1：ユーザーが「ラック」という単語を知っていて質問してきた場合
        const hasRuckWord = question.includes("ラック");
        const knowsRuck = hasRuckWord && askingDetails;
        
        // パターン2：初心者が単語を知らずに「状況」で質問してきた場合
        const hasRuckSituation = question.includes("タックル") || question.includes("組") || question.includes("密集") || question.includes("倒れ") || question.includes("たおれ");
        const askingRuckSituation = hasRuckSituation && askingDetails;

        if (knowsRuck) {
            // 「ラックについて教えて」「ラックとは？」と聞かれたら画像を出力
            imageTags.push("[IMG:ruck (1).jpg][IMG:ruck (2).jpg][IMG:ruck (3).jpg][IMG:ruck (4).jpg]"); // ※画像ファイル名は実際のラックの画像に合わせてください
            
        } else if (askingRuckSituation && answer.includes("ラック")) {
            // 「タックル後の組み合いについて教えて」と聞かれ、AIの解説に「ラック」が含まれていたら出力
            imageTags.push("[IMG:ruck (1).jpg][IMG:ruck (2).jpg][IMG:ruck (3).jpg][IMG:ruck (4).jpg]");
        }

        // --- ④ タックル・コンタクト ---
        if (checkText.includes("スピア") || checkText.includes("ショルダーチャージ") || checkText.includes("ノーバインド")) {
            imageTags.push("[IMG:dangerous-tackle-01.jpg]");
        }
        if (checkText.includes("空中") && checkText.includes("タックル")) imageTags.push("[IMG:dangerous-tackle-02.jpg]");
        if (checkText.includes("ノーボールタックル")) imageTags.push("[IMG:dangerous-tackle-03.jpg]");
        if (!isCommonFouls && checkText.includes("ハイタックル")) {
            imageTags.push("[IMG:high-tackle (1).jpg][IMG:high-tackle (2).jpg][IMG:high-tackle (3).jpg]");
        }
        if (checkText.includes("タックルボックス") || checkText.includes("オフザゲート") || checkText.includes("サイドエントリー")) {
            imageTags.push("[IMG:tackle-box (1).jpg][IMG:tackle-box (2).jpg][IMG:tackle-box (3).jpg][IMG:tackle-box (4).jpg]");
        }
        if (!isCommonFouls && checkText.includes("ノットリリース")) {
            imageTags.push("[IMG:release.jpg]");
        }

        // --- ⑤ スチール（ジャッカル） ---
        if (checkText.includes("スチール") || checkText.includes("ジャッカル") || checkText.includes("ノットリリース") || checkText.includes("奪い取る")) {
            imageTags.push("[IMG:steal (1).jpg][IMG:steal (2).jpg][IMG:steal (3).jpg]");
        }
        
        // --- ⑬ タックル成立とホールディング ---

        // 1. 【ホールディング】に関するキーワード
        const hasHoldingWord = question.includes("ホールディング") || question.includes("スチール");
        const hasHoldingAction = question.includes("さない") || question.includes("み続") || question.includes("みつづ");
        
        // 2. 【タックル成立・不成立（パイルアップ等）】に関するキーワード
        const hasTackleSuccessWord = question.includes("成立") || question.includes("地面に倒") || question.includes("片膝") || question.includes("横たわる") || question.includes("腰を下ろす") || question.includes("他の選手の上");
        const hasUnplayableAction = checkText.includes("パイルアップ") || checkText.includes("アンプレアブル") || checkText.includes("かかえこみ") || checkText.includes("抱え込み") || checkText.includes("あえて倒さず");

        // ★ストッパー：上記のキーワードが入っているか、または純粋に「タックルとは？」と聞いている場合
        const isTackleOrHolding = hasHoldingWord || hasHoldingAction || hasTackleSuccessWord || hasUnplayableAction || (question.includes("タックル") && askingDetails);

        if (!isCommonFouls && isTackleOrHolding) {
            
            // ▼ ホールディングの判定（反則）
            if (hasHoldingWord || (hasHoldingAction && (answer.includes("ホールディング") || answer.includes("反則")))) {
                // スチール失敗や、タックル後に離さなかった場合
                imageTags.push("[IMG:holding (1).jpg][IMG:holding (2).jpg][IMG:holding (3).jpg]");
                
            } 
            // ▼ タックル成立・不成立の判定（定義・戦術）
            else if (hasTackleSuccessWord || hasUnplayableAction || (question.includes("タックル") && answer.includes("成立"))) {
                // タックルが成立する条件（片膝など）や、あえて倒さないパイルアップ等の場合
                if (hasUnplayableAction) {
                    imageTags.push("[IMG:successful tackle (1).jpg][IMG:successful tackle (2).jpg][IMG:successful tackle (3).jpg][IMG:successful tackle (4).jpg]");
                } else {
                    imageTags.push("[IMG:successful tackle (2).jpg][IMG:successful tackle (4).jpg]");
                }
            }
        }


        // --- ⑥ 反則（ペナルティ関連） ---

        // --- 〇 ノックフォワード（ノックオン） ---
        
        // パターン1：ユーザーがノックオンを「メインの話題」として質問してきた場合
        // ① ノックオン関連の単語が入っているか
        const hasKnockOnWord = question.includes("ノックフォワード") || question.includes("ノックオン") || question.includes("ノッコン") || (question.includes("前") && question.includes("落とす"));
        // ② メインで聞いているサイン（とは、について、教えて、何）があるか

        // ①があり、かつ②がある場合、または③の場合にフラグを立てる
        const knowsKnockOn = (hasKnockOnWord && askingDetails);
        
        // パターン2：初心者が単語を知らずに動作で質問してきた場合
        const hasTarget = question.includes("前") || question.includes("ボール");
        const hasAction = question.includes("落とす") || question.includes("こぼす") || question.includes("おとす");
        const askingDrop = hasTarget && hasAction;

        if (knowsKnockOn) {
            // メインの話題として聞かれたら画像を出力
            imageTags.push("[IMG:knock-forward-01.jpg]");
            
        } else if (askingDrop && (answer.includes("ノックフォワード") || answer.includes("ノックオン"))) {
            // 動作で質問され、かつAIの回答に「ノックフォワード/ノックオン」が含まれていれば出力
            imageTags.push("[IMG:knock-forward-01.jpg]");
        }
        // --- 〇 スローフォワード） ---
        
        const hasSlowForward = question.includes("スローフォワード");
        // ② メインで聞いているサイン（とは、について、教えて、何）があるか

        // ①があり、かつ②がある場合、または③の場合にフラグを立てる
        const knowsSlowForward = (hasSlowForward && askingDetails);
        
        // パターン2：初心者が単語を知らずに動作で質問してきた場合
        const hasSlowAction = question.includes("投げる") || question.includes("なげる") || question.includes("放る") || question.includes("ほうる") || question.includes("パス");
        const askingSlow = hasTarget && hasSlowAction;

        if (knowsSlowForward) {
            // メインの話題として聞かれたら画像を出力
            imageTags.push("[IMG:throw-forward-01.jpg]");
            
        } else if (askingSlow && answer.includes("スローフォワード")) {
            imageTags.push("[IMG:throw-forward-01.jpg]");
        }
        
        if (checkText.includes("アクシデンタルオフサイド")) imageTags.push("[IMG:Accidental offside.jpg]");
        if (checkText.includes("ノットロールアウェイ") || checkText.includes("どかない")) {
            imageTags.push("[IMG:not roll-away (1).jpg][IMG:not roll-away (2).jpg][IMG:not roll-away (3).jpg][IMG:not roll-away (4).jpg]");
        }
        if (question.includes("オフサイド") && checkText.includes("ラック")) {
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
        if (checkText.includes("キック") || checkText.includes("ける") || checkText.includes("蹴る") || checkText.includes("蹴った") || checkText.includes("けった")) {
            if (question.includes("理由") || question.includes("なぜ")) {
                imageTags.push("[IMG:kick-01.jpg][IMG:kick-02.jpg]");
            }
            if (question.includes("出し方") || question.includes("場所")) {
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

            // まず、質問に「22m」や「トライライン」と具体的に指定されているかを最優先でチェックする
            if (question.includes("22m") || question.includes("22メートル") || question.includes("二十二")) {
                if (needsAll) {
                    imageTags.push("[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg][IMG:goal-dead (2).jpg][IMG:goal-dead (3).jpg]");
                } else {
                    imageTags.push("[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg]");
                }
            } 
            else if (question.includes("トライライン") || question.includes("ゴールライン")) {
                if (needsAll) {
                    imageTags.push("[IMG:knock-forward in the try area.jpg][IMG:held up.jpg][IMG:touchdown (1).jpg][IMG:touchdown (2).jpg][IMG:defensive dead (1).jpg][IMG:defensive dead (2).jpg][IMG:ball-dead (1).jpg][IMG:ball-dead (2).jpg]");
                } else {
                    imageTags.push("[IMG:held up.jpg][IMG:knock-forward in the try area.jpg]");
                }
            } 
            // 種類が指定されず、単に「ドロップアウト」とだけ聞かれた場合
            else {
                if (needsAll) {
                    imageTags.push("[IMG:dead-kick (2).jpg][IMG:goal-dead (1).jpg][IMG:goal-dead (2).jpg][IMG:goal-dead (3).jpg][IMG:knock-forward in the try area.jpg][IMG:held up.jpg][IMG:touchdown (1).jpg][IMG:touchdown (2).jpg][IMG:defensive dead (1).jpg][IMG:defensive dead (2).jpg][IMG:ball-dead (1).jpg][IMG:ball-dead (2).jpg]");
                } else if(asksSituation) {
                    // 「どうなったらなる？」と全般的な条件を聞かれた場合は、両方の代表を出す
                    imageTags.push("[IMG:dead-kick (2).jpg][IMG:held up.jpg]");
                }
                else {
                    // 「ドロップアウトとは？」と概要を聞かれた場合は、新しい概要用画像2枚を出す
                    imageTags.push("[IMG:22m drop-out.jpg][IMG:tl drop-out.jpg]");
                }
            }
        }

        // --- 〇 アドバンテージ ---
        
        // 1. アドバンテージという単語が入っているか
        const hasAdvWord = question.includes("アドバンテージ") || question.includes("AD");
        
        // 2. メインで聞いているサイン（askingDetailsを流用しつつ、「違い」「種類」「範囲」を追加）
        const askingAdvDetails = askingDetails || question.includes("違い") || question.includes("種類") || question.includes("範囲") || question.includes("適用");
        
        // 3. 初心者が「状況」で聞いているサイン
        const askingAdvSituation = question.includes("まらない") || question.includes("続く") || question.includes("つづく") || question.includes("継続") || (question.includes("笛") && (question.includes("らない") || question.includes("かない")));
        // ★誤爆ストッパー：質問で明確にアドバンテージを聞いている時だけ処理を走らせる
        // （これにより、AIの回答にたまたまアドバンテージが入っただけの時は完全にスルーされます）
        if (!isCommonFouls && ((hasAdvWord && askingAdvDetails) || (askingAdvSituation && answer.includes("アドバンテージ")))) {
            
            // ユーザーが何の種類について聞いているかを判定
            const hasPenalty = question.includes("ペナルティ") || question.includes("PK");
            const askingDifference = question.includes("違い") || question.includes("範囲") || question.includes("適用");

            if (askingDifference || (hasKnockOnWord && hasPenalty)) {
                // 【違い・適用範囲】両方の単語がある、または「違い」を聞かれた場合
                imageTags.push("[IMG:advantage (4).jpg][IMG:advantage (6).jpg][IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
                
            } else if (hasKnockOnWord) {
                // 【ノックオンアドバンテージ】
                imageTags.push("[IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg]");
                
            } else if (hasPenalty) {
                // 【ペナルティアドバンテージ】
                imageTags.push("[IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
                
            } else {
                // 【初歩的・概要】（とは？、笛が鳴らない等）
                if (needsAll) {
                    // もし「すべて教えて」と言われた場合は8枚フルセット
                    imageTags.push("[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg][IMG:advantage (4).jpg][IMG:advantage (5).jpg][IMG:advantage (6).jpg][IMG:advantage (7).jpg][IMG:advantage (8).jpg]");
                } else {
                    // 通常の概要確認
                    imageTags.push("[IMG:advantage (1).jpg][IMG:advantage (2).jpg][IMG:advantage (3).jpg]");
                }
            }
        }

        // --- ⑪ マーク・フェアキャッチ ---      
        // パターン1：用語を知っている場合
        const hasFairCatchWord = question.includes("フェアキャッチ");
        const isNotOtherMark = !question.includes("オブタッチ") && !question.includes("ポイントマーク") && !question.includes("マークする") && !question.includes("マークを外す");
        const hasMarkWord = question.includes("マーク") && isNotOtherMark;
        
        const knowsFairCatch = (hasFairCatchWord || hasMarkWord) && askingDetails;

        // パターン2：初心者が「動作や状況」で質問してきた場合
        const hasCatch = question.includes("キャッチ") || question.includes("捕る") || question.includes("とる");
        const hasMarkAction = question.includes("声") || question.includes("手") || question.includes("叫ぶ") || question.includes("さけぶ");
        
        const askingFairCatchSituation = hasCatch && hasMarkAction; // 「キャッチ」＋「声・手・ノーバウンド」など

        // 判定
        if (knowsFairCatch) {
            // 用語ズバリで聞かれたら画像を出力
            imageTags.push("[IMG:mark (1).jpg][IMG:mark (2).jpg][IMG:mark (3).jpg][IMG:mark (4).jpg]");
            
        } else if (askingFairCatchSituation && (answer.includes("フェアキャッチ") || answer.includes("マーク"))) {
            // 動作で質問され、かつAIの回答に「フェアキャッチ」か「マーク」が含まれていれば出力
            imageTags.push("[IMG:mark (1).jpg][IMG:mark (2).jpg][IMG:mark (3).jpg][IMG:mark (4).jpg]");
        }

        // --- ⑫ レフリーのシグナル ---
        if (question.includes("シグナル") || question.includes("ジェスチャー") || question.includes("レフリーの動き") || question.includes("審判の動き") || question.includes("ゼスチャー")) {
            if (question.includes("反則")) {
                imageTags.push("[IMG:signal (5).jpg][IMG:signal (6).jpg][IMG:signal (7).jpg][IMG:signal (8).jpg]");
            } else {
                imageTags.push("[IMG:signal (1).jpg][IMG:signal (2).jpg][IMG:signal (3).jpg][IMG:signal (4).jpg]");
            }
        }

        // --- ⑫ 立平面（タッチライン上の空中） ---
        
        // 大前提：立平面やタッチライン際の空中に関する質問かどうか
        const hasPlaneWord = question.includes("立平面") || question.includes("空中") || question.includes("外に出る") || question.includes("出たボール");
        const askingAboutTouch = question.includes("タッチ") || question.includes("ダイレクト");

        // ★ストッパー：質問に立平面関連の言葉があるか、AIの回答に「立平面」が含まれている時だけ起動
        if (hasPlaneWord || askingAboutTouch || answer.includes("立平面")) {
            
            // 【動作の判定】
            const isCatch = question.includes("キャッチ") || question.includes("捕る") || question.includes("とる");
            const isTapOrKick = question.includes("タップ") || question.includes("キック") || question.includes("はじく") || question.includes("叩く") || question.includes("はたく");
            
            // 【状況・位置の判定】
            const isJump = question.includes("ジャンプ") || question.includes("跳ぶ") || question.includes("とぶ") || question.includes("飛ぶ");
            const isOutside = question.includes("外") || question.includes("出ている") || question.includes("越えている") || question.includes("超えている");
            const isInside = question.includes("内側") || question.includes("中") || question.includes("着地");

            if (isCatch) {
                // 〇 【キャッチした場合】の出し分け
                
                // ★追加：「どこに着地したか」をピンポイントで判定する最強の条件
                const isLandedInside = question.includes("内側に着地") || question.includes("内側で着地") || question.includes("中に着地");
                const isLandedOutside = question.includes("外側に着地") || question.includes("外側で着地") || question.includes("外に着地");

                // ▼ 判定を「最強の条件」から順番に行うように並び替え
                if (isLandedInside) {
                    // ① 何が起きても「内側に着地」したなら優先してコレを出す！
                    imageTags.push("[IMG:catch-in(1).jpg][IMG:catch-in(2).jpg]");
                    
                } else if (isLandedOutside) {
                    // ② 明確に「外側に着地」したならコレ！
                    imageTags.push("[IMG:catch-out.jpg][IMG:catch-out-in(1).jpg][IMG:catch-out-in(2).jpg][IMG:catch-out-out.jpg]");
                    
                } else if (isOutside) {
                    // ③ 着地場所は書いてないが、「外」「超えている」という言葉がある場合
                    imageTags.push("[IMG:catch-out.jpg][IMG:catch-out-in(1).jpg][IMG:catch-out-in(2).jpg][IMG:catch-out-out.jpg]");
                    
                } else if (isInside) {
                    // ④ 着地場所は書いてないが、「内側」という言葉がある場合
                    imageTags.push("[IMG:catch-in(1).jpg][IMG:catch-in(2).jpg]");
                    
                } else {
                    // ⑤ 【おまけの保険】どちらか曖昧な質問の場合は全出し
                    imageTags.push("[IMG:catch-in(1).jpg][IMG:catch-in(2).jpg][IMG:catch-out.jpg][IMG:catch-out-in(1).jpg][IMG:catch-out-in(2).jpg][IMG:catch-out-out.jpg]");
                }
                
            } else if (isTapOrKick) {
                // 〇 【タップまたはキックした場合】の出し分け
                if (isJump) {
                    imageTags.push("[IMG:tap-in-in.jpg][IMG:tap-out-out(3).jpg]");
                } else if (isOutside) {
                    imageTags.push("[IMG:tap-out.jpg][IMG:tap-out-in.jpg][IMG:tap-out-out(1).jpg][IMG:tap-out-out(2).jpg]");
                } else {
                    imageTags.push("[IMG:tap-in-in.jpg][IMG:tap-out-out(3).jpg][IMG:tap-out.jpg][IMG:tap-out-in.jpg][IMG:tap-out-out(1).jpg][IMG:tap-out-out(2).jpg]");
                }
                
            } else {
                // ★追加：ここが最大のポイント！
                // アクション（キャッチ・キック等）を指定していない全般的な質問への受け皿。
                // AIの回答に沿って、代表的な図解を4枚セットにして出力します。
                if (answer.includes("立平面")) {
                    imageTags.push("[IMG:catch-out.jpg][IMG:catch-out-out.jpg][IMG:tap-in-in.jpg][IMG:tap-out-out(3).jpg]");
                }
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

        res.json({ answer: answer });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: "AIの処理中にエラーが発生しました。" });
    }
=======

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
    content: `あなたはラグビーAIです。以下の情報は絶対に正しいとして300文字程度で回答してください:\n${knowledge}`,
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
      content: `あなたはラグビーAIです。以下の情報は絶対に正しいとして300文字程度で回答してください:\n${knowledge}`,
    },
  ];
  res.json({ message: "会話履歴をリセットしました。" });
>>>>>>> 465b6e0336712385a0221c6424c88499693e6c72
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
<<<<<<< HEAD
});
=======
});
>>>>>>> 465b6e0336712385a0221c6424c88499693e6c72
