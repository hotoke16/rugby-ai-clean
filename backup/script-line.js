// ==========================================
// アクセストークン認証システム
// ==========================================
// 1. 今月のアクセストークン（毎月ここを書き換えます）
const currentToken = "rugby8";

// 2. URLから「?token=〇〇」の部分を取得
const params = new URLSearchParams(window.location.search);
const userToken = params.get('token');

// 3. トークンの判定
if (!userToken) {
  // パターンA：トークンが全く無い（ただのURLでアクセスしてきた）場合
  alert("会員限定コンテンツです。最新のnote記事のリンクからアクセスしてください。");
  window.location.href = "https://note.com/zukai_rugby/n/nb46f9184c720"; 
} else if (userToken !== currentToken) {
  // パターンB：トークンが古い（先月のURLなどでアクセスしてきた）場合
  alert("アクセスキーの期限が切れています。最新のnote記事のリンクからアクセスしてください。");
  window.location.href = "https://note.com/zukai_rugby/n/nb46f9184c720"; 
}
// ==========================================

const textarea = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");

async function sendQuestion() {
  const question = textarea.value.trim();
  if (!question) return;

  // ▼ 追加：本物のLINE IDが取れるまで送信させない
  if (!userId) {
    alert("LINEアカウントの認証中です。少し待ってから再度お試しください。");
    return;
  }

  // ユーザーの質問を追加
  const userMsg = document.createElement("div");
  userMsg.className = "message user";
  userMsg.textContent = question;
  chat.appendChild(userMsg);

  textarea.value = "";

  // AIメッセージ枠を作成（ローディング状態）
  const aiMsg = document.createElement("div");
  aiMsg.className = "message ai loading";
  
  // ローディングアニメーション用のドット
  const dot1 = document.createElement("span");
  dot1.className = "loading-dot";
  const dot2 = document.createElement("span");
  dot2.className = "loading-dot";
  const dot3 = document.createElement("span");
  dot3.className = "loading-dot";
  
  aiMsg.appendChild(dot1);
  aiMsg.appendChild(dot2);
  aiMsg.appendChild(dot3);
  
  chat.appendChild(aiMsg);

  // 送信直後にスクロール
  scrollToBottom();

  // サーバーに送信
  try {
    const res = await fetch("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        question: question,
        userId: userId // ★重要：ここを currentUserId から userId に変更！
      })
    });
    const data = await res.json();
    
    // ・・・（この下は元のコードのままでOKです）・・・

// ローディングクラスを削除して内容をクリア
    aiMsg.classList.remove("loading");
    aiMsg.textContent = "";

    // ★修正: AIの返答から複数の画像タグを「すべて」抽出する
    const rawText = data.answer || data.error;
    const imgRegex = /\[IMG:\s*([^\]]+?)\s*\]/g;
    
    // 見つかったすべてのファイル名を格納する配列（箱）
    const imageFileNames = [];
    let match;
    // タグが見つかる限り、繰り返し配列に追加する
    while ((match = imgRegex.exec(rawText)) !== null) {
      imageFileNames.push(match[1].trim());
    }
    
    // 文章中から [IMG:***] の部分をすべて削除
    const cleanText = rawText.replace(imgRegex, "").trim();

    // タイピングアニメーションで表示（画像ファイル名の「配列」を渡す）
    typeWriter(aiMsg, cleanText, 0, imageFileNames);
  } catch (err) {
    aiMsg.classList.remove("loading");
    aiMsg.textContent = "";
    typeWriter(aiMsg, "サーバーに接続できませんでした。");
  }
}

// Enterキーで送信（Shift+Enterで改行）
textarea.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

sendBtn.addEventListener("click", sendQuestion);

// 常に一番下までスクロール
function scrollToBottom() {
  const chatEnd = document.getElementById("chatEnd");
  chatEnd.scrollIntoView({ behavior: "auto" });
}

// ==== typeWriter() 関数を以下のようにまるごと差し替えます ====
// タイピング風に表示（改行対応あり）
// 第4引数に画像ファイル名を受け取るように変更
function typeWriter(element, text, i = 0, imageFileNames = []) {
  if (i < text.length) {
    const char = text.charAt(i);

    if (char === "\n") {
      element.innerHTML += "<br>";
    } else {
      element.innerHTML += char;
    }

    setTimeout(() => typeWriter(element, text, i + 1, imageFileNames), 30);
  } else {
    // ★修正: タイピングが全て終わった後に、画像があればコンテナに入れて追加する
    if (imageFileNames && imageFileNames.length > 0) {
      
      // ▼ 新規：画像をまとめる箱（コンテナ）を作成
      const imgContainer = document.createElement("div");
      imgContainer.className = "chat-image-container";
      
      imageFileNames.forEach(fileName => {
        const img = document.createElement("img");
        img.src = `./image/${fileName}`; 
        img.className = "chat-image";
        img.alt = "図解";
        
        // 画像が読み込まれるたびに一番下までスクロールさせる
        img.onload = () => scrollToBottom();
        
        // コンテナの中に画像を追加
        imgContainer.appendChild(img);
      });
      
      // メッセージの最後にコンテナごと追加
      element.appendChild(document.createElement("br"));
      element.appendChild(imgContainer);
    }
  }
}

// ==========================================
// ★ 会話の保存・呼び出し機能（タイトル抽出・スクロール版） ★
// ==========================================
const saveBtn = document.getElementById("save-btn");
const historyContainer = document.getElementById("history-container");

// 1. 起動時にローカルストレージから履歴を読み込む
let savedChats = JSON.parse(localStorage.getItem("rugbyAI_savedChats")) || [];

// ※過去のデータ（文字列だけの状態）があれば、タイトル付きの形式に自動変換する
savedChats = savedChats.map(chat => {
  if (typeof chat === "string") {
    return { title: "保存された会話", html: chat };
  }
  return chat;
});

// 2. 履歴ボタンを作る処理
function renderHistoryButtons() {
  historyContainer.innerHTML = ""; // 一旦リセット

  // 新規作成用の「＋ 新しい会話」ボタン
  const newBtn = document.createElement("button");
  newBtn.className = "history-new-btn";
  newBtn.innerText = "＋ 新しい会話";
  newBtn.onclick = () => { chat.innerHTML = ""; };
  historyContainer.appendChild(newBtn);

  // 保存された会話の数だけボタンを作る
  savedChats.forEach((chatData, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item-wrapper";

    // キーワード（タイトル）が表示されるボタン
    const btn = document.createElement("button");
    btn.className = "history-item-btn";
    btn.innerText = chatData.title; // ここで抽出したタイトルを表示
    btn.title = chatData.title; // マウスを乗せた時に全文ツールチップを出す
    btn.onclick = () => {
      chat.innerHTML = chatData.html;
      scrollToBottom();
    };
    
    // ×（削除）ボタン
    const delBtn = document.createElement("button");
    delBtn.className = "delete-history-btn";
    delBtn.innerText = "×";
    delBtn.onclick = () => {
      if (confirm(`「${chatData.title}」を削除しますか？`)) {
        savedChats.splice(index, 1); 
        localStorage.setItem("rugbyAI_savedChats", JSON.stringify(savedChats));
        renderHistoryButtons(); 
        chat.innerHTML = ""; 
      }
    };
    
    wrapper.appendChild(btn);
    wrapper.appendChild(delBtn);
    historyContainer.appendChild(wrapper);
  });
}

// 3. 画面読み込み時に描画
renderHistoryButtons();

// 4. 保存ボタンを押したときの処理
saveBtn.addEventListener("click", () => {
  const currentChatHtml = chat.innerHTML.trim();
  
  if (currentChatHtml === "") {
    alert("保存する会話がありません。");
    return;
  }

  // ★ ユーザーの「最初の質問」からタイトルを抽出する処理
  let chatTitle = "無題の会話";
  // チャット内の最初の「ユーザーの発言要素」を探す
  const firstUserMsg = chat.querySelector(".message.user");
  
  if (firstUserMsg) {
    const text = firstUserMsg.textContent.trim();
    // タイトルが長すぎる場合は、最初の12文字＋「...」にする
    chatTitle = text.length > 12 ? text.substring(0, 12) + "..." : text;
  }

  // タイトルとHTMLをセットにして保存
  const newChatData = {
    title: chatTitle,
    html: currentChatHtml
  };

  savedChats.push(newChatData);
  localStorage.setItem("rugbyAI_savedChats", JSON.stringify(savedChats));

  // 画面をリセットして再描画
  chat.innerHTML = "";
  renderHistoryButtons();
});

// ==========================================
// ★ 履歴サイドバーの開閉アクション ★
// ==========================================
const historyToggleBtn = document.getElementById("history-toggle-btn");
historyToggleBtn.addEventListener("click", () => {
  // historyContainer に "open" クラスを付け外しする
  historyContainer.classList.toggle("open");
});

// ↓ファイルの末尾などに追加↓

// ==========================================
// スマホ用画像ビューワー ＆ スワイプ処理
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const viewer = document.getElementById("image-viewer");
    const viewerImg = document.getElementById("viewer-img");
    const closeBtn = document.getElementById("viewer-close-btn");
    const chatContainer = document.getElementById("chat-container");

    let currentImageGroup = [];
    let currentImageIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    // 閉じるボタン
    closeBtn.addEventListener("click", () => {
        viewer.classList.remove("image-viewer-visible");
        viewer.classList.add("image-viewer-hidden");
        
        if (window.innerWidth <= 768) {
            document.body.style.paddingBottom = "0";
            if(chatContainer) chatContainer.style.paddingBottom = "0";
        }
    });

    // 画像タップ時
    document.body.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG" && e.target.className.includes("chat-image")) {
            // タップされた画像と同じグループ（コンテナ内）の画像をすべて取得
            const container = e.target.closest('.chat-image-container');
            if (container) {
                currentImageGroup = Array.from(container.querySelectorAll('img'));
                currentImageIndex = currentImageGroup.indexOf(e.target);
            } else {
                currentImageGroup = [e.target];
                currentImageIndex = 0;
            }

            viewerImg.src = e.target.src;
            viewerImg.style.opacity = 1;
            viewer.classList.remove("image-viewer-hidden");
            viewer.classList.add("image-viewer-visible");

            // スマホの場合のみ、上半分でテキストをスクロールできるよう下半分に余白を作る
            if (window.innerWidth <= 768) {
                document.body.style.paddingBottom = "50vh";
                if(chatContainer) chatContainer.style.paddingBottom = "50vh";
            }
        }
    });

    // 斜めブレを防ぐ高精度スワイプ処理
    viewer.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    viewer.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        if (currentImageGroup.length <= 1) return;

        const diffX = touchStartX - touchEndX;
        const diffY = touchStartY - touchEndY;
        
        // 縦の移動量が横より大きい場合はスワイプとみなさない
        if (Math.abs(diffY) > Math.abs(diffX)) {
            return; 
        }

        const minSwipeDistance = 40;

        if (diffX > minSwipeDistance) {
            // 左スワイプ（次へ）
            currentImageIndex = (currentImageIndex + 1) % currentImageGroup.length;
            updateImage();
        } else if (diffX < -minSwipeDistance) {
            // 右スワイプ（前へ）
            currentImageIndex = (currentImageIndex - 1 + currentImageGroup.length) % currentImageGroup.length;
            updateImage();
        }
    }

    function updateImage() {
        viewerImg.style.opacity = 0;
        setTimeout(() => {
            viewerImg.src = currentImageGroup[currentImageIndex].src;
            viewerImg.style.opacity = 1;
        }, 200); // フワッと切り替えるアニメーション
    }
});