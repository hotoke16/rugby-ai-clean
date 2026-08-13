const textarea = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");
const chat = document.getElementById("chat");

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

    // ★追加: AIの返答から画像タグ [IMG:ファイル名] を抽出する
    const rawText = data.answer || data.error;
    const imgRegex = /\[IMG:(.+?)\]/g;
    let imageFileName = null;
    
    // マッチする部分があればファイル名を保存
    const match = imgRegex.exec(rawText);
    if (match) {
      imageFileName = match[1];
    }
    
    // 文章中から [IMG:***] の部分を削除して、表示用のクリーンなテキストにする
    const cleanText = rawText.replace(imgRegex, "").trim();

    // タイピングアニメーションで表示
    typeWriter(aiMsg, data.answer || data.error);
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
function typeWriter(element, text, i = 0, imageFileName = null) {
  if (i < text.length) {
    const char = text.charAt(i);

    // 改行を <br> に変換（改行中もスクロール位置は動かさない）
    if (char === "\n") {
      element.innerHTML += "<br>";
    } else {
      element.innerHTML += char;
    }

    setTimeout(() => typeWriter(element, text, i + 1, imageFileName), 30);
  } else {
    // ★追加: タイピングが全て終わった後に、画像があれば要素として追加する
    if (imageFileName) {
      const img = document.createElement("img");
      // 画像が格納されているフォルダパスを指定（例として 'images' フォルダ）
      img.src = `./images/${imageFileName}`; 
      img.className = "chat-image";
      img.alt = "図解";
      
      // 画像が読み込まれたタイミングで一番下までスクロールさせる
      img.onload = () => scrollToBottom();
      
      element.appendChild(document.createElement("br"));
      element.appendChild(img);
    }
  }
}
