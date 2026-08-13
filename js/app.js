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
            if (currentUser.is_banned) {
                showToast('您的账号已被封禁', 'error');
                await supabaseClient.auth.signOut();
                window.location.href = 'index.html';
                return;
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
    }

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
    }

    async function loadPosts(container, type) {
        container.innerHTML = '<p>加载中...</p>';
        let query;
        if (type === 'square') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
                .order('created_at', { ascending: false });
        } else if (type === 'hot') {
            query = supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
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
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
                .eq('is_recommended', true)
                .order('created_at', { ascending: false })
                .limit(30),
            supabaseClient
                .from('topics')
                .select('*, creator:creator_id(id, username, nickname, avatar_url)')
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

    function renderSearch(container) { /* 保持原样 */ }

    function renderSearchResults(container, posts, users, topics, files) { /* 保持原样 */ }

    // ---------- 论坛 ----------
    async function renderForum() { /* 保持原样 */ }
    async function loadTopics() { /* 保持原样 */ }
    function showCreateTopicModal() { /* 保持原样 */ }

    // ---------- 社交 ----------
    async function renderSocial() { /* 保持原样 */ }
    async function loadFriends(container) { /* 保持原样 */ }
    async function loadFriendRequests(container) { /* 保持原样 */ }
    async function loadMessages(container) { /* 保持原样 */ }
    async function openChatModal(otherUser) { /* 保持原样 */ }
    function renderChatMessages(container, messages) { /* 保持原样 */ }
    async function loadChatMessages(otherUserId) { /* 保持原样 */ }
    async function sendMessage(receiverId, content, fileObj) { /* 保持原样 */ }
    async function loadNotifications(container) { /* 保持原样 */ }

    // ---------- 个人与设置 ----------
    async function renderProfile() { /* 保持原样 */ }
    async function loadUserPosts(container) { /* 保持原样 */ }
    async function loadUserFavorites(container) { /* 保持原样 */ }
    async function loadUserHistory(container) { /* 保持原样 */ }

    async function loadSettings(container) {
        let pendingAvatarUrl = null;
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
                    avatarContainer.innerHTML = `<div class="avatar-lg"><img src="${uploaded.url}" alt="avatar" /></div>`;
                    showToast('头像已选择，点击保存后生效', 'success');
                } catch (err) {
                    showToast('头像上传失败: ' + err.message, 'error');
                }
            };
            fileInput.click();
        });

        container.querySelector('#saveProfileBtn').addEventListener('click', async () => {
            const nickname = container.querySelector('#editNickname').value.trim();
            const username = container.querySelector('#editUsername').value.trim();
            const bio = container.querySelector('#editBio').value.trim();
            if (!nickname || !username) {
                showToast('昵称和ID不能为空', 'error');
                return;
            }
            const idRegex = /^[a-z0-9_@.]+$/;
            if (!idRegex.test(username)) {
                showToast('ID 只能包含小写字母、数字、下划线、@ 和点', 'error');
                return;
            }
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
            if (pendingAvatarUrl) updates.avatar_url = pendingAvatarUrl;
            const { error } = await supabaseClient.from('profiles').update(updates).eq('id', currentUser.id);
            if (error) {
                if (error.message && error.message.includes('duplicate key')) {
                    showToast('该 ID 已被占用，请更换', 'error');
                } else {
                    showToast('保存失败: ' + error.message, 'error');
                }
                return;
            }
            Object.assign(currentUser, updates);
            pendingAvatarUrl = null;
            showToast('保存成功', 'success');
            renderSidebar();
            renderProfile();
        });
    }

    async function loadFeedback(container) { /* 保持原样 */ }
    async function getAdminId() { /* 保持原样 */ }

    // ---------- 关于 ----------
    async function renderAbout() { /* 保持原样 */ }

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
                adminContent.innerHTML = '';
                const tab = btn.dataset.adminTab;
                if (tab === 'announcements') await loadAnnouncementsAdmin(adminContent);
                else if (tab === 'reports') await loadReportsAdmin(adminContent);
                else if (tab === 'topics') await loadTopicsAdmin(adminContent);
                else if (tab === 'recommend') await loadRecommendAdmin(adminContent);
                else if (tab === 'about') await loadAboutAdmin(adminContent);
                else if (tab === 'user-operations') await loadUserOperationsAdmin(adminContent);
            });
        });
    }

    async function loadAnnouncementsAdmin(container) { /* 保持原样 */ }
    async function refreshAnnouncementsList(listDiv) { /* 保持原样 */ }
    function showCreateAnnouncementModal(container) { /* 保持原样 */ }
    async function loadReportsAdmin(container) { /* 保持原样 */ }
    async function loadTopicsAdmin(container) { /* 保持原样 */ }

    async function loadRecommendAdmin(container) {
        container.innerHTML = `
            <h3>推荐管理</h3>
            <div class="form-group">
                <label>输入帖子或话题的 ID（UUID）</label>
                <input type="text" id="recommendTargetId" placeholder="例如：帖子的 UUID 或话题的 UUID" />
            </div>
            <button class="btn btn-primary" id="addRecommendBtn">推荐</button>
            <div id="recommendList" style="margin-top: 16px;"></div>`;

        container.querySelector('#addRecommendBtn').addEventListener('click', async () => {
            const input = container.querySelector('#recommendTargetId').value.trim();
            if (!input) {
                showToast('请输入 ID', 'error');
                return;
            }
            const { data: postData, error: postError } = await supabaseClient
                .from('posts')
                .select('id')
                .eq('id', input)
                .maybeSingle();
            if (!postError && postData) {
                const { error: updateError } = await supabaseClient
                    .from('posts')
                    .update({ is_recommended: true })
                    .eq('id', input);
                if (updateError) {
                    showToast('推荐帖子失败: ' + updateError.message, 'error');
                } else {
                    showToast('帖子推荐成功', 'success');
                    container.querySelector('#recommendTargetId').value = '';
                    await refreshRecommendList(container.querySelector('#recommendList'));
                }
                return;
            }
            const { data: topicData, error: topicError } = await supabaseClient
                .from('topics')
                .select('id')
                .eq('id', input)
                .maybeSingle();
            if (!topicError && topicData) {
                const { error: updateError } = await supabaseClient
                    .from('topics')
                    .update({ is_recommended: true })
                    .eq('id', input);
                if (updateError) {
                    showToast('推荐话题失败: ' + updateError.message, 'error');
                } else {
                    showToast('话题推荐成功', 'success');
                    container.querySelector('#recommendTargetId').value = '';
                    await refreshRecommendList(container.querySelector('#recommendList'));
                }
                return;
            }
            showToast('未找到该 ID 对应的帖子或话题', 'error');
        });

        await refreshRecommendList(container.querySelector('#recommendList'));
    }

    async function refreshRecommendList(listDiv) {
        listDiv.innerHTML = '加载中...';
        const [postsRes, topicsRes] = await Promise.all([
            supabaseClient
                .from('posts')
                .select('*, profiles:user_id(id, username, nickname, avatar_url, is_online)')
                .eq('is_recommended', true)
                .order('created_at', { ascending: false })
                .limit(50),
            supabaseClient
                .from('topics')
                .select('*, creator:creator_id(id, username, nickname, avatar_url)')
                .eq('is_recommended', true)
                .order('created_at', { ascending: false })
                .limit(50)
        ]);
        if (postsRes.error || topicsRes.error) {
            listDiv.innerHTML = `<p>加载失败: ${(postsRes.error || topicsRes.error).message}</p>`;
            return;
        }
        const posts = postsRes.data || [];
        const topics = topicsRes.data || [];
        if (posts.length === 0 && topics.length === 0) {
            listDiv.innerHTML = '<p>暂无推荐内容</p>';
            return;
        }
        listDiv.innerHTML = '';
        posts.forEach(post => {
            post.is_owner = post.user_id === currentUser.id;
            const card = renderPostCard(post);
            const unRecommendBtn = document.createElement('button');
            unRecommendBtn.className = 'btn btn-secondary btn-sm';
            unRecommendBtn.textContent = '取消推荐';
            unRecommendBtn.addEventListener('click', async () => {
                await supabaseClient.from('posts').update({ is_recommended: false }).eq('id', post.id);
                showToast('已取消推荐', 'success');
                await refreshRecommendList(listDiv);
            });
            card.appendChild(unRecommendBtn);
            listDiv.appendChild(card);
        });
        topics.forEach(topic => {
            const card = renderTopicCard(topic, { showJoin: true });
            const unRecommendBtn = document.createElement('button');
            unRecommendBtn.className = 'btn btn-secondary btn-sm';
            unRecommendBtn.textContent = '取消推荐';
            unRecommendBtn.addEventListener('click', async () => {
                await supabaseClient.from('topics').update({ is_recommended: false }).eq('id', topic.id);
                showToast('已取消推荐', 'success');
                await refreshRecommendList(listDiv);
            });
            card.appendChild(unRecommendBtn);
            listDiv.appendChild(card);
        });
    }

    async function loadAboutAdmin(container) { /* 保持原样 */ }

    async function loadUserOperationsAdmin(container) {
        container.innerHTML = `
            <h3>用户操作</h3>
            <div class="form-group">
                <label>目标用户 ID</label>
                <input type="text" id="targetUserIdInput" placeholder="输入用户的 ID（用户名）" />
                <small style="color: var(--text-light);">例如：bikan_admin</small>
            </div>
            <div class="form-group">
                <label>选择操作（可多选，互斥操作不能同时选择）</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <label><input type="checkbox" id="opBan" /> 封禁账号</label>
                    <label><input type="checkbox" id="opUnban" /> 解封账号</label>
                    <label><input type="checkbox" id="opMute" /> 禁言私聊</label>
                    <label><input type="checkbox" id="opUnmute" /> 恢复私聊</label>
                    <label><input type="checkbox" id="opPostBan" /> 禁止发帖/话题</label>
                    <label><input type="checkbox" id="opPostUnban" /> 恢复发帖/话题</label>
                </div>
            </div>
            <div class="form-group" id="durationGroup" style="display: none;">
                <label>持续时间（数字 + 单位）</label>
                <div style="display: flex; gap: 8px;">
                    <input type="number" id="durationValue" min="1" placeholder="时长" style="width: 120px;" />
                    <select id="durationUnit">
                        <option value="minutes">分钟</option>
                        <option value="hours">小时</option>
                        <option value="days">天</option>
                        <option value="weeks">周</option>
                        <option value="months">月</option>
                    </select>
                </div>
                <small style="color: var(--text-light);">仅对封禁、禁言、禁止发帖有效，解封/恢复无需设置时间</small>
            </div>
            <div class="form-group">
                <label>通知文本（将随操作一起发送给用户）</label>
                <textarea id="operationText" placeholder="输入要发送给用户的通知内容"></textarea>
            </div>
            <button class="btn btn-primary" id="submitUserOperationBtn">执行操作</button>
            <div id="operationResult" class="message"></div>`;

        const checkboxes = container.querySelectorAll('input[type="checkbox"]');
        const durationGroup = container.querySelector('#durationGroup');
        function updateDurationVisibility() {
            const needsDuration = container.querySelector('#opBan').checked ||
                                  container.querySelector('#opMute').checked ||
                                  container.querySelector('#opPostBan').checked;
            durationGroup.style.display = needsDuration ? 'block' : 'none';
        }
        checkboxes.forEach(cb => cb.addEventListener('change', updateDurationVisibility));

        container.querySelector('#submitUserOperationBtn').addEventListener('click', async () => {
            const usernameInput = container.querySelector('#targetUserIdInput').value.trim();
            if (!usernameInput) {
                showToast('请输入目标用户 ID', 'error');
                return;
            }
            const { data: targetProfile, error: lookupError } = await supabaseClient
                .from('profiles')
                .select('id, username, nickname')
                .eq('username', usernameInput)
                .single();
            if (lookupError || !targetProfile) {
                showToast('未找到该 ID 对应的用户', 'error');
                return;
            }
            const targetUserId = targetProfile.id;
            const opBan = container.querySelector('#opBan').checked;
            const opUnban = container.querySelector('#opUnban').checked;
            const opMute = container.querySelector('#opMute').checked;
            const opUnmute = container.querySelector('#opUnmute').checked;
            const opPostBan = container.querySelector('#opPostBan').checked;
            const opPostUnban = container.querySelector('#opPostUnban').checked;

            if (opBan && opUnban) {
                showToast('不能同时选择封禁和解封', 'error');
                return;
            }
            if (opMute && opUnmute) {
                showToast('不能同时选择禁言和恢复私聊', 'error');
                return;
            }
            if (opPostBan && opPostUnban) {
                showToast('不能同时选择禁止发帖和恢复发帖', 'error');
                return;
            }
            if (!opBan && !opUnban && !opMute && !opUnmute && !opPostBan && !opPostUnban) {
                showToast('请至少选择一种操作', 'error');
                return;
            }

            const text = container.querySelector('#operationText').value.trim();
            const durationValue = parseInt(container.querySelector('#durationValue').value);
            const durationUnit = container.querySelector('#durationUnit').value;
            let durationMs = 0;
            if (opBan || opMute || opPostBan) {
                if (!durationValue || durationValue <= 0) {
                    showToast('请设置有效的时间', 'error');
                    return;
                }
                const unitMap = { minutes: 60*1000, hours: 3600*1000, days: 86400*1000, weeks: 7*86400*1000, months: 30*86400*1000 };
                durationMs = durationValue * unitMap[durationUnit];
            }

            const updates = {};
            if (opBan) {
                updates.is_banned = true;
                updates.banned_until = new Date(Date.now() + durationMs).toISOString();
            } else if (opUnban) {
                updates.is_banned = false;
                updates.banned_until = null;
            }
            if (opMute) {
                updates.mute_until = new Date(Date.now() + durationMs).toISOString();
            } else if (opUnmute) {
                updates.mute_until = null;
            }
            if (opPostBan) {
                updates.post_ban_until = new Date(Date.now() + durationMs).toISOString();
            } else if (opPostUnban) {
                updates.post_ban_until = null;
            }

            const { error: updateError } = await supabaseClient
                .from('profiles')
                .update(updates)
                .eq('id', targetUserId);
            if (updateError) {
                showToast('操作失败: ' + updateError.message, 'error');
                return;
            }

            let operationDesc = [];
            if (opBan) operationDesc.push('账号已被封禁');
            if (opUnban) operationDesc.push('账号已解封');
            if (opMute) operationDesc.push('已被禁言私聊');
            if (opUnmute) operationDesc.push('私聊已恢复');
            if (opPostBan) operationDesc.push('已被禁止发帖/话题');
            if (opPostUnban) operationDesc.push('发帖/话题权限已恢复');
            let finalText = operationDesc.join('，');
            if (text) finalText += '，' + text;
            if (durationMs > 0) finalText += '（时长：' + durationValue + ' ' + durationUnit + '）';

            const { error: notifError } = await supabaseClient
                .from('notifications')
                .insert({
                    user_id: targetUserId,
                    type: 'admin_action',
                    actor_id: currentUser.id,
                    content: finalText,
                    is_read: false
                });
            if (notifError) {
                showToast('操作成功但通知发送失败: ' + notifError.message, 'error');
            } else {
                showToast('操作成功', 'success');
                container.querySelector('#operationText').value = '';
                container.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
                durationGroup.style.display = 'none';
            }
        });
    }

    // ---------- 帖子详情 ----------
    async function openPostDetail(postId) { /* 保持原样 */ }
    async function loadComments(postId) { /* 保持原样 */ }

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
                navigator.clipboard.writeText('976926251').then(() => {
                    showToast('QQ群号已复制，请到群内 @管理员 申诉', 'success');
                    target.textContent = '已提示';
                    target.disabled = true;
                }).catch(() => {
                    showToast('请手动搜索 QQ 群：976926251', 'error');
                });
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
            if (navItem) navigateTo(navItem.dataset.route);
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

    // ---------- 弹窗 ----------
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
            if (error) showToast('转发失败: ' + error.message, 'error');
            else {
                modal.remove();
                showToast('已转发', 'success');
            }
        });
    }

    function showShareModal(postId) {
        const url = window.location.origin + '/#post-' + postId;
        const content = `
            <p>分享链接：</p>
            <input type="text" value="${url}" readonly style="width:100%; margin-bottom: 12px;" onclick="this.select();document.execCommand('copy');showToast('已复制','success');" />
            <p>或转发给站内好友</p>
            <button class="btn btn-primary" data-action="repost" data-post-id="${postId}">${Icons.repost} 转发</button>`;
        openModal('分享', content);
    }

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
            if (error) showToast('举报失败: ' + error.message, 'error');
            else {
                modal.remove();
                showToast('举报已提交', 'success');
            }
        });
    }

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
            if (error) showToast('保存失败: ' + error.message, 'error');
            else {
                modal.remove();
                showToast('已更新', 'success');
                if (currentPostId === postId) openPostDetail(postId);
                else navigateTo(currentRoute);
            }
        });
    }

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

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
