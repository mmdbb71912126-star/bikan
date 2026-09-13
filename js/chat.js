<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>纸飞机 · 聊天</title>
<link rel="stylesheet" href="/css/style.css">
</head>
<body class="chat-page">
  <aside class="sidebar">
    <div class="sidebar-top">
      <input type="text" id="search" placeholder="搜索">
      <button id="logoutBtn" class="icon-btn" title="退出">⎋</button>
    </div>
    <div class="chat-list" id="chatList"></div>
  </aside>

  <main class="chat-panel">
    <header class="chat-top" id="chatTop" style="display:none">
      <div class="peer-name" id="peerName"></div>
    </header>
    <div class="messages" id="messages">
      <div class="empty-state">选择左侧会话开始</div>
    </div>
    <footer class="composer" id="composer" style="display:none">
      <input type="file" id="fileInput" style="display:none">
      <button class="icon-btn" id="attachBtn" title="附件">📎</button>
      <input type="text" id="msgInput" placeholder="写一条消息…">
      <button class="send-btn" id="sendBtn">➤</button>
    </footer>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="/js/supabase.js"></script>
  <script src="/js/chat.js"></script>
</body>
</html>
