// ============================================================
//  profile.js - 个人中心与设置（含 Bug 反馈）
// ============================================================

// ============================================================
//  1. 渲染个人中心主界面（包含 Tab 切换）
// ============================================================
window.renderProfile = async function() {
    if (!window.currentUser) return;

    const contentRender = document.getElementById('contentRender');
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', window.currentUser.id)
        .single();

    contentRender.innerHTML = `
        <div style="width:100%; max-width:800px; margin:0 auto;">
            <!-- 返回首页 -->
            <div class="back-btn" onclick="navigateTo('home')" style="display:flex; align-items:center; gap:6px; color:var(--text-secondary); cursor:pointer; margin-bottom:20px; font-size:14px;">
                ${ICONS.BACK_ARROW} 返回首页
            </div>

            <!-- 个人中心主卡片 -->
            <div style="background:var(--bg-card); border-radius:var(--radius-md); padding:24px; border:1px solid var(--border-color);">
                
                <!-- 分区 Tab 切换（修复 第 28 条：新增设置分区） -->
                <div style="display:flex; gap:8px; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
                    <button id="profileTabInfo" onclick="switchProfileTab('info')" class="capsule-tab active">个人资料</button>
                    <button id="profileTabSettings" onclick="switchProfileTab('settings')" class="capsule-tab">设置</button>
                </div>

                <!-- 动态内容容器 -->
                <div id="profileContent"></div>
                
            </div>
        </div>
    `;

    // 默认渲染“个人资料”
    switchProfileTab('info', profile);
};

// ============================================================
//  2. 个人资料 & 设置 的 Tab 切换逻辑
// ============================================================
window.switchProfileTab = function(tab, profileData = null) {
    const btnInfo = document.getElementById('profileTabInfo');
    const btnSettings = document.getElementById('profileTabSettings');
    const container = document.getElementById('profileContent');

    // 重置按钮状态
    [btnInfo, btnSettings].forEach(el => {
        if (el) el.classList.remove('active');
    });

    if (tab === 'info') {
        if (btnInfo) btnInfo.classList.add('active');
        renderProfileInfo(container);
    } else if (tab === 'settings') {
        if (btnSettings) btnSettings.classList.add('active');
        renderProfileSettings(container);
    }
};

// ============================================================
//  3. 渲染“个人资料”（解决 第 27 条）
// ============================================================
async function renderProfileInfo(container) {
    if (!window.currentUser) return;
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', window.currentUser.id)
        .single();

    // 修复 第 10 条：显示自定义 display_id
    const avatarHtml = profile?.avatar_url 
        ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` 
        : (userNickname?.textContent || 'U').charAt(0).toUpperCase();

    container.innerHTML = `
        <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
            <div style="width:64px; height:64px; border-radius:50%; background:var(--bg-card); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:24px;">
                ${avatarHtml}
            </div>
            <div>
                <div style="font-size:22px; font-weight:700;">${profile?.nickname || window.currentUser.email.split('@')[0]}</div>
                <div style="font-size:13px; color:var(--text-secondary);">${window.currentUser.email}</div>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">展示 ID：<span style="color:var(--text-primary);">${profile?.display_id || '未设置'}</span></div>
                <div style="margin-top:8px;">
                    <!-- 修复 第 6 条：按钮改为胶囊样式 -->
                    <button onclick="openProfileEdit()" class="btn-publish" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff; padding:6px 16px; border-radius:20px; font-size:13px;">
                        ${ICONS.EDIT} 编辑资料
                    </button>
                </div>
            </div>
        </div>
        ${profile?.bio ? `<div style="margin-top:12px; color:var(--text-secondary);">${profile.bio}</div>` : ''}
    `;
}

// ============================================================
//  4. 渲染“设置”分区（修复 第 18 条：Bug 反馈移到这里）
// ============================================================
function renderProfileSettings(container) {
    container.innerHTML = `
        <div>
            <div style="margin-bottom:20px;">
                <h3 style="font-size:16px; margin-bottom:12px;">Bug 反馈</h3>
                <div style="display:flex; gap:8px;">
                    <input type="text" id="bugFeedbackInput" placeholder="描述你遇到的问题..." style="flex:1;padding:10px 14px;border:1px solid var(--border-color);border-radius:var(--radius-sm);background:var(--bg-primary);color:var(--text-primary);font-size:14px;">
                    <button onclick="submitBugFeedback()" style="padding:10px 18px;background:#ef4444;color:#fff;border:none;border-radius:var(--radius-sm);font-weight:600;cursor:pointer;">提交</button>
                </div>
                <div id="bugFeedbackStatus" style="font-size:12px;color:var(--text-secondary);margin-top:4px;">📝 描述问题，管理员会尽快处理</div>
            </div>
        </div>
    `;
    checkBugFeedbackToday();
}

// ============================================================
//  5. 编辑资料相关功能（彻底删除 30 天限制）
// ============================================================
let avatarFileToUpload = null;

window.openProfileEdit = async function() {
    if (!window.currentUser) return;
    avatarFileToUpload = null;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', window.currentUser.id)
        .single();

    // 填充弹窗
    const modal = document.getElementById('profileEditModal');
    if (modal) modal.classList.remove('hidden');

    const avatarPreview = document.getElementById('avatarPreview');
    if (avatarPreview) {
        if (profile?.avatar_url) {
            avatarPreview.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;">`;
        } else {
            avatarPreview.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="width:48px;height:48px;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }
    }

    document.getElementById('editDisplayId').value = profile?.display_id || '';
    document.getElementById('editNickname').value = profile?.nickname || '';
    document.getElementById('editBio').value = profile?.bio || '';
    document.getElementById('editAvatar').value = '';
};

window.closeProfileEdit = function() {
    document.getElementById('profileEditModal').classList.add('hidden');
};

window.previewAvatar = function(input) {
    const file = input.files[0];
    if (!file) return;
    avatarFileToUpload = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('avatarPreview');
        if (preview) preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
};

// ============================================================
//  6. 保存资料（解决 第 10、11、12 条）
// ============================================================
window.saveProfile = async function() {
    const display_id = document.getElementById('editDisplayId').value.trim();
    const nickname = document.getElementById('editNickname').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    const updateData = {};
    if (display_id) updateData.display_id = display_id;
    if (nickname) updateData.nickname = nickname;
    if (bio) updateData.bio = bio;

    // 处理头像上传
    if (avatarFileToUpload) {
        const filePath = `${window.currentUser.id}/${Date.now()}_${avatarFileToUpload.name}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, avatarFileToUpload);
        if (!uploadError) {
            const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(filePath);
            updateData.avatar_url = urlData.publicUrl;
        } else {
            console.warn('头像上传失败:', uploadError);
        }
    }

    if (Object.keys(updateData).length === 0) {
        alert('没有修改任何内容');
        return;
    }

    // 彻底删掉 30 天限制、删掉 last_updated_at 的逻辑
    const { error } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', window.currentUser.id);

    if (error) {
        alert('保存失败：' + error.message);
    } else {
        alert('✅ 资料保存成功');
        closeProfileEdit();
        // 刷新个人中心页面
        window.navigateTo('profile');
    }
};

// ============================================================
//  7. Bug 反馈功能（设置分区里专用）
// ============================================================
function checkBugFeedbackToday() {
    const today = new Date().toDateString();
    const lastSubmit = localStorage.getItem('bugFeedbackDate');
    const status = document.getElementById('bugFeedbackStatus');
    const input = document.getElementById('bugFeedbackInput');
    if (status && input) {
        if (lastSubmit === today) {
            status.textContent = '✅ 今日已提交反馈，感谢你的反馈！';
            status.style.color = '#166534';
            input.disabled = true;
        } else {
            status.textContent = '📝 描述问题，管理员会尽快处理';
            status.style.color = '#94a3b8';
            input.disabled = false;
        }
    }
}

window.submitBugFeedback = async function() {
    const input = document.getElementById('bugFeedbackInput');
    const content = input.value.trim();
    if (!content) { alert('请输入反馈内容'); return; }
    if (content.length < 5) { alert('反馈内容至少5个字'); return; }

    const today = new Date().toDateString();
    if (localStorage.getItem('bugFeedbackDate') === today) {
        alert('今日已提交过反馈，请明天再试');
        return;
    }

    const { data: admins } = await supabaseClient.from('profiles').select('id').eq('role', 'admin');
    if (admins) {
        for (const admin of admins) {
            await supabaseClient.from('notifications').insert({
                user_id: admin.id,
                type: 'report_created',
                content: `🐛 ${window.currentUser.email} 提交了Bug反馈：${content}`,
                link: '/admin'
            });
        }
    }

    localStorage.setItem('bugFeedbackDate', today);
    input.value = '';
    const status = document.getElementById('bugFeedbackStatus');
    if (status) {
        status.textContent = '✅ 提交成功，感谢你的反馈！';
        status.style.color = '#166534';
        input.disabled = true;
    }
    alert('✅ Bug反馈已提交，管理员将尽快处理');
};
