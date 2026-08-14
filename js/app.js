// ============================================================
// js/app.js
// 必看 - 核心应用逻辑（路由、页面渲染、交互）
// 依赖：config.js, components.js（需先加载）
// ============================================================

(function() {
    console.log('[必看] app.js 开始加载');

    // ---------- 内置工具函数 ----------
    function timeAgo(dateStr) {
        if (!dateStr) return '';
        const now = new Date();
        const date = new Date(dateStr);
        const seconds = Math.floor((now - date) / 1000);
        if (seconds < 60) return '刚刚';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return minutes + '分钟前';
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + '小时前';
        const days = Math.floor(hours / 24);
        if (days < 30) return days + '天前';
        const months = Math.floor(days / 30);
        if (months < 12) return months + '个月前';
        return new Date(dateStr).toLocaleDateString();
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const cfg = window.BikanConfig;
    const comp = window.BikanComponents;
    const { supabaseClient, sdkReady, ROUTES, EXPLORE_TABS, FILE_TYPES } = cfg;
    const { Icons, renderPostCard, renderCommentItem, renderNotificationItem, renderUserCard, renderTopicCard, renderFileDetail, getUserAvatarHTML, getUserDisplayName, getUserHandle, openModal, showToast } = comp;

    let currentUser = null;
    let currentUserAuth = null;
    let currentRoute = ROUTES.EXPLORE;
    let currentTab = EXPLORE_TABS.SQUARE;
    let notificationsUnread = 0;
    let unreadMessages = 0;
    let unreadFriendRequests = 0;
    let isTogglingLike = false;
    let isTogglingFavorite = false;
    let realtimeChannels = [];

    const appContainer = document.getElementById('app');
    const sidebarNav = document.getElementById('sidebarNav');
    const mainContent = document.getElementById('mainContent');
    const navBadge = document.getElementById('navBadge');

    // ---------- 初始化 ----------
    async function init() {
        console.log('[必看] 初始化开始');
        if (!sdkReady) {
            showToast('Supabase 未初始化', 'error');
            return;
        }
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                window.location.href = 'index.html';
                return;
            }
            currentUserAuth = session.user;
            const { data: profile, error: profileError } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', currentUserAuth.id)
                .single();
            if (profileError) {
                console.error('获取用户资料失败', profileError);
                showToast('获取用户资料失败', 'error');
                return;
            }
            currentUser = profile;
            console.log('[必看] 当前用户:', currentUser.username || currentUser.id);

            if (currentUser.is_banned) addBannedOverlay();

            await supabaseClient.from('profiles').update({ is_online: true, last_active_at: new Date().toISOString() }).eq('id', currentUser.id);
            await loadUnreadCounts();
            renderSidebar();
            navigateTo(ROUTES.EXPLORE);
            supabaseClient.auth.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT') window.location.href = 'index.html';
            });
            setupGlobalEventDelegation();
            setupRealtimeSubscriptions();
        } catch (e) {
            console.error('初始化失败', e);
            showToast('初始化失败: ' + e.message, 'error');
        }
    }

    function addBannedOverlay() {
        if (document.querySelector('.banned-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'banned-overlay';
        overlay.innerHTML = `<div class="banned-logo">${Icons.logo(150)}</div><div class="banned-text">你已被封禁</div>`;
        document.body.appendChild(overlay);
    }

    // ---------- 加载未读计数 ----------
    async function loadUnreadCounts() {
        if (!currentUser) return;
        await Promise.all([loadUnreadNotifications(), loadUnreadMessages(), loadUnreadFriendRequests()]);
        updateAllBadges();
    }

    async function loadUnreadNotifications() {
        const { count, error } = await supabaseClient
            .from('notifications').select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = (!error && count !== null) ? count : 0;
    }

    async function loadUnreadMessages() {
        const { count, error } = await supabaseClient
            .from('messages').select('id', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id).eq('is_read', false);
        unreadMessages = (!error && count !== null) ? count : 0;
    }

    async function loadUnreadFriendRequests() {
        const { count, error } = await supabaseClient
            .from('friend_requests').select('id', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id).eq('status', 'pending');
        unreadFriendRequests = (!error && count !== null) ? count : 0;
    }

    function updateAllBadges() {
        updateNavBadge();
        updateMessageBadge();
        updateFriendRequestBadge();
        updateNotificationBadge();
    }

    function updateNavBadge() {
        const socialNavItem = document.querySelector('.nav-item[data-route="social"]');
        if (!socialNavItem) return;
        let badge = socialNavItem.querySelector('.nav-badge');
        const totalUnread = notificationsUnread + unreadMessages + unreadFriendRequests;
        if (totalUnread > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; socialNavItem.appendChild(badge); }
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.classList.remove('hidden');
        } else { if (badge) badge.remove(); }
    }

    function updateMessageBadge() {
        const friendsTab = document.querySelector('.tab-item[data-social-tab="friends"]');
        if (!friendsTab) return;
        let badge = friendsTab.querySelector('.nav-badge');
        if (unreadMessages > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; friendsTab.appendChild(badge); }
            badge.textContent = unreadMessages > 99 ? '99+' : unreadMessages;
            badge.classList.remove('hidden');
        } else { if (badge) badge.remove(); }
    }

    function updateFriendRequestBadge() {
        const requestsTab = document.querySelector('.tab-item[data-social-tab="requests"]');
        if (!requestsTab) return;
        let badge = requestsTab.querySelector('.nav-badge');
        if (unreadFriendRequests > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; requestsTab.appendChild(badge); }
            badge.textContent = unreadFriendRequests > 99 ? '99+' : unreadFriendRequests;
            badge.classList.remove('hidden');
        } else { if (badge) badge.remove(); }
    }

    function updateNotificationBadge() {
        const notifTab = document.querySelector('.tab-item[data-social-tab="notifications"]');
        if (!notifTab) return;
        let badge = notifTab.querySelector('.nav-badge');
        if (notificationsUnread > 0) {
            if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; notifTab.appendChild(badge); }
            badge.textContent = notificationsUnread > 99 ? '99+' : notificationsUnread;
            badge.classList.remove('hidden');
        } else { if (badge) badge.remove(); }
    }

    // ---------- 实时订阅 ----------
    function setupRealtimeSubscriptions() {
        if (!supabaseClient) return;

        // 私信
        const msgChannel = supabaseClient
            .channel('private-messages-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                if (newMsg.receiver_id === currentUser.id) { unreadMessages++; updateAllBadges(); }
            }).subscribe();
        realtimeChannels.push(msgChannel);

        // 通知
        const notifChannel = supabaseClient
            .channel('notifications-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newNotif = payload.new;
                if (newNotif.user_id === currentUser.id) { notificationsUnread++; updateAllBadges(); }
            }).subscribe();
        realtimeChannels.push(notifChannel);

        // 好友请求
        const friendReqChannel = supabaseClient
            .channel('friend-requests-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, (payload) => {
                const newReq = payload.new;
                if (newReq.receiver_id === currentUser.id) { unreadFriendRequests++; updateAllBadges(); }
            }).subscribe();
        realtimeChannels.push(friendReqChannel);

        // 帖子计数更新（只更新数字，不影响按钮状态）
        const postUpdateChannel = supabaseClient
            .channel('posts-counts-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
                const updatedPost = payload.new;
                if (currentRoute === ROUTES.EXPLORE) {
                    updatePostCardCounts(updatedPost);
                }
            }).subscribe();
        realtimeChannels.push(postUpdateChannel);

        // 新公告
        const announcementChannel = supabaseClient
            .channel('announcements-updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
                if (currentRoute === ROUTES.EXPLORE) loadHomeAnnouncement();
            }).subscribe();
        realtimeChannels.push(announcementChannel);

        // 用户资料更新
        const profileChannel = supabaseClient
            .channel('profiles-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                const updatedProfile = payload.new;
                if (updatedProfile.id === currentUser.id) {
                    currentUser = { ...currentUser, ...updatedProfile };
                    renderSidebar();
                }
                updateUserInfoInPosts(updatedProfile);
            }).subscribe();
        realtimeChannels.push(profileChannel);
    }

    function updatePostCardCounts(updatedPost) {
        const likeBtns = document.querySelectorAll(`[data-post-id="${updatedPost.id}"][data-action="like"]`);
        const commentBtns = document.querySelectorAll(`[data-post-id="${updatedPost.id}"][data-action="comment"]`);
        const favBtns = document.querySelectorAll(`[data-post-id="${updatedPost.id}"][data-action="favorite"]`);

        likeBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = updatedPost.like_count || 0;
        });
        commentBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = updatedPost.comment_count || 0;
        });
        favBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = updatedPost.favorite_count || 0;
        });
    }

    function updateUserInfoInPosts(updatedProfile) {
        const userNames = document.querySelectorAll(`[data-user-id="${updatedProfile.id}"] .post-user-name`);
        userNames.forEach(el => { if (updatedProfile.nickname) el.textContent = updatedProfile.nickname; });
        const userHandles = document.querySelectorAll(`[data-user-id="${updatedProfile.id}"] .post-user-id`);
        userHandles.forEach(el => { if (updatedProfile.username) el.textContent = '@' + updatedProfile.username; });
        const avatars = document.querySelectorAll(`[data-user-id="${updatedProfile.id}"] .avatar img, [data-user-id="${updatedProfile.id}"] .avatar-sm img`);
        avatars.forEach(img => { if (updatedProfile.avatar_url) img.src = updatedProfile.avatar_url; });
    }

    // ---------- 渲染侧边栏 ----------
    function renderSidebar() {
        if (!sidebarNav) return;
        const navItems = [
            { key: ROUTES.EXPLORE, label: '探索/发现', icon: Icons.home },
            { key: ROUTES.FORUM, label: '论坛', icon: Icons.comment },
            { key: ROUTES.SOCIAL, label: '社交', icon: Icons.friend },
            { key: ROUTES.PROFILE, label: '个人与设置', icon: Icons.user },
            { key: ROUTES.ABOUT, label: '关于', icon: Icons.star },
        ];
        if (currentUser?.is_admin) navItems.push({ key: ROUTES.ADMIN, label: '管理', icon: Icons.admin });

        let html = '<ul class="nav-list">';
        navItems.forEach(item => {
            const active = item.key === currentRoute ? ' active' : '';
            html += `<li class="nav-item${active}" data-route="${item.key}">${item.icon}<span>${item.label}</span></li>`;
        });
        html += '</ul>';
        sidebarNav.innerHTML = html;
        updateAllBadges();
    }

    // ---------- 全屏控制 ----------
    function enterFullscreen() { document.body.classList.add('fullscreen-app'); }
    function exitFullscreen() { document.body.classList.remove('fullscreen-app'); }

    // ---------- 路由导航 ----------
    function navigateTo(route) {
        currentRoute = route;
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.route === route);
        });
        mainContent.innerHTML = '';
        switch (route) {
            case ROUTES.EXPLORE: renderExplore(); break;
            case ROUTES.FORUM: renderForum(); break;
            case ROUTES.SOCIAL: renderSocial(); break;
            case ROUTES.PROFILE: renderProfile(); break;
            case ROUTES.ABOUT: renderAbout(); break;
            case ROUTES.ADMIN: if (currentUser?.is_admin) renderAdmin(); else navigateTo(ROUTES.EXPLORE); break;
            default: renderExplore();
        }
    }

    // ---------- 生成公共 ID ----------
    function generatePublicId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }

    // ---------- 探索/发现 ----------
    async function renderExplore() {
        currentTab = currentTab || EXPLORE_TABS.SQUARE;
        mainContent.innerHTML = `
            <div id="homeAnnouncement" style="margin-bottom:16px;"></div>
            <div class="tab-bar">
                <button class="tab-item ${currentTab===EXPLORE_TABS.SQUARE?'active':''}" data-tab="${EXPLORE_TABS.SQUARE}">${Icons.refresh} 广场</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.HOT?'active':''}" data-tab="${EXPLORE_TABS.HOT}">${Icons.trend} 热门</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.RECOMMENDED?'active':''}" data-tab="${EXPLORE_TABS.RECOMMENDED}">${Icons.star} 推荐</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.SEARCH?'active':''}" data-tab="${EXPLORE_TABS.SEARCH}">${Icons.search} 搜索</button>
            </div>
            <div id="exploreContent"></div>`;

        loadHomeAnnouncement();

        const contentDiv = document.getElementById('exploreContent');
        if (currentTab === EXPLORE_TABS.SQUARE) await loadPosts(contentDiv, 'square');
        else if (currentTab === EXPLORE_TABS.HOT) await loadPosts(contentDiv, 'hot');
        else if (currentTab === EXPLORE_TABS.RECOMMENDED) await loadRecommended(contentDiv);
        else if (currentTab === EXPLORE_TABS.SEARCH) renderSearch(contentDiv);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', () => { currentTab = btn.dataset.tab; renderExplore(); });
        });
        addFloatingPostButton();
    }

    async function loadHomeAnnouncement() {
        const container = document.getElementById('homeAnnouncement');
        if (!container) return;
        container.innerHTML = '';
        const { data, error } = await supabaseClient
            .from('announcements').select('*').order('created_at', { ascending: false }).limit(1);
        if (error || !data.length) return;
        const ann = data[0];
        const card = document.createElement('div');
        card.className = 'announcement-card';
        card.style.marginBottom = '12px';
        card.innerHTML = `
            <div class="announcement-title">${ann.title}</div>
            <div class="post-content">${ann.content || ''}</div>
            <div style="font-size:13px;color:var(--text-light);">${timeAgo(ann.created_at)}</div>
        `;
        card.addEventListener('click', () => {
            window.location.href = 'post-detail.html?type=announcement&id=' + ann.id;
        });
        container.appendChild(card);
    }

    function addFloatingPostButton() {
        const oldBtn = document.querySelector('.floating-post-btn');
        if (oldBtn) oldBtn.remove();
        if (currentUser.is_banned) return;
        const btn = document.createElement('button');
        btn.className = 'floating-post-btn';
        btn.title = '发帖';
        btn.innerHTML = Icons.plus;
        btn.addEventListener('click', () => { window.location.href = 'post.html'; });
        document.body.appendChild(btn);
    }

    async function loadPosts(container, type) {
        container.innerHTML = '<p>加载中...</p>';
        let query;
        if (type === 'square') {
            query = supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').order('created_at', { ascending: false });
        } else if (type === 'hot') {
            query = supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').order('like_count', { ascending: false }).order('created_at', { ascending: false });
        }
        const { data, error } = await query.limit(30);
        if (error) { container.innerHTML = `<p>加载失败: ${error.message}</p>`; return; }
        if (!data.length) { container.innerHTML = '<p>暂无帖子</p>'; return; }
        container.innerHTML = '';
        const postsWithState = await Promise.all(data.map(async post => {
            const [likeRes, favRes] = await Promise.all([
                supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
                supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
            ]);
            post.liked_by_me = !!likeRes.data;
            post.favorited_by_me = !!favRes.data;
            post.is_owner = post.user_id === currentUser.id;
            return post;
        }));
        postsWithState.forEach(post => container.appendChild(renderPostCard(post)));
    }

    async function loadRecommended(container) {
        container.innerHTML = '<p>加载中...</p>';
        const [postsRes, topicsRes] = await Promise.all([
            supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').eq('is_recommended', true).order('created_at', { ascending: false }).limit(30),
            supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('is_recommended', true).order('created_at', { ascending: false }).limit(30)
        ]);
        if (postsRes.error || topicsRes.error) { container.innerHTML = `<p>加载失败: ${(postsRes.error||topicsRes.error).message}</p>`; return; }
        const posts = postsRes.data || [], topics = topicsRes.data || [];
        if (!posts.length && !topics.length) { container.innerHTML = '<p>暂无推荐内容</p>'; return; }
        container.innerHTML = '';
        for (const post of posts) {
            const [likeRes, favRes] = await Promise.all([
                supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
                supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
            ]);
            post.liked_by_me = !!likeRes.data; post.favorited_by_me = !!favRes.data; post.is_owner = post.user_id === currentUser.id;
            container.appendChild(renderPostCard(post));
        }
        topics.forEach(topic => container.appendChild(renderTopicCard(topic, { showJoin: true })));
    }

    function renderSearch(container) {
        container.innerHTML = `<div class="search-bar"><input type="search" id="searchInput" placeholder="搜索帖子、用户、话题、文件名称" /><button class="btn btn-primary" id="searchBtn" style="text-align:center;">${Icons.search} 搜索</button></div><div id="searchResults"></div>`;
        document.getElementById('searchBtn').addEventListener('click', async () => {
            const keyword = document.getElementById('searchInput').value.trim();
            if (!keyword) return showToast('请输入搜索关键词', 'error');
            const [postRes, userRes, topicRes, fileRes] = await Promise.all([
                supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').ilike('content', `%${keyword}%`).limit(20),
                supabaseClient.from('profiles').select('*').or(`username.ilike.%${keyword}%,nickname.ilike.%${keyword}%`).limit(20),
                supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`).limit(20),
                supabaseClient.from('files').select('*').ilike('file_name', `%${keyword}%`).limit(20)
            ]);
            renderSearchResults(document.getElementById('searchResults'), postRes.data, userRes.data, topicRes.data, fileRes.data);
        });
    }

    function renderSearchResults(container, posts, users, topics, files) {
        let html = '';
        if (posts?.length) { html += '<h3>帖子</h3>'; posts.forEach(post => { post.is_owner = post.user_id === currentUser.id; html += renderPostCard(post).outerHTML; }); }
        if (users?.length) { html += '<h3>用户</h3>'; users.forEach(u => html += renderUserCard(u, { showFollowBtn: u.id !== currentUser.id, showBlockBtn: false }).outerHTML); }
        if (topics?.length) { html += '<h3>话题</h3>'; topics.forEach(t => html += renderTopicCard(t).outerHTML); }
        if (files?.length) { html += '<h3>文件</h3>'; files.forEach(f => html += `<div class="file-item"><div class="file-icon">${Icons.file}</div><div class="file-info"><div class="file-name">${f.file_name}</div><div class="file-size">${formatFileSize(f.file_size)}</div></div></div>`); }
        container.innerHTML = html || '<p>没有找到相关内容</p>';
    }

    // ---------- 论坛 ----------
    async function renderForum() {
        mainContent.innerHTML = `<div class="page-header"><div class="page-title">论坛</div><div class="page-subtitle">围绕话题进行讨论</div></div><button class="btn btn-primary" id="createTopicBtn" style="margin-bottom:16px;">${Icons.plus} 创建话题</button><div id="topicsList"></div>`;
        document.getElementById('createTopicBtn').addEventListener('click', showCreateTopicModal);
        await loadTopics();
    }

    async function loadTopics() {
        const listDiv = document.getElementById('topicsList');
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('status', 'approved').order('created_at', { ascending: false });
        if (error) return listDiv.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return listDiv.innerHTML = '<p>暂无已审核的话题</p>';
        listDiv.innerHTML = '';
        data.forEach(topic => listDiv.appendChild(renderTopicCard(topic, { showJoin: true })));
    }

    function showCreateTopicModal() {
        if (currentUser.is_banned) return showToast('你已被封禁，无法操作', 'error');
        const content = `<div class="form-group"><label>话题名称</label><input type="text" id="topicName" /></div><div class="form-group"><label>话题描述</label><textarea id="topicDesc"></textarea></div><button class="btn btn-primary" id="submitTopicBtn">提交审核</button>`;
        const modal = openModal('创建话题', content);
        modal.querySelector('#submitTopicBtn').addEventListener('click', async () => {
            const name = modal.querySelector('#topicName').value.trim();
            const desc = modal.querySelector('#topicDesc').value.trim();
            if (!name) return showToast('请输入话题名称', 'error');
            const days = (Date.now() - new Date(currentUser.created_at).getTime()) / (1000*60*60*24);
            if (days < 30) return showToast('账号注册需满30天才能创建话题', 'error');
            const { count } = await supabaseClient.from('topics').select('id', { count: 'exact', head: true }).eq('creator_id', currentUser.id);
            if (count >= 3) return showToast('每个账号最多创建3个话题', 'error');
            const publicId = generatePublicId();
            const { error } = await supabaseClient.from('topics').insert({ name, description: desc, creator_id: currentUser.id, status: 'pending', public_id: publicId });
            if (error) return showToast('创建失败: ' + error.message, 'error');
            modal.remove(); showToast('话题已提交审核', 'success'); loadTopics();
        });
    }

    // ---------- 社交 ----------
    async function renderSocial() {
        mainContent.innerHTML = `<div class="tab-bar">
            <button class="tab-item active" data-social-tab="friends">${Icons.friend} 好友</button>
            <button class="tab-item" data-social-tab="requests">${Icons.user} 好友请求</button>
            <button class="tab-item" data-social-tab="notifications">${Icons.bell} 通知中心</button>
        </div><div id="socialContent"></div>`;
        const contentDiv = document.getElementById('socialContent');
        await loadFriends(contentDiv);
        updateAllBadges();
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
                const tab = btn.dataset.socialTab; contentDiv.innerHTML = '';
                if (tab === 'friends') { await loadFriends(contentDiv); updateAllBadges(); }
                else if (tab === 'requests') { await loadFriendRequests(contentDiv); updateAllBadges(); }
                else if (tab === 'notifications') { await loadNotifications(contentDiv); updateAllBadges(); }
            });
        });
    }

    async function loadFriends(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('follows').select('following:following_id(id, username, nickname, avatar_url, is_online, is_banned, bio)').eq('follower_id', currentUser.id);
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        const friends = data.map(d => d.following);
        if (!friends.length) return container.innerHTML = '<p>暂无好友，去关注一些人吧</p>';
        container.innerHTML = '';
        friends.forEach(f => {
            const card = document.createElement('div'); card.className = 'user-card';
            card.innerHTML = `<div class="avatar" style="cursor:pointer;" data-action="view-profile" data-user-id="${f.id}">${getUserAvatarHTML(f, 'avatar')}</div>
                <div class="user-card-info" style="cursor:pointer;" data-action="view-profile" data-user-id="${f.id}">
                    <div class="post-user-name">${getUserDisplayName(f)}</div><div class="post-user-id">${getUserHandle(f)}</div>${f.bio?`<div style="font-size:13px;color:var(--text-secondary);">${f.bio}</div>`:''}
                </div>
                <div class="user-card-actions"><button class="btn btn-secondary btn-sm chat-btn" data-action="chat" data-user-id="${f.id}">${Icons.message} <span>私聊</span></button></div>`;
            card.querySelector('[data-action="chat"]')?.addEventListener('click', () => window.location.href = `chat.html?userId=${f.id}`);
            card.querySelectorAll('[data-action="view-profile"]').forEach(el => el.addEventListener('click', () => viewUserProfile(f.id)));
            container.appendChild(card);
        });
    }

    async function loadFriendRequests(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('friend_requests').select('id, sender:sender_id(id, username, nickname, avatar_url, is_online, is_banned, bio), status').eq('receiver_id', currentUser.id).order('created_at', { ascending: false });
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return container.innerHTML = '<p>暂无好友请求</p>';
        container.innerHTML = '';
        data.forEach(req => {
            const card = document.createElement('div'); card.className = 'user-card';
            card.innerHTML = `<div class="avatar" style="cursor:pointer;" data-action="view-profile" data-user-id="${req.sender.id}">${getUserAvatarHTML(req.sender, 'avatar')}</div>
                <div class="user-card-info" style="cursor:pointer;" data-action="view-profile" data-user-id="${req.sender.id}"><div class="post-user-name">${getUserDisplayName(req.sender)}</div><div class="post-user-id">${getUserHandle(req.sender)}</div><div style="font-size:13px;color:var(--text-light);">${req.status}</div></div>
                <div class="user-card-actions">${req.status==='pending'?`<button class="btn btn-primary btn-sm" data-action="accept-friend" data-request-id="${req.id}">接受</button><button class="btn btn-secondary btn-sm" data-action="decline-friend" data-request-id="${req.id}">拒绝</button>`:''}</div>`;
            card.querySelectorAll('[data-action="view-profile"]').forEach(el => el.addEventListener('click', () => viewUserProfile(req.sender.id)));
            container.appendChild(card);
        });
    }

    async function loadNotifications(container) {
        container.innerHTML = '加载中...';
        await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = 0;
        updateAllBadges();
        const { data, error } = await supabaseClient.from('notifications').select('*, actor:actor_id(id, username, nickname, avatar_url, is_banned)').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50);
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return container.innerHTML = '<p>暂无通知</p>';
        container.innerHTML = '';
        data.forEach(n => container.appendChild(renderNotificationItem(n)));
    }

    // ---------- 他人主页（跳转）----------
    function viewUserProfile(userId) {
        window.location.href = 'post-detail.html?type=user&id=' + userId;
    }

    // ---------- 个人与设置 ----------
    async function renderProfile() {
        mainContent.innerHTML = `<div class="page-header"><div class="page-title">个人与设置</div></div>
            <div class="profile-header" style="display:flex;align-items:center;gap:20px;margin-bottom:20px;">${getUserAvatarHTML(currentUser,'avatar-lg')}<div><h2>${getUserDisplayName(currentUser)}</h2><p>${getUserHandle(currentUser)}</p><p style="color:var(--text-secondary);">${currentUser.bio||'暂无简介'}</p><p style="font-size:13px;color:var(--text-light);">注册于 ${new Date(currentUser.created_at).toLocaleDateString()}</p></div></div>
            <div class="tab-bar"><button class="tab-item active" data-profile-tab="profile">个人资料</button><button class="tab-item" data-profile-tab="posts">我的帖子</button><button class="tab-item" data-profile-tab="favorites">收藏</button><button class="tab-item" data-profile-tab="history">历史</button><button class="tab-item" data-profile-tab="feedback">反馈</button></div>
            <div id="profileContent"></div>`;
        const contentDiv = document.getElementById('profileContent');
        await loadSettings(contentDiv);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
                const tab = btn.dataset.profileTab; contentDiv.innerHTML = '';
                if (tab === 'profile') await loadSettings(contentDiv);
                else if (tab === 'posts') await loadUserPosts(contentDiv);
                else if (tab === 'favorites') await loadUserFavorites(contentDiv);
                else if (tab === 'history') await loadUserHistory(contentDiv);
                else if (tab === 'feedback') await loadFeedback(contentDiv);
            });
        });
    }

    async function loadUserPosts(container) {
        const { data, error } = await supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无帖子</p>';
        container.innerHTML = '';
        data.forEach(post => { post.is_owner = true; container.appendChild(renderPostCard(post)); });
    }

    async function loadUserFavorites(container) {
        const { data, error } = await supabaseClient.from('favorites').select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无收藏</p>';
        container.innerHTML = '';
        data.forEach(f => { if (f.post) { f.post.is_owner = f.post.user_id === currentUser.id; container.appendChild(renderPostCard(f.post)); } });
    }

    async function loadUserHistory(container) {
        const { data, error } = await supabaseClient.from('view_history').select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))').eq('user_id', currentUser.id).order('viewed_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无历史记录</p>';
        container.innerHTML = '';
        data.forEach(h => { if (h.post) { h.post.is_owner = h.post.user_id === currentUser.id; container.appendChild(renderPostCard(h.post)); } });
    }

    async function loadSettings(container) {
        let pendingAvatarUrl = null;
        container.innerHTML = `
            <h3>个人资料</h3>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                <div id="settingsAvatar" style="cursor:pointer;">${getUserAvatarHTML(currentUser,'avatar-lg')}</div>
                <div><p style="font-size:14px;color:var(--text-secondary);">点击头像上传新图片</p></div>
            </div>
            <div class="form-group"><label>ID</label><input type="text" id="editUsername" value="${currentUser.username}" /></div>
            <div class="form-group"><label>昵称</label><input type="text" id="editNickname" value="${currentUser.nickname}" /></div>
            <div class="form-group"><label>简介</label><textarea id="editBio">${currentUser.bio || ''}</textarea></div>
            <div class="form-group"><label><input type="checkbox" id="editFavoritesPublic" ${currentUser.favorites_public !== false ? 'checked' : ''} /> 公开我的收藏</label></div>
            <div class="form-group"><label><input type="checkbox" id="editFollowingPublic" ${currentUser.following_public !== false ? 'checked' : ''} /> 公开我的关注</label></div>
            <button class="btn btn-primary" id="saveProfileBtn">保存</button>
            <button class="btn btn-danger btn-block" id="logoutProfileBtn" style="margin-top:20px;">退出登录</button>`;

        const avatarContainer = container.querySelector('#settingsAvatar');
        avatarContainer.addEventListener('click', () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法修改资料','error');
            const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
            fileInput.onchange = async (e) => { const file = e.target.files[0]; if(!file) return; const uploaded = await uploadFile(file, 'avatars', `avatar/${currentUser.id}`); pendingAvatarUrl = uploaded.url; avatarContainer.innerHTML = `<div class="avatar-lg"><img src="${uploaded.url}" alt="avatar"></div>`; showToast('头像已选择，点击保存后生效','success'); };
            fileInput.click();
        });

        container.querySelector('#editFavoritesPublic').addEventListener('change', async (e) => {
            const val = e.target.checked;
            await supabaseClient.from('profiles').update({ favorites_public: val }).eq('id', currentUser.id);
            currentUser.favorites_public = val;
            showToast('收藏公开设置已更新','success');
        });
        container.querySelector('#editFollowingPublic').addEventListener('change', async (e) => {
            const val = e.target.checked;
            await supabaseClient.from('profiles').update({ following_public: val }).eq('id', currentUser.id);
            currentUser.following_public = val;
            showToast('关注公开设置已更新','success');
        });

        container.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法修改资料','error');
            const nickname = container.querySelector('#editNickname').value.trim();
            const username = container.querySelector('#editUsername').value.trim();
            const bio = container.querySelector('#editBio').value.trim();
            if (!nickname || !username) return showToast('昵称和ID不能为空','error');
            if (!/^[a-z0-9_@.]+$/.test(username)) return showToast('ID 只能包含小写字母、数字、下划线、@ 和点','error');
            if (currentUser.updated_at && Date.now() - new Date(currentUser.updated_at).getTime() < 15*24*60*60*1000) return showToast('个人资料每15天只能修改一次','error');
            const updates = { nickname, username, bio, updated_at: new Date().toISOString() };
            if (pendingAvatarUrl) updates.avatar_url = pendingAvatarUrl;
            const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
            if (error) return showToast('保存失败: ' + error.message, 'error');
            Object.assign(currentUser, updates); showToast('保存成功','success'); renderSidebar(); renderProfile();
        });

        container.querySelector('#logoutProfileBtn').addEventListener('click', async () => {
            if (currentUser) await supabaseClient.from('profiles').update({ is_online: false }).eq('id', currentUser.id);
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    async function loadFeedback(container) {
        container.innerHTML = `<h3>反馈 Bug</h3><div class="form-group"><label>问题描述</label><textarea id="feedbackContent"></textarea></div><button class="btn btn-primary" id="submitFeedbackBtn">提交反馈</button>`;
        container.querySelector('#submitFeedbackBtn').addEventListener('click', async () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法提交反馈','error');
            const content = container.querySelector('#feedbackContent').value.trim(); if(!content) return showToast('请输入问题描述','error');
            const adminId = await getAdminId(); if(!adminId) return showToast('无法获取管理员信息','error');
            await supabaseClient.from('notifications').insert({ user_id: adminId, type:'system', content:'用户反馈: '+content, actor_id: currentUser.id });
            showToast('反馈已提交','success'); container.querySelector('#feedbackContent').value = '';
        });
    }

    async function getAdminId() {
        const { data } = await supabaseClient.from('profiles').select('id').eq('is_admin', true).single();
        return data?.id || null;
    }

    // ---------- 关于 ----------
    async function renderAbout() {
        mainContent.innerHTML = '<div class="page-header"><div class="page-title">关于</div></div><div id="aboutContent"></div>';
        const { data, error } = await supabaseClient.from('about_page').select('*').order('updated_at', { ascending: false }).limit(1);
        document.getElementById('aboutContent').innerHTML = (!error && data?.length) ? data[0].content : '<p>暂无关于信息</p>';
    }

    // ---------- 管理员 ----------
    async function renderAdmin() {
        mainContent.innerHTML = `<div class="page-header"><div class="page-title">管理面板</div></div><div class="tab-bar">
            <button class="tab-item active" data-admin-tab="announcements">公告</button>
            <button class="tab-item" data-admin-tab="reports">举报处理</button>
            <button class="tab-item" data-admin-tab="topics">话题审核</button>
            <button class="tab-item" data-admin-tab="recommend">推荐管理</button>
            <button class="tab-item" data-admin-tab="about">关于编辑</button>
            <button class="tab-item" data-admin-tab="user-operations">用户操作</button>
        </div><div id="adminContent"></div>`;
        const adminContent = document.getElementById('adminContent');
        await loadAnnouncementsAdmin(adminContent);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active')); btn.classList.add('active');
                const tab = btn.dataset.adminTab; adminContent.innerHTML = '';
                if (tab==='announcements') await loadAnnouncementsAdmin(adminContent);
                else if (tab==='reports') await loadReportsAdmin(adminContent);
                else if (tab==='topics') await loadTopicsAdmin(adminContent);
                else if (tab==='recommend') await loadRecommendAdmin(adminContent);
                else if (tab==='about') await loadAboutAdmin(adminContent);
                else if (tab==='user-operations') await loadUserOperationsAdmin(adminContent);
            });
        });
    }

    async function loadAnnouncementsAdmin(container) {
        container.innerHTML = `<button class="btn btn-primary" id="createAnnouncementBtn">${Icons.plus} 创建公告</button><div id="announcementsList" style="margin-top:16px;"></div>`;
        container.querySelector('#createAnnouncementBtn').addEventListener('click', () => showCreateAnnouncementModal(container));
        await refreshAnnouncementsList(container.querySelector('#announcementsList'));
    }
    async function refreshAnnouncementsList(listDiv) {
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('announcements').select('*').order('created_at', { ascending: false });
        if (error || !data.length) return listDiv.innerHTML = '<p>暂无公告</p>';
        listDiv.innerHTML = ''; data.forEach(a => { const card=document.createElement('div'); card.className='announcement-card'; card.innerHTML=`<div class="announcement-title">${a.title}</div><div class="post-content">${a.content||''}</div><div style="font-size:13px;color:var(--text-light);">${timeAgo(a.created_at)}</div><button class="btn btn-secondary btn-sm" data-action="delete-announcement" data-id="${a.id}">删除</button>`; listDiv.appendChild(card); });
    }
    function showCreateAnnouncementModal(container) {
        const content = `<div class="form-group"><label>标题</label><input type="text" id="announcementTitle"></div><div class="form-group"><label>内容</label><textarea id="announcementContent"></textarea></div><div class="form-group"><label>引用帖子ID（逗号分隔）</label><input type="text" id="announcementPosts"></div><div class="form-group"><label>引用话题ID（逗号分隔）</label><input type="text" id="announcementTopics"></div><div class="form-group"><label>上传文件</label><input type="file" id="announcementFiles" multiple></div><button class="btn btn-primary" id="submitAnnouncementBtn">发布公告</button>`;
        const modal = openModal('创建公告', content);
        modal.querySelector('#submitAnnouncementBtn').addEventListener('click', async () => {
            const title = modal.querySelector('#announcementTitle').value.trim(); if(!title) return showToast('请输入标题','error');
            const contentText = modal.querySelector('#announcementContent').value.trim();
            const postIds = modal.querySelector('#announcementPosts').value.split(',').map(s=>s.trim()).filter(Boolean);
            const topicIds = modal.querySelector('#announcementTopics').value.split(',').map(s=>s.trim()).filter(Boolean);
            let filesData = []; for(const file of modal.querySelector('#announcementFiles').files){ const uploaded = await uploadFile(file,'announcements','announcements'); filesData.push(uploaded); }
            await supabaseClient.from('announcements').insert({ admin_id: currentUser.id, title, content: contentText, files: filesData, referenced_posts: postIds, referenced_topics: topicIds });
            const { data: users } = await supabaseClient.from('profiles').select('id');
            if (users && users.length) {
                const notifications = users.map(u => ({ user_id: u.id, type: 'admin_announcement', actor_id: currentUser.id, content: '管理员发布了公告：' + title, is_read: false }));
                await supabaseClient.from('notifications').insert(notifications);
            }
            modal.remove(); showToast('公告已发布','success'); await refreshAnnouncementsList(container.querySelector('#announcementsList'));
        });
    }

    async function loadReportsAdmin(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('reports').select('*, reporter:reporter_id(id, username, nickname, avatar_url, is_banned)').eq('status','pending').order('created_at',{ascending:false});
        if(error||!data.length) return container.innerHTML='<p>暂无待处理举报</p>';
        container.innerHTML=''; data.forEach(r=>{const card=document.createElement('div');card.className='post-card';card.innerHTML=`<div><strong>举报类型：</strong>${r.reason}</div><div><strong>描述：</strong>${r.description||'无'}</div><div><strong>举报人：</strong>${getUserDisplayName(r.reporter)}</div><div style="font-size:13px;color:var(--text-light);">${timeAgo(r.created_at)}</div><div style="margin-top:8px;"><button class="btn btn-secondary btn-sm" data-action="dismiss-report" data-id="${r.id}">忽略</button><button class="btn btn-danger btn-sm" data-action="action-report" data-id="${r.id}" data-target-type="${r.target_type}" data-target-id="${r.target_id}">处理</button></div>`;container.appendChild(card);});
    }
    async function loadTopicsAdmin(container) {
        container.innerHTML='加载中...';
        const { data, error } = await supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('status','pending').order('created_at',{ascending:false});
        if(error||!data.length) return container.innerHTML='<p>暂无待审核话题</p>';
        container.innerHTML='';data.forEach(t=>{const card=document.createElement('div');card.className='topic-card';card.innerHTML=`<div class="topic-name">${t.name}</div><div class="topic-desc">${t.description||''}</div><div>创建者：${getUserDisplayName(t.creator)}</div><div style="margin-top:8px;"><button class="btn btn-primary btn-sm" data-action="approve-topic" data-id="${t.id}">批准</button><button class="btn btn-secondary btn-sm" data-action="reject-topic" data-id="${t.id}">拒绝</button></div>`;container.appendChild(card);});
    }
    async function loadRecommendAdmin(container) {
        container.innerHTML=`<h3>推荐管理</h3><div class="form-group"><label>输入帖子或话题的 ID（自定义短 ID）</label><input type="text" id="recommendTargetId" placeholder="例如：abc12345"></div><button class="btn btn-primary" id="addRecommendBtn">推荐</button><div id="recommendList" style="margin-top:16px;"></div>`;
        container.querySelector('#addRecommendBtn').addEventListener('click', async()=>{
            const input=container.querySelector('#recommendTargetId').value.trim();if(!input)return showToast('请输入 ID','error');
            const {data:postData,error:postError}=await supabaseClient.from('posts').select('id').eq('public_id',input).maybeSingle();
            if(!postError&&postData){await supabaseClient.from('posts').update({is_recommended:true}).eq('id',postData.id);showToast('帖子推荐成功','success');container.querySelector('#recommendTargetId').value='';await refreshRecommendList(container.querySelector('#recommendList'));return;}
            const {data:topicData,error:topicError}=await supabaseClient.from('topics').select('id').eq('public_id',input).maybeSingle();
            if(!topicError&&topicData){await supabaseClient.from('topics').update({is_recommended:true}).eq('id',topicData.id);showToast('话题推荐成功','success');container.querySelector('#recommendTargetId').value='';await refreshRecommendList(container.querySelector('#recommendList'));return;}
            showToast('未找到该 ID 对应的帖子或话题','error');
        });
        await refreshRecommendList(container.querySelector('#recommendList'));
    }
    async function refreshRecommendList(listDiv) {
        listDiv.innerHTML='加载中...';
        const [postsRes,topicsRes]=await Promise.all([
            supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').eq('is_recommended',true).order('created_at',{ascending:false}).limit(50),
            supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('is_recommended',true).order('created_at',{ascending:false}).limit(50)
        ]);
        if(postsRes.error||topicsRes.error)return listDiv.innerHTML=`<p>加载失败: ${(postsRes.error||topicsRes.error).message}</p>`;
        const posts=postsRes.data||[],topics=topicsRes.data||[];if(!posts.length&&!topics.length)return listDiv.innerHTML='<p>暂无推荐内容</p>';
        listDiv.innerHTML='';
        posts.forEach(post=>{post.is_owner=post.user_id===currentUser.id;const card=renderPostCard(post);const btn=document.createElement('button');btn.className='btn btn-secondary btn-sm';btn.textContent='取消推荐';btn.addEventListener('click',async()=>{await supabaseClient.from('posts').update({is_recommended:false}).eq('id',post.id);await refreshRecommendList(listDiv);});card.appendChild(btn);listDiv.appendChild(card);});
        topics.forEach(topic=>{const card=renderTopicCard(topic,{showJoin:true});const btn=document.createElement('button');btn.className='btn btn-secondary btn-sm';btn.textContent='取消推荐';btn.addEventListener('click',async()=>{await supabaseClient.from('topics').update({is_recommended:false}).eq('id',topic.id);await refreshRecommendList(listDiv);});card.appendChild(btn);listDiv.appendChild(card);});
    }
    async function loadAboutAdmin(container) {
        container.innerHTML=`<h3>编辑关于页面</h3><div class="form-group"><label>内容（支持 HTML）</label><textarea id="aboutEditor" style="min-height:300px;"></textarea></div><button class="btn btn-primary" id="saveAboutBtn">保存</button>`;
        const {data}=await supabaseClient.from('about_page').select('*').order('updated_at',{ascending:false}).limit(1);if(data?.length)container.querySelector('#aboutEditor').value=data[0].content||'';
        container.querySelector('#saveAboutBtn').addEventListener('click',async()=>{const content=container.querySelector('#aboutEditor').value;await supabaseClient.from('about_page').insert({admin_id:currentUser.id,content});showToast('已保存','success');});
    }
    async function loadUserOperationsAdmin(container) {
        container.innerHTML = `<h3>用户操作</h3><div class="form-group"><label>目标用户 ID</label><input type="text" id="targetUserIdInput" placeholder="输入用户的 ID（用户名）"></div><div class="form-group"><label>选择操作（可多选，互斥操作不能同时选择）</label><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"><label><input type="checkbox" id="opBan"> 封禁账号</label><label><input type="checkbox" id="opUnban"> 解封账号</label><label><input type="checkbox" id="opMute"> 禁言私聊</label><label><input type="checkbox" id="opUnmute"> 恢复私聊</label><label><input type="checkbox" id="opPostBan"> 禁止发帖/话题</label><label><input type="checkbox" id="opPostUnban"> 恢复发帖/话题</label></div></div><div class="form-group" id="durationGroup" style="display:none;"><label>持续时间（数字 + 单位）</label><div style="display:flex;gap:8px;"><input type="number" id="durationValue" min="1" placeholder="时长" style="width:120px;"><select id="durationUnit"><option value="minutes">分钟</option><option value="hours">小时</option><option value="days">天</option><option value="weeks">周</option><option value="months">月</option></select></div></div><div class="form-group"><label>通知文本</label><textarea id="operationText"></textarea></div><button class="btn btn-primary" id="submitUserOperationBtn">执行操作</button>`;
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const durationGroup = container.querySelector('#durationGroup');
        function updateDurationVisibility() { durationGroup.style.display = (container.querySelector('#opBan').checked || container.querySelector('#opMute').checked || container.querySelector('#opPostBan').checked) ? 'block' : 'none'; }
        checkboxes.forEach(cb => cb.addEventListener('change', updateDurationVisibility));
        container.querySelector('#submitUserOperationBtn').addEventListener('click', async () => {
            const usernameInput = container.querySelector('#targetUserIdInput').value.trim();
            if (!usernameInput) return showToast('请输入目标用户 ID', 'error');
            const { data: targetProfile, error: lookupError } = await supabaseClient.from('profiles').select('id, username, nickname').eq('username', usernameInput).single();
            if (lookupError || !targetProfile) return showToast('未找到该 ID 对应的用户', 'error');
            const targetUserId = targetProfile.id;
            const opBan = container.querySelector('#opBan').checked, opUnban = container.querySelector('#opUnban').checked, opMute = container.querySelector('#opMute').checked, opUnmute = container.querySelector('#opUnmute').checked, opPostBan = container.querySelector('#opPostBan').checked, opPostUnban = container.querySelector('#opPostUnban').checked;
            if (opBan && opUnban) return showToast('不能同时选择封禁和解封', 'error');
            if (opMute && opUnmute) return showToast('不能同时选择禁言和恢复私聊', 'error');
            if (opPostBan && opPostUnban) return showToast('不能同时选择禁止发帖和恢复发帖', 'error');
            if (!opBan && !opUnban && !opMute && !opUnmute && !opPostBan && !opPostUnban) return showToast('请至少选择一种操作', 'error');
            const durationValue = parseInt(container.querySelector('#durationValue').value), durationUnit = container.querySelector('#durationUnit').value;
            let durationMs = 0;
            if (opBan || opMute || opPostBan) {
                if (!durationValue || durationValue <= 0) return showToast('请设置有效的时间', 'error');
                const unitMap = { minutes: 60*1000, hours: 3600*1000, days: 86400*1000, weeks: 7*86400*1000, months: 30*86400*1000 };
                durationMs = durationValue * unitMap[durationUnit];
            }
            const updates = {};
            if (opBan) { updates.is_banned = true; updates.banned_until = new Date(Date.now()+durationMs).toISOString(); }
            else if (opUnban) { updates.is_banned = false; updates.banned_until = null; }
            if (opMute) { updates.mute_until = new Date(Date.now()+durationMs).toISOString(); }
            else if (opUnmute) { updates.mute_until = null; }
            if (opPostBan) { updates.post_ban_until = new Date(Date.now()+durationMs).toISOString(); }
            else if (opPostUnban) { updates.post_ban_until = null; }
            const { error: updateError } = await supabaseClient.from('profiles').update(updates).eq('id', targetUserId);
            if (updateError) return showToast('操作失败: ' + updateError.message, 'error');
            let operationDesc = [];
            if (opBan) operationDesc.push('账号已被封禁');
            if (opUnban) operationDesc.push('账号已解封');
            if (opMute) operationDesc.push('已被禁言私聊');
            if (opUnmute) operationDesc.push('私聊已恢复');
            if (opPostBan) operationDesc.push('已被禁止发帖/话题');
            if (opPostUnban) operationDesc.push('发帖/话题权限已恢复');
            let finalText = operationDesc.join('，');
            const text = container.querySelector('#operationText').value.trim();
            if (text) finalText += '，' + text;
            if (durationMs > 0) finalText += '（时长：' + durationValue + ' ' + durationUnit + '）';
            const { error: notifError } = await supabaseClient.from('notifications').insert({ user_id: targetUserId, type: 'admin_action', actor_id: currentUser.id, content: finalText, is_read: false });
            showToast(notifError ? '操作成功但通知发送失败' : '操作成功', notifError ? 'error' : 'success');
            container.querySelector('#operationText').value = '';
            checkboxes.forEach(cb => cb.checked = false);
            durationGroup.style.display = 'none';
        });
    }

    // ---------- 帖子详情（跳转）----------
    function openPostDetail(postId) {
        window.location.href = 'post-detail.html?type=post&id=' + postId;
    }

    // ---------- 话题详情（跳转）----------
    function openTopicDetail(topicId) {
        window.location.href = 'post-detail.html?type=topic&id=' + topicId;
    }

    // ---------- 全局事件委托 ----------
    function setupGlobalEventDelegation() {
        document.addEventListener('click', async (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const postId = target.dataset.postId;
            const commentId = target.dataset.commentId;
            const topicId = target.dataset.topicId;
            const userId = target.dataset.userId;
            const requestId = target.dataset.requestId;
            const id = target.dataset.id;
            const notificationId = target.dataset.notificationId;

            if (currentUser.is_banned && action !== 'qq-appeal') return showToast('你已被封禁，无法进行此操作', 'error');

            if (action === 'like' && postId) { await toggleLike(postId, target); }
            else if (action === 'favorite' && postId) { await toggleFavorite(postId, target); }
            else if (action === 'share' && postId) { showShareModal(postId); }
            else if (action === 'report' && postId) { showReportModal('post', postId); }
            else if (action === 'edit' && postId) { showEditPostModal(postId); }
            else if (action === 'delete' && postId) { if (confirm('确认删除这条帖子吗？')) { await supabaseClient.from('posts').delete().eq('id', postId); showToast('已删除','success'); navigateTo(ROUTES.EXPLORE); } }
            else if (action === 'like-comment' && commentId) { await toggleCommentLike(commentId, target); }
            else if (action === 'reply-comment' && commentId) { const commentInput = document.getElementById('commentInput'); if (commentInput) { commentInput.focus(); commentInput.dataset.parentId = commentId; const { data } = await supabaseClient.from('comments').select('user_id').eq('id', commentId).single(); if (data) commentInput.dataset.replyToUserId = data.user_id; } }
            else if (action === 'share-comment' && commentId) { await shareComment(commentId); }
            else if (action === 'report-comment' && commentId) { showReportModal('comment', commentId); }
            else if (action === 'accept-friend' && requestId) {
                await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
                const { data: reqData } = await supabaseClient.from('friend_requests').select('sender_id, receiver_id').eq('id', requestId).single();
                if (reqData) {
                    await supabaseClient.from('follows').insert([{ follower_id: reqData.sender_id, following_id: reqData.receiver_id }, { follower_id: reqData.receiver_id, following_id: reqData.sender_id }]);
                }
                unreadFriendRequests = Math.max(0, unreadFriendRequests - 1);
                updateAllBadges();
                showToast('已接受','success');
                if(currentRoute===ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL);
            }
            else if (action === 'decline-friend' && requestId) {
                await supabaseClient.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
                unreadFriendRequests = Math.max(0, unreadFriendRequests - 1);
                updateAllBadges();
                showToast('已拒绝','success');
                if(currentRoute===ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL);
            }
            else if (action === 'follow' && userId) { await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: userId }); showToast('已关注','success'); }
            else if (action === 'block' && userId) { await supabaseClient.from('blocked_users').insert({ user_id: currentUser.id, blocked_user_id: userId }); showToast('已拉黑','success'); }
            else if (action === 'dismiss-report' && id) { await supabaseClient.from('reports').update({ status:'dismissed', reviewed_by:currentUser.id, reviewed_at:new Date().toISOString() }).eq('id', id); showToast('已忽略','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'action-report' && id) { const targetType = target.dataset.targetType, targetId = target.dataset.targetId; if(targetType==='post') await supabaseClient.from('posts').delete().eq('id', targetId); else if(targetType==='comment') await supabaseClient.from('comments').delete().eq('id', targetId); else if(targetType==='user') await supabaseClient.from('profiles').update({ is_banned: true }).eq('id', targetId); else if(targetType==='topic') await supabaseClient.from('topics').update({ status:'closed' }).eq('id', targetId); await supabaseClient.from('reports').update({ status:'action_taken', reviewed_by:currentUser.id, reviewed_at:new Date().toISOString() }).eq('id', id); showToast('已处理','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'approve-topic' && id) { await supabaseClient.from('topics').update({ status:'approved', approved_at:new Date().toISOString(), approved_by:currentUser.id }).eq('id', id); showToast('已批准','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'reject-topic' && id) { await supabaseClient.from('topics').update({ status:'rejected' }).eq('id', id); showToast('已拒绝','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'delete-announcement' && id) { await supabaseClient.from('announcements').delete().eq('id', id); showToast('已删除','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'qq-appeal' && notificationId) { e.stopPropagation(); navigator.clipboard.writeText('976926251').then(() => { showToast('QQ群号已复制，请到群内 @管理员 申诉','success'); target.textContent='已提示'; target.disabled=true; }).catch(() => showToast('请手动搜索 QQ 群：976926251','error')); }
            else if (action === 'join-topic' && topicId) { openTopicDetail(topicId); }
        });

        document.addEventListener('click', (e) => {
            const notificationCard = e.target.closest('.notification-card');
            if (notificationCard) {
                const postId = notificationCard.dataset.postId;
                if (postId) openPostDetail(postId); else { const content = notificationCard.querySelector('.notification-text')?.textContent || '通知'; openModal('通知详情', `<p>${content}</p>`); }
                return;
            }
            const postCard = e.target.closest('.post-card');
            if (postCard && !e.target.closest('[data-action]') && !e.target.closest('.media-item')) { const postId = postCard.querySelector('[data-post-id]')?.dataset.postId; if(postId) openPostDetail(postId); }
            const mediaItem = e.target.closest('.media-item');
            if (mediaItem) { const url = mediaItem.dataset.fileUrl, type = mediaItem.dataset.fileType; if(url){ if(type==='image') window.open(url,'_blank'); else if(type==='video'||type==='audio'){ const postId=mediaItem.closest('.post-card')?.querySelector('[data-post-id]')?.dataset.postId; if(postId) openPostDetail(postId); } } }
            const tag = e.target.closest('.tag');
            if (tag) { currentTab=EXPLORE_TABS.SEARCH; renderExplore(); const searchInput=document.getElementById('searchInput'); if(searchInput){ searchInput.value=tag.dataset.tag; document.getElementById('searchBtn')?.click(); } }
        });

        sidebarNav.addEventListener('click', (e) => { const navItem = e.target.closest('.nav-item'); if(navItem){ exitFullscreen(); navigateTo(navItem.dataset.route); } });
    }

    // ---------- 刷新帖子计数函数 ----------
    async function refreshPostCounts(postId) {
        const { data: post, error } = await supabaseClient
            .from('posts')
            .select('like_count, comment_count, favorite_count')
            .eq('id', postId)
            .single();
        if (error || !post) return;

        const likeBtns = document.querySelectorAll(`[data-post-id="${postId}"][data-action="like"]`);
        likeBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = post.like_count || 0;
        });

        const commentBtns = document.querySelectorAll(`[data-post-id="${postId}"][data-action="comment"]`);
        commentBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = post.comment_count || 0;
        });

        const favBtns = document.querySelectorAll(`[data-post-id="${postId}"][data-action="favorite"]`);
        favBtns.forEach(btn => {
            const count = btn.querySelector('.count');
            if (count) count.textContent = post.favorite_count || 0;
        });
    }

    // ---------- 点赞/收藏切换 ----------
    async function toggleLike(postId, btn) {
        if (isTogglingLike) return;
        isTogglingLike = true;
        if (btn) btn.disabled = true;
        try {
            const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
            if (existing.data) {
                await supabaseClient.from('likes').delete().eq('id', existing.data.id);
            } else {
                await supabaseClient.from('likes').insert({ user_id: currentUser.id, post_id: postId });
            }
            await refreshPostCounts(postId);
            // 更新按钮状态
            const likeCheck = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
            const likeBtns = document.querySelectorAll(`[data-post-id="${postId}"][data-action="like"]`);
            likeBtns.forEach(button => {
                if (likeCheck.data) {
                    button.classList.add('liked');
                    button.innerHTML = `${Icons.heartFilled}<span class="count">${button.querySelector('.count')?.textContent || 0}</span>`;
                } else {
                    button.classList.remove('liked');
                    button.innerHTML = `${Icons.heart}<span class="count">${button.querySelector('.count')?.textContent || 0}</span>`;
                }
            });
        } finally {
            isTogglingLike = false;
            if (btn) btn.disabled = false;
        }
    }

    async function toggleFavorite(postId, btn) {
        if (isTogglingFavorite) return;
        isTogglingFavorite = true;
        if (btn) btn.disabled = true;
        try {
            const existing = await supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
            if (existing.data) {
                await supabaseClient.from('favorites').delete().eq('id', existing.data.id);
            } else {
                await supabaseClient.from('favorites').insert({ user_id: currentUser.id, post_id: postId, is_public: true });
            }
            await refreshPostCounts(postId);
            const favCheck = await supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
            const favBtns = document.querySelectorAll(`[data-post-id="${postId}"][data-action="favorite"]`);
            favBtns.forEach(button => {
                if (favCheck.data) {
                    button.classList.add('favorited');
                    button.innerHTML = `${Icons.bookmarkFilled}<span class="count">${button.querySelector('.count')?.textContent || 0}</span>`;
                } else {
                    button.classList.remove('favorited');
                    button.innerHTML = `${Icons.bookmark}<span class="count">${button.querySelector('.count')?.textContent || 0}</span>`;
                }
            });
        } finally {
            isTogglingFavorite = false;
            if (btn) btn.disabled = false;
        }
    }

    async function toggleCommentLike(commentId, btn) {
        const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('comment_id', commentId).maybeSingle();
        if (existing.data) {
            await supabaseClient.from('likes').delete().eq('id', existing.data.id);
        } else {
            await supabaseClient.from('likes').insert({ user_id: currentUser.id, comment_id: commentId });
        }
        // 刷新评论列表（如果存在）
        const postId = document.getElementById('commentsList')?.dataset.postId;
        const postAuthorId = document.getElementById('commentsList')?.dataset.postAuthorId;
        if (postId) {
            // 避免递归调用，详情页自己处理
            if (typeof loadComments === 'function') {
                loadComments(postId, postAuthorId);
            }
        }
    }

    // ---------- 弹窗 ----------
    function showShareModal(postId) {
        supabaseClient.from('follows').select('following:following_id(id, username, nickname, avatar_url)').eq('follower_id', currentUser.id).then(async ({ data }) => {
            const friends = data.map(d => d.following);
            let friendOptions = '';
            if (friends.length) friends.forEach(f => friendOptions += `<button class="btn btn-secondary btn-sm" data-share-friend-id="${f.id}">${getUserDisplayName(f)}</button>`);
            else friendOptions = '<p>暂无互关好友</p>';
            const content = `<p>选择发送给好友：</p><div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">${friendOptions}</div><button class="btn btn-secondary" id="copyLinkBtn">复制链接</button>`;
            const modal = openModal('分享', content);
            modal.querySelector('#copyLinkBtn').addEventListener('click', () => { const url = window.location.origin + '/post-detail.html?type=post&id=' + postId; navigator.clipboard.writeText(url).then(() => showToast('链接已复制','success')); });
            modal.querySelectorAll('[data-share-friend-id]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const receiverId = btn.dataset.shareFriendId;
                    await supabaseClient.from('messages').insert({ sender_id: currentUser.id, receiver_id: receiverId, content: window.location.origin + '/post-detail.html?type=post&id=' + postId, is_read: false });
                    modal.remove();
                    showToast('已发送到私聊','success');
                });
            });
        });
    }
    function showReportModal(targetType, targetId) {
        const reasonOptions = ['血腥', '恶意病毒文件', '政治', '招嫖', '诈骗', '其他'];
        const content = `<div class="form-group"><label>举报原因</label><select id="reportReason">${reasonOptions.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div><div class="form-group"><label>详细描述</label><textarea id="reportDesc"></textarea></div><div class="form-group"><label>图片证据（可选）</label><input type="file" id="reportEvidence" accept="image/*" multiple></div><button class="btn btn-danger" id="submitReportBtn">提交举报</button>`;
        const modal = openModal('举报', content);
        modal.querySelector('#submitReportBtn').addEventListener('click', async () => {
            const reason = modal.querySelector('#reportReason').value;
            const desc = modal.querySelector('#reportDesc').value.trim();
            let evidenceUrls = [];
            for (const file of modal.querySelector('#reportEvidence').files) { const uploaded = await uploadFile(file, 'reports', 'evidence'); evidenceUrls.push(uploaded.url); }
            await supabaseClient.from('reports').insert({ reporter_id: currentUser.id, target_type: targetType, target_id: targetId, reason, description: desc, evidence_urls: evidenceUrls });
            modal.remove(); showToast('举报已提交', 'success');
        });
    }
    async function showEditPostModal(postId) {
        const { data: post } = await supabaseClient.from('posts').select('*').eq('id', postId).single();
        if (!post) return;
        const content = `<div class="form-group"><label>内容</label><textarea id="editPostContent">${post.content || ''}</textarea></div><button class="btn btn-primary" id="saveEditBtn">保存修改</button>`;
        const modal = openModal('编辑帖子', content);
        modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
            const newContent = modal.querySelector('#editPostContent').value;
            await supabaseClient.from('posts').update({ content: newContent, is_edited: true, edited_at: new Date().toISOString() }).eq('id', postId);
            modal.remove(); showToast('已更新', 'success');
        });
    }

    async function shareComment(commentId) {
        const { data: comment } = await supabaseClient.from('comments').select('content, post_id').eq('id', commentId).single();
        if (!comment) return;
        const shareContent = comment.content || '';
        const postLink = window.location.origin + '/post-detail.html?type=post&id=' + comment.post_id;
        const content = `<p>分享评论：</p><p style="background:var(--bg-light);padding:8px;border-radius:6px;">${shareContent}</p><button class="btn btn-secondary" id="copyCommentBtn">复制评论</button><button class="btn btn-secondary" id="copyPostLinkBtn">复制帖子链接</button><hr><p>发送到好友私聊：</p><div id="friendList"></div>`;
        const modal = openModal('分享评论', content);
        modal.querySelector('#copyCommentBtn').addEventListener('click', () => navigator.clipboard.writeText(shareContent).then(() => showToast('评论已复制','success')));
        modal.querySelector('#copyPostLinkBtn').addEventListener('click', () => navigator.clipboard.writeText(postLink).then(() => showToast('链接已复制','success')));
        const friendListDiv = modal.querySelector('#friendList');
        const { data: follows } = await supabaseClient.from('follows').select('following:following_id(id, username, nickname, avatar_url)').eq('follower_id', currentUser.id);
        if (follows?.length) follows.forEach(f => {
            const btn = document.createElement('button'); btn.className = 'btn btn-secondary btn-sm'; btn.textContent = getUserDisplayName(f.following);
            btn.addEventListener('click', async () => { await supabaseClient.from('messages').insert({ sender_id: currentUser.id, receiver_id: f.following.id, content: `分享评论：${shareContent}`, is_read: false }); modal.remove(); showToast('已发送到私聊','success'); });
            friendListDiv.appendChild(btn);
        }); else friendListDiv.innerHTML = '<p>暂无好友</p>';
    }

    // ---------- 启动 ----------
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
