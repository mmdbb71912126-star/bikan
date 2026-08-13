// ============================================================
// js/app.js
// 必看 - 核心应用逻辑（路由、页面渲染、交互）
// 依赖：config.js, components.js（需先加载）
// ============================================================

(function() {
    console.log('[必看] app.js 开始加载');

    const cfg = window.BikanConfig;
    const comp = window.BikanComponents;
    const { supabaseClient, sdkReady, ROUTES, EXPLORE_TABS, FILE_TYPES } = cfg;
    const { Icons, renderPostCard, renderCommentItem, renderNotificationItem, renderUserCard, renderTopicCard, renderFileDetail, getUserAvatarHTML, getUserDisplayName, getUserHandle, openModal, showToast } = comp;

    let currentUser = null;
    let currentUserAuth = null;
    let currentRoute = ROUTES.EXPLORE;
    let currentTab = EXPLORE_TABS.SQUARE;
    let currentTopicId = null;
    let currentPostId = null;
    let notificationsUnread = 0;      // 未读通知数
    let unreadMessages = 0;           // 未读私信数
    let unreadFriendRequests = 0;     // 待处理好友请求数

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

    // ---------- 加载所有未读计数 ----------
    async function loadUnreadCounts() {
        if (!currentUser) return;
        await Promise.all([
            loadUnreadNotifications(),
            loadUnreadMessages(),
            loadUnreadFriendRequests()
        ]);
        updateAllBadges();
    }

    async function loadUnreadNotifications() {
        const { count, error } = await supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        notificationsUnread = (!error && count !== null) ? count : 0;
    }

    async function loadUnreadMessages() {
        const { count, error } = await supabaseClient
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('is_read', false);
        unreadMessages = (!error && count !== null) ? count : 0;
    }

    async function loadUnreadFriendRequests() {
        const { count, error } = await supabaseClient
            .from('friend_requests')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', currentUser.id)
            .eq('status', 'pending');
        unreadFriendRequests = (!error && count !== null) ? count : 0;
    }

    function updateAllBadges() {
        updateNavBadge();
        updateMessageBadge();
        updateFriendRequestBadge();
        updateNotificationBadge();
    }

    // 侧边栏社交红点：通知+私信+好友请求
    function updateNavBadge() {
        const socialNavItem = document.querySelector('.nav-item[data-route="social"]');
        if (!socialNavItem) return;
        let badge = socialNavItem.querySelector('.nav-badge');
        const totalUnread = notificationsUnread + unreadMessages + unreadFriendRequests;
        if (totalUnread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                socialNavItem.appendChild(badge);
            }
            badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            badge.classList.remove('hidden');
        } else {
            if (badge) badge.remove();
        }
    }

    // 好友tab红点：仅未读私信
    function updateMessageBadge() {
        const friendsTab = document.querySelector('.tab-item[data-social-tab="friends"]');
        if (!friendsTab) return;
        let badge = friendsTab.querySelector('.nav-badge');
        if (unreadMessages > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                friendsTab.appendChild(badge);
            }
            badge.textContent = unreadMessages > 99 ? '99+' : unreadMessages;
            badge.classList.remove('hidden');
        } else {
            if (badge) badge.remove();
        }
    }

    // 好友请求tab红点：待处理请求数
    function updateFriendRequestBadge() {
        const requestsTab = document.querySelector('.tab-item[data-social-tab="requests"]');
        if (!requestsTab) return;
        let badge = requestsTab.querySelector('.nav-badge');
        if (unreadFriendRequests > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                requestsTab.appendChild(badge);
            }
            badge.textContent = unreadFriendRequests > 99 ? '99+' : unreadFriendRequests;
            badge.classList.remove('hidden');
        } else {
            if (badge) badge.remove();
        }
    }

    // 通知中心tab红点
    function updateNotificationBadge() {
        const notifTab = document.querySelector('.tab-item[data-social-tab="notifications"]');
        if (!notifTab) return;
        let badge = notifTab.querySelector('.nav-badge');
        if (notificationsUnread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                notifTab.appendChild(badge);
            }
            badge.textContent = notificationsUnread > 99 ? '99+' : notificationsUnread;
            badge.classList.remove('hidden');
        } else {
            if (badge) badge.remove();
        }
    }

    // ---------- 实时订阅 ----------
    function setupRealtimeSubscriptions() {
        if (!supabaseClient) return;
        // 私信
        supabaseClient
            .channel('private-messages-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                if (newMsg.receiver_id === currentUser.id) {
                    unreadMessages++;
                    updateAllBadges();
                }
            })
            .subscribe();

        // 通知
        supabaseClient
            .channel('notifications-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                const newNotif = payload.new;
                if (newNotif.user_id === currentUser.id) {
                    notificationsUnread++;
                    updateAllBadges();
                }
            })
            .subscribe();

        // 好友请求
        supabaseClient
            .channel('friend-requests-' + currentUser.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_requests' }, (payload) => {
                const newReq = payload.new;
                if (newReq.receiver_id === currentUser.id) {
                    unreadFriendRequests++;
                    updateAllBadges();
                }
            })
            .subscribe();
    }

    // ---------- 渲染侧边栏（无底部用户信息）----------
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
        const tabHtml = `
            <div class="tab-bar">
                <button class="tab-item ${currentTab===EXPLORE_TABS.SQUARE?'active':''}" data-tab="${EXPLORE_TABS.SQUARE}">${Icons.refresh} 广场</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.HOT?'active':''}" data-tab="${EXPLORE_TABS.HOT}">${Icons.trend} 热门</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.RECOMMENDED?'active':''}" data-tab="${EXPLORE_TABS.RECOMMENDED}">${Icons.star} 推荐</button>
                <button class="tab-item ${currentTab===EXPLORE_TABS.SEARCH?'active':''}" data-tab="${EXPLORE_TABS.SEARCH}">${Icons.search} 搜索</button>
            </div>
            <div id="exploreContent"></div>`;
        mainContent.innerHTML = tabHtml;
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
                <div class="user-card-actions"><button class="btn btn-secondary btn-sm chat-btn" data-user-id="${f.id}">${Icons.message} <span>私聊</span></button></div>`;
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
        // 进入通知中心立即清除未读
        await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = 0;
        updateAllBadges();
        const { data, error } = await supabaseClient.from('notifications').select('*, actor:actor_id(id, username, nickname, avatar_url, is_banned)').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(50);
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return container.innerHTML = '<p>暂无通知</p>';
        container.innerHTML = '';
        data.forEach(n => container.appendChild(renderNotificationItem(n)));
    }

    // ---------- 他人主页 ----------
    async function viewUserProfile(userId) {
        if (userId === currentUser.id) { navigateTo(ROUTES.PROFILE); return; }
        enterFullscreen();
        mainContent.innerHTML = '<p>加载用户信息...</p>';
        const { data: profile, error: profileError } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
        if (profileError || !profile) { exitFullscreen(); return showToast('用户不存在', 'error'); }
        const { count: followingCount } = await supabaseClient.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId);
        const { count: followerCount } = await supabaseClient.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId);
        const { count: favCount } = await supabaseClient.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId);
        const { data: followData } = await supabaseClient.from('follows').select('id').eq('follower_id', currentUser.id).eq('following_id', userId).maybeSingle();
        const isFollowing = !!followData;
        const favPublic = profile.favorites_public !== false;
        const followingPublic = profile.following_public !== false;

        mainContent.innerHTML = `
            <button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button>
            <div style="position:relative; display:inline-block; float:right;">
                <button class="btn btn-secondary btn-sm" id="moreMenuBtn">${Icons.more}</button>
            </div>
            <div class="profile-header" style="display:flex;align-items:center;gap:20px;margin:20px 0;">
                ${getUserAvatarHTML(profile, 'avatar-lg')}
                <div>
                    <h2>${getUserDisplayName(profile)}</h2>
                    <p>${getUserHandle(profile)}</p>
                    <p style="color:var(--text-secondary);">${profile.bio||'暂无简介'}</p>
                    <p style="font-size:13px;color:var(--text-light);">注册于 ${new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <div style="display:flex;gap:20px;margin-bottom:20px;">
                <span>关注 ${followingCount||0}</span>
                <span>粉丝 ${followerCount||0}</span>
                ${favPublic?`<span>收藏 ${favCount||0}</span>`:''}
            </div>
            ${followingPublic?`<button class="btn btn-secondary btn-sm" id="viewFollowingBtn">查看关注列表</button>`:''}
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                ${isFollowing ? `<button class="btn btn-secondary" id="unfollowBtn" style="min-width:80px;">取关</button>` : `<button class="btn btn-primary" id="followBtn">关注</button>`}
                <button class="btn btn-primary" id="friendRequestBtn">好友请求</button>
                ${favPublic?`<button class="btn btn-secondary" id="viewFavBtn">查看收藏</button>`:`<button class="btn btn-secondary" disabled title="收藏未公开">${Icons.lock || '🔒'} 收藏</button>`}
            </div>
            <div id="userContent"></div>
        `;

        // 三个点菜单
        document.getElementById('moreMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.createElement('div');
            menu.style.cssText = 'position:absolute; right:0; top:30px; background:white; border:1px solid var(--border); border-radius:8px; box-shadow:var(--shadow-md); z-index:10;';
            menu.innerHTML = `
                <button class="btn btn-secondary btn-sm" data-action="report-user" data-user-id="${profile.id}" style="display:block; width:100%; text-align:left;">举报</button>
                <button class="btn btn-secondary btn-sm" data-action="block-user" data-user-id="${profile.id}" style="display:block; width:100%; text-align:left;">拉黑</button>
                <button class="btn btn-secondary btn-sm" data-action="share-profile" data-user-id="${profile.id}" style="display:block; width:100%; text-align:left;">分享主页</button>
            `;
            document.body.appendChild(menu);
            document.addEventListener('click', function closeMenu(ev) {
                if (!menu.contains(ev.target) && ev.target !== document.getElementById('moreMenuBtn')) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        });

        document.querySelector('[data-action="back"]').addEventListener('click', () => { exitFullscreen(); navigateTo(ROUTES.SOCIAL); });

        const followBtn = document.getElementById('followBtn');
        if (followBtn) followBtn.addEventListener('click', async () => { await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: userId }); showToast('已关注','success'); viewUserProfile(userId); });
        const unfollowBtn = document.getElementById('unfollowBtn');
        if (unfollowBtn) unfollowBtn.addEventListener('click', async () => { await supabaseClient.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId); showToast('已取关','success'); viewUserProfile(userId); });

        document.getElementById('friendRequestBtn').addEventListener('click', async () => {
            // 检查是否已发送过请求
            const existing = await supabaseClient.from('friend_requests').select('id').eq('sender_id', currentUser.id).eq('receiver_id', userId).maybeSingle();
            if (existing.data) return showToast('已发送好友请求', 'error');
            await supabaseClient.from('friend_requests').insert({ sender_id: currentUser.id, receiver_id: userId, status: 'pending' });
            showToast('好友请求已发送', 'success');
        });

        const viewFavBtn = document.getElementById('viewFavBtn');
        if (viewFavBtn && favPublic) {
            viewFavBtn.addEventListener('click', async () => {
                const userContent = document.getElementById('userContent');
                const { data: favs } = await supabaseClient.from('favorites').select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))').eq('user_id', userId).order('created_at', { ascending: false });
                if (!favs?.length) userContent.innerHTML = '<p>暂无公开收藏</p>';
                else {
                    userContent.innerHTML = '';
                    favs.forEach(f => { if (f.post) { f.post.is_owner = f.post.user_id === currentUser.id; userContent.appendChild(renderPostCard(f.post)); } });
                }
            });
        } else if (!favPublic) {
            // 锁图标已在按钮中显示
        }

        // 查看关注列表
        const viewFollowingBtn = document.getElementById('viewFollowingBtn');
        if (viewFollowingBtn) viewFollowingBtn.addEventListener('click', async () => {
            const { data: followingList } = await supabaseClient.from('follows').select('following:following_id(id, username, nickname, avatar_url, is_banned)').eq('follower_id', userId).limit(50);
            if (!followingList?.length) return showToast('暂无关注列表','error');
            let listHtml = '<ul style="list-style:none;padding:0;">';
            followingList.forEach(item => {
                const u = item.following;
                listHtml += `<li style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">${getUserAvatarHTML(u,'avatar-sm')}<span class="post-user-name">${getUserDisplayName(u)}</span><span class="post-user-id">${getUserHandle(u)}</span></li>`;
            });
            listHtml += '</ul>';
            openModal('关注列表', listHtml);
        });

        // 分享主页
        document.querySelector('[data-action="share-profile"]')?.addEventListener('click', () => {
            const url = window.location.origin + '/#user-' + userId;
            openModal('分享主页', `<p>复制链接：</p><input type="text" value="${url}" readonly style="width:100%;margin-bottom:12px;" onclick="this.select();document.execCommand('copy');showToast('已复制','success');">`);
        });

        // 举报用户
        document.querySelector('[data-action="report-user"]')?.addEventListener('click', () => {
            showReportModal('user', userId);
        });

        // 拉黑用户
        document.querySelector('[data-action="block-user"]')?.addEventListener('click', async () => {
            await supabaseClient.from('blocked_users').insert({ user_id: currentUser.id, blocked_user_id: userId });
            showToast('已拉黑','success');
            viewUserProfile(userId);
        });
    }

    // ---------- 个人与设置（退出按钮只在个人资料tab）----------
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

    async function loadUserPosts(container) { /* ... 与之前相同 ... */ }
    async function loadUserFavorites(container) { /* ... 与之前相同 ... */ }
    async function loadUserHistory(container) { /* ... 与之前相同 ... */ }

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

        // 公开设置立即生效
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

    async function loadFeedback(container) { /* ... 与之前相同 ... */ }
    async function getAdminId() { /* ... 与之前相同 ... */ }

    // ---------- 关于 ----------
    async function renderAbout() { /* ... 与之前相同 ... */ }

    // ---------- 管理员 ----------
    async function renderAdmin() { /* ... 与之前相同 ... */ }

    // 管理员各函数保留，但公告发布需通知所有用户
    async function showCreateAnnouncementModal(container) {
        // ... 插入公告后，通知所有用户
        const { data: users } = await supabaseClient.from('profiles').select('id');
        if (users && users.length) {
            const notifications = users.map(u => ({ user_id: u.id, type: 'admin_announcement', actor_id: currentUser.id, content: '管理员发布了公告：' + title, is_read: false }));
            await supabaseClient.from('notifications').insert(notifications);
        }
    }

    // ---------- 帖子详情 ----------
    async function openPostDetail(postId) { /* ... 与之前相同 ... */ }
    async function loadComments(postId) { /* ... 与之前相同 ... */ }

    // ---------- 话题详情 ----------
    async function openTopicDetail(topicId) {
        const { data: topic } = await supabaseClient.from('topics').select('*').eq('id', topicId).single();
        if (!topic) return;
        enterFullscreen();
        mainContent.innerHTML = `
            <button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button>
            <div class="page-header" style="margin-top:16px;">
                <div class="page-title">${topic.name}</div>
                <div class="page-subtitle">${topic.description || ''}</div>
                ${currentUser.is_admin && topic.public_id ? `<div style="font-size:13px;color:var(--text-light);">ID: ${topic.public_id}</div>` : ''}
            </div>
            <div class="post-actions" style="margin-bottom:16px;">
                <button class="action-btn" data-topic-id="${topic.id}" data-action="like-topic">${Icons.heart} <span>0</span></button>
                <button class="action-btn" data-topic-id="${topic.id}" data-action="comment-topic">${Icons.comment} <span>0</span></button>
                <button class="action-btn" data-topic-id="${topic.id}" data-action="share-topic">${Icons.share} <span>分享</span></button>
                <button class="action-btn" data-topic-id="${topic.id}" data-action="favorite-topic">${Icons.bookmark} <span>0</span></button>
                <button class="action-btn" data-topic-id="${topic.id}" data-action="report-topic">${Icons.flag} 举报</button>
            </div>
            <div id="topicPosts"></div>`;
        document.querySelector('[data-action="back"]').addEventListener('click', () => { exitFullscreen(); navigateTo(ROUTES.FORUM); });
        const postsDiv = document.getElementById('topicPosts');
        const { data: topicPosts, error } = await supabaseClient.from('topic_posts').select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))').eq('topic_id', topicId).order('created_at', { ascending: false });
        if (error || !topicPosts.length) return postsDiv.innerHTML = '<p>暂无讨论</p>';
        postsDiv.innerHTML = '';
        const posts = topicPosts.map(tp => tp.post).sort((a,b) => (b.like_count - a.like_count) || (new Date(b.created_at) - new Date(a.created_at)));
        for (const post of posts) {
            const [likeRes, favRes] = await Promise.all([
                supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
                supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
            ]);
            post.liked_by_me = !!likeRes.data; post.favorited_by_me = !!favRes.data; post.is_owner = post.user_id === currentUser.id;
            postsDiv.appendChild(renderPostCard(post));
        }
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

            // 原有帖子动作
            if (action === 'like' && postId) { await toggleLike(postId, target); }
            else if (action === 'favorite' && postId) { await toggleFavorite(postId, target); }
            else if (action === 'share' && postId) { showShareModal(postId); }
            else if (action === 'report' && postId) { showReportModal('post', postId); }
            else if (action === 'edit' && postId) { showEditPostModal(postId); }
            else if (action === 'delete' && postId) { if (confirm('确认删除这条帖子吗？')) { await supabaseClient.from('posts').delete().eq('id', postId); showToast('已删除','success'); if(currentPostId===postId) currentPostId=null; exitFullscreen(); navigateTo(ROUTES.EXPLORE); } }
            else if (action === 'like-comment' && commentId) { await toggleCommentLike(commentId, target); }
            else if (action === 'reply-comment' && commentId) { const commentInput = document.getElementById('commentInput'); if (commentInput) { commentInput.focus(); commentInput.dataset.parentId = commentId; const { data } = await supabaseClient.from('comments').select('user_id').eq('id', commentId).single(); if (data) commentInput.dataset.replyToUserId = data.user_id; } }
            else if (action === 'report-comment' && commentId) { showReportModal('comment', commentId); }
            else if (action === 'accept-friend' && requestId) {
                await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
                // 自动互相关注
                const { data: reqData } = await supabaseClient.from('friend_requests').select('sender_id, receiver_id').eq('id', requestId).single();
                if (reqData) {
                    await supabaseClient.from('follows').insert([{ follower_id: reqData.sender_id, following_id: reqData.receiver_id }, { follower_id: reqData.receiver_id, following_id: reqData.sender_id }]);
                }
                showToast('已接受','success');
                if(currentRoute===ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL);
            }
            else if (action === 'decline-friend' && requestId) { await supabaseClient.from('friend_requests').update({ status: 'declined' }).eq('id', requestId); showToast('已拒绝','success'); if(currentRoute===ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL); }
            else if (action === 'follow' && userId) { await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: userId }); showToast('已关注','success'); if(currentRoute===ROUTES.EXPLORE) renderExplore(); }
            else if (action === 'block' && userId) { await supabaseClient.from('blocked_users').insert({ user_id: currentUser.id, blocked_user_id: userId }); showToast('已拉黑','success'); }
            else if (action === 'dismiss-report' && id) { await supabaseClient.from('reports').update({ status:'dismissed', reviewed_by:currentUser.id, reviewed_at:new Date().toISOString() }).eq('id', id); showToast('已忽略','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'action-report' && id) { const targetType = target.dataset.targetType, targetId = target.dataset.targetId; if(targetType==='post') await supabaseClient.from('posts').delete().eq('id', targetId); else if(targetType==='comment') await supabaseClient.from('comments').delete().eq('id', targetId); else if(targetType==='user') await supabaseClient.from('profiles').update({ is_banned: true }).eq('id', targetId); else if(targetType==='topic') await supabaseClient.from('topics').update({ status:'closed' }).eq('id', targetId); await supabaseClient.from('reports').update({ status:'action_taken', reviewed_by:currentUser.id, reviewed_at:new Date().toISOString() }).eq('id', id); showToast('已处理','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'approve-topic' && id) { await supabaseClient.from('topics').update({ status:'approved', approved_at:new Date().toISOString(), approved_by:currentUser.id }).eq('id', id); showToast('已批准','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'reject-topic' && id) { await supabaseClient.from('topics').update({ status:'rejected' }).eq('id', id); showToast('已拒绝','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'delete-announcement' && id) { await supabaseClient.from('announcements').delete().eq('id', id); showToast('已删除','success'); if(currentRoute===ROUTES.ADMIN) navigateTo(ROUTES.ADMIN); }
            else if (action === 'qq-appeal' && notificationId) { e.stopPropagation(); navigator.clipboard.writeText('976926251').then(() => { showToast('QQ群号已复制，请到群内 @管理员 申诉','success'); target.textContent='已提示'; target.disabled=true; }).catch(() => showToast('请手动搜索 QQ 群：976926251','error')); }
            // 话题互动（示例）
            else if (action === 'like-topic' && topicId) { showToast('话题点赞功能开发中','info'); }
            else if (action === 'favorite-topic' && topicId) { showToast('话题收藏功能开发中','info'); }
            else if (action === 'share-topic' && topicId) { showToast('话题分享功能开发中','info'); }
            else if (action === 'report-topic' && topicId) { showReportModal('topic', topicId); }
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

    // ---------- 点赞/收藏切换 ----------
    async function toggleLike(postId, btn) { const existing=await supabaseClient.from('likes').select('id').eq('user_id',currentUser.id).eq('post_id',postId).maybeSingle(); if(existing.data) await supabaseClient.from('likes').delete().eq('id',existing.data.id); else await supabaseClient.from('likes').insert({user_id:currentUser.id,post_id:postId}); navigateTo(currentRoute); }
    async function toggleFavorite(postId, btn) { const existing=await supabaseClient.from('favorites').select('id').eq('user_id',currentUser.id).eq('post_id',postId).maybeSingle(); if(existing.data) await supabaseClient.from('favorites').delete().eq('id',existing.data.id); else await supabaseClient.from('favorites').insert({user_id:currentUser.id,post_id:postId,is_public:true}); navigateTo(currentRoute); }
    async function toggleCommentLike(commentId, btn) { const existing=await supabaseClient.from('likes').select('id').eq('user_id',currentUser.id).eq('comment_id',commentId).maybeSingle(); if(existing.data) await supabaseClient.from('likes').delete().eq('id',existing.data.id); else await supabaseClient.from('likes').insert({user_id:currentUser.id,comment_id:commentId}); if(currentPostId) await loadComments(currentPostId); }

    // ---------- 弹窗 ----------
    function showRepostModal(postId) { /* 已合并到分享，但保留以防 */ }
    function showShareModal(postId) {
        // 获取互关好友
        supabaseClient.from('follows').select('following:following_id(id, username, nickname, avatar_url)').eq('follower_id', currentUser.id).then(async ({ data }) => {
            const friends = data.map(d => d.following);
            let friendOptions = '';
            if (friends.length) {
                friends.forEach(f => {
                    friendOptions += `<button class="btn btn-secondary btn-sm" data-share-friend-id="${f.id}">${getUserDisplayName(f)}</button>`;
                });
            } else {
                friendOptions = '<p>暂无互关好友</p>';
            }
            const content = `
                <p>选择发送给好友：</p>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">${friendOptions}</div>
                <button class="btn btn-secondary" id="copyLinkBtn">复制链接</button>
            `;
            const modal = openModal('分享', content);
            modal.querySelector('#copyLinkBtn').addEventListener('click', () => {
                const url = window.location.origin + '/#post-' + postId;
                navigator.clipboard.writeText(url).then(() => showToast('链接已复制','success'));
            });
            modal.querySelectorAll('[data-share-friend-id]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const receiverId = btn.dataset.shareFriendId;
                    await supabaseClient.from('messages').insert({ sender_id: currentUser.id, receiver_id: receiverId, content: window.location.origin + '/#post-' + postId, is_read: false });
                    modal.remove();
                    showToast('已发送到私聊','success');
                });
            });
        });
    }
    function showReportModal(targetType, targetId) { /* ... 与之前相同 ... */ }
    async function showEditPostModal(postId) { /* ... 与之前相同 ... */ }

    // ---------- 启动 ----------
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
