// ============================================================
//  admin.js - 管理中心 (管理员界面)
// ============================================================

let currentAdminTab = 'users';
let allReports = [];
let currentReportContentId = null;

// ============================================================
//  1. 渲染管理中心主界面
// ============================================================
window.renderAdminPage = function() {
    if (window.currentUserRole !== 'admin') {
        document.getElementById('contentRender').innerHTML = `<div style="color:var(--text-danger); text-align:center; padding:40px;">无权限访问</div>`;
        return;
    }

    loadReports();

    const contentRender = document.getElementById('contentRender');
    contentRender.innerHTML = `
        <div style="width:100%; max-width:900px; margin:0 auto;">
            <div style="background:var(--bg-card); border-radius:var(--radius-md); padding:24px; border:1px solid var(--border-color); position:relative;">
                
                <!-- 修复：返回首页移进卡片内部并修横排 (第24条) -->
                <div class="back-btn" onclick="navigateTo('home')" style="display:flex; align-items:center; gap:6px; color:var(--text-secondary); cursor:pointer; margin-bottom:20px; font-size:14px;">
                    ${ICONS.BACK_ARROW} 返回首页
                </div>

                <h2 style="font-size:22px; font-weight:700; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
                    ${ICONS.ADMIN} 管理中心
                </h2>

                <!-- 修复：二级分区改为胶囊标签 (第7条) -->
                <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
                    <button onclick="switchAdminTab('users')" id="adminTabUsers" class="capsule-tab active" data-admin-tab="users">${ICONS.ADMIN} 用户管理</button>
                    <button onclick="switchAdminTab('reports')" id="adminTabReports" class="capsule-tab" data-admin-tab="reports">${ICONS.REPORT} 举报 <span id="reportCountBadge">0</span></button>
                    <button onclick="switchAdminTab('announce')" id="adminTabAnnounce" class="capsule-tab" data-admin-tab="announce">${ICONS.CAT_FORUM} 全局公告</button>
                    <button onclick="switchAdminTab('bans')" id="adminTabBans" class="capsule-tab" data-admin-tab="bans">${ICONS.LOCK} 封禁记录</button>
                </div>

                <!-- 主内容区域 -->
                <div id="adminTabContent">
                    <p style="color:var(--text-secondary); font-size:14px; margin-bottom:12px;">主管理员：<strong style="color:var(--text-primary);">${MAIN_ADMIN_EMAIL}</strong></p>
                    
                    <div style="margin-bottom:12px;">
                        <label style="font-size:13px; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">操作</label>
                        <select id="adminActionType" style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;">
                            <!-- 修复：更新下拉菜单文案 (第23条) -->
                            <option value="add_admin">添加管理员 (通过 自定义ID/数字ID/邮箱)</option>
                            <option value="remove_admin">撤销管理员 (通过 自定义ID/数字ID/邮箱)</option>
                            <option value="ban_user">封禁用户 (通过 自定义ID/数字ID/邮箱)</option>
                            <option value="unban_user">取消封禁 (通过 自定义ID/数字ID/邮箱)</option>
                            <option value="block_upload">限制上传 (通过 自定义ID/数字ID/邮箱)</option>
                            <option value="unblock_upload">解除上传限制 (通过 自定义ID/数字ID/邮箱)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">目标用户ID / 邮箱</label>
                        <input type="text" id="adminTargetId" placeholder="输入 自定义ID / 数字ID / 邮箱" style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;">
                    </div>

                    <!-- 修复：封禁时间只有在选择封禁时才显示 (第22条) -->
                    <div class="form-group" id="adminExtraField" style="display:none;">
                        <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">封禁时间（可选，不填为永久）</label>
                        <input type="datetime-local" id="adminBanExpires" style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;">
                    </div>

                    <div class="form-group">
                        <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">理由 *</label>
                        <textarea id="adminReason" placeholder="请输入操作理由" rows="2" required style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;"></textarea>
                    </div>

                    <button onclick="submitAdminAction()" class="btn-publish" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff; width:100%; justify-content:center; padding:12px;">
                        ${ICONS.ADMIN} 执行操作
                    </button>

                    <hr style="margin:24px 0; border-color:var(--border-color);">
                    
                    <p style="font-size:14px; font-weight:600; color:var(--text-primary); margin-bottom:12px;">操作记录</p>
                    <div id="adminRequestList"></div>

                </div>

                <!-- 修复：QQ群框亮绿色改成暗绿色融入背景 (第26条) -->
                <div style="margin-top:16px; border:1px solid var(--border-color); background:rgba(45,106,79,0.1); border-radius:var(--radius-md); padding:12px 16px; display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-secondary);">
                    <span class="qq-icon">🐧</span>
                    <span>必看网官方QQ群：<span style="color:var(--text-primary); font-weight:600;">976926251</span></span>
                    <span style="color:#64748b; font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                </div>

            </div>
        </div>
    `;

    // 下拉菜单监听事件，显示/隐藏封禁时间输入框
    const actionSelect = document.getElementById('adminActionType');
    if (actionSelect) {
        actionSelect.addEventListener('change', function() {
            const extra = document.getElementById('adminExtraField');
            if (extra) {
                extra.style.display = this.value === 'ban_user' ? 'block' : 'none';
            }
        });
    }

    switchAdminTab('users');
};

// ============================================================
//  2. 管理员 Tab 切换逻辑
// ============================================================
window.switchAdminTab = function(tab) {
    currentAdminTab = tab;
    // 更新胶囊按钮状态
    document.querySelectorAll('.capsule-tab[data-admin-tab]').forEach(el => {
        el.classList.toggle('active', el.dataset.adminTab === tab);
    });

    const content = document.getElementById('adminTabContent');
    if (!content) return;

    // 根据不同 Tab 渲染不同内容
    if (tab === 'reports') {
        renderReportsTab(content);
    } else if (tab === 'announce') {
        renderAnnounceTab(content);
    } else if (tab === 'bans') {
        loadBannedUsers(content);
    } else {
        // 默认 Tab（用户管理）已经在主布局里了，只刷新记录列表
        loadAdminRequests();
    }
};

// ============================================================
//  3. 各 Tab 内容渲染函数
// ============================================================
async function renderReportsTab(content) {
    loadReports();
    let html = `<h3 style="font-size:16px; margin-bottom:12px; color:var(--text-primary);">待处理举报</h3>`;
    if (allReports.length === 0) {
        html += `<p style="color:var(--text-secondary);">暂无待处理举报</p>`;
    } else {
        html += allReports.map(r => `
            <div style="padding:12px 0; border-bottom:1px solid var(--border-color); cursor:pointer;" onclick="openReportDetail(${r.id})">
                <div style="font-size:14px; color:var(--text-primary);">${r.content_title || '已删除'}</div>
                <div style="font-size:12px; color:var(--text-secondary);">举报人：${r.reporter_email || '未知'} · ${timeAgo(r.created_at)}</div>
                <div style="font-size:12px; color:#64748b; margin-top:4px;">"${r.reason}"</div>
            </div>
        `).join('');
    }
    content.innerHTML = html;
}

async function renderAnnounceTab(content) {
    let html = `
        <h3 style="font-size:16px; margin-bottom:12px; color:var(--text-primary);">发布全局公告</h3>
        <div class="form-group">
            <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">标题</label>
            <input type="text" id="globalAnnounceTitle" placeholder="公告标题" maxlength="50" style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;">
        </div>
        <div class="form-group">
            <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">内容 *</label>
            <textarea id="globalAnnounceContent" placeholder="公告内容" rows="3" required style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;"></textarea>
        </div>
        <div class="form-group">
            <label style="color:var(--text-secondary); display:block; margin-bottom:4px;">过期时间（可选）</label>
            <input type="datetime-local" id="globalAnnounceExpires" style="width:100%; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); color:var(--text-primary); font-size:14px;">
        </div>
        <button onclick="publishGlobalAnnouncement()" class="btn-publish" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff;">发布全局公告</button>
        <hr style="margin:16px 0; border-color:var(--border-color);">
        <h3 style="font-size:16px; margin-bottom:12px; color:var(--text-primary);">已发布公告</h3>
        <div id="announceList"></div>
    `;
    content.innerHTML = html;

    // 加载公告列表
    const { data, error } = await supabaseClient
        .from('global_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    
    const container = document.getElementById('announceList');
    if (!container) return;
    if (error || !data || data.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:13px; padding:8px 0;">暂无已发布公告</div>';
        return;
    }
    container.innerHTML = data.map(a => `
        <div style="padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
            <div style="font-weight:600;">${a.title || '系统公告'}</div>
            <div style="color:var(--text-primary); margin:4px 0;">${a.content}</div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:11px;">${timeAgo(a.created_at)}</span>
                <button onclick="revokeGlobalAnnouncement('${a.id}')" style="padding:4px 12px; background:#ef4444; color:#fff; border:none; border-radius:6px; font-size:11px; cursor:pointer;">撤销</button>
            </div>
        </div>
    `).join('');
}

async function loadBannedUsers(content) {
    const { data, error } = await supabaseClient
        .from('banned_users')
        .select('*, banned_by_user:banned_by(email)')
        .order('created_at', { ascending: false });

    if (!content) return;
    if (!data || data.length === 0) {
        content.innerHTML = `<h3 style="font-size:16px; margin-bottom:12px; color:var(--text-primary);">封禁记录</h3><p style="color:var(--text-secondary);">暂无封禁记录</p>`;
        return;
    }
    let html = `<h3 style="font-size:16px; margin-bottom:12px; color:var(--text-primary);">封禁记录</h3>`;
    html += data.map(b => `
        <div style="padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
            <div>用户ID：<span style="font-family:monospace; font-size:12px;">${b.user_id}</span></div>
            <div>理由：${b.reason}</div>
            <div>封禁类型：${b.ban_type === 'permanent' ? '永久' : '临时'}</div>
            ${b.expires_at ? `<div>到期时间：${new Date(b.expires_at).toLocaleString()}</div>` : ''}
            <div style="color:var(--text-secondary); font-size:12px;">操作人：${b.banned_by_user?.email || '系统'} · ${timeAgo(b.created_at)}</div>
        </div>
    `).join('');
    content.innerHTML = html;
}

// ============================================================
//  4. 全局公告发布与撤销 (第20条)
// ============================================================
window.publishGlobalAnnouncement = async function() {
    const title = document.getElementById('globalAnnounceTitle').value.trim();
    const content = document.getElementById('globalAnnounceContent').value.trim();
    const expires = document.getElementById('globalAnnounceExpires').value;

    if (!content) { alert('请输入公告内容'); return; }

    const { error } = await supabaseClient
        .from('global_announcements')
        .insert({ title: title || '系统公告', content: content, created_by: window.currentUser.id, expires_at: expires || null, is_active: true });

    if (error) { alert('发布失败：' + error.message); return; }

    const { data: users } = await supabaseClient.from('profiles').select('id');
    if (users) {
        for (const user of users) {
            await supabaseClient.from('notifications').insert({
                user_id: user.id, type: 'global_announcement',
                content: `📢 ${title || '系统公告'}：${content}`,
                link: '/messages'
            });
        }
    }
    alert('✅ 全局公告已发布');
    document.getElementById('globalAnnounceTitle').value = '';
    document.getElementById('globalAnnounceContent').value = '';
    document.getElementById('globalAnnounceExpires').value = '';
    switchAdminTab('announce');
};

window.revokeGlobalAnnouncement = async function(id) {
    if (!confirm('确定要撤销这条公告吗？')) return;
    const { error } = await supabaseClient.from('global_announcements').update({ is_active: false, is_deleted: true }).eq('id', id);
    if (error) { alert('撤销失败：' + error.message); return; }
    alert('✅ 公告已撤销');
    switchAdminTab('announce');
};

// ============================================================
//  5. 管理员执行操作 (核心逻辑 + 搜索方式 + 操作记录写入)
// ============================================================
window.submitAdminAction = async function() {
    if (!window.currentUser || window.currentUserRole !== 'admin') { alert('无权限'); return; }

    const actionType = document.getElementById('adminActionType').value;
    const targetId = document.getElementById('adminTargetId').value.trim();
    const reason = document.getElementById('adminReason').value.trim();
    const banExpires = document.getElementById('adminBanExpires').value;

    if (!targetId) { alert('请输入目标用户ID/邮箱'); return; }
    if (!reason) { alert('请输入操作理由'); return; }

    // 修复：支持3种方式搜索 (第10条)
    let query = supabaseClient.from('profiles').select('id, role, email, custom_id, display_id');
    query = query.or(`custom_id.eq.${targetId},display_id.eq.${targetId},email.eq.${targetId}`);
    const { data: targetUser, error: userError } = await query.maybeSingle();

    if (userError || !targetUser) { alert('未找到该用户，请检查ID/邮箱是否正确'); return; }
    if (targetUser.id === window.currentUser.id) { alert('不能操作自己'); return; }

    try {
        let actionLog = { requester_id: window.currentUser.id, target_id: targetUser.id, action_type: actionType, reason: reason, status: 'approved' };

        switch (actionType) {
            case 'add_admin':
                if (targetUser.role === 'admin') { alert('该用户已经是管理员'); return; }
                await supabaseClient.from('profiles').update({ role: 'admin' }).eq('id', targetUser.id);
                await supabaseClient.from('notifications').insert({ user_id: targetUser.id, type: 'admin_response', content: `👑 你已被 ${window.currentUser.email} 设为管理员`, link: '/' });
                alert('✅ 已设为管理员');
                break;
            case 'remove_admin':
                if (targetUser.role !== 'admin') { alert('该用户不是管理员'); return; }
                if (targetUser.email === MAIN_ADMIN_EMAIL) { alert('不能撤销主管理员'); return; }
                await supabaseClient.from('profiles').update({ role: 'user' }).eq('id', targetUser.id);
                await supabaseClient.from('notifications').insert({ user_id: targetUser.id, type: 'admin_response', content: `📋 你已被 ${window.currentUser.email} 撤销管理员权限`, link: '/' });
                alert('✅ 已撤销管理员');
                break;
            case 'ban_user':
                const banType = banExpires ? 'temporary' : 'permanent';
                await banUser(targetUser.id, reason, banType, window.currentUser.id);
                alert('✅ 封禁成功');
                break;
            case 'unban_user':
                await unbanUser(targetUser.id);
                break;
            case 'block_upload':
                const until = new Date(); until.setDate(until.getDate() + 7);
                await supabaseClient.from('profiles').update({ upload_blocked_until: until.toISOString() }).eq('id', targetUser.id);
                await supabaseClient.from('notifications').insert({ user_id: targetUser.id, type: 'upload_blocked', content: `🚫 因 ${reason}，上传功能被限制至 ${until.toLocaleString()}`, link: '/' });
                alert('✅ 已限制上传7天');
                break;
            case 'unblock_upload':
                await supabaseClient.from('profiles').update({ upload_blocked_until: null }).eq('id', targetUser.id);
                await supabaseClient.from('notifications').insert({ user_id: targetUser.id, type: 'upload_unblocked', content: '✅ 上传限制已解除', link: '/' });
                alert('✅ 已解除上传限制');
                break;
            default: alert('未知操作'); return;
        }

        // 修复：写入操作记录 (第19条)
        await supabaseClient.from('admin_requests').insert(actionLog);

        document.getElementById('adminTargetId').value = '';
        document.getElementById('adminReason').value = '';
        document.getElementById('adminBanExpires').value = '';
        loadAdminRequests();

    } catch (err) { alert('操作失败：' + err.message); }
};

async function banUser(userId, reason, banType, bannedBy) {
    const expiresAt = banType === 'temporary' ? new Date(Date.now() + 30*24*60*60*1000).toISOString() : null;
    const { error } = await supabaseClient.from('banned_users').insert({ user_id: userId, banned_by: bannedBy, reason: reason, ban_type: banType, expires_at: expiresAt });
    if (error) { console.error('封禁失败:', error); return false; }
    const msg = banType === 'permanent' ? `🔒 你的账号已被永久封禁，理由：${reason}` : `🔒 你的账号已被封禁至 ${new Date(expiresAt).toLocaleString()}，理由：${reason}`;
    await supabaseClient.from('notifications').insert({ user_id: userId, type: 'ban', content: msg, link: '/' });
    return true;
}

async function unbanUser(userId) {
    const { error } = await supabaseClient.from('banned_users').delete().eq('user_id', userId);
    if (error) { console.error('取消封禁失败:', error); return false; }
    await supabaseClient.from('notifications').insert({ user_id: userId, type: 'unban', content: '🔓 你的账号已被解封，欢迎回来！', link: '/' });
    alert('✅ 已取消封禁');
    return true;
}

// ============================================================
//  6. 操作记录加载 (第19条)
// ============================================================
async function loadAdminRequests() {
    const { data, error } = await supabaseClient
        .from('admin_requests')
        .select('*, target:target_id(email)')
        .eq('requester_id', window.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

    const container = document.getElementById('adminRequestList');
    if (!container) return;
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:var(--text-secondary); font-size:13px;">暂无操作记录</p>';
        return;
    }
    const actionMap = { 'add_admin': '添加管理员', 'remove_admin': '撤销管理员', 'ban_user': '封禁用户', 'unban_user': '取消封禁', 'block_upload': '限制上传', 'unblock_upload': '解除限制' };
    container.innerHTML = data.map(r => `
        <div style="padding:8px 0; border-bottom:1px solid var(--border-color); font-size:13px;">
            <div>${actionMap[r.action_type] || r.action_type}：${r.target?.email || '未知用户'}</div>
            <div style="color:var(--text-secondary); font-size:12px;">理由：${r.reason}</div>
            <div style="color:var(--text-secondary); font-size:11px;">${timeAgo(r.created_at)}</div>
        </div>
    `).join('');
}

// 辅助时间格式化
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
