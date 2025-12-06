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

  // AIメッセージ枠を作成
  const aiMsg = document.createElement("div");
  aiMsg.className = "message ai";
  chat.appendChild(aiMsg);

  // 送信直後にスクロール
  scrollToBottom();

  // サーバーに送信
  try {
    const res = await fetch("http://localhost:3000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    const data = await res.json();

    // タイピングアニメーションで表示
    typeWriter(aiMsg, data.answer || data.error);
  } catch (err) {
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

// タイピング風に表示（改行対応あり）
function typeWriter(element, text, i = 0) {
  if (i < text.length) {
    const char = text.charAt(i);

    // 改行を <br> に変換
    if (char === "\n") {
      element.innerHTML += "<br>";
    } else {
      element.innerHTML += char;
    }

    scrollToBottom(); // 文字が増えるごとにスクロール

    setTimeout(() => typeWriter(element, text, i + 1), 30);
  }
}

