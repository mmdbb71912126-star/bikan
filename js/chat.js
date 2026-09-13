let currentUser = null;
let currentConv = null;
let channel = null;

(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return location.href = '/index.html';
  currentUser = session.user;
  loadConversations();
})();

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut();
  location.href = '/index.html';
};

async function loadConversations() {
  const { data, error } = await supabase
    .from('conversation_members')
    .select('conversation_id, conversations(id, name, is_group, last_message_at)')
    .eq('user_id', currentUser.id);

  if (error) return console.error(error);

  const listEl = document.getElementById('chatList');
  if (!data || data.length === 0) {
    listEl.innerHTML = '<div style="padding:20px;color:#9ca3af;font-size:13px">还没有会话</div>';
    return;
  }

  listEl.innerHTML = data.map(row => {
    const c = row.conversations;
    return `<div class="chat-item" data-id="${c.id}">
      <div class="avatar">${(c.name || '?')[0]}</div>
      <div class="ci-body">
        <div class="ci-name">${c.name || '私聊'}</div>
        <div class="ci-preview">点击打开</div>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.chat-item').forEach(el => {
    el.onclick = () => openConversation(el.dataset.id);
  });
}

async function openConversation(convId) {
  currentConv = convId;
  document.querySelectorAll('.chat-item').forEach(el =>
    el.classList.toggle('active', el.dataset.id === convId)
  );

  document.getElementById('chatTop').style.display = 'flex';
  document.getElementById('composer').style.display = 'flex';
  document.getElementById('peerName').textContent = '会话 ' + convId.slice(0, 6);

  await loadMessages();
  subscribeRealtime();
}

async function loadMessages() {
  const { data, error } = await supabase
    .from('messages')
    .select('id, user_id, content, message_type, attachment_url, created_at')
    .eq('conversation_id', currentConv)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error) return console.error(error);

  const box = document.getElementById('messages');
  box.innerHTML = data.map(renderMessage).join('');
  box.scrollTop = box.scrollHeight;
}

function renderMessage(m) {
  const out = m.user_id === currentUser.id;
  const time = new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  const body = m.attachment_url
    ? `<a href="${m.attachment_url}" target="_blank">${m.content || '文件'}</a>`
    : escapeHtml(m.content);
  return `<div class="msg-row ${out ? 'out' : ''}">
    <div class="bubble">
      <div class="b-text">${body}</div>
      <div class="b-meta">${time}</div>
    </div>
  </div>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function subscribeRealtime() {
  if (channel) supabase.removeChannel(channel);

  channel = supabase
    .channel('room:' + currentConv)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${currentConv}`
    }, payload => {
      const box = document.getElementById('messages');
      box.insertAdjacentHTML('beforeend', renderMessage(payload.new));
      box.scrollTop = box.scrollHeight;
    })
    .subscribe();
}

document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('msgInput').onkeydown = e => {
  if (e.key === 'Enter') sendMessage();
};

async function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !currentConv) return;

  input.value = '';
  const { error } = await supabase.from('messages').insert({
    conversation_id: currentConv,
    user_id: currentUser.id,
    content: text,
    message_type: 'text'
  });
  if (error) console.error(error);
}

document.getElementById('attachBtn').onclick = () => document.getElementById('fileInput').click();

document.getElementById('fileInput').onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !currentConv) return;

  const path = `${currentConv}/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { upsert: false });

  if (upErr) return alert('上传失败：' + upErr.message);

  const { data: { publicUrl } } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(path);

  await supabase.from('messages').insert({
    conversation_id: currentConv,
    user_id: currentUser.id,
    content: file.name,
    message_type: 'file',
    attachment_url: publicUrl
  });

  e.target.value = '';
};
