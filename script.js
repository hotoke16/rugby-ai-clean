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
  alert("会員限定コンテンツです。最新のnote記事のリンクからアクセスしてください。");
  window.location.href = "https://note.com/zukai_rugby/n/nb46f9184c720"; 
} else if (userToken !== currentToken) {
  alert("アクセスキーの期限が切れています。最新のnote記事のリンクからアクセスしてください。");
  window.location.href = "https://note.com/zukai_rugby/n/nb46f9184c720"; 
}
// ==========================================

// ==========================================
// ★ 端末ごとに固有のIDを付与する（履歴仕分け用）
// ==========================================
// ローカルストレージ（ブラウザの記憶領域）からIDを探す
let localUserId = localStorage.getItem("rugbyAI_userId");

if (!localUserId) {
    localUserId = "User_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    localStorage.setItem("rugbyAI_userId", localUserId);
}

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
        body: JSON.stringify({ 
          question: question,
          userId: localUserId // ★ここを localUserId に変更
      })
    });
    const data = await res.json();
    
    // ローディングクラスを削除して内容をクリア
    aiMsg.classList.remove("loading");
    aiMsg.textContent = "";

    const rawText = data.answer || data.error;
    const imgRegex = /\[IMG:\s*([^\]]+?)\s*\]/g;
    
    // 見つかったすべてのファイル名を格納する配列
    const imageFileNames = [];
    let match;
    while ((match = imgRegex.exec(rawText)) !== null) {
      imageFileNames.push(match[1].trim());
    }
    
    // 文章中から [IMG:***] の部分をすべて削除
    const cleanText = rawText.replace(imgRegex, "").trim();

    // タイピングアニメーションで表示
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

// 送信ボタンのクリック
if (sendBtn) {
    sendBtn.addEventListener("click", sendQuestion);
}

// 常に一番下までスクロール
function scrollToBottom() {
  const chatEnd = document.getElementById("chatEnd");
  if(chatEnd) chatEnd.scrollIntoView({ behavior: "auto" });
}

// タイピング風に表示
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
    // タイピングが全て終わった後に画像をコンテナに入れて追加
    if (imageFileNames && imageFileNames.length > 0) {
      const imgContainer = document.createElement("div");
      imgContainer.className = "chat-image-container";
      
      imageFileNames.forEach(fileName => {
        const img = document.createElement("img");
        img.src = `./image/${fileName}`; 
        img.className = "chat-image";
        img.alt = "図解";
        
        img.onload = () => scrollToBottom();
        imgContainer.appendChild(img);
      });
      
      element.appendChild(document.createElement("br"));
      element.appendChild(imgContainer);
    }
  }
}

// ==========================================
// ★ 会話の保存・呼び出し機能 ★
// ==========================================
const saveBtn = document.getElementById("save-btn");
const historyContainer = document.getElementById("history-container");

let savedChats = JSON.parse(localStorage.getItem("rugbyAI_savedChats")) || [];

savedChats = savedChats.map(chatData => {
  if (typeof chatData === "string") {
    return { title: "保存された会話", html: chatData };
  }
  return chatData;
});

function renderHistoryButtons() {
  if (!historyContainer) return;
  historyContainer.innerHTML = ""; 

  const newBtn = document.createElement("button");
  newBtn.className = "history-new-btn";
  newBtn.innerText = "＋ 新しい会話";
  newBtn.onclick = () => { chat.innerHTML = ""; };
  historyContainer.appendChild(newBtn);

  savedChats.forEach((chatData, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item-wrapper";

    const btn = document.createElement("button");
    btn.className = "history-item-btn";
    btn.innerText = chatData.title; 
    btn.title = chatData.title; 
    btn.onclick = () => {
      chat.innerHTML = chatData.html;
      scrollToBottom();
    };
    
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

renderHistoryButtons();

if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const currentChatHtml = chat.innerHTML.trim();
      
      if (currentChatHtml === "") {
        alert("保存する会話がありません。");
        return;
      }

      let chatTitle = "無題の会話";
      const firstUserMsg = chat.querySelector(".message.user");
      
      if (firstUserMsg) {
        const text = firstUserMsg.textContent.trim();
        chatTitle = text.length > 12 ? text.substring(0, 12) + "..." : text;
      }

      const newChatData = {
        title: chatTitle,
        html: currentChatHtml
      };

      savedChats.push(newChatData);
      localStorage.setItem("rugbyAI_savedChats", JSON.stringify(savedChats));

      chat.innerHTML = "";
      renderHistoryButtons();
    });
}

const historyToggleBtn = document.getElementById("history-toggle-btn");
if (historyToggleBtn) {
    historyToggleBtn.addEventListener("click", () => {
      historyContainer.classList.toggle("open");
    });
}

// ==========================================
// スマホ用画像ビューワー ＆ スワイプ・PCボタン処理
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const viewer = document.getElementById("image-viewer");
    const viewerImg = document.getElementById("viewer-img");
    const closeBtn = document.getElementById("viewer-close-btn");
    const chatContainer = document.getElementById("chat-container");
    
    // PC用の左右ボタン
    const prevBtn = document.getElementById("viewer-prev-btn");
    const nextBtn = document.getElementById("viewer-next-btn");

    // HTMLにビューワーが追加されていない場合はエラーを出さずに止める
    if(!viewer || !viewerImg || !closeBtn) return; 

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
        
        document.body.style.paddingBottom = "0";
        if(chatContainer) chatContainer.style.paddingBottom = "0";
    });

    // 画像タップ時
    document.body.addEventListener("click", (e) => {
        if (e.target.tagName === "IMG" && e.target.className.includes("chat-image")) {
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

            // 画像が2枚以上ある時だけボタンを表示
            if (currentImageGroup.length > 1) {
                if(prevBtn) prevBtn.style.display = "flex";
                if(nextBtn) nextBtn.style.display = "flex";
            } else {
                if(prevBtn) prevBtn.style.display = "none";
                if(nextBtn) nextBtn.style.display = "none";
            }

            if (window.innerWidth <= 768) {
                document.body.style.paddingBottom = "50vh";
                if(chatContainer) chatContainer.style.paddingBottom = "50vh";
            }
        }
    });

    // 左ボタン（前へ）
    if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            if (currentImageGroup.length <= 1) return;
            currentImageIndex = (currentImageIndex - 1 + currentImageGroup.length) % currentImageGroup.length;
            updateImage();
        });
    }

    // 右ボタン（次へ）
    if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
            e.stopPropagation(); 
            if (currentImageGroup.length <= 1) return;
            currentImageIndex = (currentImageIndex + 1) % currentImageGroup.length;
            updateImage();
        });
    }

    // スマホ用：斜めブレを防ぐ高精度スワイプ処理
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
        
        if (Math.abs(diffY) > Math.abs(diffX)) {
            return; 
        }

        const minSwipeDistance = 40;

        if (diffX > minSwipeDistance) {
            currentImageIndex = (currentImageIndex + 1) % currentImageGroup.length;
            updateImage();
        } else if (diffX < -minSwipeDistance) {
            currentImageIndex = (currentImageIndex - 1 + currentImageGroup.length) % currentImageGroup.length;
            updateImage();
        }
    }

    function updateImage() {
        viewerImg.style.opacity = 0;
        setTimeout(() => {
            viewerImg.src = currentImageGroup[currentImageIndex].src;
            viewerImg.style.opacity = 1;
        }, 200); 
    }
});
