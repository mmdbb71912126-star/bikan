// ============================================================
// js/app.js
// 必看 - 核心应用逻辑（路由、页面渲染、交互）
// 依赖：config.js, components.js（需先加载）
// ============================================================

(function() {
    // ---------- 引用全局 ----------
    const cfg = window.BikanConfig;
    const comp = window.BikanComponents;
    const { supabaseClient, sdkReady, ROUTES, EXPLORE_TABS, FILE_TYPES } = cfg;
    const { Icons, renderPostCard, renderCommentItem, renderNotificationItem, renderUserCard, renderTopicCard, renderFileDetail, getUserAvatarHTML, getUserDisplayName, getUserHandle, openModal, showToast } = comp;

    // ---------- 全局状态 ----------
    let currentUser = null;         // profiles 表当前用户
    let currentUserAuth = null;     // auth 用户
    let currentRoute = ROUTES.EXPLORE;
    let currentTab = EXPLORE_TABS.SQUARE; // 探索子标签
    let currentTopicId = null;      // 当前查看的话题
    let currentPostId = null;       // 当前查看的帖子详情
    let notificationsUnread = 0;    // 未读通知数

    // ---------- DOM 元素 ----------
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
            // 获取用户资料
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
            if (currentUser.is_banned) {
                showToast('您的账号已被封禁', 'error');
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
                return;
            }
            // 更新在线状态
            await supabaseClient.from('profiles').update({ is_online: true, last_active_at: new Date().toISOString() }).eq('id', currentUser.id);
            // 加载未读通知数
            await loadUnreadNotificationCount();
            // 渲染侧边栏
            renderSidebar();
            // 默认路由
            navigateTo(ROUTES.EXPLORE);
            // 监听认证状态变化
            supabaseClient.auth.onAuthStateChange((event, session) => {
                if (event === 'SIGNED_OUT') {
                    window.location.href = 'index.html';
                }
            });
            // 全局事件委托
            setupGlobalEventDelegation();
        } catch (e) {
            console.error('初始化失败', e);
            showToast('初始化失败: ' + e.message, 'error');
        }
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
        if (navBadge) {
            if (notificationsUnread > 0) {
                navBadge.textContent = notificationsUnread > 99 ? '99+' : notificationsUnread;
                navBadge.classList.remove('hidden');
            } else {
                navBadge.classList.add('hidden');
            }
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

        // 处理底部用户信息，固定在侧边栏底部
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

    // ---------- 探索/发现页面 ----------
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
            await loadPosts(contentDiv, 'recommended');
        } else if (currentTab === EXPLORE_TABS.SEARCH) {
            renderSearch(contentDiv);
        }
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', () => {
                currentTab = btn.dataset.tab;
                renderExplore();
            });
        });
    }

    // 加载帖子列表
    async function loadPosts(container, type) {
        container.innerHTML = '<p>加载中...</p>';
        let query = supabaseClient
            .from('posts')
            .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
            .order('created_at', { ascending: false });
        if (type === 'hot') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
                .order('like_count', { ascending: false })
                .order('created_at', { ascending: false });
        } else if (type === 'recommended') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
                .gt('like_count', 0)
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

    // 渲染搜索
    function renderSearch(container) {
        container.innerHTML = `
            <div class="search-bar">
                <input type="search" id="searchInput" placeholder="搜索帖子、用户、话题、文件名称" />
                <button class="btn btn-primary" id="searchBtn">${Icons.search} 搜索</button>
            </div>
            <div id="searchResults"></div>`;
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const resultsDiv = document.getElementById('searchResults');
        searchBtn.addEventListener('click', async () => {
            const keyword = searchInput.value.trim();
            if (!keyword) {
                showToast('请输入搜索关键词', 'error');
                return;
            }
            resultsDiv.innerHTML = '搜索中...';
            const [postRes, userRes, topicRes, fileRes] = await Promise.all([
                supabaseClient.from('posts').select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)').ilike('content', `%${keyword}%`).limit(20),
                supabaseClient.from('profiles').select('*').or(`username.ilike.%${keyword}%,nickname.ilike.%${keyword}%`).limit(20),
                supabaseClient.from('topics').select('*, creator:creator_id(id, username, nickname, avatar_url)').or(`name.ilike.%${keyword}%,description.ilike.%${keyword}%`).limit(20),
                supabaseClient.from('files').select('*').ilike('file_name', `%${keyword}%`).limit(20)
            ]);
            renderSearchResults(resultsDiv, postRes.data, userRes.data, topicRes.data, fileRes.data);
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
            users.forEach(u => {
                html += renderUserCard(u, { showFollowBtn: u.id !== currentUser.id }).outerHTML;
            });
        }
        if (topics && topics.length) {
            html += '<h3>话题</h3>';
            topics.forEach(t => {
                html += renderTopicCard(t).outerHTML;
            });
        }
        if (files && files.length) {
            html += '<h3>文件</h3>';
            files.forEach(f => {
                html += `<div class="file-item">
                    <div class="file-icon">${Icons.file}</div>
                    <div class="file-info">
                        <div class="file-name">${f.file_name}</div>
                        <div class="file-size">${formatFileSize(f.file_size)}</div>
                    </div>
                </div>`;
            });
        }
        if (!html) html = '<p>没有找到相关内容</p>';
        container.innerHTML = html;
    }

    // ---------- 论坛页面 ----------
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
            .select('*, creator:creator_id(id, username, nickname, avatar_url)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false });
        if (error) {
            listDiv.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        if (!data.length) {
            listDiv.innerHTML = '<p>暂无已审核的话题</p>';
            return;
        }
        listDiv.innerHTML = '';
        data.forEach(topic => {
            listDiv.appendChild(renderTopicCard(topic, { showJoin: true }));
        });
    }

    function showCreateTopicModal() {
        const content = `
            <div class="form-group"><label>话题名称</label><input type="text" id="topicName" placeholder="输入话题名称" /></div>
            <div class="form-group"><label>话题描述</label><textarea id="topicDesc" placeholder="简要描述话题内容"></textarea></div>
            <button class="btn btn-primary" id="submitTopicBtn">提交审核</button>`;
        const modal = openModal('创建话题', content);
        modal.querySelector('#submitTopicBtn').addEventListener('click', async () => {
            const name = modal.querySelector('#topicName').value.trim();
            const desc = modal.querySelector('#topicDesc').value.trim();
            if (!name) {
                showToast('请输入话题名称', 'error');
                return;
            }
            const createdAt = new Date(currentUser.created_at);
            const days = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            if (days < 30) {
                showToast('账号注册需满30天才能创建话题', 'error');
                return;
            }
            const { count, error: countError } = await supabaseClient
                .from('topics')
                .select('id', { count: 'exact', head: true })
                .eq('creator_id', currentUser.id);
            if (countError || count >= 3) {
                showToast('每个账号最多创建3个话题', 'error');
                return;
            }
            const { error } = await supabaseClient
                .from('topics')
                .insert({ name, description: desc, creator_id: currentUser.id, status: 'pending' });
            if (error) {
                showToast('创建失败: ' + error.message, 'error');
                return;
            }
            modal.remove();
            showToast('话题已提交审核', 'success');
            loadTopics();
        });
    }

    // ---------- 社交页面 ----------
    async function renderSocial() {
        mainContent.innerHTML = `
            <div class="tab-bar">
                <button class="tab-item active" data-social-tab="friends">${Icons.friend} 好友</button>
                <button class="tab-item" data-social-tab="requests">${Icons.user} 好友请求</button>
                <button class="tab-item" data-social-tab="messages">${Icons.message} 私信</button>
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
                else if (tab === 'messages') await loadMessages(contentDiv);
                else if (tab === 'notifications') await loadNotifications(contentDiv);
            });
        });
    }

    async function loadFriends(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('follows')
            .select('following:following_id(id, username, nickname, avatar_url, is_online, bio)')
            .eq('follower_id', currentUser.id);
        if (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        const friends = data.map(d => d.following);
        if (!friends.length) {
            container.innerHTML = '<p>暂无好友，去关注一些人吧</p>';
            return;
        }
        container.innerHTML = '';
        friends.forEach(f => {
            container.appendChild(renderUserCard(f, { showBlockBtn: true }));
        });
    }

    async function loadFriendRequests(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('friend_requests')
            .select('id, sender:sender_id(id, username, nickname, avatar_url, is_online, bio), status')
            .eq('receiver_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        if (!data.length) {
            container.innerHTML = '<p>暂无好友请求</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(req => {
            const card = document.createElement('div');
            card.className = 'user-card';
            card.innerHTML = `
                ${getUserAvatarHTML(req.sender, 'avatar')}
                <div class="user-card-info">
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
            container.appendChild(card);
        });
    }

    async function loadMessages(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('messages')
            .select('id, sender_id, receiver_id, content, created_at, profiles_sender:sender_id(id, username, nickname, avatar_url), profiles_receiver:receiver_id(id, username, nickname, avatar_url)')
            .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        const conversations = {};
        data.forEach(msg => {
            const other = msg.sender_id === currentUser.id ? msg.profiles_receiver : msg.profiles_sender;
            if (!other) return;
            const key = other.id;
            if (!conversations[key]) {
                conversations[key] = { user: other, lastMessage: msg, messages: [] };
            }
            conversations[key].messages.push(msg);
        });
        const convList = Object.values(conversations);
        if (!convList.length) {
            container.innerHTML = '<p>暂无私信</p>';
            return;
        }
        container.innerHTML = '';
        convList.forEach(conv => {
            const div = document.createElement('div');
            div.className = 'user-card';
            div.style.cursor = 'pointer';
            div.dataset.userId = conv.user.id;
            div.innerHTML = `
                ${getUserAvatarHTML(conv.user, 'avatar')}
                <div class="user-card-info">
                    <div class="post-user-name">${getUserDisplayName(conv.user)}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${conv.lastMessage.content || '[文件]'}</div>
                </div>`;
            div.addEventListener('click', () => openChatModal(conv.user));
            container.appendChild(div);
        });
    }

    async function openChatModal(otherUser) {
        const messages = await loadChatMessages(otherUser.id);
        const content = `
            <div id="chatMessages" style="max-height: 300px; overflow-y: auto; margin-bottom: 12px;">
                ${messages.map(m => {
                    const isMine = m.sender_id === currentUser.id;
                    return `<div style="text-align: ${isMine ? 'right' : 'left'}; margin-bottom: 8px;">
                        <div style="display: inline-block; background: ${isMine ? 'var(--primary)' : 'var(--bg-light)'}; color: ${isMine ? 'white' : 'var(--text-main)'}; padding: 8px 12px; border-radius: 12px; max-width: 80%; word-break: break-word;">
                            ${m.content || ''}
                            ${m.file_url ? `<div><a href="${m.file_url}" target="_blank">${Icons.file} ${m.file_name || '文件'}</a></div>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>
            <div style="display: flex; gap: 8px;">
                <input type="text" id="chatInput" placeholder="输入消息..." style="flex:1;" />
                <button class="btn btn-primary" id="sendChatBtn">${Icons.send} 发送</button>
            </div>
            <div style="margin-top: 8px;">
                <input type="file" id="chatFileInput" multiple />
            </div>`;
        const modal = openModal('与 ' + getUserDisplayName(otherUser) + ' 聊天', content);
        modal.querySelector('#sendChatBtn').addEventListener('click', async () => {
            const text = modal.querySelector('#chatInput').value.trim();
            if (!text) return;
            await sendMessage(otherUser.id, text, null);
            modal.querySelector('#chatInput').value = '';
            const newMsgs = await loadChatMessages(otherUser.id);
            renderChatMessages(modal.querySelector('#chatMessages'), newMsgs);
        });
        modal.querySelector('#chatFileInput').addEventListener('change', async (e) => {
            const files = e.target.files;
            for (const file of files) {
                try {
                    const uploaded = await uploadFile(file, 'messages', `chat/${currentUser.id}`);
                    await sendMessage(otherUser.id, '', uploaded);
                    const newMsgs = await loadChatMessages(otherUser.id);
                    renderChatMessages(modal.querySelector('#chatMessages'), newMsgs);
                } catch (err) {
                    showToast('文件上传失败: ' + err.message, 'error');
                }
            }
        });
    }

    function renderChatMessages(container, messages) {
        container.innerHTML = messages.map(m => {
            const isMine = m.sender_id === currentUser.id;
            return `<div style="text-align: ${isMine ? 'right' : 'left'}; margin-bottom: 8px;">
                <div style="display: inline-block; background: ${isMine ? 'var(--primary)' : 'var(--bg-light)'}; color: ${isMine ? 'white' : 'var(--text-main)'}; padding: 8px 12px; border-radius: 12px; max-width: 80%; word-break: break-word;">
                    ${m.content || ''}
                    ${m.file_url ? `<div><a href="${m.file_url}" target="_blank">${Icons.file} ${m.file_name || '文件'}</a></div>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    async function loadChatMessages(otherUserId) {
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true });
        if (error) return [];
        return data;
    }

    async function sendMessage(receiverId, content, fileObj) {
        const payload = {
            sender_id: currentUser.id,
            receiver_id: receiverId,
            content: content || null,
        };
        if (fileObj) {
            payload.file_url = fileObj.url;
            payload.file_name = fileObj.name;
            payload.file_type = fileObj.type;
        }
        const { error } = await supabaseClient.from('messages').insert(payload);
        if (error) throw error;
    }

    async function loadNotifications(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('notifications')
            .select('*, actor:actor_id(id, username, nickname, avatar_url)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) {
            container.innerHTML = `<p>加载失败: ${error.message}</p>`;
            return;
        }
        await supabaseClient.from('notifications').update({ is_read: true }).eq('user_id', currentUser.id).eq('is_read', false);
        notificationsUnread = 0;
        updateNavBadge();
        if (!data.length) {
            container.innerHTML = '<p>暂无通知</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(n => container.appendChild(renderNotificationItem(n)));
    }

    // ---------- 个人与设置页面 ----------
    async function renderProfile() {
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="page-title">个人与设置</div>
            </div>
            <div class="profile-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
                <div id="profileAvatarContainer" style="cursor: pointer; position: relative;" title="点击更换头像">
                    ${getUserAvatarHTML(currentUser, 'avatar-lg')}
                </div>
                <div>
                    <h2>${getUserDisplayName(currentUser)}</h2>
                    <p>${getUserHandle(currentUser)}</p>
                    <p style="color: var(--text-secondary);">${currentUser.bio || '暂无简介'}</p>
                    <p style="font-size: 13px; color: var(--text-light);">注册于 ${new Date(currentUser.created_at).toLocaleDateString()}</p>
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
        // 绑定头像点击上传（由 loadSettings 内部处理，这里不再重复绑定）
        await loadSettings(contentDiv);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                contentDiv.innerHTML = '';
                const tab = btn.dataset.profileTab;
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
            .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error || !data.length) {
            container.innerHTML = '<p>暂无帖子</p>';
            return;
        }
        container.innerHTML = '';
        for (const post of data) {
            post.is_owner = true;
            post.liked_by_me = false;
            post.favorited_by_me = false;
            container.appendChild(renderPostCard(post));
        }
    }

    async function loadUserFavorites(container) {
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online))')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        if (error || !data.length) {
            container.innerHTML = '<p>暂无收藏</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(f => {
            if (f.post) {
                f.post.is_owner = f.post.user_id === currentUser.id;
                container.appendChild(renderPostCard(f.post));
            }
        });
    }

    async function loadUserHistory(container) {
        const { data, error } = await supabaseClient
            .from('view_history')
            .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online))')
            .eq('user_id', currentUser.id)
            .order('viewed_at', { ascending: false });
        if (error || !data.length) {
            container.innerHTML = '<p>暂无历史记录</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(h => {
            if (h.post) {
                h.post.is_owner = h.post.user_id === currentUser.id;
                container.appendChild(renderPostCard(h.post));
            }
        });
    }

    // 个人资料编辑（包含头像点击上传、ID 格式验证、15天限制）
    async function loadSettings(container) {
        let pendingAvatarUrl = null; // 暂存新上传的头像 URL，保存时才写入数据库

        container.innerHTML = `
            <h3>个人资料</h3>
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                <div id="settingsAvatar" style="cursor: pointer; position: relative;" title="点击更换头像">
                    ${getUserAvatarHTML(currentUser, 'avatar-lg')}
                </div>
                <div>
                    <p style="font-size: 14px; color: var(--text-secondary);">点击头像上传新图片</p>
                </div>
            </div>
            <div class="form-group">
                <label>ID</label>
                <input type="text" id="editUsername" value="${currentUser.username}" placeholder="仅小写字母、数字、_、@、." />
            </div>
            <div class="form-group">
                <label>昵称</label>
                <input type="text" id="editNickname" value="${currentUser.nickname}" />
            </div>
            <div class="form-group">
                <label>简介</label>
                <textarea id="editBio">${currentUser.bio || ''}</textarea>
            </div>
            <button class="btn btn-primary" id="saveProfileBtn">保存</button>`;

        // 绑定头像点击上传
        const avatarContainer = container.querySelector('#settingsAvatar');
        avatarContainer.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    showToast('头像上传中...', 'info');
                    const uploaded = await uploadFile(file, 'avatars', `avatar/${currentUser.id}`);
                    pendingAvatarUrl = uploaded.url;
                    // 更新预览
                    avatarContainer.innerHTML = `<div class="avatar-lg"><img src="${uploaded.url}" alt="avatar" /></div>`;
                    showToast('头像已选择，点击保存后生效', 'success');
                } catch (err) {
                    showToast('头像上传失败: ' + err.message, 'error');
                }
            };
            fileInput.click();
        });

        // 保存按钮
        container.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            const nickname = container.querySelector('#editNickname').value.trim();
            const username = container.querySelector('#editUsername').value.trim();
            const bio = container.querySelector('#editBio').value.trim();

            if (!nickname || !username) {
                showToast('昵称和ID不能为空', 'error');
                return;
            }

            // ID 格式验证：仅小写字母、数字、_、@、.
            const idRegex = /^[a-z0-9_@.]+$/;
            if (!idRegex.test(username)) {
                showToast('ID 只能包含小写字母、数字、下划线、@ 和点', 'error');
                return;
            }

            // 15天修改限制
            if (currentUser.updated_at) {
                const lastUpdate = new Date(currentUser.updated_at).getTime();
                const now = Date.now();
                const fifteenDays = 15 * 24 * 60 * 60 * 1000;
                if (now - lastUpdate < fifteenDays) {
                    showToast('个人资料每15天只能修改一次', 'error');
                    return;
                }
            }

            const updates = {
                nickname,
                username,
                bio,
                updated_at: new Date().toISOString()
            };
            if (pendingAvatarUrl) {
                updates.avatar_url = pendingAvatarUrl;
            }

            const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
            if (error) {
                if (error.message && error.message.includes('duplicate key')) {
                    showToast('该 ID 已被占用，请更换', 'error');
                } else {
                    showToast('保存失败: ' + error.message, 'error');
                }
                return;
            }

            // 更新当前用户信息
            Object.assign(currentUser, updates);
            pendingAvatarUrl = null;
            showToast('保存成功', 'success');
            renderSidebar();
            // 重新渲染个人页面以显示最新资料
            renderProfile();
        });
    }

    async function loadFeedback(container) {
        container.innerHTML = `
            <h3>反馈 Bug</h3>
            <div class="form-group"><label>问题描述</label><textarea id="feedbackContent" placeholder="请详细描述问题"></textarea></div>
            <button class="btn btn-primary" id="submitFeedbackBtn">提交反馈</button>`;
        container.querySelector('#submitFeedbackBtn').addEventListener('click', async () => {
            const content = container.querySelector('#feedbackContent').value.trim();
            if (!content) {
                showToast('请输入问题描述', 'error');
                return;
            }
            const adminId = await getAdminId();
            if (!adminId) {
                showToast('无法获取管理员信息', 'error');
                return;
            }
            const { error } = await supabaseClient.from('notifications').insert({
                user_id: adminId,
                type: 'system',
                content: '用户反馈: ' + content,
                actor_id: currentUser.id
            });
            if (error) {
                showToast('提交失败: ' + error.message, 'error');
            } else {
                showToast('反馈已提交', 'success');
                container.querySelector('#feedbackContent').value = '';
            }
        });
    }

    async function getAdminId() {
        const { data } = await supabaseClient.from('profiles').select('id').eq('is_admin', true).single();
        return data?.id || null;
    }

    // ---------- 关于页面 ----------
    async function renderAbout() {
        mainContent.innerHTML = '<div class="page-header"><div class="page-title">关于</div></div><div id="aboutContent"></div>';
        const aboutDiv = document.getElementById('aboutContent');
        const { data, error } = await supabaseClient.from('about_page').select('*').order('updated_at', { ascending: false }).limit(1);
        if (error || !data.length) {
            aboutDiv.innerHTML = '<p>暂无关于信息</p>';
        } else {
            aboutDiv.innerHTML = `<div>${data[0].content || ''}</div>`;
        }
    }

    // ---------- 管理员页面 ----------
    async function renderAdmin() {
        mainContent.innerHTML = `<div class="page-header"><div class="page-title">管理面板</div></div>
            <div class="tab-bar">
                <button class="tab-item active" data-admin-tab="announcements">公告</button>
                <button class="tab-item" data-admin-tab="reports">举报处理</button>
                <button class="tab-item" data-admin-tab="topics">话题审核</button>
                <button class="tab-item" data-admin-tab="recommend">推荐管理</button>
                <button class="tab-item" data-admin-tab="about">关于编辑</button>
            </div>
            <div id="adminContent"></div>`;
        const adminContent = document.getElementById('adminContent');
        await loadAnnouncementsAdmin(adminContent);
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.addEventListener('click', async () => {
                document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                adminContent.innerHTML = '';
                const tab = btn.dataset.adminTab;
                if (tab === 'announcements') await loadAnnouncementsAdmin(adminContent);
                else if (tab === 'reports') await loadReportsAdmin(adminContent);
                else if (tab === 'topics') await loadTopicsAdmin(adminContent);
                else if (tab === 'recommend') await loadRecommendAdmin(adminContent);
                else if (tab === 'about') await loadAboutAdmin(adminContent);
            });
        });
    }

    async function loadAnnouncementsAdmin(container) {
        container.innerHTML = `<button class="btn btn-primary" id="createAnnouncementBtn">${Icons.plus} 创建公告</button>
            <div id="announcementsList" style="margin-top: 16px;"></div>`;
        container.querySelector('#createAnnouncementBtn').addEventListener('click', () => showCreateAnnouncementModal(container));
        await refreshAnnouncementsList(container.querySelector('#announcementsList'));
    }

    async function refreshAnnouncementsList(listDiv) {
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient.from('announcements').select('*').order('created_at', { ascending: false });
        if (error || !data.length) {
            listDiv.innerHTML = '<p>暂无公告</p>';
            return;
        }
        listDiv.innerHTML = '';
        data.forEach(a => {
            const card = document.createElement('div');
            card.className = 'announcement-card';
            card.innerHTML = `
                <div class="announcement-title">${a.title}</div>
                <div class="post-content">${a.content || ''}</div>
                <div style="font-size: 13px; color: var(--text-light);">${timeAgo(a.created_at)}</div>
                <button class="btn btn-secondary btn-sm" data-action="delete-announcement" data-id="${a.id}">删除</button>`;
            listDiv.appendChild(card);
        });
    }

    function showCreateAnnouncementModal(container) {
        const content = `
            <div class="form-group"><label>标题</label><input type="text" id="announcementTitle" /></div>
            <div class="form-group"><label>内容（支持 Markdown）</label><textarea id="announcementContent"></textarea></div>
            <div class="form-group"><label>引用帖子ID（可选，逗号分隔）</label><input type="text" id="announcementPosts" placeholder="例如: uuid1,uuid2" /></div>
            <div class="form-group"><label>引用话题ID（可选，逗号分隔）</label><input type="text" id="announcementTopics" placeholder="例如: uuid1" /></div>
            <div class="form-group"><label>上传文件</label><input type="file" id="announcementFiles" multiple /></div>
            <button class="btn btn-primary" id="submitAnnouncementBtn">发布公告</button>`;
        const modal = openModal('创建公告', content);
        modal.querySelector('#submitAnnouncementBtn').addEventListener('click', async () => {
            const title = modal.querySelector('#announcementTitle').value.trim();
            const contentText = modal.querySelector('#announcementContent').value.trim();
            if (!title) {
                showToast('请输入标题', 'error');
                return;
            }
            const postIds = modal.querySelector('#announcementPosts').value.split(',').map(s => s.trim()).filter(Boolean);
            const topicIds = modal.querySelector('#announcementTopics').value.split(',').map(s => s.trim()).filter(Boolean);
            const filesInput = modal.querySelector('#announcementFiles');
            let filesData = [];
            if (filesInput.files.length) {
                for (const file of filesInput.files) {
                    try {
                        const uploaded = await uploadFile(file, 'announcements', 'announcements');
                        filesData.push(uploaded);
                    } catch (e) {
                        showToast('文件上传失败: ' + e.message, 'error');
                        return;
                    }
                }
            }
            const { error } = await supabaseClient.from('announcements').insert({
                admin_id: currentUser.id,
                title,
                content: contentText,
                files: filesData,
                referenced_posts: postIds,
                referenced_topics: topicIds
            });
            if (error) {
                showToast('发布失败: ' + error.message, 'error');
            } else {
                modal.remove();
                showToast('公告已发布', 'success');
                const listDiv = container.querySelector('#announcementsList');
                if (listDiv) await refreshAnnouncementsList(listDiv);
            }
        });
    }

    async function loadReportsAdmin(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('reports')
            .select('*, reporter:reporter_id(id, username, nickname, avatar_url)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (error || !data.length) {
            container.innerHTML = '<p>暂无待处理举报</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(r => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <div><strong>举报类型：</strong>${r.reason}</div>
                <div><strong>描述：</strong>${r.description || '无'}</div>
                <div><strong>举报人：</strong>${getUserDisplayName(r.reporter)}</div>
                <div style="font-size: 13px; color: var(--text-light);">${timeAgo(r.created_at)}</div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-secondary btn-sm" data-action="dismiss-report" data-id="${r.id}">忽略</button>
                    <button class="btn btn-danger btn-sm" data-action="action-report" data-id="${r.id}" data-target-type="${r.target_type}" data-target-id="${r.target_id}">处理</button>
                </div>`;
            container.appendChild(card);
        });
    }

    async function loadTopicsAdmin(container) {
        container.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('topics')
            .select('*, creator:creator_id(id, username, nickname, avatar_url)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (error || !data.length) {
            container.innerHTML = '<p>暂无待审核话题</p>';
            return;
        }
        container.innerHTML = '';
        data.forEach(t => {
            const card = document.createElement('div');
            card.className = 'topic-card';
            card.innerHTML = `
                <div class="topic-name">${t.name}</div>
                <div class="topic-desc">${t.description || ''}</div>
                <div>创建者：${getUserDisplayName(t.creator)}</div>
                <div style="margin-top: 8px;">
                    <button class="btn btn-primary btn-sm" data-action="approve-topic" data-id="${t.id}">批准</button>
                    <button class="btn btn-secondary btn-sm" data-action="reject-topic" data-id="${t.id}">拒绝</button>
                </div>`;
            container.appendChild(card);
        });
    }

    async function loadRecommendAdmin(container) {
        container.innerHTML = '<p>推荐管理：选择帖子标记为推荐（功能开发中，当前展示热门帖子）</p>';
        const { data, error } = await supabaseClient
            .from('posts')
            .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
            .order('like_count', { ascending: false })
            .limit(20);
        if (error || !data.length) {
            container.innerHTML += '<p>暂无帖子</p>';
            return;
        }
        data.forEach(post => {
            post.is_owner = post.user_id === currentUser.id;
            container.appendChild(renderPostCard(post));
        });
    }

    async function loadAboutAdmin(container) {
        container.innerHTML = `
            <h3>编辑关于页面</h3>
            <div class="form-group"><label>内容（支持 HTML）</label><textarea id="aboutEditor" style="min-height: 300px;"></textarea></div>
            <button class="btn btn-primary" id="saveAboutBtn">保存</button>`;
        const { data } = await supabaseClient.from('about_page').select('*').order('updated_at', { ascending: false }).limit(1);
        if (data && data.length) {
            container.querySelector('#aboutEditor').value = data[0].content || '';
        }
        container.querySelector('#saveAboutBtn').addEventListener('click', async () => {
            const content = container.querySelector('#aboutEditor').value;
            const { error } = await supabaseClient.from('about_page').insert({
                admin_id: currentUser.id,
                content
            });
            if (error) {
                showToast('保存失败: ' + error.message, 'error');
            } else {
                showToast('已保存', 'success');
            }
        });
    }

    // ---------- 帖子详情页 ----------
    async function openPostDetail(postId) {
        if (!postId) return;
        currentPostId = postId;
        await supabaseClient.from('view_history').upsert({ user_id: currentUser.id, post_id: postId, viewed_at: new Date().toISOString() }, { onConflict: 'user_id,post_id' });
        const { data: post, error } = await supabaseClient
            .from('posts')
            .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
            .eq('id', postId)
            .single();
        if (error) {
            showToast('加载帖子失败', 'error');
            return;
        }
        const [likeRes, favRes] = await Promise.all([
            supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle(),
            supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle()
        ]);
        post.liked_by_me = !!likeRes.data;
        post.favorited_by_me = !!favRes.data;
        post.is_owner = post.user_id === currentUser.id;
        mainContent.innerHTML = `
            <button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button>
            <div id="postDetailContainer" style="margin-top: 16px;"></div>`;
        document.querySelector('[data-action="back"]').addEventListener('click', () => {
            currentPostId = null;
            navigateTo(currentRoute);
        });
        const detailContainer = document.getElementById('postDetailContainer');
        detailContainer.appendChild(renderPostCard(post, { showActions: true, isDetail: true }));
        if (post.media && post.media.length) {
            const mediaDiv = document.createElement('div');
            mediaDiv.innerHTML = post.media.map(file => renderFileDetail(file)).join('');
            detailContainer.appendChild(mediaDiv);
        }
        detailContainer.innerHTML += `<div class="comments-section"><h3>评论</h3><div id="commentsList"></div>
            <div class="comment-form" style="margin-top: 16px;">
                <textarea id="commentInput" placeholder="写下你的评论..." rows="3"></textarea>
                <button class="btn btn-primary" id="submitCommentBtn" style="margin-top: 8px;">${Icons.comment} 发表评论</button>
            </div></div>`;
        await loadComments(postId);
        detailContainer.querySelector('#submitCommentBtn').addEventListener('click', async () => {
            const content = detailContainer.querySelector('#commentInput').value.trim();
            if (!content) {
                showToast('请输入评论内容', 'error');
                return;
            }
            const parentId = detailContainer.querySelector('#commentInput').dataset.parentId || null;
            const replyToUserId = detailContainer.querySelector('#commentInput').dataset.replyToUserId || null;
            const insertData = {
                post_id: postId,
                user_id: currentUser.id,
                content
            };
            if (parentId) {
                insertData.parent_id = parentId;
                insertData.reply_to_user_id = replyToUserId;
            }
            const { error } = await supabaseClient.from('comments').insert(insertData);
            if (error) {
                showToast('评论失败: ' + error.message, 'error');
            } else {
                detailContainer.querySelector('#commentInput').value = '';
                delete detailContainer.querySelector('#commentInput').dataset.parentId;
                delete detailContainer.querySelector('#commentInput').dataset.replyToUserId;
                await loadComments(postId);
            }
        });
    }

    async function loadComments(postId) {
        const listDiv = document.getElementById('commentsList');
        if (!listDiv) return;
        listDiv.innerHTML = '加载中...';
        const { data, error } = await supabaseClient
            .from('comments')
            .select('*, profiles:user_id(id, username, nickname, avatar_url), reply_to_user:reply_to_user_id(id, username, nickname)')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (error || !data.length) {
            listDiv.innerHTML = '<p>暂无评论</p>';
            return;
        }
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
                    if (currentPostId === postId) {
                        currentPostId = null;
                    }
                    navigateTo(currentRoute);
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
                const targetType = target.dataset.targetType;
                const targetId = target.dataset.targetId;
                if (targetType === 'post') {
                    await supabaseClient.from('posts').delete().eq('id', targetId);
                } else if (targetType === 'comment') {
                    await supabaseClient.from('comments').delete().eq('id', targetId);
                } else if (targetType === 'user') {
                    await supabaseClient.from('profiles').update({ is_banned: true }).eq('id', targetId);
                } else if (targetType === 'topic') {
                    await supabaseClient.from('topics').update({ status: 'closed' }).eq('id', targetId);
                }
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
            }
        });

        document.addEventListener('click', (e) => {
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
                    if (type === 'image') {
                        window.open(url, '_blank');
                    } else if (type === 'video' || type === 'audio') {
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
                navigateTo(navItem.dataset.route);
            }
        });
    }

    // ---------- 点赞/收藏切换 ----------
    async function toggleLike(postId, btn) {
        const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
        if (existing.data) {
            await supabaseClient.from('likes').delete().eq('id', existing.data.id);
        } else {
            await supabaseClient.from('likes').insert({ user_id: currentUser.id, post_id: postId });
        }
        navigateTo(currentRoute);
    }

    async function toggleFavorite(postId, btn) {
        const existing = await supabaseClient.from('favorites').select('id').eq('user_id', currentUser.id).eq('post_id', postId).maybeSingle();
        if (existing.data) {
            await supabaseClient.from('favorites').delete().eq('id', existing.data.id);
        } else {
            await supabaseClient.from('favorites').insert({ user_id: currentUser.id, post_id: postId, is_public: true });
        }
        navigateTo(currentRoute);
    }

    async function toggleCommentLike(commentId, btn) {
        const existing = await supabaseClient.from('likes').select('id').eq('user_id', currentUser.id).eq('comment_id', commentId).maybeSingle();
        if (existing.data) {
            await supabaseClient.from('likes').delete().eq('id', existing.data.id);
        } else {
            await supabaseClient.from('likes').insert({ user_id: currentUser.id, comment_id: commentId });
        }
        if (currentPostId) await loadComments(currentPostId);
    }

    // ---------- 转发弹窗 ----------
    function showRepostModal(postId) {
        const content = `
            <p>转发帖子 #${postId}</p>
            <div class="form-group"><label>添加评论（可选）</label><textarea id="repostComment"></textarea></div>
            <button class="btn btn-primary" id="doRepostBtn">转发</button>`;
        const modal = openModal('转发', content);
        modal.querySelector('#doRepostBtn').addEventListener('click', async () => {
            const comment = modal.querySelector('#repostComment').value.trim();
            const { error } = await supabaseClient.from('reposts').insert({
                user_id: currentUser.id,
                post_id: postId,
                comment: comment || null
            });
            if (error) {
                showToast('转发失败: ' + error.message, 'error');
            } else {
                modal.remove();
                showToast('已转发', 'success');
            }
        });
    }

    // ---------- 分享弹窗 ----------
    function showShareModal(postId) {
        const url = window.location.origin + '/#post-' + postId;
        const content = `
            <p>分享链接：</p>
            <input type="text" value="${url}" readonly style="width:100%; margin-bottom: 12px;" onclick="this.select();document.execCommand('copy');showToast('已复制','success');" />
            <p>或转发给站内好友</p>
            <button class="btn btn-primary" data-action="repost" data-post-id="${postId}">${Icons.repost} 转发</button>`;
        openModal('分享', content);
    }

    // ---------- 举报弹窗 ----------
    function showReportModal(targetType, targetId) {
        const reasonOptions = ['血腥', '恶意病毒文件', '政治', '招嫖', '诈骗', '其他'];
        const content = `
            <div class="form-group"><label>举报原因</label><select id="reportReason">${reasonOptions.map(r => `<option value="${r}">${r}</option>`).join('')}</select></div>
            <div class="form-group"><label>详细描述</label><textarea id="reportDesc"></textarea></div>
            <div class="form-group"><label>图片证据（可选）</label><input type="file" id="reportEvidence" accept="image/*" multiple /></div>
            <button class="btn btn-danger" id="submitReportBtn">提交举报</button>`;
        const modal = openModal('举报', content);
        modal.querySelector('#submitReportBtn').addEventListener('click', async () => {
            const reason = modal.querySelector('#reportReason').value;
            const desc = modal.querySelector('#reportDesc').value.trim();
            const evidenceInput = modal.querySelector('#reportEvidence');
            let evidenceUrls = [];
            if (evidenceInput.files.length) {
                for (const file of evidenceInput.files) {
                    try {
                        const uploaded = await uploadFile(file, 'reports', 'evidence');
                        evidenceUrls.push(uploaded.url);
                    } catch (e) { /* ignore */ }
                }
            }
            const { error } = await supabaseClient.from('reports').insert({
                reporter_id: currentUser.id,
                target_type: targetType,
                target_id: targetId,
                reason,
                description: desc,
                evidence_urls: evidenceUrls
            });
            if (error) {
                showToast('举报失败: ' + error.message, 'error');
            } else {
                modal.remove();
                showToast('举报已提交', 'success');
            }
        });
    }

    // ---------- 编辑帖子弹窗 ----------
    async function showEditPostModal(postId) {
        const { data: post } = await supabaseClient.from('posts').select('*').eq('id', postId).single();
        if (!post) return;
        const content = `
            <div class="form-group"><label>内容</label><textarea id="editPostContent">${post.content || ''}</textarea></div>
            <button class="btn btn-primary" id="saveEditBtn">保存修改</button>`;
        const modal = openModal('编辑帖子', content);
        modal.querySelector('#saveEditBtn').addEventListener('click', async () => {
            const newContent = modal.querySelector('#editPostContent').value;
            const { error } = await supabaseClient.from('posts').update({ content: newContent, is_edited: true, edited_at: new Date().toISOString() }).eq('id', postId);
            if (error) {
                showToast('保存失败: ' + error.message, 'error');
            } else {
                modal.remove();
                showToast('已更新', 'success');
                if (currentPostId === postId) openPostDetail(postId);
                else navigateTo(currentRoute);
            }
        });
    }

    // ---------- 话题详情 ----------
    async function openTopicDetail(topicId) {
        const { data: topic } = await supabaseClient.from('topics').select('*').eq('id', topicId).single();
        if (!topic) return;
        mainContent.innerHTML = `
            <button class="btn btn-secondary" data-action="back">${Icons.chevronLeft} 返回</button>
            <div class="page-header" style="margin-top: 16px;">
                <div class="page-title">${topic.name}</div>
                <div class="page-subtitle">${topic.description || ''}</div>
            </div>
            <div id="topicPosts"></div>`;
        document.querySelector('[data-action="back"]').addEventListener('click', () => navigateTo(ROUTES.FORUM));
        const postsDiv = document.getElementById('topicPosts');
        const { data: topicPosts, error } = await supabaseClient
            .from('topic_posts')
            .select('post:post_id(*, profiles:user_id(id, username, nickname, avatar_url, is_online))')
            .eq('topic_id', topicId)
            .order('created_at', { ascending: false });
        if (error || !topicPosts.length) {
            postsDiv.innerHTML = '<p>暂无讨论</p>';
            return;
        }
        postsDiv.innerHTML = '';
        const posts = topicPosts.map(tp => tp.post).sort((a, b) => {
            if (b.like_count !== a.like_count) return b.like_count - a.like_count;
            return new Date(b.created_at) - new Date(a.created_at);
        });
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

    // ---------- 启动 ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
