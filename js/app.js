// ============================================================
// js/app.js
// 必看 - 核心应用逻辑（路由、页面渲染、交互）
// 依赖：config.js, components.js（需先加载）
// ============================================================

(function() {
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
    let notificationsUnread = 0;

    const appContainer = document.getElementById('app');
    const sidebarNav = document.getElementById('sidebarNav');
    const mainContent = document.getElementById('mainContent');
    const navBadge = document.getElementById('navBadge');

    // ---------- 初始化 ----------
    async function init() {
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

            // 如果被封禁，显示红色遮罩
            if (currentUser.is_banned) {
                addBannedOverlay();
            }

            await supabaseClient.from('profiles').update({ is_online: true, last_active_at: new Date().toISOString() }).eq('id', currentUser.id);
            await loadUnreadNotificationCount();
            renderSidebar();
            navigateTo(ROUTES.EXPLORE);
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') window.location.href = 'index.html';
            });
            setupGlobalEventDelegation();
        } catch (e) {
            console.error('初始化失败', e);
            showToast('初始化失败: ' + e.message, 'error');
        }
    }

    function addBannedOverlay() {
        if (document.querySelector('.banned-overlay')) return;
        const overlay = document.createElement('div');
        overlay.className = 'banned-overlay';
        overlay.innerHTML = `
            <div class="banned-logo">${Icons.logo(150)}</div>
            <div class="banned-text">你已被封禁</div>
        `;
        document.body.appendChild(overlay);
    }

    // ---------- 加载未读通知数 ----------
    async function loadUnreadNotificationCount() {
        if (!currentUser) return;
        const { count, error } = await supabaseClient
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false);
        if (!error && count !== null) {
            notificationsUnread = count;
            updateNavBadge();
        }
    }

    function updateNavBadge() {
        const socialNavItem = document.querySelector('.nav-item[data-route="social"]');
        if (!socialNavItem) return;
        let badge = socialNavItem.querySelector('.nav-badge');
        if (notificationsUnread > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'nav-badge';
                socialNavItem.appendChild(badge);
            }
            badge.textContent = notificationsUnread > 99 ? '99+' : notificationsUnread;
            badge.classList.remove('hidden');
        } else {
            if (badge) badge.remove();
        }
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
        if (currentUser && currentUser.is_admin) {
            navItems.push({ key: ROUTES.ADMIN, label: '管理', icon: Icons.admin });
        }
        let html = '<ul class="nav-list">';
        navItems.forEach(item => {
            const active = item.key === currentRoute ? ' active' : '';
            html += `<li class="nav-item${active}" data-route="${item.key}">${item.icon}<span>${item.label}</span></li>`;
        });
        html += '</ul>';
        sidebarNav.innerHTML = html;

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        const oldFooter = sidebar.querySelector('.sidebar-footer');
        if (oldFooter) oldFooter.remove();
        const footer = document.createElement('div');
        footer.className = 'sidebar-footer';
        footer.innerHTML = `
            <div class="user-mini" data-route="${ROUTES.PROFILE}">
                ${getUserAvatarHTML(currentUser, 'avatar-sm')}
                <div class="user-mini-info">
                    <div class="user-mini-name">${getUserDisplayName(currentUser)}</div>
                    <div class="user-mini-id">${currentUserAuth ? currentUserAuth.email : getUserHandle(currentUser)}</div>
                </div>
                <button class="logout-btn" id="logoutBtn" title="退出登录">${Icons.logout}</button>
            </div>
        `;
        sidebar.appendChild(footer);

        document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            await supabaseClient.from('profiles').update({ is_online: false }).eq('id', currentUser.id);
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });

        updateNavBadge();
    }

    // ---------- 全屏控制 ----------
    function enterFullscreen() {
        document.body.classList.add('fullscreen-app');
    }
    function exitFullscreen() {
        document.body.classList.remove('fullscreen-app');
    }

    // ---------- 路由导航 ----------
    function navigateTo(route) {
        currentRoute = route;
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.route === route);
        });
        mainContent.innerHTML = '';
        switch (route) {
            case ROUTES.EXPLORE:
                renderExplore();
                break;
            case ROUTES.FORUM:
                renderForum();
                break;
            case ROUTES.SOCIAL:
                renderSocial();
                break;
            case ROUTES.PROFILE:
                renderProfile();
                break;
            case ROUTES.ABOUT:
                renderAbout();
                break;
            case ROUTES.ADMIN:
                if (currentUser && currentUser.is_admin) renderAdmin();
                else navigateTo(ROUTES.EXPLORE);
                break;
            default:
                renderExplore();
        }
    }

    // ---------- 生成公共 ID ----------
    function generatePublicId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // ---------- 探索/发现 ----------
    async function renderExplore() {
        currentTab = currentTab || EXPLORE_TABS.SQUARE;
        const tabHtml = `
            <div class="tab-bar">
                <button class="tab-item ${currentTab === EXPLORE_TABS.SQUARE ? 'active' : ''}" data-tab="${EXPLORE_TABS.SQUARE}">${Icons.refresh} 广场</button>
                <button class="tab-item ${currentTab === EXPLORE_TABS.HOT ? 'active' : ''}" data-tab="${EXPLORE_TABS.HOT}">${Icons.trend} 热门</button>
                <button class="tab-item ${currentTab === EXPLORE_TABS.RECOMMENDED ? 'active' : ''}" data-tab="${EXPLORE_TABS.RECOMMENDED}">${Icons.star} 推荐</button>
                <button class="tab-item ${currentTab === EXPLORE_TABS.SEARCH ? 'active' : ''}" data-tab="${EXPLORE_TABS.SEARCH}">${Icons.search} 搜索</button>
            </div>
            <div id="exploreContent"></div>`;
        mainContent.innerHTML = tabHtml;
        const contentDiv = document.getElementById('exploreContent');
        if (currentTab === EXPLORE_TABS.SQUARE) {
            await loadPosts(contentDiv, 'square');
        } else if (currentTab === EXPLORE_TABS.HOT) {
            await loadPosts(contentDiv, 'hot');
        } else if (currentTab === EXPLORE_TABS.RECOMMENDED) {
            await loadRecommended(contentDiv);
        } else if (currentTab === EXPLORE_TABS.SEARCH) {
            renderSearch(contentDiv);
        }
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTab = btn.dataset.tab;
                renderExplore();
            });
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
        btn.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
        document.body.appendChild(btn);
    }

    // 加载帖子列表
    async function loadPosts(container, type) {
        container.innerHTML = '<p>加载中...</p>';
        let query;
        if (type === 'square') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)')
                .order('created_at', { ascending: false });
        } else if (type === 'hot') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)')
                .order('like_count', { ascending: false })
                .order('created_at', { ascending: false });
        }
        const { data, error } = await query.limit(30);
        if (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        if (data.length === 0) {
            container.innerHTML = '<p>暂无帖子</p>';
            return;
        }
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
        postsWithState.forEach(post => {
            container.appendChild(renderPostCard(post));
        });
    }

    async function loadRecommended(container) {
        container.innerHTML = '<p>加载中...</p>';
        const [postsRes, topicsRes] = await Promise.all([
            supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)')
                .eq('is_recommended', true)
                .order('created_at', { ascending: false })
                .limit(30),
            supabaseClient
                .from('topics')
                .select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)')
                .eq('is_recommended', true)
                .order('created_at', { ascending: false })
                .limit(30)
        ]);
        if (postsRes.error || topicsRes.error) {
            container.innerHTML = `<p>加载失败: ${(postsRes.error || topicsRes.error).message}</p>`;
            return;
        }
        const recommendedPosts = postsRes.data || [];
        const recommendedTopics = topicsRes.data || [];
        if (recommendedPosts.length === 0 && recommendedTopics.length === 0) {
            container.innerHTML = '<p>暂无推荐内容</p>';
            return;
        }
        container.innerHTML = '';
        for (const post of recommendedPosts) {
            const [likeRes, favRes] = await Promise.all([
                supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
                supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
            ]);
            post.liked_by_me = !!likeRes.data;
            post.favorited_by_me = !!favRes.data;
            post.is_owner = post.user_id === currentUser.id;
            container.appendChild(renderPostCard(post));
        }
        recommendedTopics.forEach(topic => {
            container.appendChild(renderTopicCard(topic, { showJoin: true }));
        });
    }

    // ---------- 搜索 ----------
    function renderSearch(container) {
        container.innerHTML = `
            <div class="search-bar">
                <input type="search" id="searchInput" placeholder="搜索帖子、用户、话题、文件名称" />
                <button class="btn btn-primary" id="searchBtn">${Icons.search} 搜索</button>
            </div>
            <div id="searchResults"></div>`;
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
        if (posts && posts.length) {
            html += '<h3>帖子</h3>';
            posts.forEach(post => {
                post.is_owner = post.user_id === currentUser.id;
                html += renderPostCard(post).outerHTML;
            });
        }
        if (users && users.length) {
            html += '<h3>用户</h3>';
            users.forEach(u => html += renderUserCard(u, { showFollowBtn: u.id !== currentUser.id, showBlockBtn: false }).outerHTML);
        }
        if (topics && topics.length) {
            html += '<h3>话题</h3>';
            topics.forEach(t => html += renderTopicCard(t).outerHTML);
        }
        if (files && files.length) {
            html += '<h3>文件</h3>';
            files.forEach(f => html += `<div class="file-item"><div class="file-icon">${Icons.file}</div><div class="file-info"><div class="file-name">${f.file_name}</div><div class="file-size">${formatFileSize(f.file_size)}</div></div></div>`);
        }
        container.innerHTML = html || '<p>没有找到相关内容</p>';
    }

    // ---------- 论坛 ----------
    async function renderForum() {
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="page-title">论坛</div>
                <div class="page-subtitle">围绕话题进行讨论</div>
            </div>
            <button class="btn btn-primary" id="createTopicBtn" style="margin-bottom: 16px;">${Icons.plus} 创建话题</button>
            <div id="topicsList"></div>`;
        document.getElementById('createTopicBtn').addEventListener('click', showCreateTopicModal);
        await loadTopics();
    }

    async function loadTopics() {
        const listDiv = document.getElementById('topicsList');
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('topics')
            .select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (error) return listDiv.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return listDiv.innerHTML = '<p>暂无已审核的话题</p>';
        listDiv.innerHTML = '';
        data.forEach(topic => listDiv.appendChild(renderTopicCard(topic, { showJoin: true })));
    }

    function showCreateTopicModal() {
        if (currentUser.is_banned) return showToast('你已被封禁，无法操作', 'error');
        const content = `
            <div class="form-group"><label>话题名称</label><input type="text" id="topicName" /></div>
            <div class="form-group"><label>话题描述</label><textarea id="topicDesc"></textarea></div>
            <button class="btn btn-primary" id="submitTopicBtn">提交审核</button>`;
        const modal = openModal('创建话题', content);
        modal.querySelector('#submitTopicBtn').addEventListener('click', async () => {
            const name = modal.querySelector('#topicName').value.trim();
            const desc = modal.querySelector('#topicDesc').value.trim();
            if (!name) return showToast('请输入话题名称', 'error');
            const createdAt = new Date(currentUser.created_at);
            const days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (days < 30) return showToast('账号注册需满30天才能创建话题', 'error');
            const { count, error: countError } = await supabaseClient.from('topics').select('id', { count: 'exact', head: true }).eq('creator_id', currentUser.id);
            if (countError || count >= 3) return showToast('每个账号最多创建3个话题', 'error');
            const publicId = generatePublicId();
            const { error } = await supabaseClient.from('topics').insert({ name, description: desc, creator_id: currentUser.id, status: 'pending', public_id: publicId });
            if (error) return showToast('创建失败: ' + error.message, 'error');
            modal.remove();
            showToast('话题已提交审核', 'success');
            loadTopics();
        });
    }

    // ---------- 社交 ----------
    async function renderSocial() {
        // 自动标记所有通知为已读，清除红点
        await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = 0;
        updateNavBadge();

        mainContent.innerHTML = `
            <div class="tab-bar">
                <button class="tab-item active" data-social-tab="friends">${Icons.friend} 好友</button>
                <button class="tab-item" data-social-tab="requests">${Icons.user} 好友请求</button>
                <button class="tab-item" data-social-tab="notifications">${Icons.bell} 通知中心</button>
            </div>
            <div id="socialContent"></div>`;
        const contentDiv = document.getElementById('socialContent');
        await loadFriends(contentDiv);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.socialTab;
                contentDiv.innerHTML = '';
                if (tab === 'friends') await loadFriends(contentDiv);
                else if (tab === 'requests') await loadFriendRequests(contentDiv);
                else if (tab === 'notifications') await loadNotifications(contentDiv);
            });
        });
    }

    async function loadFriends(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('follows')
            .select('following:following_id(id, username, nickname, avatar_url, is_online, is_banned, bio)')
            .eq('follower_id', currentUser.id);
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        const friends = data.map(d => d.following);
        if (!friends.length) return container.innerHTML = '<p>暂无好友，去关注一些人吧</p>';
        container.innerHTML = '';
        friends.forEach(f => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="avatar" style="cursor:pointer;" data-action="view-profile" data-user-id="${f.id}">
                    ${getUserAvatarHTML(f, 'avatar')}
                </div>
                <div class="user-card-info" style="cursor:pointer;" data-action="view-profile" data-user-id="${f.id}">
                    <div class="post-user-name">${getUserDisplayName(f)}</div>
                    <div class="post-user-id">${getUserHandle(f)}</div>
                    ${f.bio ? `<div style="font-size:13px;color:var(--text-secondary);">${f.bio}</div>` : ''}
                </div>
                <div class="user-card-actions">
                    <button class="btn btn-secondary btn-sm" data-action="chat" data-user-id="${f.id}">${Icons.message} 私聊</button>
                </div>`;
            card.querySelector('[data-action="chat"]').addEventListener('click', () => {
                window.location.href = `chat.html?userId=${f.id}`;
            });
            card.querySelectorAll('[data-action="view-profile"]').forEach(el => {
                el.addEventListener('click', () => viewUserProfile(f.id));
            });
            container.appendChild(card);
        });
    }

    async function loadFriendRequests(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('friend_requests')
            .select('id, sender:sender_id(id, username, nickname, avatar_url, is_online, is_banned, bio), status')
            .eq('receiver_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        if (!data.length) return container.innerHTML = '<p>暂无好友请求</p>';
        container.innerHTML = '';
        data.forEach(req => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                <div class="avatar" style="cursor:pointer;" data-action="view-profile" data-user-id="${req.sender.id}">
                    ${getUserAvatarHTML(req.sender, 'avatar')}
                </div>
                <div class="user-card-info" style="cursor:pointer;" data-action="view-profile" data-user-id="${req.sender.id}">
                    <div class="post-user-name">${getUserDisplayName(req.sender)}</div>
                    <div class="post-user-id">${getUserHandle(req.sender)}</div>
                    <div style="font-size: 13px; color: var(--text-light);">${req.status}</div>
                </div>
                <div class="user-card-actions">
                    ${req.status === 'pending' ? `
                        <button class="btn btn-primary btn-sm" data-action="accept-friend" data-request-id="${req.id}">接受</button>
                        <button class="btn btn-secondary btn-sm" data-action="decline-friend" data-request-id="${req.id}">拒绝</button>
                    ` : ''}
                </div>`;
            card.querySelectorAll('[data-action="view-profile"]').forEach(el => {
                el.addEventListener('click', () => viewUserProfile(req.sender.id));
            });
            container.appendChild(card);
        });
    }

    async function loadNotifications(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*, actor:actor_id(id, username, nickname, avatar_url, is_banned)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) return container.innerHTML = `<p>加载失败: ${error.message}</p>`;
        await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = 0;
        updateNavBadge();
        if (!data.length) return container.innerHTML = '<p>暂无通知</p>';
        container.innerHTML = '';
        data.forEach(n => container.appendChild(renderNotificationItem(n)));
    }

    // ---------- 他人主页 ----------
    async function viewUserProfile(userId) {
        if (userId === currentUser.id) {
            navigateTo(ROUTES.PROFILE);
            return;
        }
        enterFullscreen();
        mainContent.innerHTML = '<p>加载用户信息...</p>';
        // 获取用户信息
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (profileError || !profile) {
            exitFullscreen();
            return showToast('用户不存在', 'error');
        }
        // 统计关注数（该用户关注了多少人）
        const { count: followingCount, error: followingError } = await supabaseClient
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', userId);
        // 统计粉丝数（多少人关注了该用户）
        const { count: followerCount, error: followerError } = await supabaseClient
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', userId);
        // 统计收藏数
        const { count: favCount, error: favError } = await supabaseClient
            .from('favorites')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId);
        // 判断当前用户是否已关注他
        const { data: followData } = await supabaseClient
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)
            .maybeSingle();
        const isFollowing = !!followData;

        const favPublic = profile.favorites_public !== false; // 默认 true
        const followingPublic = profile.following_public !== false; // 默认 true

        mainContent.innerHTML = `
            <button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button>
            <div class="profile-header" style="display:flex;align-items:center;gap:20px;margin:20px 0;">
                ${getUserAvatarHTML(profile, 'avatar-lg')}
                <div>
                    <h2>${getUserDisplayName(profile)}</h2>
                    <p>${getUserHandle(profile)}</p>
                    <p style="color:var(--text-secondary);">${profile.bio || '暂无简介'}</p>
                    <p style="font-size:13px;color:var(--text-light);">注册于 ${new Date(profile.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <div style="display:flex;gap:20px;margin-bottom:20px;">
                <span>关注 ${followingCount || 0}</span>
                <span>粉丝 ${followerCount || 0}</span>
                ${favPublic ? `<span>收藏 ${favCount || 0}</span>` : ''}
            </div>
            ${followingPublic ? `<button class="btn btn-secondary btn-sm" id="viewFollowingBtn">查看关注列表</button>` : ''}
            <div style="display:flex;gap:8px;margin-bottom:20px;">
                ${isFollowing ? 
                    `<button class="btn btn-secondary" id="unfollowBtn">取关</button>` :
                    `<button class="btn btn-primary" id="followBtn">关注</button>`
                }
                <button class="btn btn-danger" id="blockBtn">拉黑</button>
            </div>
            ${favPublic ? `<div id="userFavs"></div>` : ''}
        `;
        // 绑定返回
        document.querySelector('[data-action="back"]').addEventListener('click', () => {
            exitFullscreen();
            navigateTo(ROUTES.SOCIAL);
        });
        // 关注/取关
        const followBtn = document.getElementById('followBtn');
        if (followBtn) followBtn.addEventListener('click', async () => {
            await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
            showToast('已关注', 'success');
            viewUserProfile(userId);
        });
        const unfollowBtn = document.getElementById('unfollowBtn');
        if (unfollowBtn) unfollowBtn.addEventListener('click', async () => {
            await supabaseClient.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', userId);
            showToast('已取关', 'success');
            viewUserProfile(userId);
        });
        // 拉黑
        document.getElementById('blockBtn').addEventListener('click', async () => {
            await supabaseClient.from('blocked_users').insert({ user_id: currentUser.id, blocked_user_id: userId });
            showToast('已拉黑', 'success');
            viewUserProfile(userId);
        });
        // 查看关注列表
        const viewFollowingBtn = document.getElementById('viewFollowingBtn');
        if (viewFollowingBtn) {
            viewFollowingBtn.addEventListener('click', async () => {
                const { data: followingList, error: listError } = await supabaseClient
                    .from('follows')
                    .select('following:following_id(id, username, nickname, avatar_url, is_banned)')
                    .eq('follower_id', userId)
                    .limit(50);
                if (listError || !followingList.length) {
                    return showToast('暂无关注列表', 'error');
                }
                let listHtml = '<ul style="list-style:none;padding:0;">';
                followingList.forEach(item => {
                    const u = item.following;
                    listHtml += `<li style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border);">
                        ${getUserAvatarHTML(u, 'avatar-sm')}
                        <span class="post-user-name">${getUserDisplayName(u)}</span>
                        <span class="post-user-id">${getUserHandle(u)}</span>
                    </li>`;
                });
                listHtml += '</ul>';
                openModal('关注列表', listHtml);
            });
        }
        // 如果收藏公开，加载用户收藏的帖子
        if (favPublic) {
            const favsContainer = document.getElementById('userFavs');
            const { data: favs, error: favsError } = await supabaseClient
                .from('favorites')
                .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (favsError || !favs.length) {
                favsContainer.innerHTML = '<p>暂无公开收藏</p>';
            } else {
                favsContainer.innerHTML = '';
                favs.forEach(f => {
                    if (f.post) {
                        f.post.is_owner = f.post.user_id === currentUser.id;
                        favsContainer.appendChild(renderPostCard(f.post));
                    }
                });
            }
        }
    }

    // ---------- 个人与设置 ----------
    async function renderProfile() {
        mainContent.innerHTML = `
            <div class="page-header"><div class="page-title">个人与设置</div></div>
            <div class="profile-header" style="display:flex;align-items:center;gap:20px;margin-bottom:20px;">
                <div id="profileAvatarContainer" style="cursor:pointer;">${getUserAvatarHTML(currentUser, 'avatar-lg')}</div>
                <div>
                    <h2>${getUserDisplayName(currentUser)}</h2>
                    <p>${getUserHandle(currentUser)}</p>
                    <p style="color:var(--text-secondary);">${currentUser.bio || '暂无简介'}</p>
                    <p style="font-size:13px;color:var(--text-light);">注册于 ${new Date(currentUser.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="tab-bar">
                <button class="tab-item active" data-profile-tab="profile">个人资料</button>
                <button class="tab-item" data-profile-tab="posts">我的帖子</button>
                <button class="tab-item" data-profile-tab="favorites">收藏</button>
                <button class="tab-item" data-profile-tab="history">历史</button>
                <button class="tab-item" data-profile-tab="feedback">反馈</button>
            </div>
            <div id="profileContent"></div>`;
        const contentDiv = document.getElementById('profileContent');
        await loadSettings(contentDiv);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.profileTab;
                contentDiv.innerHTML = '';
                if (tab === 'profile') await loadSettings(contentDiv);
                else if (tab === 'posts') await loadUserPosts(contentDiv);
                else if (tab === 'favorites') await loadUserFavorites(contentDiv);
                else if (tab === 'history') await loadUserHistory(contentDiv);
                else if (tab === 'feedback') await loadFeedback(contentDiv);
            });
        });
    }

    async function loadUserPosts(container) {
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无帖子</p>';
        container.innerHTML = '';
        data.forEach(post => { post.is_owner = true; container.appendChild(renderPostCard(post)); });
    }

    async function loadUserFavorites(container) {
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无收藏</p>';
        container.innerHTML = '';
        data.forEach(f => { if (f.post) { f.post.is_owner = f.post.user_id === currentUser.id; container.appendChild(renderPostCard(f.post)); } });
    }

    async function loadUserHistory(container) {
        const { data, error } = await supabaseClient
            .from('view_history')
            .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))')
            .eq('user_id', currentUser.id)
            .order('viewed_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无历史记录</p>';
        container.innerHTML = '';
        data.forEach(h => { if (h.post) { h.post.is_owner = h.post.user_id === currentUser.id; container.appendChild(renderPostCard(h.post)); } });
    }

    async function loadSettings(container) {
        let pendingAvatarUrl = null;
        container.innerHTML = `
            <h3>个人资料</h3>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
                <div id="settingsAvatar" style="cursor:pointer;">${getUserAvatarHTML(currentUser, 'avatar-lg')}</div>
                <div><p style="font-size:14px;color:var(--text-secondary);">点击头像上传新图片</p></div>
            </div>
            <div class="form-group"><label>ID</label><input type="text" id="editUsername" value="${currentUser.username}" /></div>
            <div class="form-group"><label>昵称</label><input type="text" id="editNickname" value="${currentUser.nickname}" /></div>
            <div class="form-group"><label>简介</label><textarea id="editBio">${currentUser.bio || ''}</textarea></div>
            <div class="form-group">
                <label><input type="checkbox" id="editFavoritesPublic" ${currentUser.favorites_public !== false ? 'checked' : ''} /> 公开我的收藏</label>
            </div>
            <div class="form-group">
                <label><input type="checkbox" id="editFollowingPublic" ${currentUser.following_public !== false ? 'checked' : ''} /> 公开我的关注</label>
            </div>
            <button class="btn btn-primary" id="saveProfileBtn">保存</button>`;
        const avatarContainer = container.querySelector('#settingsAvatar');
        avatarContainer.addEventListener('click', () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法修改资料', 'error');
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const uploaded = await uploadFile(file, 'avatars', `avatar/${currentUser.id}`);
                pendingAvatarUrl = uploaded.url;
                avatarContainer.innerHTML = `<div class="avatar-lg"><img src="${uploaded.url}" alt="avatar"></div>`;
                showToast('头像已选择，点击保存后生效', 'success');
            };
            fileInput.click();
        });
        container.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法修改资料', 'error');
            const nickname = container.querySelector('#editNickname').value.trim();
            const username = container.querySelector('#editUsername').value.trim();
            const bio = container.querySelector('#editBio').value.trim();
            const favoritesPublic = container.querySelector('#editFavoritesPublic').checked;
            const followingPublic = container.querySelector('#editFollowingPublic').checked;
            if (!nickname || !username) return showToast('昵称和ID不能为空', 'error');
            if (!/^[a-z0-9_@.]+$/.test(username)) return showToast('ID 只能包含小写字母、数字、下划线、@ 和点', 'error');
            if (currentUser.updated_at && Date.now() - new Date(currentUser.updated_at).getTime() < 15*24*60*60*1000) return showToast('个人资料每15天只能修改一次', 'error');
            const updates = { nickname, username, bio, favorites_public: favoritesPublic, following_public: followingPublic, updated_at: new Date().toISOString() };
            if (pendingAvatarUrl) updates.avatar_url = pendingAvatarUrl;
            const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
            if (error) return showToast('保存失败: ' + error.message, 'error');
            Object.assign(currentUser, updates);
            showToast('保存成功', 'success');
            renderSidebar();
            renderProfile();
        });
    }

    async function loadFeedback(container) {
        container.innerHTML = `
            <h3>反馈 Bug</h3>
            <div class="form-group"><label>问题描述</label><textarea id="feedbackContent"></textarea></div>
            <button class="btn btn-primary" id="submitFeedbackBtn">提交反馈</button>`;
        container.querySelector('#submitFeedbackBtn').addEventListener('click', async () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法提交反馈', 'error');
            const content = container.querySelector('#feedbackContent').value.trim();
            if (!content) return showToast('请输入问题描述', 'error');
            const adminId = await getAdminId();
            if (!adminId) return showToast('无法获取管理员信息', 'error');
            await supabaseClient.from('notifications').insert({ user_id: adminId, type: 'system', content: '用户反馈: ' + content, actor_id: currentUser.id });
            showToast('反馈已提交', 'success');
            container.querySelector('#feedbackContent').value = '';
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
        mainContent.innerHTML = `<div class="page-header"><div class="page-title">管理面板</div></div>
            <div class="tab-bar">
                <button class="tab-item active" data-admin-tab="announcements">公告</button>
                <button class="tab-item" data-admin-tab="reports">举报处理</button>
                <button class="tab-item" data-admin-tab="topics">话题审核</button>
                <button class="tab-item" data-admin-tab="recommend">推荐管理</button>
                <button class="tab-item" data-admin-tab="about">关于编辑</button>
                <button class="tab-item" data-admin-tab="user-operations">用户操作</button>
            </div>
            <div id="adminContent"></div>`;
        const adminContent = document.getElementById('adminContent');
        await loadAnnouncementsAdmin(adminContent);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.adminTab;
                adminContent.innerHTML = '';
                if (tab === 'announcements') await loadAnnouncementsAdmin(adminContent);
                else if (tab === 'reports') await loadReportsAdmin(adminContent);
                else if (tab === 'topics') await loadTopicsAdmin(adminContent);
                else if (tab === 'recommend') await loadRecommendAdmin(adminContent);
                else if (tab === 'about') await loadAboutAdmin(adminContent);
                else if (tab === 'user-operations') await loadUserOperationsAdmin(adminContent);
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
        listDiv.innerHTML = '';
        data.forEach(a => {
            const card = document.createElement('div');
            card.className = 'announcement-card';
            card.innerHTML = `<div class="announcement-title">${a.title}</div><div class="post-content">${a.content||''}</div><div style="font-size:13px;color:var(--text-light);">${timeAgo(a.created_at)}</div><button class="btn btn-secondary btn-sm" data-action="delete-announcement" data-id="${a.id}">删除</button>`;
            listDiv.appendChild(card);
        });
    }

    function showCreateAnnouncementModal(container) {
        const content = `<div class="form-group"><label>标题</label><input type="text" id="announcementTitle"></div><div class="form-group"><label>内容</label><textarea id="announcementContent"></textarea></div><div class="form-group"><label>引用帖子ID（逗号分隔）</label><input type="text" id="announcementPosts"></div><div class="form-group"><label>引用话题ID（逗号分隔）</label><input type="text" id="announcementTopics"></div><div class="form-group"><label>上传文件</label><input type="file" id="announcementFiles" multiple></div><button class="btn btn-primary" id="submitAnnouncementBtn">发布公告</button>`;
        const modal = openModal('创建公告', content);
        modal.querySelector('#submitAnnouncementBtn').addEventListener('click', async () => {
            const title = modal.querySelector('#announcementTitle').value.trim();
            if (!title) return showToast('请输入标题', 'error');
            const contentText = modal.querySelector('#announcementContent').value.trim();
            const postIds = modal.querySelector('#announcementPosts').value.split(',').map(s=>s.trim()).filter(Boolean);
            const topicIds = modal.querySelector('#announcementTopics').value.split(',').map(s=>s.trim()).filter(Boolean);
            let filesData = [];
            for (const file of modal.querySelector('#announcementFiles').files) {
                const uploaded = await uploadFile(file, 'announcements', 'announcements');
                filesData.push(uploaded);
            }
            await supabaseClient.from('announcements').insert({ admin_id: currentUser.id, title, content: contentText, files: filesData, referenced_posts: postIds, referenced_topics: topicIds });
            modal.remove();
            showToast('公告已发布', 'success');
            await refreshAnnouncementsList(container.querySelector('#announcementsList'));
        });
    }

    async function loadReportsAdmin(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('reports').select('*, reporter:reporter_id(id, username, nickname, avatar_url, is_banned)').eq('status', 'pending').order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无待处理举报</p>';
        container.innerHTML = '';
        data.forEach(r => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `<div><strong>举报类型：</strong>${r.reason}</div><div><strong>描述：</strong>${r.description||'无'}</div><div><strong>举报人：</strong>${getUserDisplayName(r.reporter)}</div><div style="font-size:13px;color:var(--text-light);">${timeAgo(r.created_at)}</div><div style="margin-top:8px;"><button class="btn btn-secondary btn-sm" data-action="dismiss-report" data-id="${r.id}">忽略</button><button class="btn btn-danger btn-sm" data-action="action-report" data-id="${r.id}" data-target-type="${r.target_type}" data-target-id="${r.target_id}">处理</button></div>`;
            container.appendChild(card);
        });
    }

    async function loadTopicsAdmin(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('status', 'pending').order('created_at', { ascending: false });
        if (error || !data.length) return container.innerHTML = '<p>暂无待审核话题</p>';
        container.innerHTML = '';
        data.forEach(t => {
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.innerHTML = `<div class="topic-name">${t.name}</div><div class="topic-desc">${t.description||''}</div><div>创建者：${getUserDisplayName(t.creator)}</div><div style="margin-top:8px;"><button class="btn btn-primary btn-sm" data-action="approve-topic" data-id="${t.id}">批准</button><button class="btn btn-secondary btn-sm" data-action="reject-topic" data-id="${t.id}">拒绝</button></div>`;
            container.appendChild(card);
        });
    }

    async function loadRecommendAdmin(container) {
        container.innerHTML = `<h3>推荐管理</h3><div class="form-group"><label>输入帖子或话题的 ID（自定义短 ID）</label><input type="text" id="recommendTargetId" placeholder="例如：abc12345"></div><button class="btn btn-primary" id="addRecommendBtn">推荐</button><div id="recommendList" style="margin-top:16px;"></div>`;
        container.querySelector('#addRecommendBtn').addEventListener('click', async () => {
            const input = container.querySelector('#recommendTargetId').value.trim();
            if (!input) return showToast('请输入 ID', 'error');
            const { data: postData, error: postError } = await supabaseClient.from('posts').select('id').eq('public_id', input).maybeSingle();
            if (!postError && postData) {
                await supabaseClient.from('posts').update({ is_recommended: true }).eq('id', postData.id);
                showToast('帖子推荐成功', 'success');
                container.querySelector('#recommendTargetId').value = '';
                await refreshRecommendList(container.querySelector('#recommendList'));
                return;
            }
            const { data: topicData, error: topicError } = await supabaseClient.from('topics').select('id').eq('public_id', input).maybeSingle();
            if (!topicError && topicData) {
                await supabaseClient.from('topics').update({ is_recommended: true }).eq('id', topicData.id);
                showToast('话题推荐成功', 'success');
                container.querySelector('#recommendTargetId').value = '';
                await refreshRecommendList(container.querySelector('#recommendList'));
                return;
            }
            showToast('未找到该 ID 对应的帖子或话题', 'error');
        });
        await refreshRecommendList(container.querySelector('#recommendList'));
    }

    async function refreshRecommendList(listDiv) {
        listDiv.innerHTML = '加载中...';
        const [postsRes, topicsRes] = await Promise.all([
            supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').eq('is_recommended', true).order('created_at', { ascending: false }).limit(50),
            supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url, is_banned)').eq('is_recommended', true).order('created_at', { ascending: false }).limit(50)
        ]);
        if (postsRes.error || topicsRes.error) return listDiv.innerHTML = `<p>加载失败: ${(postsRes.error||topicsRes.error).message}</p>`;
        const posts = postsRes.data || [], topics = topicsRes.data || [];
        if (!posts.length && !topics.length) return listDiv.innerHTML = '<p>暂无推荐内容</p>';
        listDiv.innerHTML = '';
        posts.forEach(post => {
            post.is_owner = post.user_id === currentUser.id;
            const card = renderPostCard(post);
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-sm';
            btn.textContent = '取消推荐';
            btn.addEventListener('click', async () => { await supabaseClient.from('posts').update({ is_recommended: false }).eq('id', post.id); await refreshRecommendList(listDiv); });
            card.appendChild(btn);
            listDiv.appendChild(card);
        });
        topics.forEach(topic => {
            const card = renderTopicCard(topic, { showJoin: true });
            const btn = document.createElement('button');
            btn.className = 'btn btn-secondary btn-sm';
            btn.textContent = '取消推荐';
            btn.addEventListener('click', async () => { await supabaseClient.from('topics').update({ is_recommended: false }).eq('id', topic.id); await refreshRecommendList(listDiv); });
            card.appendChild(btn);
            listDiv.appendChild(card);
        });
    }

    async function loadAboutAdmin(container) {
        container.innerHTML = `<h3>编辑关于页面</h3><div class="form-group"><label>内容（支持 HTML）</label><textarea id="aboutEditor" style="min-height:300px;"></textarea></div><button class="btn btn-primary" id="saveAboutBtn">保存</button>`;
        const { data } = await supabaseClient.from('about_page').select('*').order('updated_at', { ascending: false }).limit(1);
        if (data?.length) container.querySelector('#aboutEditor').value = data[0].content || '';
        container.querySelector('#saveAboutBtn').addEventListener('click', async () => {
            const content = container.querySelector('#aboutEditor').value;
            await supabaseClient.from('about_page').insert({ admin_id: currentUser.id, content });
            showToast('已保存', 'success');
        });
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

    // ---------- 帖子详情 ----------
    async function openPostDetail(postId) {
        if (!postId) return;
        currentPostId = postId;
        enterFullscreen();
        await supabaseClient.from('view_history').upsert({ user_id: currentUser.id, post_id: postId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,post_id' });
        const { data: post, error } = await supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned)').eq('id', postId).single();
        if (error) { exitFullscreen(); return showToast('加载帖子失败', 'error'); }
        const [likeRes, favRes] = await Promise.all([
            supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle(),
            supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle()
        ]);
        post.liked_by_me = !!likeRes.data;
        post.favorited_by_me = !!favRes.data;
        post.is_owner = post.user_id === currentUser.id;
        mainContent.innerHTML = `<button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button><div id="postDetailContainer" style="margin-top:16px;"></div>`;
        document.querySelector('[data-action="back"]').addEventListener('click', () => { currentPostId = null; exitFullscreen(); navigateTo(ROUTES.EXPLORE); });
        const detailContainer = document.getElementById('postDetailContainer');
        detailContainer.appendChild(renderPostCard(post, { showActions: true, isDetail: true }));
        if (currentUser.is_admin && post.public_id) {
            const idTag = document.createElement('div');
            idTag.style.cssText = 'position:absolute;top:10px;right:10px;background:var(--bg-light);padding:4px 8px;border-radius:6px;font-size:12px;color:var(--text-light);';
            idTag.textContent = 'ID: ' + post.public_id;
            detailContainer.style.position = 'relative';
            detailContainer.appendChild(idTag);
        }
        if (post.media?.length) {
            const mediaDiv = document.createElement('div');
            mediaDiv.innerHTML = post.media.map(file => renderFileDetail(file)).join('');
            detailContainer.appendChild(mediaDiv);
        }
        detailContainer.innerHTML += `<div class="comments-section"><h3>评论</h3><div id="commentsList"></div><div class="comment-form" style="margin-top:16px;"><textarea id="commentInput" placeholder="写下你的评论..." rows="3"></textarea><button class="btn btn-primary" id="submitCommentBtn" style="margin-top:8px;">${Icons.comment} 发表评论</button></div></div>`;
        await loadComments(postId);
        detailContainer.querySelector('#submitCommentBtn').addEventListener('click', async () => {
            if (currentUser.is_banned) return showToast('你已被封禁，无法评论', 'error');
            const content = detailContainer.querySelector('#commentInput').value.trim();
            if (!content) return showToast('请输入评论内容', 'error');
            const parentId = detailContainer.querySelector('#commentInput').dataset.parentId || null;
            const replyToUserId = detailContainer.querySelector('#commentInput').dataset.replyToUserId || null;
            const insertData = { post_id: postId, user_id: currentUser.id, content };
            if (parentId) { insertData.parent_id = parentId; insertData.reply_to_user_id = replyToUserId; }
            const { error } = await supabaseClient.from('comments').insert(insertData);
            if (error) return showToast('评论失败: ' + error.message, 'error');
            detailContainer.querySelector('#commentInput').value = '';
            delete detailContainer.querySelector('#commentInput').dataset.parentId;
            delete detailContainer.querySelector('#commentInput').dataset.replyToUserId;
            await loadComments(postId);
        });
    }

    async function loadComments(postId) {
        const listDiv = document.getElementById('commentsList');
        if (!listDiv) return;
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('comments').select('*, profiles:user_id(id, username, nickname, avatar_url, is_banned), reply_to_user:reply_to_user_id(id, username, nickname, is_banned)').eq('post_id', postId).order('created_at', { ascending: true });
        if (error || !data.length) return listDiv.innerHTML = '<p>暂无评论</p>';
        listDiv.innerHTML = '';
        const mainComments = data.filter(c => !c.parent_id);
        const replies = data.filter(c => c.parent_id);
        mainComments.forEach(comment => {
            listDiv.appendChild(renderCommentItem(comment));
            const commentReplies = replies.filter(r => r.parent_id === comment.id);
            commentReplies.forEach(reply => {
                const replyEl = renderCommentItem(reply, { isReply: true });
                replyEl.style.marginLeft = '24px';
                listDiv.appendChild(replyEl);
            });
        });
    }

    // ---------- 话题详情 ----------
    async function openTopicDetail(topicId) {
        const { data: topic } = await supabaseClient.from('topics').select('*').eq('id', topicId).single();
        if (!topic) return;
        enterFullscreen();
        mainContent.innerHTML = `<button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button><div class="page-header" style="margin-top:16px;"><div class="page-title">${topic.name}</div><div class="page-subtitle">${topic.description || ''}</div>${currentUser.is_admin && topic.public_id ? `<div style="font-size:13px;color:var(--text-light);">ID: ${topic.public_id}</div>` : ''}</div><div id="topicPosts"></div>`;
        document.querySelector('[data-action="back"]').addEventListener('click', () => { exitFullscreen(); navigateTo(ROUTES.FORUM); });
        const postsDiv = document.getElementById('topicPosts');
        const { data: topicPosts, error } = await supabaseClient.from('topic_posts').select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online, is_banned))').eq('topic_id', topicId).order('created_at', { ascending: false });
        if (error || !topicPosts.length) return postsDiv.innerHTML = '<p>暂无讨论</p>';
        postsDiv.innerHTML = '';
        const posts = topicPosts.map(tp => tp.post).sort((a, b) => (b.like_count - a.like_count) || (new Date(b.created_at) - new Date(a.created_at)));
        for (const post of posts) {
            const [likeRes, favRes] = await Promise.all([
                supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle(),
                supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', post.id).maybeSingle()
            ]);
            post.liked_by_me = !!likeRes.data;
            post.favorited_by_me = !!favRes.data;
            post.is_owner = post.user_id === currentUser.id;
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

            // 封禁用户禁止操作（除了 qq-appeal）
            if (currentUser.is_banned && action !== 'qq-appeal') {
                return showToast('你已被封禁，无法进行此操作', 'error');
            }

            if (action === 'like' && postId) {
                await toggleLike(postId, target);
            } else if (action === 'favorite' && postId) {
                await toggleFavorite(postId, target);
            } else if (action === 'repost' && postId) {
                showRepostModal(postId);
            } else if (action === 'share' && postId) {
                showShareModal(postId);
            } else if (action === 'report' && postId) {
                showReportModal('post', postId);
            } else if (action === 'edit' && postId) {
                showEditPostModal(postId);
            } else if (action === 'delete' && postId) {
                if (confirm('确认删除这条帖子吗？')) {
                    await supabaseClient.from('posts').delete().eq('id', postId);
                    showToast('已删除', 'success');
                    if (currentPostId === postId) currentPostId = null;
                    exitFullscreen();
                    navigateTo(ROUTES.EXPLORE);
                }
            } else if (action === 'like-comment' && commentId) {
                await toggleCommentLike(commentId, target);
            } else if (action === 'reply-comment' && commentId) {
                const commentInput = document.getElementById('commentInput');
                if (commentInput) {
                    commentInput.focus();
                    commentInput.dataset.parentId = commentId;
                    const { data } = await supabaseClient.from('comments').select('user_id').eq('id', commentId).single();
                    if (data) commentInput.dataset.replyToUserId = data.user_id;
                }
            } else if (action === 'report-comment' && commentId) {
                showReportModal('comment', commentId);
            } else if (action === 'join-topic' && topicId) {
                navigateTo(ROUTES.FORUM);
                await openTopicDetail(topicId);
            } else if (action === 'accept-friend' && requestId) {
                await supabaseClient.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
                showToast('已接受', 'success');
                if (currentRoute === ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL);
            } else if (action === 'decline-friend' && requestId) {
                await supabaseClient.from('friend_requests').update({ status: 'declined' }).eq('id', requestId);
                showToast('已拒绝', 'success');
                if (currentRoute === ROUTES.SOCIAL) navigateTo(ROUTES.SOCIAL);
            } else if (action === 'follow' && userId) {
                await supabaseClient.from('follows').insert({ follower_id: currentUser.id, following_id: userId });
                showToast('已关注', 'success');
                if (currentRoute === ROUTES.EXPLORE) renderExplore();
            } else if (action === 'block' && userId) {
                await supabaseClient.from('blocked_users').insert({ user_id: currentUser.id, blocked_user_id: userId });
                showToast('已拉黑', 'success');
            } else if (action === 'dismiss-report' && id) {
                await supabaseClient.from('reports').update({ status: 'dismissed', reviewed_by: currentUser.id, reviewed_at: new Date().toISOString() }).eq('id', id);
                showToast('已忽略', 'success');
                if (currentRoute === ROUTES.ADMIN) navigateTo(ROUTES.ADMIN);
            } else if (action === 'action-report' && id) {
                const targetType = target.dataset.targetType, targetId = target.dataset.targetId;
                if (targetType === 'post') await supabaseClient.from('posts').delete().eq('id', targetId);
                else if (targetType === 'comment') await supabaseClient.from('comments').delete().eq('id', targetId);
                else if (targetType === 'user') await supabaseClient.from('profiles').update({ is_banned: true }).eq('id', targetId);
                else if (targetType === 'topic') await supabaseClient.from('topics').update({ status: 'closed' }).eq('id', targetId);
                await supabaseClient.from('reports').update({ status: 'action_taken', reviewed_by: currentUser.id, reviewed_at: new Date().toISOString() }).eq('id', id);
                showToast('已处理', 'success');
                if (currentRoute === ROUTES.ADMIN) navigateTo(ROUTES.ADMIN);
            } else if (action === 'approve-topic' && id) {
                await supabaseClient.from('topics').update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: currentUser.id }).eq('id', id);
                showToast('已批准', 'success');
                if (currentRoute === ROUTES.ADMIN) navigateTo(ROUTES.ADMIN);
            } else if (action === 'reject-topic' && id) {
                await supabaseClient.from('topics').update({ status: 'rejected' }).eq('id', id);
                showToast('已拒绝', 'success');
                if (currentRoute === ROUTES.ADMIN) navigateTo(ROUTES.ADMIN);
            } else if (action === 'delete-announcement' && id) {
                await supabaseClient.from('announcements').delete().eq('id', id);
                showToast('已删除', 'success');
                if (currentRoute === ROUTES.ADMIN) navigateTo(ROUTES.ADMIN);
            } else if (action === 'qq-appeal' && notificationId) {
                e.stopPropagation();
                navigator.clipboard.writeText('976926251').then(() => {
                    showToast('QQ群号已复制，请到群内 @管理员 申诉', 'success');
                    target.textContent = '已提示';
                    target.disabled = true;
                }).catch(() => showToast('请手动搜索 QQ 群：976926251', 'error'));
            }
        });

        document.addEventListener('click', (e) => {
            // 通知卡片点击查看详情
            const notificationCard = e.target.closest('.notification-card');
            if (notificationCard) {
                const postId = notificationCard.dataset.postId;
                if (postId) {
                    openPostDetail(postId);
                } else {
                    const content = notificationCard.querySelector('.notification-text')?.textContent || '通知';
                    openModal('通知详情', `<p>${content}</p>`);
                }
                return;
            }

            const postCard = e.target.closest('.post-card');
            if (postCard && !e.target.closest('[data-action]') && !e.target.closest('.media-item')) {
                const postId = postCard.querySelector('[data-post-id]')?.dataset.postId;
                if (postId) openPostDetail(postId);
            }
            const mediaItem = e.target.closest('.media-item');
            if (mediaItem) {
                const url = mediaItem.dataset.fileUrl;
                const type = mediaItem.dataset.fileType;
                if (url) {
                    if (type === 'image') window.open(url, '_blank');
                    else if (type === 'video' || type === 'audio') {
                        const postId = mediaItem.closest('.post-card')?.querySelector('[data-post-id]')?.dataset.postId;
                        if (postId) openPostDetail(postId);
                    }
                }
            }
            const tag = e.target.closest('.tag');
            if (tag) {
                currentTab = EXPLORE_TABS.SEARCH;
                renderExplore();
                const searchInput = document.getElementById('searchInput');
                if (searchInput) {
                    searchInput.value = tag.dataset.tag;
                    document.getElementById('searchBtn')?.click();
                }
            }
        });

        sidebarNav.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                exitFullscreen();
                navigateTo(navItem.dataset.route);
            }
        });
    }

    // ---------- 点赞/收藏切换 ----------
    async function toggleLike(postId, btn) {
        const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
        if (existing.data) await supabaseClient.from('likes').delete().eq('id', existing.data.id);
        else await supabaseClient.from('likes').insert({ user_id: currentUser.id, post_id: postId });
        navigateTo(currentRoute);
    }

    async function toggleFavorite(postId, btn) {
        const existing = await supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
        if (existing.data) await supabaseClient.from('favorites').delete().eq('id', existing.data.id);
        else await supabaseClient.from('favorites').insert({ user_id: currentUser.id, post_id: postId, is_public: true });
        navigateTo(currentRoute);
    }

    async function toggleCommentLike(commentId, btn) {
        const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('comment_id', commentId).maybeSingle();
        if (existing.data) await supabaseClient.from('likes').delete().eq('id', existing.data.id);
        else await supabaseClient.from('likes').insert({ user_id: currentUser.id, comment_id: commentId });
        if (currentPostId) await loadComments(currentPostId);
    }

    // ---------- 弹窗 ----------
    function showRepostModal(postId) {
        const content = `<p>转发帖子 #${postId}</p><div class="form-group"><label>添加评论（可选）</label><textarea id="repostComment"></textarea></div><button class="btn btn-primary" id="doRepostBtn">转发</button>`;
        const modal = openModal('转发', content);
        modal.querySelector('#doRepostBtn').addEventListener('click', async () => {
            const comment = modal.querySelector('#repostComment').value.trim();
            await supabaseClient.from('reposts').insert({ user_id: currentUser.id, post_id: postId, comment: comment || null });
            modal.remove();
            showToast('已转发', 'success');
        });
    }

    function showShareModal(postId) {
        const url = window.location.origin + '/#post-' + postId;
        openModal('分享', `<p>分享链接：</p><input type="text" value="${url}" readonly style="width:100%;margin-bottom:12px;" onclick="this.select();document.execCommand('copy');showToast('已复制','success');"><p>或转发给站内好友</p><button class="btn btn-primary" data-action="repost" data-post-id="${postId}">${Icons.repost} 转发</button>`);
    }

    function showReportModal(targetType, targetId) {
        const reasonOptions = ['血腥', '恶意病毒文件', '政治', '招嫖', '诈骗', '其他'];
        const content = `<div class="form-group"><label>举报原因</label><select id="reportReason">${reasonOptions.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div><div class="form-group"><label>详细描述</label><textarea id="reportDesc"></textarea></div><div class="form-group"><label>图片证据（可选）</label><input type="file" id="reportEvidence" accept="image/*" multiple></div><button class="btn btn-danger" id="submitReportBtn">提交举报</button>`;
        const modal = openModal('举报', content);
        modal.querySelector('#submitReportBtn').addEventListener('click', async () => {
            const reason = modal.querySelector('#reportReason').value;
            const desc = modal.querySelector('#reportDesc').value.trim();
            let evidenceUrls = [];
            for (const file of modal.querySelector('#reportEvidence').files) {
                const uploaded = await uploadFile(file, 'reports', 'evidence');
                evidenceUrls.push(uploaded.url);
            }
            await supabaseClient.from('reports').insert({ reporter_id: currentUser.id, target_type: targetType, target_id: targetId, reason, description: desc, evidence_urls: evidenceUrls });
            modal.remove();
            showToast('举报已提交', 'success');
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
            modal.remove();
            showToast('已更新', 'success');
            if (currentPostId === postId) openPostDetail(postId);
            else navigateTo(currentRoute);
        });
    }

    // ---------- 启动 ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
