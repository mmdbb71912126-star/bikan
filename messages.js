// ============================================================
//  messages.js - 消息、好友与免打扰
// ============================================================

// 局部状态
let allNotifications = [];
let allFriends = [];
let friendRequests = [];
let currentChatFriendId = null;

// 免打扰设置（存储于 localStorage）
let messageSettings = {
    dndSystem: localStorage.getItem('dndSystem') === 'true',
    dndInteract: localStorage.getItem('dndInteract') === 'true',
    dndFriend: localStorage.getItem('dndFriend') === 'true'
};

// ============================================================
//  1. 渲染消息主界面（三级入口）
// ============================================================
window.renderMessages = async function() {
    // 先加载数据
    await loadNotifications();
    await loadFriends();
    await loadFriendRequests();

    const contentRender = document.getElementById('contentRender');
    contentRender.innerHTML = `
        <div style="width:100%; max-width:800px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px;">
                <h2 style="font-size:22px; font-weight:700;">消息</h2>
                <button onclick="openMessageSettings()" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; padding:6px;">${ICONS.REPORT}</button>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
                <!-- 系统消息 -->
                <div class="capsule-tab" onclick="openMessageCategory('system')" style="display:flex; align-items:center; justify-content:space-between; padding:16px; background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color); cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:20px;">${ICONS.CAT_FORUM}</span>
                        <span style="font-size:16px; font-weight:500;">系统消息</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:var(--accent-green); color:#fff; padding:2px 10px; border-radius:20px; font-size:12px;">${allNotifications.filter(n => ['global_announcement','approved','rejected','ban','unban','upload_blocked','upload_unblocked'].includes(n.type)).length}</span>
                        <span style="color:var(--text-secondary);">›</span>
                    </div>
                </div>

                <!-- 互动消息 -->
                <div class="capsule-tab" onclick="openMessageCategory('interact')" style="display:flex; align-items:center; justify-content:space-between; padding:16px; background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color); cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:20px;">${ICONS.COMMENT}</span>
                        <span style="font-size:16px; font-weight:500;">互动消息</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:var(--accent-green); color:#fff; padding:2px 10px; border-radius:20px; font-size:12px;">${allNotifications.filter(n => ['like','comment'].includes(n.type)).length}</span>
                        <span style="color:var(--text-secondary);">›</span>
                    </div>
                </div>

                <!-- 好友申请 -->
                <div class="capsule-tab" onclick="openMessageCategory('friend')" style="display:flex; align-items:center; justify-content:space-between; padding:16px; background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color); cursor:pointer;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:20px;">${ICONS.FRIEND}</span>
                        <span style="font-size:16px; font-weight:500;">好友申请</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:var(--accent-green); color:#fff; padding:2px 10px; border-radius:20px; font-size:12px;">${friendRequests.length}</span>
                        <span style="color:var(--text-secondary);">›</span>
                    </div>
                </div>
            </div>

            <!-- 好友列表板块（直接展示在消息主界面） -->
            <div style="border-top:1px solid var(--border-color); padding-top:16px; margin-top:8px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:20px;">${ICONS.FRIEND}</span>
                        <span style="font-size:16px; font-weight:500;">好友 (${allFriends.length})</span>
                    </div>
                    <button onclick="openAddFriend()" class="capsule-tab" style="background:var(--accent-green); color:#fff; padding:4px 12px; font-size:13px;">+ 添加</button>
                </div>
                ${allFriends.length === 0 ? '<div style="color:var(--text-secondary); padding:12px 0; font-size:14px;">暂无好友</div>' : ''}
                ${allFriends.map(f => `
                    <div onclick="openChat('${f.friend_id}', '${f.friend?.nickname || '用户'}')" style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid var(--border-color); cursor:pointer;">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <span style="width:32px; height:32px; border-radius:50%; background:var(--bg-card); display:flex; align-items:center; justify-content:center;">${f.friend?.nickname?.charAt(0)?.toUpperCase() || '?'}</span>
                            <div>
                                <div style="font-weight:500;">${f.friend?.nickname || '用户'}</div>
                                <div style="font-size:12px; color:var(--text-secondary);">好友</div>
                            </div>
                        </div>
                        <button onclick="event.stopPropagation();openChat('${f.friend_id}', '${f.friend?.nickname || '用户'}')" class="capsule-tab">私聊</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

// ============================================================
//  2. 数据加载函数
// ============================================================
async function loadNotifications() {
    if (!window.currentUser) return;
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(200);
    if (data) allNotifications = data;
}

async function loadFriends() {
    if (!window.currentUser) return;
    const { data, error } = await supabaseClient
        .from('friends')
        .select('*, friend:friend_id(id, nickname, avatar_url)')
        .eq('user_id', window.currentUser.id)
        .eq('status', 'accepted');
    if (!error && data) allFriends = data;
    else allFriends = [];
}

async function loadFriendRequests() {
    if (!window.currentUser) return;
    const { data, error } = await supabaseClient
        .from('friends')
        .select('*, requester:user_id(id, nickname, avatar_url)')
        .eq('friend_id', window.currentUser.id)
        .eq('status', 'pending');
    if (!error && data) friendRequests = data;
    else friendRequests = [];
}

// ============================================================
//  3. 二级菜单：具体消息列表（含删除按钮）
// ============================================================
function openMessageCategory(type) {
    let items = [];
    let title = '';
    if (type === 'system') {
        items = allNotifications.filter(n => ['global_announcement','approved','rejected','ban','unban','upload_blocked','upload_unblocked'].includes(n.type));
        title = '系统消息';
    } else if (type === 'interact') {
        items = allNotifications.filter(n => ['like','comment'].includes(n.type));
        title = '互动消息';
    } else if (type === 'friend') {
        items = friendRequests.map(req => ({ id: req.id, content: `${req.requester?.nickname || '用户'} 请求添加好友`, created_at: req.created_at, _type: 'friend_request', original: req }));
        title = '好友申请';
    }
    renderMessageList(type, title, items);
}

function renderMessageList(type, title, items) {
    const contentRender = document.getElementById('contentRender');
    let html = `
        <div style="width:100%; max-width:800px; margin:0 auto;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
                <button onclick="window.renderMessages()" style="background:transparent; border:none; color:var(--text-secondary); font-size:24px; cursor:pointer;">‹</button>
                <h2 style="font-size:20px; font-weight:700;">${title}</h2>
            </div>
            <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    if (items.length === 0) {
        html += `<div style="color:var(--text-secondary); padding:20px; text-align:center;">暂无消息</div>`;
    } else {
        items.forEach(item => {
            let content = item.content || '...';
            let time = timeAgo(item.created_at);
            html += `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px; background:var(--bg-card); border-radius:var(--radius-md); border:1px solid var(--border-color);">
                    <div style="flex:1;">
                        <div style="font-size:14px;">${content}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">${time}</div>
                    </div>
                    <button onclick="deleteMessage('${item.id}','${type}')" style="background:transparent; border:none; color:var(--text-danger); cursor:pointer;">${ICONS.REPORT}</button>
                </div>
            `;
        });
    }
    html += `</div></div>`;
    contentRender.innerHTML = html;
}

// ============================================================
//  4. 删除消息逻辑（第17条）
// ============================================================
window.deleteMessage = async function(id, type) {
    if (!confirm('确定要删除这条消息吗？')) return;
    // 如果是好友申请，从 friends 表删；其他从 notifications 表删
    const table = type === 'friend' ? 'friends' : 'notifications';
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) { alert('删除失败：' + error.message); return; }
    await loadNotifications();
    await loadFriendRequests();
    window.renderMessages();
};

// ============================================================
//  5. 消息免打扰设置（第16条）
// ============================================================
window.openMessageSettings = function() {
    const contentRender = document.getElementById('contentRender');
    contentRender.innerHTML = `
        <div style="width:100%; max-width:600px; margin:0 auto;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
                <button onclick="window.renderMessages()" style="background:transparent; border:none; color:var(--text-secondary); font-size:24px; cursor:pointer;">‹</button>
                <h2 style="font-size:20px; font-weight:700;">消息设置</h2>
            </div>
            <div style="display:flex; flex-direction:column; gap:16px; background:var(--bg-card); border-radius:var(--radius-md); padding:20px; border:1px solid var(--border-color);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>系统消息免打扰</span>
                    <label class="switch"><input type="checkbox" ${messageSettings.dndSystem ? 'checked' : ''} onchange="toggleDnd('system', this.checked)"><span class="slider"></span></label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>互动消息免打扰</span>
                    <label class="switch"><input type="checkbox" ${messageSettings.dndInteract ? 'checked' : ''} onchange="toggleDnd('interact', this.checked)"><span class="slider"></span></label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>好友申请免打扰</span>
                    <label class="switch"><input type="checkbox" ${messageSettings.dndFriend ? 'checked' : ''} onchange="toggleDnd('friend', this.checked)"><span class="slider"></span></label>
                </div>
            </div>
        </div>
    `;
    // 注入 css 样式（如果 index.html 里没有开关样式）
    if (!document.getElementById('switchStyles')) {
        const style = document.createElement('style');
        style.id = 'switchStyles';
        style.innerHTML = `
            .switch { position:relative; display:inline-block; width:44px; height:24px; }
            .switch input { opacity:0; width:0; height:0; }
            .slider { position:absolute; cursor:pointer; top:0; left:0; right:0; bottom:0; background:var(--bg-primary); transition:.4s; border-radius:24px; border:1px solid var(--border-color); }
            .slider:before { position:absolute; content:""; height:18px; width:18px; left:2px; bottom:2px; background:var(--text-secondary); transition:.4s; border-radius:50%; }
            input:checked + .slider { background:var(--accent-green); border-color:var(--accent-green); }
            input:checked + .slider:before { transform:translateX(20px); background:#fff; }
        `;
        document.head.appendChild(style);
    }
};

window.toggleDnd = function(key, checked) {
    messageSettings['dnd' + key.charAt(0).toUpperCase() + key.slice(1)] = checked;
    localStorage.setItem('dnd' + key.charAt(0).toUpperCase() + key.slice(1), checked);
};

// ============================================================
//  6. 好友功能全流程（第33条修复）
// ============================================================
// 添加好友弹窗
window.openAddFriend = function() {
    const email = prompt('请输入对方的邮箱地址以发送好友申请：');
    if (email) sendFriendRequest(email);
};

async function sendFriendRequest(email) {
    // 找到对方用户ID
    const { data: target, error } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
    if (error || !target) { alert('未找到该用户，请确认邮箱正确。'); return; }
    if (target.id === window.currentUser.id) { alert('不能添加自己为好友。'); return; }

    // 检查是否已经是好友或有待处理申请
    const { data: exist } = await supabaseClient
        .from('friends')
        .select('id')
        .or(`and(user_id.eq.${window.currentUser.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${window.currentUser.id})`)
        .maybeSingle();
    if (exist) { alert('你们已经是好友或已发送过申请。'); return; }

    const { error: insertError } = await supabaseClient
        .from('friends')
        .insert({ user_id: window.currentUser.id, friend_id: target.id, status: 'pending' });
    if (insertError) { alert('申请发送失败：' + insertError.message); return; }
    alert('✅ 好友申请已发送！');
    window.renderMessages();
}

// 处理好友申请（接受/拒绝）
window.handleFriendRequest = async function(requestId, action) {
    if (!confirm(`确定要${action === 'accept' ? '接受' : '拒绝'}该好友申请吗？`)) return;
    const status = action === 'accept' ? 'accepted' : 'rejected';
    const { error } = await supabaseClient.from('friends').update({ status }).eq('id', requestId);
    if (error) { alert('操作失败：' + error.message); return; }
    await loadFriendRequests();
    await loadFriends();
    window.renderMessages();
};

// 私聊入口（占位）
window.openChat = function(friendId, friendName) {
    alert(`💬 私聊功能待开发。\n你正在尝试与 ${friendName} 聊天。`);
};

// 辅助时间格式化（复用）
function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '刚刚';
    if (mins < 60) return mins + '分钟前';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + '小时前';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + '天前';
    return new Date(date).toLocaleDateString('zh-CN');
}
