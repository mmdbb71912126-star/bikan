// ============================================================
//  配 置
// ============================================================
const SUPABASE_URL = 'https://bazpyoiklkoajdhfkwly.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lTx_tYITroL8_jVVR4EjAA_Eg61lBFT';
const MAIN_ADMIN_EMAIL = '3948677391@qq.com';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
//  状 态
// ============================================================
let currentUser = null;
let currentUserRole = 'user';
let currentPage = 'home';
let currentTab = '推荐';
let allContents = [];
let allNotifications = [];
let allReports = [];
let pendingCount = 0;
let isSubmitting = false;
let uploadedFiles = [];
let uploadedUrls = [];
let uploadedTags = [];
let currentSearchQuery = '';
let isMainAdmin = false;
let detailContentId = null;
let detailContentData = null;
let detailComments = [];
let avatarFileToUpload = null;
let _canEditProfile = true;
let _lastUpdatedAt = null;
let currentReportContentId = null;
let currentAdminTab = 'users';

// ============================================================
//  DOM 引 用
// ============================================================
const app = document.getElementById('app');
const contentRender = document.getElementById('contentRender');
const announcementText = document.getElementById('announcementText');
const editAnnounceBtn = document.getElementById('editAnnounceBtn');
const navReview = document.getElementById('navReview');
const navAdmin = document.getElementById('navAdmin');
const navProfile = document.getElementById('navProfile');
const reviewBadge = document.getElementById('reviewBadge');
const reportBadge = document.getElementById('reportBadge');
const msgBadge = document.getElementById('msgBadge');
const userAvatar = document.getElementById('userAvatar');
const userEmail = document.getElementById('userEmail');
const userNickname = document.getElementById('userNickname');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const topNav = document.getElementById('topNav');

// ============================================================
//  检 查 登 录（修复循环跳转）
// ============================================================
(async function checkAuth() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = '/login.html';
            return;
        }

        // ✅ 验证 token 是否有效
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData.user) {
            await supabaseClient.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        currentUser = session.user;

        // 检查封禁状态
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('is_banned, ban_expires_at, ban_reason')
            .eq('id', currentUser.id)
            .single();

        if (profile?.is_banned) {
            const expires = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
            if (!expires || expires > new Date()) {
                await supabaseClient.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login.html?banned=true';
                return;
            }
        }

        app.classList.remove('hidden');
        await loadUserProfile();
        await loadUserRole();
        await loadAnnouncement();
        await loadNotifications();
        await loadGlobalAnnouncement();
        await loadReports();

        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || 'home';
        const id = params.get('id');
        const uid = params.get('uid');

        if (page === 'profile_view' && uid) {
            navigateTo('profile_view', uid);
        } else if (page === 'detail' && id) {
            navigateTo('detail', id);
        } else {
            navigateTo(page);
        }

        updateUI();
    } catch (err) {
        console.error('认证失败:', err);
        window.location.href = '/login.html';
    }
})();

supabaseClient.auth.onAuthStateChange((event, session) => {
    if (!session) {
        window.location.href = '/login.html';
    }
});

// ============================================================
//  路 由 系 统
// ============================================================
function navigateTo(page, id) {
    if (page === 'detail' && id) {
        currentPage = 'detail';
        detailContentId = id;
        const url = new URL(window.location);
        url.searchParams.set('page', 'detail');
        url.searchParams.set('id', id);
        url.searchParams.delete('uid');
        window.history.pushState({ page: 'detail', id: id }, '', url);
        loadDetail(id);
        return;
    }

    if (page === 'profile_view' && id) {
        currentPage = 'profile_view';
        const url = new URL(window.location);
        url.searchParams.set('page', 'profile_view');
        url.searchParams.set('uid', id);
        url.searchParams.delete('id');
        window.history.pushState({ page: 'profile_view', uid: id }, '', url);
        loadUserProfileView(id);
        return;
    }

    currentPage = page;
    const url = new URL(window.location);
    if (page === 'home') {
        url.searchParams.delete('page');
        url.searchParams.delete('id');
        url.searchParams.delete('uid');
    } else {
        url.searchParams.set('page', page);
        url.searchParams.delete('id');
        url.searchParams.delete('uid');
    }
    window.history.pushState({ page: page }, '', url);

    document.querySelectorAll('#sideNav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    if (page === 'home') {
        topNav.classList.remove('hidden');
        searchContainer.classList.remove('hidden');
        document.querySelectorAll('#topNav .tab').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === currentTab);
        });
    } else {
        topNav.classList.add('hidden');
        searchContainer.classList.add('hidden');
    }

    if (page === 'messages') {
        loadNotifications();
        renderMessages();
    } else if (page === 'review') {
        if (currentUserRole === 'admin') {
            loadContents();
        } else {
            contentRender.innerHTML =
                `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p>无权限</p></div>`;
        }
    } else if (page === 'upload') {
        loadContents();
    } else if (page === 'home') {
        loadContents(currentSearchQuery);
    } else if (page === 'profile') {
        renderProfile();
    } else if (page === 'admin') {
        if (currentUserRole === 'admin') {
            renderAdminPage();
        } else {
            contentRender.innerHTML =
                `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p>无权限访问</p></div>`;
        }
    } else {
        contentRender.innerHTML =
            `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p>页面建设中</p></div>`;
    }
}

window.addEventListener('popstate', function(event) {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'home';
    const id = params.get('id');
    const uid = params.get('uid');
    if (page === 'profile_view' && uid) {
        navigateTo('profile_view', uid);
    } else if (page === 'detail' && id) {
        navigateTo('detail', id);
    } else {
        navigateTo(page);
    }
});

// ============================================================
//  加 载 用 户 资 料
// ============================================================
async function loadUserProfile() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    if (data) {
        if (data.avatar_url) {
            userAvatar.innerHTML = `<img src="${data.avatar_url}" alt="avatar">`;
        } else {
            userAvatar.innerHTML =
                `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        }
        userNickname.textContent = data.nickname || currentUser.email.split('@')[0] || '用户';
        userEmail.textContent = currentUser.email || '';
        isMainAdmin = currentUser.email === MAIN_ADMIN_EMAIL;
        _lastUpdatedAt = data.last_updated_at || null;
    } else {
        userAvatar.innerHTML =
            `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
        userNickname.textContent = currentUser.email.split('@')[0] || '用户';
        userEmail.textContent = currentUser.email || '';
        _lastUpdatedAt = null;
    }
}

// ============================================================
//  加 载 用 户 角 色
// ============================================================
async function loadUserRole() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
    if (data) {
        currentUserRole = data.role;
    } else {
        const role = currentUser.email === MAIN_ADMIN_EMAIL ? 'admin' : 'user';
        await supabaseClient.from('profiles').upsert({
            id: currentUser.id,
            role: role,
            nickname: currentUser.email.split('@')[0]
        });
        currentUserRole = role;
    }
    isMainAdmin = currentUser.email === MAIN_ADMIN_EMAIL;
    updateUI();
}

// ============================================================
//  加 载 公 告
// ============================================================
async function loadAnnouncement() {
    const { data, error } = await supabaseClient
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
    if (data && data.length > 0) {
        announcementText.textContent = data[0].content;
    } else {
        announcementText.textContent = '🎉 欢迎来到必看网！';
    }
}

// ============================================================
//  加 载 全 局 公 告
// ============================================================
async function loadGlobalAnnouncement() {
    const { data, error } = await supabaseClient
        .from('global_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        const banner = document.getElementById('globalBanner');
        const text = document.getElementById('globalBannerText');
        const ann = data[0];
        if (ann.expires_at && new Date(ann.expires_at) < new Date()) {
            banner.style.display = 'none';
            return;
        }
        text.textContent = `📢 ${ann.title}: ${ann.content}`;
        banner.style.display = 'block';
    } else {
        document.getElementById('globalBanner').style.display = 'none';
    }
}

function closeGlobalBanner() {
    document.getElementById('globalBanner').style.display = 'none';
}

// ============================================================
//  加 载 举 报
// ============================================================
async function loadReports() {
    if (currentUserRole !== 'admin') return;

    const { data, error } = await supabaseClient
        .from('reports')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('加载举报失败:', error);
        return;
    }

    if (data) {
        for (let report of data) {
            try {
                const { data: userData } = await supabaseClient.auth.admin.getUserById(report.reporter_id);
                report.reporter_email = userData?.user?.email || '未知用户';
            } catch (e) {
                report.reporter_email = '未知用户';
            }
            try {
                const { data: contentData } = await supabaseClient
                    .from('contents')
                    .select('title')
                    .eq('id', report.content_id)
                    .single();
                report.content_title = contentData?.title || '已删除内容';
            } catch (e) {
                report.content_title = '已删除内容';
            }
        }
        allReports = data;
        const count = data.length;

        // ✅ 安全设置：先检查元素是否存在
        const reportBadge = document.getElementById('reportBadge');
        if (reportBadge) {
            reportBadge.textContent = count;
            if (count > 0) {
                reportBadge.classList.remove('hidden');
            } else {
                reportBadge.classList.add('hidden');
            }
        }

        const reportCountBadge = document.getElementById('reportCountBadge');
        if (reportCountBadge) {
            reportCountBadge.textContent = count;
        }
    }
}

// ============================================================
//  加 载 消 息
// ============================================================
async function loadNotifications() {
    if (!currentUser) return;
    const { data, error } = await supabaseClient
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(100);
    if (data) {
        allNotifications = data;
        const unread = data.filter(n => !n.is_read).length;
        if (unread > 0) {
            msgBadge.textContent = unread;
            msgBadge.classList.remove('hidden');
        } else {
            msgBadge.classList.add('hidden');
        }
    }
}

function renderMessages() {
    if (!allNotifications || allNotifications.length === 0) {
        contentRender.innerHTML =
            `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><p>暂无消息</p></div>`;
        return;
    }

    let html = '<div style="max-width:600px;margin:0 auto;">';
    allNotifications.forEach(n => {
        const iconMap = {
            'approved': '<svg viewBox="0 0 24 24" stroke="#166534"><polyline points="20 6 9 17 4 12"/></svg>',
            'rejected': '<svg viewBox="0 0 24 24" stroke="#991b1b"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            'comment': '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
            'like': '<svg viewBox="0 0 24 24" stroke="#ef4444"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
            'admin_request': '<svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
            'admin_response': '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 3 14 7 18"/><line x1="3" y1="14" x2="18" y2="14"/></svg>',
            'global_announcement': '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
            'ban': '<svg viewBox="0 0 24 24" stroke="#991b1b"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
            'unban': '<svg viewBox="0 0 24 24" stroke="#166534"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>',
            'report_created': '<svg viewBox="0 0 24 24" stroke="#ef4444"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
            'report_resolved': '<svg viewBox="0 0 24 24" stroke="#166534"><polyline points="20 6 9 17 4 12"/></svg>',
            'upload_blocked': '<svg viewBox="0 0 24 24" stroke="#d97706"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
            'upload_unblocked': '<svg viewBox="0 0 24 24" stroke="#166534"><polyline points="20 6 9 17 4 12"/></svg>'
        };
        html += `
                    <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
                        <span class="noti-icon">${iconMap[n.type] || ''}</span>
                        <div class="noti-content">
                            <div class="noti-text">${n.content}</div>
                            <div class="noti-time">${timeAgo(n.created_at)}</div>
                        </div>
                    </div>
                `;
    });
    html += '</div>';
    contentRender.innerHTML = html;
}

async function markNotificationRead(id) {
    await supabaseClient
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    await loadNotifications();
    if (currentPage === 'messages') renderMessages();
}

// ============================================================
//  加 载 内 容（含封禁检查）
// ============================================================
async function loadContents(searchQuery = '') {
    if (!currentUser) return;

    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_banned, ban_expires_at, upload_blocked_until')
        .eq('id', currentUser.id)
        .single();

    if (profile?.is_banned) {
        const expires = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
        if (!expires || expires > new Date()) {
            contentRender.innerHTML = `
                        <div class="empty-state">
                            <svg viewBox="0 0 24 24" stroke="#ef4444"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            <p style="font-size:18px;font-weight:600;color:#ef4444;">🚫 账号已被封禁</p>
                            <p style="color:#64748b;margin-top:8px;">${profile.ban_reason || '违规操作'}</p>
                            ${expires ? `<p style="color:#64748b;font-size:13px;margin-top:4px;">封禁至：${expires.toLocaleString()}</p>` : '<p style="color:#64748b;font-size:13px;margin-top:4px;">永久封禁</p>'}
                            <div class="qq-group-tip" style="margin-top:16px;max-width:400px;margin-left:auto;margin-right:auto;">
                                <span class="qq-icon">🐧</span>
                                <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                                <span style="color:#64748b;font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                            </div>
                        </div>
                    `;
            return;
        }
    }

    let query = supabaseClient.from('contents').select(`
                *,
                profiles!user_id (id, nickname, avatar_url, role)
            `);

    if (currentPage === 'home') {
        query = query.eq('status', 'approved');
        if (currentTab !== '推荐') {
            query = query.eq('category', currentTab);
        }
        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,file_name.ilike.%${searchQuery}%,url.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
        }
    } else if (currentPage === 'upload') {
        if (profile?.upload_blocked_until && new Date(profile.upload_blocked_until) > new Date()) {
            contentRender.innerHTML = `
                        <div class="empty-state">
                            <svg viewBox="0 0 24 24" stroke="#d97706"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <p style="font-size:18px;font-weight:600;color:#d97706;">🚫 上传已被限制</p>
                            <p style="color:#64748b;margin-top:8px;">限制上传至：${new Date(profile.upload_blocked_until).toLocaleString()}</p>
                            <div class="qq-group-tip" style="margin-top:16px;max-width:400px;margin-left:auto;margin-right:auto;">
                                <span class="qq-icon">🐧</span>
                                <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                                <span style="color:#64748b;font-size:12px;">如有疑问请在群内联系管理员</span>
                            </div>
                        </div>
                    `;
            return;
        }
        query = query.eq('user_id', currentUser.id);
    } else if (currentPage === 'review') {
        if (currentUserRole === 'admin') {
            query = query.eq('status', 'pending');
        } else {
            query = query.eq('status', 'approved').limit(0);
        }
    } else {
        query = query.eq('status', 'approved');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('加载内容失败:', error);
        allContents = [];
        return;
    }

    const uniqueMap = new Map();
    data.forEach(item => {
        if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
        }
    });
    allContents = Array.from(uniqueMap.values());

    if (currentUser && allContents.length > 0) {
        const contentIds = allContents.map(c => c.id);
        const { data: likesData, error: likesError } = await supabaseClient
            .from('likes')
            .select('content_id')
            .eq('user_id', currentUser.id)
            .in('content_id', contentIds);
        if (!likesError && likesData) {
            const likedIds = likesData.map(l => l.content_id);
            allContents.forEach(c => {
                c._isLiked = likedIds.includes(c.id);
            });
        }
    }

    if (currentUserRole === 'admin') {
        const { count, error: countErr } = await supabaseClient
            .from('contents')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        if (!countErr) {
            pendingCount = count || 0;
            if (pendingCount > 0) {
                reviewBadge.textContent = pendingCount;
                reviewBadge.classList.remove('hidden');
            } else {
                reviewBadge.classList.add('hidden');
            }
        }
    }

    renderContents();
}

// ============================================================
//  渲 染 内 容
// ============================================================
function renderContents() {
    contentRender.innerHTML = '';

    if (currentPage === 'upload') {
        let html = `
                    <div class="upload-header">
                        <h2>我的内容</h2>
                        <button class="btn-publish" onclick="openUploadModal()">
                            <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            发布新内容
                        </button>
                    </div>
                `;
        contentRender.innerHTML = html;
        renderContentList(allContents);
        return;
    }

    renderContentList(allContents);
}

function renderContentList(data) {
    if (!data || data.length === 0) {
        let msg = '暂无内容';
        if (currentPage === 'home') msg = '该分区暂无内容，发布第一个吧！';
        else if (currentPage === 'upload') msg = '你还没有发布任何内容，点击上方按钮发布第一个吧！';
        else if (currentPage === 'review') msg = '暂无待审核内容';
        contentRender.innerHTML += `
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                        <p>${msg}</p>
                    </div>
                `;
        return;
    }

    let html = '<div class="content-grid">';
    data.forEach(item => {
        const isOwner = item.user_id === currentUser?.id;
        const isAdmin = currentUserRole === 'admin';
        const showActions = (currentPage === 'review' && isAdmin) || (currentPage === 'upload' && isOwner);
        const isLiked = item._isLiked || false;

        let extraHtml = '';
        if (item.file_url) {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(item.file_name || '');
            extraHtml = `
                        <div class="file-info">
                            <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                            <a href="${item.file_url}" target="_blank">${item.file_name || '下载文件'}</a>
                            ${item.file_size ? ' · ' + formatSize(item.file_size) : ''}
                            ${isImage ? `<div class="image-preview"><img src="${item.file_url}" alt="${item.file_name}" loading="lazy"></div>` : ''}
                        </div>
                    `;
        }
        if (item.url) {
            extraHtml = `
                        <div class="file-info">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                            <a href="${item.url}" target="_blank">${item.url}</a>
                        </div>
                    `;
        }

        let tagsHtml = '';
        if (item.tags && item.tags.length > 0) {
            tagsHtml = `<div class="tags">${item.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`;
        }

        let statusBadge = '';
        if (currentPage === 'upload') {
            const map = {
                'pending': `<span class="status-badge pending"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>待审核</span>`,
                'approved': `<span class="status-badge approved"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>已通过</span>`,
                'rejected': `<span class="status-badge rejected"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>已拒绝</span>`
            };
            statusBadge = map[item.status] || '';
        }

        let hotBadge = '';
        if (item.likes_count >= 1000) {
            hotBadge = `<span class="hot"><svg viewBox="0 0 24 24"><path d="M12 2C12 2 8 8 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 8 12 2 12 2Z"/><path d="M12 16C14.2091 16 16 14.2091 16 12C16 12 18 14 18 16C18 18.2091 16.2091 20 14 20H10C7.79086 20 6 18.2091 6 16C6 14 8 12 8 12C8 14.2091 9.79086 16 12 16Z"/></svg>热门</span>`;
        }
        let recommendBadge = '';
        if (item.is_recommended) {
            recommendBadge = `<span class="recommended"><svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>推荐</span>`;
        }

        let actionButtons = '';
        if (showActions && currentPage === 'review' && isAdmin) {
            actionButtons = `
                        <div class="actions">
                            <button class="btn-sm approve" onclick="reviewContent(${item.id}, 'approved')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>通过</button>
                            <button class="btn-sm reject" onclick="reviewContent(${item.id}, 'rejected')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>拒绝</button>
                            <button class="btn-sm" onclick="toggleRecommend(${item.id}, ${item.is_recommended || false})">${item.is_recommended ? '⭐ 取消推荐' : '⭐ 推荐'}</button>
                            <button class="btn-sm" onclick="viewContentDetail(${item.id})"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>详情</button>
                        </div>
                    `;
        } else if (showActions && currentPage === 'upload' && isOwner) {
            actionButtons = `
                        <div class="actions">
                            <button class="btn-sm" onclick="deleteContent(${item.id}, '${item.file_url || ''}')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>删除</button>
                        </div>
                    `;
        }

        if (currentPage === 'home' && isAdmin) {
            actionButtons += `
                        <div class="actions" style="margin-top:4px;">
                            <button class="btn-sm" onclick="toggleRecommend(${item.id}, ${item.is_recommended || false})" style="font-size:11px;">${item.is_recommended ? '⭐ 取消推荐' : '⭐ 推荐'}</button>
                        </div>
                    `;
        }

        const avatarHtml = item.profiles?.avatar_url ?
            `<img src="${item.profiles.avatar_url}" alt="avatar">` :
            (item.profiles?.nickname || 'U').charAt(0).toUpperCase();

        const cardClick = `navigateTo('detail', ${item.id})`;

        const reportBtn = `
                    <button class="report-btn" onclick="event.stopPropagation();openReportModal(${item.id})" title="举报此内容">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </button>
                `;

        html += `
                    <div class="content-card" onclick="${cardClick}">
                        ${reportBtn}
                        <div class="meta">
                            <span class="cat ${getCategoryClass(item.category)}">${getCategoryIcon(item.category)} ${item.category}</span>
                            <span>${timeAgo(item.created_at)}</span>
                            ${hotBadge} ${recommendBadge}
                        </div>
                        ${tagsHtml}
                        <div class="title">${item.title}</div>
                        ${item.description ? `<div class="desc">${item.description}</div>` : ''}
                        ${extraHtml}
                        ${statusBadge}
                        ${actionButtons}
                        <div class="footer">
                            <span class="user" onclick="event.stopPropagation();navigateTo('profile_view', '${item.user_id}')">
                                <span class="avatar-sm">${avatarHtml}</span>
                                <span class="name">${item.profiles?.nickname || '用户'}</span>
                            </span>
                            <span class="stats">
                                <span onclick="event.stopPropagation();toggleLike(${item.id})" class="${isLiked ? 'liked' : ''}">
                                    <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                                    ${item.likes_count || 0}
                                </span>
                                <span onclick="event.stopPropagation();">
                                    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                    ${item.comments_count || 0}
                                </span>
                            </span>
                        </div>
                    </div>
                `;
    });
    html += '</div>';
    contentRender.innerHTML += html;
}

// ============================================================
//  个 人 中 心（独立页面）
// ============================================================
function renderProfile() {
    // 获取当前用户完整资料
    supabaseClient.from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
        .then(({ data: profile }) => {
            const avatarHtml = profile?.avatar_url ?
                `<img src="${profile.avatar_url}" alt="avatar">` :
                (userNickname.textContent || 'U').charAt(0).toUpperCase();

            // 计算下次可修改时间
            let restrictionMsg = '';
            if (_lastUpdatedAt) {
                const lastUpdated = new Date(_lastUpdatedAt);
                const now = new Date();
                const diffDays = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
                if (diffDays < 30) {
                    const daysLeft = 30 - diffDays;
                    restrictionMsg = `<div class="restriction-msg">⏳ 距离下次修改还有 <strong>${daysLeft}</strong> 天</div>`;
                }
            }

            let html = `
                        <div class="detail-container">
                            <div class="back-btn" onclick="navigateTo('home')">
                                <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                                返回首页
                            </div>
                            <div class="detail-card">
                                <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
                                    <div class="avatar-preview" style="margin:0;">${avatarHtml}</div>
                                    <div>
                                        <div style="font-size:24px;font-weight:700;color:#0f172a;">${profile?.nickname || currentUser.email.split('@')[0]}</div>
                                        <div style="font-size:13px;color:#94a3b8;">${currentUser.email}</div>
                                        <div class="user-id-display" style="margin-top:8px;">
                                            <label>🆔 用户ID</label>
                                            <div class="id-value">${currentUser.id}</div>
                                        </div>
                                    </div>
                                </div>
                                ${restrictionMsg}
                                <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9;">
                                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                                        <button class="btn-publish" onclick="openProfileEdit()" style="background:#6366f1;">
                                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                            编辑资料
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="qq-group-tip" style="margin-top:16px;">
                                <span class="qq-icon">🐧</span>
                                <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                                <span style="color:#64748b;font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                            </div>
                        </div>
                    `;
            contentRender.innerHTML = html;
        });
}

// ============================================================
//  管 理 员 页 面（独立页面）
// ============================================================
function renderAdminPage() {
    // 加载举报数据
    loadReports();

    let html = `
                <div class="detail-container">
                    <div class="back-btn" onclick="navigateTo('home')">
                        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                        返回首页
                    </div>
                    <div class="detail-card">
                        <h2 style="font-size:24px;margin-bottom:16px;">👑 管理中心</h2>

                        <!-- Tab 切换 -->
                        <div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #eef2f6;flex-wrap:wrap;">
                            <button onclick="switchAdminTab('users')" id="adminTabUsers" class="admin-tab-btn" style="padding:8px 16px;border-bottom:3px solid #6366f1;font-weight:600;color:#6366f1;background:none;cursor:pointer;font-size:14px;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                用户管理
                            </button>
                            <button onclick="switchAdminTab('reports')" id="adminTabReports" class="admin-tab-btn" style="padding:8px 16px;border-bottom:3px solid transparent;font-weight:500;color:#64748b;background:none;cursor:pointer;font-size:14px;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                举报 (<span id="reportCountBadge">0</span>)
                            </button>
                            <button onclick="switchAdminTab('announce')" id="adminTabAnnounce" class="admin-tab-btn" style="padding:8px 16px;border-bottom:3px solid transparent;font-weight:500;color:#64748b;background:none;cursor:pointer;font-size:14px;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                                全局公告
                            </button>
                            <button onclick="switchAdminTab('bans')" id="adminTabBans" class="admin-tab-btn" style="padding:8px 16px;border-bottom:3px solid transparent;font-weight:500;color:#64748b;background:none;cursor:pointer;font-size:14px;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px;"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                封禁记录
                            </button>
                        </div>

                        <div id="adminContent">
                            <!-- 默认显示用户管理 -->
                            <div id="adminTabContent">
                                <p style="color:#64748b;font-size:14px;margin-bottom:12px;">主管理员：<strong id="mainAdminEmail">3948677391@qq.com</strong></p>
                                <div style="margin-bottom:12px;">
                                    <label style="font-size:13px;font-weight:600;">操作</label>
                                    <select id="adminActionType" style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:15px;margin-top:4px;">
                                        <option value="add_admin">添加管理员 (通过ID)</option>
                                        <option value="remove_admin">撤销管理员 (通过ID)</option>
                                        <option value="ban_user">封禁用户 (通过ID)</option>
                                        <option value="unban_user">取消封禁 (通过ID)</option>
                                        <option value="block_upload">限制上传 (通过ID)</option>
                                        <option value="unblock_upload">解除上传限制 (通过ID)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>目标用户ID</label>
                                    <input type="text" id="adminTargetId" placeholder="输入用户ID (UUID格式)">
                                </div>
                                <div class="form-group" id="adminExtraField">
                                    <label>封禁时间（可选，不填为永久）</label>
                                    <input type="datetime-local" id="adminBanExpires">
                                </div>
                                <div class="form-group">
                                    <label>理由 *</label>
                                    <textarea id="adminReason" placeholder="请输入操作理由" rows="2" required></textarea>
                                </div>
                                <button onclick="submitAdminAction()" class="btn-submit">
                                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                    执行操作
                                </button>
                                <hr style="margin:16px 0;border-color:#eef2f6;">
                                <p style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">操作记录</p>
                                <div id="adminRequestList"></div>
                            </div>
                        </div>

                        <div class="qq-group-tip" style="margin-top:16px;">
                            <span class="qq-icon">🐧</span>
                            <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                            <span style="color:#64748b;font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                        </div>
                    </div>
                </div>
            `;
    contentRender.innerHTML = html;

    // 默认加载用户管理tab
    switchAdminTab('users');
}

// ============================================================
//  管 理 员 Tab 切 换
// ============================================================
function switchAdminTab(tab) {
    currentAdminTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.style.borderBottom = '3px solid transparent';
        btn.style.color = '#64748b';
        btn.style.fontWeight = '500';
    });
    const activeBtn = document.getElementById(`adminTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (activeBtn) {
        activeBtn.style.borderBottom = '3px solid #6366f1';
        activeBtn.style.color = '#6366f1';
        activeBtn.style.fontWeight = '600';
    }

    const content = document.getElementById('adminTabContent');

    if (tab === 'reports') {
        loadReports();
        let html = `
                    <h3 style="font-size:16px;margin-bottom:12px;">🚨 待处理举报</h3>
                    ${allReports.length === 0 ? '<p style="color:#94a3b8;">暂无待处理举报</p>' : ''}
                    ${allReports.map(r => `
                        <div style="padding:10px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;" onclick="openReportDetail(${r.id})">
                            <div style="font-size:14px;color:#1e293b;">${r.content_title || '已删除'}</div>
                            <div style="font-size:12px;color:#94a3b8;">举报人：${r.reporter_email || '未知'} · ${timeAgo(r.created_at)}</div>
                            <div style="font-size:12px;color:#64748b;margin-top:4px;">"${r.reason}"</div>
                            <button class="btn-sm" style="margin-top:6px;padding:2px 12px;background:#6366f1;color:#fff;border:none;border-radius:6px;font-size:11px;">查看详情</button>
                        </div>
                    `).join('')}
                `;
        content.innerHTML = html;
        return;
    }

    if (tab === 'announce') {
        let html = `
                    <h3 style="font-size:16px;margin-bottom:12px;">📢 发布全局公告</h3>
                    <div class="form-group">
                        <label>标题</label>
                        <input type="text" id="globalAnnounceTitle" placeholder="公告标题" maxlength="50">
                    </div>
                    <div class="form-group">
                        <label>内容 *</label>
                        <textarea id="globalAnnounceContent" placeholder="公告内容" rows="3" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>过期时间（可选）</label>
                        <input type="datetime-local" id="globalAnnounceExpires">
                    </div>
                    <button onclick="publishGlobalAnnouncement()" class="btn-submit">
                        <svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                        发布全局公告
                    </button>
                `;
        content.innerHTML = html;
        return;
    }

    if (tab === 'bans') {
        loadBannedUsers();
        return;
    }

    // 默认用户管理（已在HTML中）
    // 重新显示用户管理界面
    content.innerHTML = `
                <p style="color:#64748b;font-size:14px;margin-bottom:12px;">主管理员：<strong id="mainAdminEmail">3948677391@qq.com</strong></p>
                <div style="margin-bottom:12px;">
                    <label style="font-size:13px;font-weight:600;">操作</label>
                    <select id="adminActionType" style="width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:15px;margin-top:4px;">
                        <option value="add_admin">添加管理员 (通过ID)</option>
                        <option value="remove_admin">撤销管理员 (通过ID)</option>
                        <option value="ban_user">封禁用户 (通过ID)</option>
                        <option value="unban_user">取消封禁 (通过ID)</option>
                        <option value="block_upload">限制上传 (通过ID)</option>
                        <option value="unblock_upload">解除上传限制 (通过ID)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>目标用户ID</label>
                    <input type="text" id="adminTargetId" placeholder="输入用户ID (UUID格式)">
                </div>
                <div class="form-group" id="adminExtraField">
                    <label>封禁时间（可选，不填为永久）</label>
                    <input type="datetime-local" id="adminBanExpires">
                </div>
                <div class="form-group">
                    <label>理由 *</label>
                    <textarea id="adminReason" placeholder="请输入操作理由" rows="2" required></textarea>
                </div>
                <button onclick="submitAdminAction()" class="btn-submit">
                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    执行操作
                </button>
                <hr style="margin:16px 0;border-color:#eef2f6;">
                <p style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">操作记录</p>
                <div id="adminRequestList"></div>
            `;
    loadAdminRequests();
}

// ============================================================
//  加 载 封 禁 列 表
// ============================================================
async function loadBannedUsers() {
    const { data, error } = await supabaseClient
        .from('banned_users')
        .select('*, banned_by_user:banned_by(email)')
        .order('created_at', { ascending: false });

    const content = document.getElementById('adminTabContent');
    if (!data || data.length === 0) {
        content.innerHTML = `
                    <h3 style="font-size:16px;margin-bottom:12px;">🔒 封禁记录</h3>
                    <p style="color:#94a3b8;">暂无封禁记录</p>
                `;
        return;
    }

    let html = `
                <h3 style="font-size:16px;margin-bottom:12px;">封禁记录</h3>
                ${data.map(b => `
                    <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
                        <div>用户ID：<span style="font-family:monospace;font-size:12px;">${b.user_id}</span></div>
                        <div>理由：${b.reason}</div>
                        <div>封禁类型：${b.ban_type === 'permanent' ? '永久' : '临时'}</div>
                        ${b.expires_at ? `<div>到期时间：${new Date(b.expires_at).toLocaleString()}</div>` : ''}
                        <div style="color:#94a3b8;font-size:12px;">操作人：${b.banned_by_user?.email || '系统'} · ${timeAgo(b.created_at)}</div>
                    </div>
                `).join('')}
            `;
    content.innerHTML = html;
}

// ============================================================
//  发 布 全 局 公 告
// ============================================================
async function publishGlobalAnnouncement() {
    const title = document.getElementById('globalAnnounceTitle').value.trim();
    const content = document.getElementById('globalAnnounceContent').value.trim();
    const expires = document.getElementById('globalAnnounceExpires').value;

    if (!content) {
        alert('请输入公告内容');
        return;
    }

    const { error } = await supabaseClient
        .from('global_announcements')
        .insert({
            title: title || '系统公告',
            content: content,
            created_by: currentUser.id,
            expires_at: expires || null,
            is_active: true
        });

    if (error) {
        alert('发布失败：' + error.message);
        return;
    }

    const { data: users } = await supabaseClient
        .from('profiles')
        .select('id');

    if (users) {
        for (const user of users) {
            await supabaseClient.from('notifications').insert({
                user_id: user.id,
                type: 'global_announcement',
                content: `📢 ${title || '系统公告'}：${content}`,
                link: '/'
            });
        }
    }

    alert('✅ 全局公告已发布');
    document.getElementById('globalAnnounceTitle').value = '';
    document.getElementById('globalAnnounceContent').value = '';
    document.getElementById('globalAnnounceExpires').value = '';
    await loadGlobalAnnouncement();
    switchAdminTab('announce');
}

// ============================================================
//  举 报 详 情（含完整内容预览）
// ============================================================
function openReportDetail(reportId) {
    const report = allReports.find(r => r.id === reportId);
    if (!report) {
        alert('举报数据不存在');
        return;
    }

    // 获取被举报内容的完整信息
    supabaseClient.from('contents')
        .select('*')
        .eq('id', report.content_id)
        .single()
        .then(({ data: content }) => {
            let contentPreview = '';
            if (content) {
                contentPreview = `
                            <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-top:8px;">
                                <div style="font-weight:600;font-size:15px;">${content.title}</div>
                                ${content.description ? `<div style="font-size:14px;color:#475569;margin-top:4px;">${content.description}</div>` : ''}
                                ${content.file_url ? `<div style="margin-top:6px;"><a href="${content.file_url}" target="_blank" style="color:#6366f1;">📎 查看文件</a></div>` : ''}
                                ${content.url ? `<div style="margin-top:6px;"><a href="${content.url}" target="_blank" style="color:#6366f1;">🔗 ${content.url}</a></div>` : ''}
                                ${content.tags?.length ? `<div style="font-size:12px;color:#94a3b8;margin-top:4px;">标签：${content.tags.join('、')}</div>` : ''}
                            </div>
                        `;
            } else {
                contentPreview = '<div style="color:#ef4444;font-size:14px;">⚠️ 该内容已被删除</div>';
            }

            const detailHtml = `
                        <div style="margin-bottom:16px;">
                            <div style="font-size:13px;color:#94a3b8;">举报人：<strong>${report.reporter_email || '未知'}</strong></div>
                            <div style="font-size:13px;color:#94a3b8;margin-top:4px;">被举报内容：</div>
                            ${contentPreview}
                            <div style="font-size:13px;color:#94a3b8;margin-top:8px;">举报理由：</div>
                            <div style="background:#f8fafc;padding:12px;border-radius:10px;margin-top:4px;font-size:14px;color:#1e293b;">${report.reason}</div>
                            <div style="font-size:12px;color:#94a3b8;margin-top:8px;">举报时间：${timeAgo(report.created_at)}</div>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button class="btn-sm approve" onclick="resolveReport(${report.id}, 'resolved', 'content_deleted')" style="padding:8px 16px;border-radius:10px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-weight:600;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                删除内容
                            </button>
                            <button class="btn-sm" onclick="resolveReport(${report.id}, 'resolved', 'user_banned')" style="padding:8px 16px;border-radius:10px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-weight:600;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                封禁用户
                            </button>
                            <button class="btn-sm" onclick="resolveReport(${report.id}, 'resolved', 'upload_blocked')" style="padding:8px 16px;border-radius:10px;background:#fef3c7;color:#d97706;border:1px solid #fcd34d;font-weight:600;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/><polyline points="12 12 12 16 10 14"/><polyline points="12 12 16 14 12 16"/><line x1="4" y1="20" x2="20" y2="4"/></svg>
                                限制上传
                            </button>
                            <button class="btn-sm" onclick="resolveReport(${report.id}, 'dismissed', null)" style="padding:8px 16px;border-radius:10px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;">
                                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3"/></svg>
                                驳回
                            </button>
                        </div>
                    `;
            document.getElementById('reportDetailContent').innerHTML = detailHtml;
            document.getElementById('reportDetailModal').classList.remove('hidden');
        });
}

function closeReportDetail() {
    document.getElementById('reportDetailModal').classList.add('hidden');
}

// ============================================================
//  处 理 举 报
// ============================================================
async function resolveReport(reportId, status, action) {
    if (!confirm(`确定要${status === 'resolved' ? '处理' : '驳回'}这个举报吗？`)) return;

    const { data: report } = await supabaseClient
        .from('reports')
        .select('content_id')
        .eq('id', reportId)
        .single();

    if (report && action === 'content_deleted') {
        await supabaseClient
            .from('contents')
            .delete()
            .eq('id', report.content_id);
    }

    if (report && action === 'user_banned') {
        const { data: content } = await supabaseClient
            .from('contents')
            .select('user_id')
            .eq('id', report.content_id)
            .single();
        if (content) {
            await banUser(content.user_id, '因举报封禁', 'permanent', currentUser.id);
        }
    }

    if (report && action === 'upload_blocked') {
        const { data: content } = await supabaseClient
            .from('contents')
            .select('user_id')
            .eq('id', report.content_id)
            .single();
        if (content) {
            const until = new Date();
            until.setDate(until.getDate() + 7);
            await supabaseClient
                .from('profiles')
                .update({ upload_blocked_until: until.toISOString() })
                .eq('id', content.user_id);
            await supabaseClient.from('notifications').insert({
                user_id: content.user_id,
                type: 'upload_blocked',
                content: `🚫 因举报被限制上传7天，如有疑问请联系管理员`,
                link: '/'
            });
        }
    }

    await supabaseClient
        .from('reports')
        .update({
            status: status,
            action_taken: action,
            processed_by: currentUser.id,
            processed_at: new Date().toISOString()
        })
        .eq('id', reportId);

    alert('✅ 操作完成');
    closeReportDetail();
    loadReports();
    loadContents(currentSearchQuery);
}

// ============================================================
//  封 禁 功 能
// ============================================================
async function banUser(userId, reason, banType, bannedBy) {
    const expiresAt = banType === 'temporary' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null;

    const { error } = await supabaseClient
        .from('banned_users')
        .insert({
            user_id: userId,
            banned_by: bannedBy,
            reason: reason,
            ban_type: banType,
            expires_at: expiresAt
        });

    if (error) {
        console.error('封禁失败:', error);
        return false;
    }

    // 发送通知给被禁用户
    const msg = banType === 'permanent' ?
        `🔒 你的账号已被永久封禁，理由：${reason}` :
        `🔒 你的账号已被封禁至 ${new Date(expiresAt).toLocaleString()}，理由：${reason}`;
    await supabaseClient.from('notifications').insert({
        user_id: userId,
        type: 'ban',
        content: msg,
        link: '/'
    });

    return true;
}

async function unbanUser(userId) {
    const { error } = await supabaseClient
        .from('banned_users')
        .delete()
        .eq('user_id', userId);

    if (error) {
        console.error('取消封禁失败:', error);
        return false;
    }

    await supabaseClient.from('notifications').insert({
        user_id: userId,
        type: 'unban',
        content: '🔓 你的账号已被解封，欢迎回来！',
        link: '/'
    });

    return true;
}

// ============================================================
//  管 理 员 操 作 提 交
// ============================================================
async function submitAdminAction() {
    if (!currentUser || currentUserRole !== 'admin') {
        alert('无权限');
        return;
    }

    const actionType = document.getElementById('adminActionType').value;
    const targetId = document.getElementById('adminTargetId').value.trim();
    const reason = document.getElementById('adminReason').value.trim();
    const banExpires = document.getElementById('adminBanExpires').value;

    if (!targetId) {
        alert('请输入目标用户ID');
        return;
    }
    if (!reason) {
        alert('请输入操作理由');
        return;
    }

    // ✅ 验证目标用户是否存在
    const { data: targetUser, error: userError } = await supabaseClient
        .from('profiles')
        .select('id, role, email')
        .eq('id', targetId)
        .maybeSingle();  // 使用 maybeSingle 避免 406 错误

    if (userError || !targetUser) {
        alert('未找到该用户，请检查ID是否正确');
        return;
    }

    if (targetUser.id === currentUser.id) {
        alert('不能操作自己');
        return;
    }

    try {
        switch (actionType) {
            case 'add_admin':
                if (targetUser.role === 'admin') {
                    alert('该用户已经是管理员');
                    return;
                }
                await supabaseClient
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', targetId);
                await supabaseClient.from('notifications').insert({
                    user_id: targetId,
                    type: 'admin_response',
                    content: `👑 你已被 ${currentUser.email} 设为管理员`,
                    link: '/'
                });
                alert('✅ 已设为管理员');
                break;

            case 'remove_admin':
                if (targetUser.role !== 'admin') {
                    alert('该用户不是管理员');
                    return;
                }
                if (targetUser.email === MAIN_ADMIN_EMAIL) {
                    alert('不能撤销主管理员');
                    return;
                }
                await supabaseClient
                    .from('profiles')
                    .update({ role: 'user' })
                    .eq('id', targetId);
                await supabaseClient.from('notifications').insert({
                    user_id: targetId,
                    type: 'admin_response',
                    content: `📋 你已被 ${currentUser.email} 撤销管理员权限`,
                    link: '/'
                });
                alert('✅ 已撤销管理员');
                break;

            case 'ban_user':
                const banType = banExpires ? 'temporary' : 'permanent';
                const success = await banUser(targetId, reason, banType, currentUser.id);
                if (success) {
                    alert('✅ 封禁成功');
                } else {
                    alert('❌ 封禁失败，用户可能已被封禁');
                }
                break;

            case 'unban_user':
                const unbanSuccess = await unbanUser(targetId);
                if (unbanSuccess) {
                    alert('✅ 已取消封禁');
                } else {
                    alert('❌ 该用户未被封禁');
                }
                break;

            case 'block_upload':
                const until = new Date();
                until.setDate(until.getDate() + 7);
                await supabaseClient
                    .from('profiles')
                    .update({ upload_blocked_until: until.toISOString() })
                    .eq('id', targetId);
                await supabaseClient.from('notifications').insert({
                    user_id: targetId,
                    type: 'upload_blocked',
                    content: `🚫 因 ${reason}，上传功能被限制至 ${until.toLocaleString()}`,
                    link: '/'
                });
                alert('✅ 已限制上传7天');
                break;

            case 'unblock_upload':
                await supabaseClient
                    .from('profiles')
                    .update({ upload_blocked_until: null })
                    .eq('id', targetId);
                await supabaseClient.from('notifications').insert({
                    user_id: targetId,
                    type: 'upload_unblocked',
                    content: '✅ 上传限制已解除',
                    link: '/'
                });
                alert('✅ 已解除上传限制');
                break;

            default:
                alert('未知操作');
        }

        await loadUserRole();
        await loadUserProfile();
        await loadReports();
        document.getElementById('adminTargetId').value = '';
        document.getElementById('adminReason').value = '';
        document.getElementById('adminBanExpires').value = '';
        loadAdminRequests();

    } catch (err) {
        alert('操作失败：' + err.message);
    }
}

// ============================================================
//  加 载 操 作 记 录
// ============================================================
async function loadAdminRequests() {
    const { data, error } = await supabaseClient
        .from('admin_requests')
        .select('*, requester:requester_id(email), target:target_id(email), processor:processed_by(email)')
        .eq('requester_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

    const container = document.getElementById('adminRequestList');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8;font-size:13px;">暂无操作记录</p>';
        return;
    }
    container.innerHTML = data.map(r => {
        const statusMap = { 'pending': '⏳ 待审核', 'approved': '✅ 已通过', 'rejected': '❌ 已拒绝' };
        const actionMap = { 'add': '添加管理员', 'remove': '撤销管理员' };
        return `
                    <div style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;">
                        <div>${actionMap[r.action_type] || r.action_type}：${r.target?.email || '未知用户'}</div>
                        <div style="color:#64748b;font-size:12px;">理由：${r.reason}</div>
                        <div>状态：${statusMap[r.status] || r.status}</div>
                        <div style="color:#94a3b8;font-size:11px;">${timeAgo(r.created_at)}</div>
                    </div>
                `;
    }).join('');
}

// ============================================================
//  用 户 主 页
// ============================================================
async function loadUserProfileView(userId) {
    if (!currentUser) return;

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        contentRender.innerHTML =
            `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p>用户不存在</p></div>`;
        return;
    }

    const { data: contents, error: contentsError } = await supabaseClient
        .from('contents')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    const avatarHtml = profile.avatar_url ?
        `<img src="${profile.avatar_url}" alt="avatar">` :
        (profile.nickname || 'U').charAt(0).toUpperCase();

    const isBanned = profile.is_banned;
    const banStatusHtml = isBanned ?
        `<span class="ban-status banned">🚫 已封禁</span>` :
        `<span class="ban-status normal">✅ 正常</span>`;

    let html = `
                <div class="detail-container">
                    <div class="back-btn" onclick="navigateTo('home')">
                        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                        返回首页
                    </div>
                    <div class="detail-card">
                        <div class="profile-header">
                            <div class="big-avatar">${avatarHtml}</div>
                            <div class="profile-info">
                                <div class="name">${profile.nickname || '用户'}</div>
                                <div class="id-text">🆔 ${profile.id}</div>
                                ${profile.bio ? `<div class="bio-text">${profile.bio}</div>` : ''}
                                <div class="join-text">👤 加入于 ${timeAgo(profile.created_at)}</div>
                                <div>${banStatusHtml}</div>
                            </div>
                        </div>
                        <div style="padding-top:16px;border-top:1px solid #f1f5f9;">
                            <h3 style="font-size:16px;color:#0f172a;margin-bottom:12px;">📂 发布的内容 (${contents?.length || 0})</h3>
                            ${contents && contents.length > 0 ? `
                                <div class="content-grid">
                                    ${contents.map(item => `
                                        <div class="content-card" onclick="navigateTo('detail', ${item.id})">
                                            <div class="title" style="font-size:15px;">${item.title}</div>
                                            <div class="meta" style="margin-top:6px;">
                                                <span class="cat ${getCategoryClass(item.category)}">${getCategoryIcon(item.category)} ${item.category}</span>
                                                <span>${timeAgo(item.created_at)}</span>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : `<p style="color:#94a3b8;font-size:14px;">该用户暂无公开内容</p>`}
                        </div>
                    </div>
                    <div class="qq-group-tip">
                        <span class="qq-icon">🐧</span>
                        <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                        <span style="color:#64748b;font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                    </div>
                </div>
            `;

    contentRender.innerHTML = html;
}

// ============================================================
//  详 情 页
// ============================================================
async function loadDetail(contentId) {
    if (!currentUser) return;

    const { data: content, error } = await supabaseClient
        .from('contents')
        .select(`
                    *,
                    profiles!user_id (id, nickname, avatar_url, role)
                `)
        .eq('id', contentId)
        .single();

    if (error || !content) {
        contentRender.innerHTML =
            `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg><p>内容不存在或已被删除</p></div>`;
        return;
    }

    detailContentData = content;

    const { data: likeData } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('content_id', contentId)
        .single();
    const isLiked = !!likeData;

    const { data: comments, error: cmtError } = await supabaseClient
        .from('comments')
        .select(`
                    *,
                    profiles!user_id (id, nickname, avatar_url)
                `)
        .eq('content_id', contentId)
        .order('created_at', { ascending: true });

    detailComments = comments || [];

    const { data: recs } = await supabaseClient
        .from('contents')
        .select(`
                    *,
                    profiles!user_id (id, nickname, avatar_url)
                `)
        .eq('status', 'approved')
        .eq('category', content.category)
        .neq('id', contentId)
        .order('created_at', { ascending: false })
        .limit(6);

    renderDetail(content, isLiked, recs || []);
}

function renderDetail(content, isLiked, recs) {
    const avatarHtml = content.profiles?.avatar_url ?
        `<img src="${content.profiles.avatar_url}" alt="avatar">` :
        (content.profiles?.nickname || 'U').charAt(0).toUpperCase();

    let extraHtml = '';
    if (content.file_url) {
        const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(content.file_name || '');
        extraHtml = `
                    <div class="detail-file">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                        <a href="${content.file_url}" target="_blank">${content.file_name || '下载文件'}</a>
                        ${content.file_size ? ' · ' + formatSize(content.file_size) : ''}
                        ${isImage ? `<div class="detail-image"><img src="${content.file_url}" alt="${content.file_name}" loading="lazy"></div>` : ''}
                    </div>
                `;
    }
    if (content.url) {
        extraHtml = `
                    <div class="detail-file">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                        <a href="${content.url}" target="_blank">${content.url}</a>
                    </div>
                `;
    }

    let tagsHtml = '';
    if (content.tags && content.tags.length > 0) {
        tagsHtml = `<div class="detail-tags">${content.tags.map(t => `<span class="tag">#${t}</span>`).join('')}</div>`;
    }

    let recHtml = '';
    if (recs.length > 0) {
        recHtml = `
                    <div class="recommend-section">
                        <h3>📌 类似内容推荐</h3>
                        <div class="recommend-grid">
                            ${recs.map(r => {
                                const recAvatar = r.profiles?.avatar_url ? `<img src="${r.profiles.avatar_url}" alt="avatar">` : (r.profiles?.nickname || 'U').charAt(0).toUpperCase();
                                return `
                                    <div class="recommend-item" onclick="navigateTo('detail', ${r.id})">
                                        <div class="rec-title">${r.title}</div>
                                        <div class="rec-meta">
                                            <span class="rec-cat ${getCategoryClass(r.category)}">${getCategoryIcon(r.category)} ${r.category}</span>
                                            <span>${timeAgo(r.created_at)}</span>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
    }

    let commentsHtml = '';
    if (detailComments.length > 0) {
        commentsHtml = detailComments.map(c => {
            const cAvatar = c.profiles?.avatar_url ?
                `<img src="${c.profiles.avatar_url}" alt="avatar">` :
                (c.profiles?.nickname || 'U').charAt(0).toUpperCase();
            return `
                        <div class="comment-item">
                            <span class="avatar-sm" onclick="navigateTo('profile_view', '${c.user_id}')">${cAvatar}</span>
                            <div class="cmt-content">
                                <div class="cmt-user" onclick="navigateTo('profile_view', '${c.user_id}')">${c.profiles?.nickname || '用户'}</div>
                                <div class="cmt-text">${c.content}</div>
                            </div>
                            <span class="cmt-time">${timeAgo(c.created_at)}</span>
                        </div>
                    `;
        }).join('');
    } else {
        commentsHtml = '<div style="color:#94a3b8;font-size:14px;padding:8px 0;">暂无评论</div>';
    }

    const isAdmin = currentUserRole === 'admin';

    let adminActions = '';
    if (isAdmin && content.status === 'pending') {
        adminActions = `
                    <div style="margin-top:12px;display:flex;gap:8px;">
                        <button class="btn-sm approve" onclick="reviewContent(${content.id}, 'approved');navigateTo('home')" style="padding:6px 18px;border-radius:10px;background:#dcfce7;color:#166534;border:1px solid #86efac;font-weight:600;">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>通过
                        </button>
                        <button class="btn-sm reject" onclick="reviewContent(${content.id}, 'rejected');navigateTo('home')" style="padding:6px 18px;border-radius:10px;background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;font-weight:600;">
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>拒绝
                        </button>
                        <button class="btn-sm" onclick="toggleRecommend(${content.id}, ${content.is_recommended || false})" style="padding:6px 18px;border-radius:10px;background:#fef3c7;color:#d97706;border:1px solid #fcd34d;">
                            ${content.is_recommended ? '⭐ 取消推荐' : '⭐ 推荐'}
                        </button>
                    </div>
                `;
    } else if (isAdmin) {
        adminActions = `
                    <div style="margin-top:12px;display:flex;gap:8px;">
                        <button class="btn-sm" onclick="toggleRecommend(${content.id}, ${content.is_recommended || false})" style="padding:6px 18px;border-radius:10px;background:#fef3c7;color:#d97706;border:1px solid #fcd34d;">
                            ${content.is_recommended ? '⭐ 取消推荐' : '⭐ 推荐'}
                        </button>
                    </div>
                `;
    }

    const html = `
                <div class="detail-container">
                    <div class="back-btn" onclick="navigateTo('home')">
                        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                        返回首页
                    </div>
                    <div class="detail-card">
                        <button class="detail-report-btn" onclick="openReportModal(${content.id})" title="举报此内容">
                            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        </button>
                        <div class="detail-meta">
                            <span class="cat ${getCategoryClass(content.category)}">${getCategoryIcon(content.category)} ${content.category}</span>
                            <span>${timeAgo(content.created_at)}</span>
                            ${content.is_recommended ? '<span style="background:#f59e0b;color:#fff;padding:0 10px;border-radius:12px;font-size:11px;font-weight:600;">⭐ 推荐</span>' : ''}
                            ${content.likes_count >= 1000 ? '<span style="background:#ef4444;color:#fff;padding:0 10px;border-radius:12px;font-size:11px;font-weight:600;">🔥 热门</span>' : ''}
                            ${content.status === 'pending' ? '<span style="background:#fef3c7;color:#d97706;padding:0 10px;border-radius:12px;font-size:11px;font-weight:600;">⏳ 待审核</span>' : ''}
                        </div>
                        <div class="detail-title">${content.title}</div>
                        ${content.description ? `<div class="detail-desc">${content.description}</div>` : ''}
                        ${extraHtml}
                        ${tagsHtml}
                        ${adminActions}
                        <div class="detail-footer">
                            <span class="user" onclick="navigateTo('profile_view', '${content.user_id}')">
                                <span class="avatar-sm">${avatarHtml}</span>
                                <span class="name">${content.profiles?.nickname || '用户'}</span>
                            </span>
                            <span class="stats">
                                <span onclick="toggleLikeDetail(${content.id})" class="${isLiked ? 'liked' : ''}">
                                    <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/><path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>
                                    ${content.likes_count || 0}
                                </span>
                                <span>
                                    <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                    ${content.comments_count || 0}
                                </span>
                            </span>
                        </div>
                    </div>

                    <div class="detail-comments">
                        <h3>💬 评论 (${content.comments_count || 0})</h3>
                        <div class="comment-input">
                            <input type="text" id="detailCommentInput" placeholder="写评论..." maxlength="200">
                            <button onclick="postDetailComment(${content.id})">
                                <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                                发送
                            </button>
                        </div>
                        <div class="comment-list" id="detailCommentList">
                            ${commentsHtml}
                        </div>
                    </div>

                    ${recHtml}
                    <div class="qq-group-tip" style="margin-top:16px;">
                        <span class="qq-icon">🐧</span>
                        <span>必看网官方QQ群：<span class="qq-number">976926251</span></span>
                        <span style="color:#64748b;font-size:12px;">如被误封请在群内艾特管理员申诉</span>
                    </div>
                </div>
            `;

    contentRender.innerHTML = html;
}

// ============================================================
//  详 情 页 点 赞
// ============================================================
async function toggleLikeDetail(contentId) {
    if (!currentUser) return;
    const item = detailContentData;
    if (!item) return;

    const { data: exist } = await supabaseClient
        .from('likes')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('content_id', contentId)
        .single();

    if (exist) {
        await supabaseClient
            .from('likes')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('content_id', contentId);
        item.likes_count = (item.likes_count || 1) - 1;
    } else {
        await supabaseClient
            .from('likes')
            .insert({ user_id: currentUser.id, content_id: contentId });
        item.likes_count = (item.likes_count || 0) + 1;
        if (item.user_id !== currentUser.id) {
            await supabaseClient.from('notifications').insert({
                user_id: item.user_id,
                type: 'like',
                content: `❤️ ${currentUser.email} 点赞了你的内容 "${item.title}"`,
                link: `/detail?id=${contentId}`
            });
        }
    }

    await supabaseClient
        .from('contents')
        .update({ likes_count: item.likes_count })
        .eq('id', contentId);

    loadDetail(contentId);
    loadNotifications();
}

// ============================================================
//  详 情 页 评 论
// ============================================================
async function postDetailComment(contentId) {
    const input = document.getElementById('detailCommentInput');
    const content = input.value.trim();
    if (!content) { alert('请输入评论内容'); return; }
    if (!currentUser) { alert('请先登录'); return; }

    const { error } = await supabaseClient
        .from('comments')
        .insert({
            user_id: currentUser.id,
            content_id: contentId,
            content: content
        });

    if (error) {
        alert('评论失败：' + error.message);
        return;
    }

    const item = detailContentData;
    if (item) {
        item.comments_count = (item.comments_count || 0) + 1;
        await supabaseClient
            .from('contents')
            .update({ comments_count: item.comments_count })
            .eq('id', contentId);
    }

    if (item && item.user_id !== currentUser.id) {
        await supabaseClient.from('notifications').insert({
            user_id: item.user_id,
            type: 'comment',
            content: `💬 ${currentUser.email} 评论了你的内容 "${item.title}"：${content}`,
            link: `/detail?id=${contentId}`
        });
    }

    input.value = '';
    loadDetail(contentId);
    loadNotifications();
}

// ============================================================
//  举 报 功 能
// ============================================================
function openReportModal(contentId) {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    currentReportContentId = contentId;
    document.getElementById('reportReason').value = '';
    document.getElementById('reportCharCount').textContent = '0';
    document.getElementById('reportModal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('reportModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const reasonInput = document.getElementById('reportReason');
    if (reasonInput) {
        reasonInput.addEventListener('input', function() {
            document.getElementById('reportCharCount').textContent = this.value.length;
        });
    }
});

async function submitReport() {
    const reason = document.getElementById('reportReason').value.trim();
    if (!reason) {
        alert('请输入举报理由');
        return;
    }
    if (reason.length < 5) {
        alert('举报理由至少5个字');
        return;
    }

    const { error } = await supabaseClient
        .from('reports')
        .insert({
            reporter_id: currentUser.id,
            content_id: currentReportContentId,
            reason: reason,
            status: 'pending'
        });

    if (error) {
        alert('举报失败：' + error.message);
        return;
    }

    const { data: admins } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

    if (admins) {
        const content = await supabaseClient
            .from('contents')
            .select('title')
            .eq('id', currentReportContentId)
            .single();

        for (const admin of admins) {
            await supabaseClient.from('notifications').insert({
                user_id: admin.id,
                type: 'report_created',
                content: `🚨 ${currentUser.email} 举报了内容 "${content.data?.title || '未知'}"：${reason}`,
                link: '/admin'
            });
        }
    }

    alert('✅ 举报已提交，管理员将尽快处理');
    closeReportModal();
    loadReports();
}

// ============================================================
//  工 具 函 数
// ============================================================
function getCategoryIcon(cat) {
    const map = { '论坛': '💬', '资源分享': '📦', '网址分享': '🔗', 'VPN分享': '🔒' };
    return map[cat] || '📎';
}

function getCategoryClass(cat) {
    const map = { '论坛': 'forum', '资源分享': 'res', '网址分享': 'url', 'VPN分享': 'vpn' };
    return map[cat] || '';
}

function formatSize(bytes) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

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

// ============================================================
//  切 换 分 区
// ============================================================
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('#topNav .tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    if (currentPage === 'home') {
        loadContents(currentSearchQuery);
    }
}

// ============================================================
//  更 新 UI
// ============================================================
function updateUI() {
    if (currentUserRole === 'admin') {
        navReview.classList.remove('hidden');
        navAdmin.classList.remove('hidden');
        editAnnounceBtn.classList.remove('hidden');
        navProfile.classList.remove('hidden');
    } else {
        navReview.classList.add('hidden');
        navAdmin.classList.add('hidden');
        editAnnounceBtn.classList.add('hidden');
        navProfile.classList.remove('hidden');
    }
    if (currentUserRole === 'admin') {
        loadReports();
    }
}

// ============================================================
//  退 出
// ============================================================
async function handleLogout() {
    try {
        await supabaseClient.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login.html';
    } catch (e) {
        window.location.href = '/login.html';
    }
}

// ============================================================
//  搜 索
// ============================================================
function doSearch() {
    const query = searchInput.value.trim();
    currentSearchQuery = query;
    if (currentPage === 'home') {
        loadContents(query);
    }
}

// ============================================================
//  上 传 弹 窗
// ============================================================
let uploadedFileList = [];
let uploadedUrlList = [];
let uploadedTagList = [];

function openUploadModal() {
    if (!currentUser) return;
    uploadedFileList = [];
    uploadedUrlList = [];
    uploadedTagList = [];
    document.getElementById('uploadModal').classList.remove('hidden');
    document.getElementById('uploadForm').reset();
    document.getElementById('uploadFileName').textContent = '点击选择文件（可多个）';
    document.getElementById('tagList').innerHTML = '';
    document.getElementById('urlList').innerHTML = '';
    document.getElementById('urlGroup').style.display = 'block';
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
}

function updateFileNames(input) {
    const files = input.files;
    if (files.length > 0) {
        uploadedFileList = Array.from(files);
        document.getElementById('uploadFileName').textContent = files.length + ' 个文件';
    } else {
        uploadedFileList = [];
        document.getElementById('uploadFileName').textContent = '点击选择文件（可多个）';
    }
}

function addTag() {
    const input = document.getElementById('tagInput');
    const tag = input.value.trim();
    if (!tag) return;
    if (uploadedTagList.includes(tag)) { input.value = ''; return; }
    uploadedTagList.push(tag);
    input.value = '';
    renderTags();
}

function removeTag(tag) {
    uploadedTagList = uploadedTagList.filter(t => t !== tag);
    renderTags();
}

function renderTags() {
    const container = document.getElementById('tagList');
    container.innerHTML = uploadedTagList.map(t =>
        `<span class="tag-item">#${t} <span class="remove" onclick="removeTag('${t}')">✕</span></span>`
    ).join('');
}

function addUrl() {
    const input = document.getElementById('uploadUrlInput');
    const url = input.value.trim();
    if (!url) return;
    if (uploadedUrlList.includes(url)) { input.value = ''; return; }
    uploadedUrlList.push(url);
    input.value = '';
    renderUrls();
}

function removeUrl(url) {
    uploadedUrlList = uploadedUrlList.filter(u => u !== url);
    renderUrls();
}

function renderUrls() {
    const container = document.getElementById('urlList');
    container.innerHTML = uploadedUrlList.map(u =>
        `<span class="url-tag">🔗 ${u} <span class="remove" onclick="removeUrl('${u}')">✕</span></span>`
    ).join('');
}

// ============================================================
//  提 交 内 容（含封禁检查）
// ============================================================
async function submitContent(e) {
    e.preventDefault();
    if (isSubmitting) return;
    if (!currentUser) { alert('请先登录'); return; }

    // ✅ 检查是否被封禁
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('is_banned, ban_expires_at')
        .eq('id', currentUser.id)
        .single();

    if (profile?.is_banned) {
        const expires = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
        if (!expires || expires > new Date()) {
            alert('你的账号已被封禁，无法上传');
            return;
        }
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
        let fileUrls = [],
            fileNames = [],
            fileSizes = [];
        for (const file of uploadedFileList) {
            const filePath = `${currentUser.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('files')
                .upload(filePath, file);
            if (uploadError) {
                console.warn('文件上传失败:', uploadError, file.name);
                continue;
            }
            const { data: urlData } = supabaseClient.storage
                .from('files')
                .getPublicUrl(filePath);
            fileUrls.push(urlData.publicUrl);
            fileNames.push(file.name);
            fileSizes.push(file.size);
        }

        const allUrls = [...uploadedUrlList];
        const allFiles = fileUrls;

        const insertData = {
            user_id: currentUser.id,
            category: category,
            title: title,
            description: description || null,
            tags: uploadedTagList.length > 0 ? uploadedTagList : null,
            status: 'pending'
        };

        if (allUrls.length > 0) {
            insertData.url = allUrls.join(', ');
        }
        if (allFiles.length > 0) {
            insertData.file_url = allFiles[0];
            insertData.file_name = fileNames[0] || '文件';
            insertData.file_size = fileSizes[0] || 0;
        }

        const { error: insertError } = await supabaseClient
            .from('contents')
            .insert(insertData);

        if (insertError) throw new Error('发布失败：' + insertError.message);

        alert('✅ 提交成功！等待管理员审核。');
        closeUploadModal();
        if (currentPage === 'home' || currentPage === 'upload') {
            loadContents(currentSearchQuery);
        }
    } catch (err) {
        alert('❌ ' + err.message);
    } finally {
        isSubmitting = false;
        btn.innerHTML =
            '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> 提交审核';
        btn.disabled = false;
    }
}

// ============================================================
//  审 核
// ============================================================
async function reviewContent(contentId, status) {
    if (!confirm(`确定要 ${status === 'approved' ? '通过' : '拒绝'} 这个内容吗？`)) return;
    const { error } = await supabaseClient
        .from('contents')
        .update({ status: status, updated_at: new Date().toISOString() })
        .eq('id', contentId);
    if (error) {
        alert('操作失败：' + error.message);
    } else {
        const { data: content } = await supabaseClient
            .from('contents')
            .select('user_id, title')
            .eq('id', contentId)
            .single();
        if (content) {
            const msg = status === 'approved' ?
                `✅ 你的内容 "${content.title}" 已通过审核！` :
                `❌ 你的内容 "${content.title}" 已被拒绝。`;
            await supabaseClient.from('notifications').insert({
                user_id: content.user_id,
                type: status === 'approved' ? 'approved' : 'rejected',
                content: msg,
                link: `/detail?id=${contentId}`
            });
        }
        alert('✅ 操作成功');
        loadNotifications();
        if (currentPage === 'home' || currentPage === 'upload' || currentPage === 'review') {
            loadContents(currentSearchQuery);
        }
        if (currentPage === 'detail' && detailContentId) {
            loadDetail(detailContentId);
        }
    }
}

// ============================================================
//  推 荐
// ============================================================
async function toggleRecommend(contentId, current) {
    if (!confirm(`确定要 ${current ? '取消推荐' : '推荐'} 这个内容吗？`)) return;
    const { error } = await supabaseClient
        .from('contents')
        .update({ is_recommended: !current })
        .eq('id', contentId);
    if (error) {
        alert('操作失败：' + error.message);
    } else {
        alert('✅ 操作成功');
        if (currentPage === 'home' || currentPage === 'upload' || currentPage === 'review') {
            loadContents(currentSearchQuery);
        }
        if (currentPage === 'detail' && detailContentId) {
            loadDetail(detailContentId);
        }
    }
}

// ============================================================
//  删 除
// ============================================================
async function deleteContent(contentId, fileUrl) {
    if (!confirm('确定要删除这个内容吗？')) return;
    try {
        if (fileUrl) {
            const pathParts = fileUrl.split('/');
            const storagePath = pathParts.slice(pathParts.indexOf('files') + 1).join('/');
            if (storagePath) {
                await supabaseClient.storage.from('files').remove([storagePath]);
            }
        }
        const { error } = await supabaseClient
            .from('contents')
            .delete()
            .eq('id', contentId);
        if (error) throw new Error(error.message);
        alert('✅ 删除成功');
        if (currentPage === 'home' || currentPage === 'upload' || currentPage === 'review') {
            loadContents(currentSearchQuery);
        }
        if (currentPage === 'detail') {
            navigateTo('home');
        }
    } catch (err) { alert('❌ 删除失败：' + err.message); }
}

// ============================================================
//  点 赞（列表页）
// ============================================================
async function toggleLike(contentId) {
    if (!currentUser) return;
    const item = allContents.find(c => c.id === contentId);
    if (!item) return;

    if (item._isLiked) {
        const { error } = await supabaseClient
            .from('likes')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('content_id', contentId);
        if (error) {
            alert('操作失败：' + error.message);
            return;
        }
        item._isLiked = false;
        item.likes_count = (item.likes_count || 1) - 1;
    } else {
        const { error } = await supabaseClient
            .from('likes')
            .insert({ user_id: currentUser.id, content_id: contentId });
        if (error) {
            alert('操作失败：' + error.message);
            return;
        }
        item._isLiked = true;
        item.likes_count = (item.likes_count || 0) + 1;
        if (item.user_id !== currentUser.id) {
            await supabaseClient.from('notifications').insert({
                user_id: item.user_id,
                type: 'like',
                content: `❤️ ${currentUser.email} 点赞了你的内容 "${item.title}"`,
                link: `/detail?id=${contentId}`
            });
        }
    }

    await supabaseClient
        .from('contents')
        .update({ likes_count: item.likes_count })
        .eq('id', contentId);

    renderContents();
    loadNotifications();
}

// ============================================================
//  公 告 编 辑
// ============================================================
function openAnnounceEditor() {
    document.getElementById('announceInput').value = announcementText.textContent;
    document.getElementById('announceModal').classList.remove('hidden');
}

function closeAnnounceModal() {
    document.getElementById('announceModal').classList.add('hidden');
}

async function saveAnnouncement() {
    const content = document.getElementById('announceInput').value.trim();
    if (!content) { alert('请输入公告内容'); return; }
    const { error } = await supabaseClient
        .from('announcements')
        .insert({ content: content, is_active: true });
    if (error) { alert('保存失败：' + error.message); } else {
        alert('✅ 公告已更新');
        closeAnnounceModal();
        loadAnnouncement();
    }
}

// ============================================================
//  编 辑 个 人 资 料
// ============================================================
function previewAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    avatarFileToUpload = file;
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('avatarPreview').innerHTML = `<img src="${e.target.result}" alt="avatar">`;
        document.getElementById('avatarFileName').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function openProfileEdit() {
    if (!currentUser) return;
    avatarFileToUpload = null;

    // 显示用户 ID
    document.getElementById('userIdDisplay').textContent = currentUser.id;

    const restrictionMsg = document.getElementById('editRestrictionMsg');
    const restrictionDays = document.getElementById('restrictionDays');

    if (_lastUpdatedAt) {
        const lastUpdated = new Date(_lastUpdatedAt);
        const now = new Date();
        const diffDays = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
            const daysLeft = 30 - diffDays;
            _canEditProfile = false;
            restrictionMsg.classList.remove('hidden');
            restrictionDays.textContent = daysLeft;
            document.getElementById('saveProfileBtn').disabled = true;
            document.getElementById('saveProfileBtn').style.opacity = '0.6';
        } else {
            _canEditProfile = true;
            restrictionMsg.classList.add('hidden');
            document.getElementById('saveProfileBtn').disabled = false;
            document.getElementById('saveProfileBtn').style.opacity = '1';
        }
    } else {
        _canEditProfile = true;
        restrictionMsg.classList.add('hidden');
        document.getElementById('saveProfileBtn').disabled = false;
        document.getElementById('saveProfileBtn').style.opacity = '1';
    }

    // 加载当前资料
    document.getElementById('avatarPreview').innerHTML =
        `<svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    document.getElementById('avatarFileName').textContent = '点击选择图片';
    document.getElementById('editAvatar').value = '';
    document.getElementById('editNickname').value = userNickname.textContent || '';
    document.getElementById('editBio').value = '';

    supabaseClient.from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
        .then(({ data }) => {
            if (data) {
                if (data.avatar_url) {
                    document.getElementById('avatarPreview').innerHTML =
                        `<img src="${data.avatar_url}" alt="avatar">`;
                }
                document.getElementById('editAvatar').value = data.avatar_url || '';
                document.getElementById('editNickname').value = data.nickname || '';
                document.getElementById('editBio').value = data.bio || '';
                _lastUpdatedAt = data.last_updated_at || null;
                if (_lastUpdatedAt) {
                    const lastUpdated = new Date(_lastUpdatedAt);
                    const now = new Date();
                    const diffDays = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
                    if (diffDays < 30) {
                        const daysLeft = 30 - diffDays;
                        _canEditProfile = false;
                        restrictionMsg.classList.remove('hidden');
                        restrictionDays.textContent = daysLeft;
                        document.getElementById('saveProfileBtn').disabled = true;
                        document.getElementById('saveProfileBtn').style.opacity = '0.6';
                    } else {
                        _canEditProfile = true;
                        restrictionMsg.classList.add('hidden');
                        document.getElementById('saveProfileBtn').disabled = false;
                        document.getElementById('saveProfileBtn').style.opacity = '1';
                    }
                }
            }
        });

    document.getElementById('profileEditModal').classList.remove('hidden');
}

function closeProfileEdit() {
    document.getElementById('profileEditModal').classList.add('hidden');
}

async function saveProfile() {
    if (!_canEditProfile && _lastUpdatedAt) {
        const lastUpdated = new Date(_lastUpdatedAt);
        const now = new Date();
        const diffDays = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
        if (diffDays < 30) {
            const daysLeft = 30 - diffDays;
            alert(`⏳ 距离下次修改还有 ${daysLeft} 天，每30天只能修改一次个人资料`);
            return;
        }
    }

    const avatar_url_input = document.getElementById('editAvatar').value.trim();
    const nickname = document.getElementById('editNickname').value.trim();
    const bio = document.getElementById('editBio').value.trim();

    const updateData = {};
    if (nickname) updateData.nickname = nickname;
    if (bio) updateData.bio = bio;

    if (avatarFileToUpload) {
        const filePath = `${currentUser.id}/${Date.now()}_${avatarFileToUpload.name}`;
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(filePath, avatarFileToUpload);
        if (!uploadError) {
            const { data: urlData } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(filePath);
            updateData.avatar_url = urlData.publicUrl;
        } else {
            console.warn('头像上传失败:', uploadError);
            if (avatar_url_input) updateData.avatar_url = avatar_url_input;
        }
    } else if (avatar_url_input) {
        updateData.avatar_url = avatar_url_input;
    }

    if (Object.keys(updateData).length === 0) {
        alert('没有修改任何内容');
        return;
    }

    updateData.last_updated_at = new Date().toISOString();

    const { error } = await supabaseClient
        .from('profiles')
        .update(updateData)
        .eq('id', currentUser.id);

    if (error) {
        alert('保存失败：' + error.message);
    } else {
        alert('✅ 保存成功');
        _lastUpdatedAt = updateData.last_updated_at;
        _canEditProfile = false;
        closeProfileEdit();
        await loadUserProfile();
        if (currentPage === 'home' || currentPage === 'upload') {
            loadContents(currentSearchQuery);
        }
        if (currentPage === 'detail' && detailContentId) {
            loadDetail(detailContentId);
        }
        loadUserProfile();
        // 如果当前在个人中心，刷新个人中心
        if (currentPage === 'profile') {
            renderProfile();
        }
    }
}

// ============================================================
//  初 始 化
// ============================================================
console.log('👁️ 必看网 v15.0.0 (全功能修复版)');
console.log('📧 主管理员:', MAIN_ADMIN_EMAIL);
console.log('🐧 官方QQ群: 976926251');

// 封禁状态定期检查
setInterval(async function() {
    if (currentUser) {
        const { data } = await supabaseClient
            .from('profiles')
            .select('is_banned, ban_expires_at')
            .eq('id', currentUser.id)
            .single();
        if (data?.is_banned) {
            const expires = data.ban_expires_at ? new Date(data.ban_expires_at) : null;
            if (!expires || expires > new Date()) {
                // 被封禁，强制退出
                await supabaseClient.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login.html?banned=true';
            }
        }
    }
}, 60000);
