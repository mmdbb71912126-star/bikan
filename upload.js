// ============================================================
//  upload.js - 我的内容（发布与列表管理）
// ============================================================

// 局部状态
let isSubmitting = false;
let uploadedFileList = [];
let uploadedUrlList = [];
let uploadedTagList = [];

// ============================================================
//  1. 渲染“我的内容”主界面
// ============================================================
window.renderUpload = async function() {
    const contentRender = document.getElementById('contentRender');
    // 获取当前用户已发布的内容
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('upload_blocked_until')
        .eq('id', window.currentUser.id)
        .single();

    // 检查是否被限制上传
    if (profile?.upload_blocked_until && new Date(profile.upload_blocked_until) > new Date()) {
        contentRender.innerHTML = `
            <div style="text-align:center; padding:60px 20px; color:var(--text-secondary);">
                <p style="font-size:18px; font-weight:600; color:var(--text-danger);">🚫 上传功能被限制</p>
                <p style="margin-top:8px;">限制到期时间：${new Date(profile.upload_blocked_until).toLocaleString()}</p>
            </div>
        `;
        return;
    }

    // 查询我的内容
    const { data, error } = await supabaseClient
        .from('contents')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        contentRender.innerHTML = `<div style="color:var(--text-danger);text-align:center;padding:40px;">加载失败</div>`;
        return;
    }

    let html = `
        <div style="width:100%; max-width:1000px;">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <h2 style="font-size:20px; font-weight:700;">我的内容</h2>
                <button onclick="openUploadModal()" class="btn-publish" style="background:var(--accent-green); border-color:var(--accent-green); color:#fff;">
                    ${ICONS.UPLOAD} 发布新内容
                </button>
            </div>
            <div id="myContentList"></div>
        </div>
    `;
    contentRender.innerHTML = html;

    renderMyContents(data || []);
};

// ============================================================
//  2. 渲染内容列表（含删除操作和状态）
// ============================================================
function renderMyContents(data) {
    const container = document.getElementById('myContentList');
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <p style="margin-top:12px;">你还没有发布任何内容，点击上方按钮发布第一个吧！</p>
            </div>
        `;
        return;
    }

    let html = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">`;
    data.forEach(item => {
        // 状态徽章
        const statusMap = {
            'pending': `<span class="capsule-tab" style="background:#fef3c7; color:#d97706; border-color:#fef3c7;">${ICONS.PENDING} 待审核</span>`,
            'approved': `<span class="capsule-tab" style="background:#dcfce7; color:#166534; border-color:#dcfce7;">${ICONS.STAR} 已通过</span>`,
            'rejected': `<span class="capsule-tab" style="background:#fee2e2; color:#991b1b; border-color:#fee2e2;">${ICONS.REPORT} 已拒绝</span>`
        };
        const badge = statusMap[item.status] || '';

        let extraHtml = '';
        if (item.file_url) {
            extraHtml = `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-top:6px;">
                    ${ICONS.CAT_RES} 
                    <a href="${item.file_url}" target="_blank" style="color:var(--accent-green);text-decoration:none;">${item.file_name || '下载文件'}</a>
                </div>
            `;
        }
        if (item.url) {
            extraHtml = `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-top:6px;">
                    ${ICONS.CAT_URL} 
                    <a href="${item.url}" target="_blank" style="color:var(--accent-green);text-decoration:none;">${item.url}</a>
                </div>
            `;
        }

        html += `
            <div class="content-card" onclick="navigateTo('detail', ${item.id})">
                <div style="margin-bottom:8px; display:flex; justify-content:space-between;">
                    <span style="font-size:12px; color:var(--text-secondary);">${getCategoryIcon(item.category)} ${item.category}</span>
                    ${badge}
                </div>
                <div style="font-size:16px;font-weight:600;margin-top:4px;">${item.title}</div>
                ${item.description ? `<div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${item.description}</div>` : ''}
                ${extraHtml}
                <div style="display:flex;justify-content:flex-end;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);">
                    <button onclick="event.stopPropagation();deleteContent(${item.id}, '${item.file_url || ''}')" style="background:transparent;border:none;color:var(--text-danger);cursor:pointer;font-size:13px;display:flex;align-items:center;gap:4px;">
                        ${ICONS.REPORT} 删除
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ============================================================
//  3. 上传弹窗逻辑（控制模态框显示）
// ============================================================
window.openUploadModal = function() {
    uploadedFileList = [];
    uploadedUrlList = [];
    uploadedTagList = [];
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadFileName').textContent = '点击选择文件（可多个）';
    document.getElementById('tagList').innerHTML = '';
    document.getElementById('urlList').innerHTML = '';
};

window.closeUploadModal = function() {
    document.getElementById('uploadModal').classList.add('hidden');
};

window.updateFileNames = function(input) {
    const files = input.files;
    if (files.length > 0) {
        uploadedFileList = Array.from(files);
        document.getElementById('uploadFileName').textContent = files.length + ' 个文件';
    } else {
        uploadedFileList = [];
        document.getElementById('uploadFileName').textContent = '点击选择文件（可多个）';
    }
};

// ============================================================
//  4. 标签与链接管理
// ============================================================
window.addTag = function() {
    const input = document.getElementById('tagInput');
    const tag = input.value.trim();
    if (!tag) return;
    if (uploadedTagList.includes(tag)) { input.value = ''; return; }
    uploadedTagList.push(tag);
    input.value = '';
    renderTags();
};

window.removeTag = function(tag) {
    uploadedTagList = uploadedTagList.filter(t => t !== tag);
    renderTags();
};

function renderTags() {
    const container = document.getElementById('tagList');
    if (!container) return;
    container.innerHTML = uploadedTagList.map(t =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-card);color:var(--text-secondary);padding:4px 10px;border-radius:12px;font-size:12px;margin:4px;">#${t} <span onclick="removeTag('${t}')" style="cursor:pointer;color:var(--text-danger);">✕</span></span>`
    ).join('');
}

window.addUrl = function() {
    const input = document.getElementById('uploadUrlInput');
    const url = input.value.trim();
    if (!url) return;
    if (uploadedUrlList.includes(url)) { input.value = ''; return; }
    uploadedUrlList.push(url);
    input.value = '';
    renderUrls();
};

window.removeUrl = function(url) {
    uploadedUrlList = uploadedUrlList.filter(u => u !== url);
    renderUrls();
};

function renderUrls() {
    const container = document.getElementById('urlList');
    if (!container) return;
    container.innerHTML = uploadedUrlList.map(u =>
        `<span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-card);color:var(--text-secondary);padding:4px 10px;border-radius:12px;font-size:12px;margin:4px;">${ICONS.CAT_URL} ${u} <span onclick="removeUrl('${u}')" style="cursor:pointer;color:var(--text-danger);">✕</span></span>`
    ).join('');
}

// ============================================================
//  5. 提交内容（核心逻辑）
// ============================================================
window.submitContent = async function(e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!window.currentUser) { alert('请先登录'); return; }

    // 检查封禁
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_banned, ban_expires_at')
        .eq('id', window.currentUser.id)
        .single();
    if (profile?.is_banned) {
        const expires = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
        if (!expires || expires > new Date()) { alert('你的账号已被封禁，无法上传'); return; }
    }

    const category = document.getElementById('uploadCategory').value;
    const title = document.getElementById('uploadTitle').value.trim();
    const description = document.getElementById('uploadDesc').value.trim();

    if (!title) { alert('请输入标题'); return; }

    isSubmitting = true;
    const btn = document.getElementById('submitBtn');
    btn.textContent = '⏳ 提交中...';
    btn.disabled = true;

    try {
        let fileUrls = [], fileNames = [], fileSizes = [];
        for (const file of uploadedFileList) {
            const filePath = `${window.currentUser.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('files')
                .upload(filePath, file);
            if (uploadError) { console.warn('上传失败:', file.name); continue; }
            const { data: urlData } = supabaseClient.storage.from('files').getPublicUrl(filePath);
            fileUrls.push(urlData.publicUrl);
            fileNames.push(file.name);
            fileSizes.push(file.size);
        }

        const insertData = {
            user_id: window.currentUser.id,
            category: category,
            title: title,
            description: description || null,
            tags: uploadedTagList.length > 0 ? uploadedTagList : null,
            status: 'pending'
        };

        if (uploadedUrlList.length > 0) insertData.url = uploadedUrlList.join(', ');
        if (fileUrls.length > 0) {
            insertData.file_url = fileUrls[0];
            insertData.file_name = fileNames[0] || '文件';
            insertData.file_size = fileSizes[0] || 0;
        }

        const { error: insertError } = await supabaseClient.from('contents').insert(insertData);
        if (insertError) throw new Error('发布失败：' + insertError.message);

        alert('✅ 提交成功！等待管理员审核。');
        closeUploadModal();
        window.navigateTo('upload'); // 刷新当前页面
    } catch (err) {
        alert('❌ ' + err.message);
    } finally {
        isSubmitting = false;
        btn.innerHTML = `${ICONS.UPLOAD} 提交审核`;
        btn.disabled = false;
    }
};

// ============================================================
//  6. 删除内容逻辑
// ============================================================
window.deleteContent = async function(contentId, fileUrl) {
    if (!confirm('确定要删除这个内容吗？')) return;
    try {
        if (fileUrl) {
            const pathParts = fileUrl.split('/');
            const storagePath = pathParts.slice(pathParts.indexOf('files') + 1).join('/');
            if (storagePath) await supabaseClient.storage.from('files').remove([storagePath]);
        }
        const { error } = await supabaseClient.from('contents').delete().eq('id', contentId);
        if (error) throw new Error(error.message);
        alert('✅ 删除成功');
        window.navigateTo('upload');
    } catch (err) { alert('❌ 删除失败：' + err.message); }
};

// 辅助：分类图标映射（复用 home.js 里的逻辑）
function getCategoryIcon(cat) {
    const map = { '论坛': ICONS.CAT_FORUM, '资源分享': ICONS.CAT_RES, '网址分享': ICONS.CAT_URL, 'VPN分享': ICONS.CAT_VPN };
    return map[cat] || ICONS.CAT_RES;
}
