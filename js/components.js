// ============================================================
// js/components.js
// 必看 - 通用 UI 组件与 SVG 图标库
// 依赖：config.js（需先加载）
// ============================================================

// ---------- 确保全局对象存在 ----------
const BikanComponents = window.BikanComponents || {};

// ============================================================
// SVG 图标库（全部内联，无任何系统表情）
// 所有图标函数返回 SVG 字符串
// ============================================================

const Icons = {
    // 网站 logo（你提供的标志）
    logo: function(size = 36) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 0.68}" viewBox="0 0 1000 680">
            <rect width="100%" height="100%" fill="none" />
            <path d="M 300 340 C 460 165, 540 165, 700 340 C 540 515, 460 515, 300 340 Z M 320 340 C 470 235, 530 235, 680 340 C 530 445, 470 445, 320 340 Z" fill="black" fill-rule="evenodd" stroke="#1a1a2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="484" y="273" width="32" height="100" rx="10" fill="black" />
            <rect x="488" y="383" width="24" height="24" rx="8" fill="black" />
        </svg>`;
    },
    // 导航图标
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    heartFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    comment: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>`,
    repost: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    bookmarkFilled: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
    edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    image: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    video: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
    audio: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    play: `<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    chevronLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>`,
    send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
    friend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    block: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
    message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    eye: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    admin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>`,
    trend: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

// 导出图标
BikanComponents.Icons = Icons;

// ============================================================
// 工具函数：创建元素辅助
// ============================================================
function createElement(tag, className, innerHTML) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (innerHTML !== undefined) el.innerHTML = innerHTML;
    return el;
}

// 获取用户头像 HTML（返回 SVG 或 img）
function getUserAvatarHTML(profile, size = 'avatar') {
    if (!profile) return '<div class="' + size + '"></div>';
    if (profile.avatar_url) {
        return `<div class="${size}"><img src="${profile.avatar_url}" alt="avatar" onerror="this.style.display='none';this.parentNode.innerHTML='<div class=&quot;' + size + '&quot;></div>';"></div>`;
    }
    // 默认使用用户首字母作为占位（不使用emoji）
    const initial = profile.nickname ? profile.nickname.charAt(0).toUpperCase() : 'U';
    return `<div class="${size}" style="background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-weight: 600; color: var(--primary);">${initial}</div>`;
}

// 获取用户显示名称（昵称优先，其次用户名）
function getUserDisplayName(profile) {
    if (!profile) return '未知用户';
    return profile.nickname || profile.username || '用户';
}

// 获取用户 @ID
function getUserHandle(profile) {
    if (!profile) return '@unknown';
    return '@' + (profile.username || profile.id);
}

// ============================================================
// 帖子卡片渲染
// ============================================================
/**
 * 渲染帖子卡片（不绑定事件，事件由外部委托处理）
 * @param {object} post - 帖子对象（需包含 user 信息，可由联表查询获得）
 * @param {object} options - { showActions: bool, isDetail: bool }
 */
function renderPostCard(post, options = {}) {
    const { showActions = true, isDetail = false } = options;
    const user = post.profiles || post.user || {};
    const avatarHTML = getUserAvatarHTML(user, 'avatar');
    const displayName = getUserDisplayName(user);
    const handle = getUserHandle(user);
    const timeStr = timeAgo(post.created_at);
    const editedBadge = post.is_edited ? '<span class="edited-badge">已编辑</span>' : '';

    let contentHTML = '';
    if (post.content) {
        // 注意：这里简单处理，实际应用中应使用 Markdown 渲染，我们可在 app.js 中调用渲染函数
        contentHTML = `<div class="post-content">${post.content}</div>`;
    }

    // 媒体渲染
    let mediaHTML = '';
    if (post.media && post.media.length > 0) {
        mediaHTML = '<div class="post-media-grid">';
        post.media.forEach(file => {
            if (file.type === 'image') {
                mediaHTML += `<div class="media-item" data-file-url="${file.url}" data-file-type="image">
                    <img src="${file.url}" alt="${file.name || ''}" loading="lazy" />
                </div>`;
            } else if (file.type === 'video') {
                mediaHTML += `<div class="media-item video" data-file-url="${file.url}" data-file-type="video">
                    <img src="${file.cover || ''}" alt="视频封面" onerror="this.style.display='none';" />
                    <div class="play-icon">${Icons.play}</div>
                </div>`;
            } else if (file.type === 'audio') {
                mediaHTML += `<div class="media-item audio" data-file-url="${file.url}" data-file-type="audio">
                    <div style="padding: 12px; background: var(--bg-light);">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${Icons.audio}</span>
                            <span style="font-size: 13px;">${file.name || '音频'}</span>
                        </div>
                        <div class="audio-progress"><div class="audio-progress-bar" style="width: 0%;"></div></div>
                    </div>
                </div>`;
            } else {
                // 文件类型
                mediaHTML += `<div class="file-item" data-file-url="${file.url}" data-file-name="${file.name || ''}" data-file-size="${file.size || ''}">
                    <div class="file-icon">${Icons.file}</div>
                    <div class="file-info">
                        <div class="file-name">${file.name || '文件'}</div>
                        <div class="file-size">${formatFileSize(file.size || 0)}</div>
                    </div>
                    ${isDetail ? `<button class="file-download-btn" data-download-url="${file.url}" data-download-name="${file.name || ''}">${Icons.download} 下载</button>` : ''}
                </div>`;
            }
        });
        mediaHTML += '</div>';
    }

    // 标签
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = '<div class="post-tags">' + post.tags.map(tag => `<span class="tag" data-tag="${tag}">#${tag}</span>`).join('') + '</div>';
    }

    // 操作按钮
    let actionsHTML = '';
    if (showActions) {
        actionsHTML = `
        <div class="post-actions">
            <button class="action-btn like-btn" data-post-id="${post.id}" data-action="like">
                ${post.liked_by_me ? Icons.heartFilled : Icons.heart}
                <span class="count">${post.like_count || 0}</span>
            </button>
            <button class="action-btn comment-btn" data-post-id="${post.id}" data-action="comment">
                ${Icons.comment}
                <span class="count">${post.comment_count || 0}</span>
            </button>
            <button class="action-btn repost-btn" data-post-id="${post.id}" data-action="repost">
                ${Icons.repost}
                <span class="count">${post.repost_count || 0}</span>
            </button>
            <button class="action-btn favorite-btn" data-post-id="${post.id}" data-action="favorite">
                ${post.favorited_by_me ? Icons.bookmarkFilled : Icons.bookmark}
                <span class="count">${post.favorite_count || 0}</span>
            </button>
            <button class="action-btn share-btn" data-post-id="${post.id}" data-action="share">
                ${Icons.share}
            </button>
            <button class="action-btn report-btn" data-post-id="${post.id}" data-action="report">
                ${Icons.flag}
            </button>
        </div>`;
    }

    const card = createElement('div', 'post-card', `
        <div class="post-header">
            ${avatarHTML}
            <div class="post-user-info">
                <div class="post-user-name">${displayName} ${editedBadge}</div>
                <div class="post-user-id">${handle} · ${timeStr}</div>
            </div>
            <div class="post-more">
                ${post.is_owner ? `<button class="action-btn" data-post-id="${post.id}" data-action="edit">${Icons.edit}</button>` : ''}
                ${post.is_owner ? `<button class="action-btn" data-post-id="${post.id}" data-action="delete">${Icons.trash}</button>` : ''}
            </div>
        </div>
        ${contentHTML}
        ${mediaHTML}
        ${tagsHTML}
        ${actionsHTML}
    `);

    return card;
}

// 渲染评论项
function renderCommentItem(comment, options = {}) {
    const { isReply = false } = options;
    const user = comment.profiles || comment.user || {};
    const avatarHTML = getUserAvatarHTML(user, 'avatar-sm');
    const displayName = getUserDisplayName(user);
    const handle = getUserHandle(user);
    const timeStr = timeAgo(comment.created_at);
    const replyTo = comment.reply_to_user ? (comment.reply_to_user.nickname || comment.reply_to_user.username) : '';

    let replyText = '';
    if (comment.parent_id && replyTo) {
        replyText = `<span class="comment-reply-to">回复了 @${replyTo} 的评论</span>`;
    }

    const item = createElement('div', 'comment-item' + (isReply ? ' comment-reply' : ''), `
        <div class="comment-header">
            ${avatarHTML}
            <span class="comment-user">${displayName}</span>
            <span class="post-user-id">${handle}</span>
            <span class="post-time">${timeStr}</span>
        </div>
        ${replyText ? `<div>${replyText}</div>` : ''}
        <div class="comment-content">${comment.content}</div>
        <div class="comment-actions">
            <button class="action-btn" data-comment-id="${comment.id}" data-action="like-comment">
                ${comment.liked_by_me ? Icons.heartFilled : Icons.heart}
                <span>${comment.like_count || 0}</span>
            </button>
            <button class="action-btn" data-comment-id="${comment.id}" data-action="reply-comment">${Icons.comment} 回复</button>
            <button class="action-btn" data-comment-id="${comment.id}" data-action="repost-comment">${Icons.repost} 转发</button>
            <button class="action-btn" data-comment-id="${comment.id}" data-action="report-comment">${Icons.flag} 举报</button>
        </div>
    `);

    return item;
}

// 渲染通知项
function renderNotificationItem(notification) {
    const actor = notification.actor || {};
    const avatarHTML = getUserAvatarHTML(actor, 'avatar-sm');
    const timeStr = timeAgo(notification.created_at);
    let text = '';
    switch (notification.type) {
        case 'like':
            text = '赞了你的帖子';
            break;
        case 'comment':
            text = '评论了你的帖子';
            break;
        case 'reply':
            text = '回复了你的评论';
            break;
        case 'follow':
            text = '关注了你';
            break;
        case 'repost':
            text = '转发了你的帖子';
            break;
        case 'friend_request':
            text = '向你发送了好友请求';
            break;
        case 'system':
            text = notification.content || '系统通知';
            break;
        case 'admin_announcement':
            text = '管理员发布了公告：' + (notification.content || '');
            break;
        default:
            text = notification.content || '新通知';
    }

    const item = createElement('div', 'notification-card', `
        ${avatarHTML}
        <div class="notification-content">
            <div class="notification-text"><strong>${getUserDisplayName(actor)}</strong> ${text}</div>
            <div class="notification-time">${timeStr}</div>
        </div>
        ${!notification.is_read ? '<span class="unread-dot"></span>' : ''}
    `);
    if (notification.post_id) {
        item.setAttribute('data-post-id', notification.post_id);
        item.style.cursor = 'pointer';
    }
    return item;
}

// 渲染用户卡片（用于搜索结果、关注列表等）
function renderUserCard(user, options = {}) {
    const avatarHTML = getUserAvatarHTML(user, 'avatar');
    const displayName = getUserDisplayName(user);
    const handle = getUserHandle(user);
    const statusDot = user.is_online ? '<span style="color: var(--success); font-size: 12px;">● 在线</span>' : '<span style="color: var(--text-light); font-size: 12px;">○ 离线</span>';

    const card = createElement('div', 'user-card', `
        ${avatarHTML}
        <div class="user-card-info">
            <div class="post-user-name">${displayName} ${statusDot}</div>
            <div class="post-user-id">${handle}</div>
            ${user.bio ? `<div style="font-size: 13px; color: var(--text-secondary);">${user.bio}</div>` : ''}
        </div>
        <div class="user-card-actions">
            ${options.showFollowBtn ? `<button class="btn btn-secondary" data-user-id="${user.id}" data-action="follow">关注</button>` : ''}
            ${options.showBlockBtn ? `<button class="btn btn-secondary" data-user-id="${user.id}" data-action="block">拉黑</button>` : ''}
        </div>
    `);
    return card;
}

// 渲染话题卡片
function renderTopicCard(topic, options = {}) {
    const creator = topic.creator || {};
    const avatarHTML = getUserAvatarHTML(creator, 'avatar-sm');
    const displayName = getUserDisplayName(creator);
    const timeStr = timeAgo(topic.created_at);

    const card = createElement('div', 'topic-card', `
        <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
                <div class="topic-name">${topic.name}</div>
                <div class="topic-desc">${topic.description || ''}</div>
                <div class="topic-meta">
                    <span>创建者：${displayName}</span>
                    <span>${timeStr}</span>
                    <span>${topic.post_count || 0} 帖子</span>
                </div>
            </div>
            ${avatarHTML}
        </div>
        ${options.showJoin ? `<button class="btn btn-primary" data-topic-id="${topic.id}" data-action="join-topic">参与讨论</button>` : ''}
    `);
    card.setAttribute('data-topic-id', topic.id);
    return card;
}

// 渲染文件项（详情页内使用）
function renderFileDetail(file) {
    if (!file) return '';
    if (file.type === 'image') {
        return `<div style="margin: 10px 0;"><img src="${file.url}" alt="${file.name || ''}" style="max-width: 100%; border-radius: 8px;" /></div>`;
    } else if (file.type === 'video') {
        return `<div style="margin: 10px 0;"><video controls src="${file.url}" style="max-width: 100%; border-radius: 8px;"></video></div>`;
    } else if (file.type === 'audio') {
        return `<div style="margin: 10px 0;"><audio controls src="${file.url}" style="width: 100%;"></audio></div>`;
    } else {
        return `<div class="file-item">
            <div class="file-icon">${Icons.file}</div>
            <div class="file-info">
                <div class="file-name">${file.name || '文件'}</div>
                <div class="file-size">${formatFileSize(file.size || 0)}</div>
            </div>
            <button class="file-download-btn" data-download-url="${file.url}" data-download-name="${file.name || ''}">${Icons.download} 下载</button>
        </div>`;
    }
}

// ============================================================
// 弹窗管理
// ============================================================
function openModal(title, contentHTML) {
    const overlay = createElement('div', 'modal-overlay');
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-title">${title} <button class="modal-close" data-modal-close>${Icons.close}</button></div>
            <div class="modal-body">${contentHTML}</div>
        </div>
    `;
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay || e.target.hasAttribute('data-modal-close')) {
            overlay.remove();
        }
    });
    document.body.appendChild(overlay);
    return overlay;
}

// Toast 提示
function showToast(message, type = 'info', duration = 3000) {
    const toast = createElement('div', 'toast', message);
    toast.style.position = 'fixed';
    toast.style.bottom = '30px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--text-main)';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.fontSize = '14px';
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================================
// 导出到全局
// ============================================================
BikanComponents.Icons = Icons;
BikanComponents.renderPostCard = renderPostCard;
BikanComponents.renderCommentItem = renderCommentItem;
BikanComponents.renderNotificationItem = renderNotificationItem;
BikanComponents.renderUserCard = renderUserCard;
BikanComponents.renderTopicCard = renderTopicCard;
BikanComponents.renderFileDetail = renderFileDetail;
BikanComponents.getUserAvatarHTML = getUserAvatarHTML;
BikanComponents.getUserDisplayName = getUserDisplayName;
BikanComponents.getUserHandle = getUserHandle;
BikanComponents.openModal = openModal;
BikanComponents.showToast = showToast;
BikanComponents.createElement = createElement;
BikanComponents.escapeHtml = escapeHtml; // 从 config 中引用，确保存在
BikanComponents.formatFileSize = formatFileSize; // 引用

window.BikanComponents = BikanComponents;

console.log('[必看] components.js 加载完成');
