// ============================================================
//  home.js - 首页内容渲染与分区切换
// ============================================================

// 全局状态
let currentTab = '推荐';
let currentSearchQuery = '';
let allContents = [];
let pendingRequest = null; // 用于取消过期的请求，解决切换卡顿（第29条）

// ============================================================
//  1. 渲染首页主界面（顶部 Tab + 内容区）
// ============================================================
window.renderHome = function() {
    const contentRender = document.getElementById('contentRender');
    
    // 渲染首页顶部导航（分区标签 + 搜索框）
    contentRender.innerHTML = `
        <div style="width:100%; margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
            <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="capsule-tab active" data-tab="推荐" onclick="switchTab('推荐')">推荐</button>
                    <button class="capsule-tab" data-tab="论坛" onclick="switchTab('论坛')">论坛</button>
                    <button class="capsule-tab" data-tab="资源分享" onclick="switchTab('资源分享')">资源分享</button>
                    <button class="capsule-tab" data-tab="网址分享" onclick="switchTab('网址分享')">网址分享</button>
                    <button class="capsule-tab" data-tab="VPN分享" onclick="switchTab('VPN分享')">VPN分享</button>
                </div>
                <div style="display:flex; align-items:center; background:var(--bg-card); border-radius:20px; padding:4px 12px; border:1px solid transparent; transition:var(--transition);">
                    <span style="color:var(--text-secondary); margin-right:8px;">${ICONS.SEARCH}</span>
                    <input type="text" id="searchInput" placeholder="搜索内容..." style="background:transparent; border:none; padding:6px 4px; color:var(--text-primary); outline:none; font-size:14px; width:160px;" onkeydown="if(event.key==='Enter') doSearch()">
                </div>
            </div>
        </div>
        <div id="contentList"></div>
    `;

    // 加载数据
    loadContents();
};

// ============================================================
//  2. 数据加载（带取消机制，解决切换卡顿）
// ============================================================
async function loadContents(searchQuery = '') {
    if (!window.currentUser) return;

    // 如果有正在进行的请求，直接取消它（避免快速切换时渲染旧数据）
    if (pendingRequest) {
        pendingRequest.abort();
        pendingRequest = null;
    }

    const controller = new AbortController();
    pendingRequest = controller;

    const contentList = document.getElementById('contentList');
    contentList.innerHTML = '<div style="color:var(--text-secondary);text-align:center;padding:40px;">加载中...</div>';

    try {
        // 构建查询
        let query = supabaseClient
            .from('contents')
            .select('*, profiles!user_id (id, nickname, avatar_url, role)')
            .eq('status', 'approved');

        if (currentTab !== '推荐') {
            query = query.eq('category', currentTab);
        }
        if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,file_name.ilike.%${searchQuery}%,url.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
        }

        // 发起请求（传入取消信号）
        const { data, error } = await query.order('created_at', { ascending: false });
        
        // 请求被取消后，中止执行
        if (controller.signal.aborted) return;

        pendingRequest = null;

        if (error) {
            console.error('加载内容失败:', error);
            contentList.innerHTML = `<div style="color:var(--text-danger);text-align:center;padding:40px;">加载失败，请重试</div>`;
            return;
        }

        allContents = data || [];
        renderContentList(data);
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('请求被取消（切换分区过快）');
            return;
        }
        console.error('加载异常:', err);
    }
}

// ============================================================
//  3. 内容卡片渲染（替换表情，使用 SVG 图标）
// ============================================================
function renderContentList(data) {
    const contentList = document.getElementById('contentList');
    if (!data || data.length === 0) {
        contentList.innerHTML = `
            <div class="empty-state" style="text-align:center;padding:60px 20px;color:var(--text-secondary);">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <p style="margin-top:12px;">该分区暂无内容，发布第一个吧！</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">';
    
    data.forEach(item => {
        const isLiked = item._isLiked || false;
        const avatarHtml = item.profiles?.avatar_url 
            ? `<img src="${item.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;">` 
            : (item.profiles?.nickname || 'U').charAt(0).toUpperCase();

        let extraHtml = '';
        if (item.file_url) {
            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(item.file_name || '');
            extraHtml = `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-top:6px;">
                    ${ICONS.CAT_RES} 
                    <a href="${item.file_url}" target="_blank" style="color:var(--accent-green);text-decoration:none;">${item.file_name || '下载文件'}</a>
                    ${isImage ? `<div style="margin-top:6px;"><img src="${item.file_url}" style="width:100%;max-height:200px;object-fit:cover;border-radius:6px;"></div>` : ''}
                </div>
            `;
        }
        if (item.url) {
            extraHtml = `
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-secondary);margin-top:6px;">
                    ${ICONS.CAT_URL} 
                    <a href="${item.url}" target="_blank" style="color:var(--accent-green);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.url}</a>
                </div>
            `;
        }

        let tagsHtml = '';
        if (item.tags && item.tags.length > 0) {
            tagsHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0;">${item.tags.map(t => `<span style="background:var(--bg-primary);color:var(--text-secondary);padding:0 8px;border-radius:12px;font-size:12px;">#${t}</span>`).join('')}</div>`;
        }

        // 高亮/推荐标签（修复第8条：白底突兀，改为胶囊式深绿底白字）
        let hotBadge = item.likes_count >= 1000 ? `<span class="capsule-tab" style="background:var(--accent-green);color:#fff;padding:2px 10px;font-size:11px;">${ICONS.LIKE} 热门</span>` : '';
        let recommendBadge = item.is_recommended ? `<span class="capsule-tab" style="background:var(--accent-green);color:#fff;padding:2px 10px;font-size:11px;">${ICONS.STAR} 推荐</span>` : '';

        html += `
            <div class="content-card" onclick="navigateTo('detail', ${item.id})">
                <div style="position:absolute;top:12px;right:12px;display:flex;gap:6px;">
                    <button onclick="event.stopPropagation();toggleFavorite(${item.id})" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:4px;hover:color:var(--text-primary);">${ICONS.STAR}</button>
                    <button onclick="event.stopPropagation();openReportModal(${item.id})" style="background:transparent;border:none;color:var(--text-secondary);cursor:pointer;padding:4px;border-radius:4px;">${ICONS.REPORT}</button>
                </div>
                <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary);">
                    <span style="display:flex;align-items:center;gap:4px;">${getCategoryIcon(item.category)} ${item.category}</span>
                    <span>${timeAgo(item.created_at)}</span>
                    ${hotBadge} ${recommendBadge}
                </div>
                ${tagsHtml}
                <div style="font-size:16px;font-weight:600;margin-top:4px;">${item.title}</div>
                ${item.description ? `<div style="font-size:14px;color:var(--text-secondary);margin-top:4px;">${item.description}</div>` : ''}
                ${extraHtml}
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color);">
                    <span onclick="event.stopPropagation();navigateTo('profile_view','${item.user_id}')" style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--text-secondary);">
                        <span style="width:24px;height:24px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:11px;">${avatarHtml}</span>
                        <span style="color:var(--text-primary);">${item.profiles?.nickname || '用户'}</span>
                    </span>
                    <span style="display:flex;gap:12px;font-size:13px;color:var(--text-secondary);">
                        <span onclick="event.stopPropagation();toggleLike(${item.id})" style="display:flex;align-items:center;gap:4px;cursor:pointer;${isLiked ? 'color:var(--text-danger);' : ''}">
                            ${ICONS.LIKE} <span class="like-count">${item.likes_count || 0}</span>
                        </span>
                        <span style="display:flex;align-items:center;gap:4px;">${ICONS.COMMENT} ${item.comments_count || 0}</span>
                    </span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    contentList.innerHTML = html;
}

// ============================================================
//  4. 点赞核心逻辑（修复第9条：DOM 直接更新，无需刷新）
// ============================================================
window.toggleLike = async function(contentId) {
    if (!window.currentUser) return alert('请先登录');
    
    // 在内存中找数据
    const item = allContents.find(c => c.id === contentId);
    if (!item) return;

    // 数据库操作
    if (item._isLiked) {
        const { error } = await supabaseClient.from('likes').delete().eq('user_id', window.currentUser.id).eq('content_id', contentId);
        if (error) return alert('操作失败');
        item._isLiked = false;
        item.likes_count = (item.likes_count || 1) - 1;
    } else {
        const { error } = await supabaseClient.from('likes').insert({ user_id: window.currentUser.id, content_id: contentId });
        if (error) return alert('操作失败');
        item._isLiked = true;
        item.likes_count = (item.likes_count || 0) + 1;
    }

    // 数据库异步更新
    supabaseClient.from('contents').update({ likes_count: item.likes_count }).eq('id', contentId);

    // 关键修复：直接在 DOM 上修改，不做全局刷新
    const likeSpan = document.querySelector(`.content-card [onclick*="toggleLike(${contentId})"]`);
    if (likeSpan) {
        const countSpan = likeSpan.querySelector('.like-count');
        if (countSpan) countSpan.textContent = item.likes_count;
        
        if (item._isLiked) {
            likeSpan.style.color = 'var(--text-danger)';
        } else {
            likeSpan.style.color = 'var(--text-secondary)';
        }
    }
};

// ============================================================
//  5. 辅助切换与搜索
// ============================================================
window.switchTab = function(tab) {
    currentTab = tab;
    // 更新标签页的选中状态
    document.querySelectorAll('.capsule-tab[data-tab]').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    loadContents(currentSearchQuery);
};

window.doSearch = function() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    currentSearchQuery = input.value.trim();
    loadContents(currentSearchQuery);
};

// 辅助：分类图标映射
function getCategoryIcon(cat) {
    const map = { '论坛': ICONS.CAT_FORUM, '资源分享': ICONS.CAT_RES, '网址分享': ICONS.CAT_URL, 'VPN分享': ICONS.CAT_VPN };
    return map[cat] || ICONS.CAT_RES;
}

// 辅助：时间格式化
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
