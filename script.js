const textarea = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");

// ブラウザの記憶領域（localStorage）からユーザーIDを取得
let currentUserId = localStorage.getItem("rugbyAI_userId");

// もし初めてのアクセスでIDが無ければ、新しく作って記憶させる
if (!currentUserId) {
  // 「user_」の後にランダムな英数字をつけてIDにする（例: user_x8a9b2）
  currentUserId = "user_" + Math.random().toString(36).substring(2, 9);
  localStorage.setItem("rugbyAI_userId", currentUserId);
}

async function sendQuestion() {
  const question = textarea.value.trim();
  if (!question) return;

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
      body: JSON.stringify({ question })
    });
    const data = await res.json();

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
    // ★修正: タイピングが全て終わった後に、画像があれば「すべて」要素として追加する
    if (imageFileNames && imageFileNames.length > 0) {
      imageFileNames.forEach(fileName => {
        const img = document.createElement("img");
        img.src = `./image/${fileName}`; 
        img.className = "chat-image";
        img.alt = "図解";
        
        // 画像が読み込まれるたびに一番下までスクロールさせる
        img.onload = () => scrollToBottom();
        
        element.appendChild(document.createElement("br"));
        element.appendChild(img);
      });
    }
  }
}
