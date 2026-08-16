// ============================================================
// js/components.js
// 必看 - 通用 UI 组件（卡片、头像、图标、弹窗等）
// 依赖：config.js（需先加载）
// ============================================================

(function() {
    const cfg = window.BikanConfig;
    const { supabaseClient } = cfg;

    // ---------- SVG 图标库 ----------
    const Icons = {
        home: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/></svg>`,
        comment: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
        friend: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`,
        user: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        admin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
        refresh: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
        trend: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
        search: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
        heart: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
        heartFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
        bookmark: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>`,
        bookmarkFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>`,
        share: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
        flag: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`,
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        plus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
        send: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>`,
        message: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
        bell: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
        logout: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
        file: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`,
        chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
        logo: (size = 160) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 0.68}" viewBox="0 0 1000 680"><path d="M 300 340 C 460 165, 540 165, 700 340 C 540 515, 460 515, 300 340 Z M 320 340 C 470 235, 530 235, 680 340 C 530 445, 470 445, 320 340 Z" fill="black" fill-rule="evenodd" stroke="#1a1a2e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="484" y="273" width="32" height="100" rx="10" fill="black" /><rect x="488" y="383" width="24" height="24" rx="8" fill="black" /></svg>`,
        more: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
        lock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
        image: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
        video: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
        audio: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>`,
        download: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        reply: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><line x1="3" y1="23" x2="21" y2="23"/></svg>`,
    };

    // ---------- 工具函数 ----------
    function getUserDisplayName(user) {
        if (!user) return '未知用户';
        return user.nickname || user.username || '用户';
    }

    function getUserHandle(user) {
        if (!user) return '@unknown';
        return '@' + (user.username || 'unknown');
    }

    function getUserAvatarHTML(user, size = 'avatar') {
        if (!user) {
            return `<div class="${size}"><img src="https://ui-avatars.com/api/?name=U&background=667eea&color=fff&size=64" alt="avatar" /></div>`;
        }
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=667eea&color=fff&size=64`;
        return `<div class="${size}" data-user-id="${user.id}" data-action="view-profile" style="cursor:pointer;"><img src="${avatarUrl}" alt="${user.username}" /></div>`;
    }

    function formatFileSize(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ---------- 弹窗 ----------
    function openModal(title, contentHTML) {
        document.querySelector('.modal-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'modal';

        modal.innerHTML = `
            <button class="modal-close">&times;</button>
            <div class="modal-title">${title}</div>
            <div class="modal-body">${contentHTML}</div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => overlay.remove());

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        return modal;
    }

    function showToast(message, type = 'info') {
        document.querySelector('.toast')?.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            padding: 12px 24px;
            border-radius: var(--radius);
            box-shadow: var(--shadow-md);
            z-index: 9999;
            font-size: 14px;
            font-weight: 500;
            max-width: 90%;
            text-align: center;
            animation: fadeInUp 0.3s ease;
            border: none;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    }

    // ---------- 文件卡片 ----------
    function renderFileCard(file) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.fileId = file.id;

        let icon = Icons.file;
        if (file.file_type) {
            if (file.file_type.startsWith('image/')) icon = Icons.image;
            else if (file.file_type.startsWith('video/')) icon = Icons.video;
            else if (file.file_type.startsWith('audio/')) icon = Icons.audio;
        }

        const sizeText = formatFileSize(file.file_size);

        card.innerHTML = `
            <div class="file-card-icon">${icon}</div>
            <div class="file-card-info">
                <div class="file-card-name">${file.file_name}</div>
                <div class="file-card-size">${sizeText}</div>
            </div>
            <a href="${file.file_url}" download class="file-card-download" title="下载文件">${Icons.download}</a>
        `;

        if (file.file_type && file.file_type.startsWith('image/')) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-card-download')) return;
                openModal('图片预览', `<img src="${file.file_url}" style="max-width:100%;max-height:80vh;border-radius:8px;" />`);
            });
        } else if (file.file_type && file.file_type.startsWith('video/')) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-card-download')) return;
                openModal('视频预览', `<video src="${file.file_url}" controls style="max-width:100%;max-height:80vh;border-radius:8px;"></video>`);
            });
        } else if (file.file_type && file.file_type.startsWith('audio/')) {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                if (e.target.closest('.file-card-download')) return;
                openModal('音频播放', `<audio src="${file.file_url}" controls style="width:100%;"></audio>`);
            });
        }

        return card;
    }

    // ============================================================
    // 渲染帖子内容中的自定义媒体语法（支持百分比尺寸，默认 80%）
    // ============================================================
    function renderPostContentWithMedia(content, fileMap = {}) {
        if (!content) return '';

        let html = content;

        function parseSize(sizeStr) {
            if (!sizeStr) return null;
            if (sizeStr.endsWith('%')) {
                const pct = parseInt(sizeStr);
                if (!isNaN(pct) && pct > 0 && pct <= 100) {
                    return { width: pct, unit: '%' };
                }
            }
            if (sizeStr.includes('x')) {
                const parts = sizeStr.split('x');
                if (parts.length === 2) {
                    const w = parseInt(parts[0]);
                    const h = parseInt(parts[1]);
                    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
                        return { width: w, height: h, unit: 'px' };
                    }
                }
            }
            return null;
        }

        function buildStyle(sizeInfo, isImage = true) {
            if (sizeInfo) {
                if (sizeInfo.unit === '%') {
                    return ` style="width:${sizeInfo.width}%; max-width:100%; ${isImage ? 'height:auto;' : ''}"`;
                } else {
                    return ` style="width:${sizeInfo.width}px; height:${sizeInfo.height}px; max-width:100%; ${isImage ? 'object-fit:contain;' : ''}"`;
                }
            }
            if (isImage) {
                return ` style="width:80%; max-width:100%; height:auto;"`;
            } else {
                return ` style="width:80%; max-width:100%; height:auto;"`;
            }
        }

        html = html.replace(/\[img\]([^\]]+?)(?:=([^\]]*?))?\[\/img\]/g, (match, id, sizeStr) => {
            const file = fileMap[id];
            if (file) {
                const sizeInfo = parseSize(sizeStr);
                const style = buildStyle(sizeInfo, true);
                return `<div class="post-media-wrapper"><img src="${file.file_url}" alt="${file.file_name}" class="post-media-img" loading="lazy"${style} /></div>`;
            }
            return `<span class="media-placeholder">🖼️ 图片未找到 (${id})</span>`;
        });

        html = html.replace(/\[video\]([^\]]+?)(?:=([^\]]*?))?\[\/video\]/g, (match, id, sizeStr) => {
            const file = fileMap[id];
            if (file) {
                const sizeInfo = parseSize(sizeStr);
                const style = buildStyle(sizeInfo, false);
                return `<div class="post-media-wrapper"><video src="${file.file_url}" controls class="post-media-video" preload="metadata"${style}></video></div>`;
            }
            return `<span class="media-placeholder">🎬 视频未找到 (${id})</span>`;
        });

        html = html.replace(/\[audio\]([^\]]+?)(?:=([^\]]*?))?\[\/audio\]/g, (match, id, sizeStr) => {
            const file = fileMap[id];
            if (file) {
                return `<div class="post-media-wrapper"><audio src="${file.file_url}" controls class="post-media-audio" preload="metadata" style="width:100%;"></audio></div>`;
            }
            return `<span class="media-placeholder">🎵 音频未找到 (${id})</span>`;
        });

        html = html.replace(/\[file\]([^\]]+?)(?:=([^\]]*?))?\[\/file\]/g, (match, id, sizeStr) => {
            const file = fileMap[id];
            if (file) {
                const card = renderFileCard(file);
                return card.outerHTML;
            }
            return `<span class="media-placeholder">📄 文件未找到 (${id})</span>`;
        });

        return html;
    }

    // ---------- 提取文件ID ----------
    function extractFileIdsFromContent(content) {
        if (!content) return [];
        const ids = [];
        const regex = /\[(img|video|audio|file)\]([^\]]+?)(?:=[^\]]*?)?\[\/\1\]/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            ids.push(match[2]);
        }
        return [...new Set(ids)];
    }

    // ---------- 渲染帖子卡片（删除权限：仅作者） ----------
    function renderPostCard(post, options = {}) {
        if (!post) return document.createElement('div');
        const { showActions = true, isDetail = false } = options;

        const card = document.createElement('div');
        card.className = 'post-card';
        card.dataset.postId = post.id;

        const header = document.createElement('div');
        header.className = 'post-header';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.dataset.userId = post.user_id;
        avatarDiv.dataset.action = 'view-profile';
        avatarDiv.style.cursor = 'pointer';
        const avatarImg = document.createElement('img');
        const avatarUrl = post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.username || 'U')}&background=667eea&color=fff&size=64`;
        avatarImg.src = avatarUrl;
        avatarImg.alt = post.profiles?.username || 'avatar';
        avatarDiv.appendChild(avatarImg);
        header.appendChild(avatarDiv);

        const info = document.createElement('div');
        info.className = 'post-user-info';

        const name = document.createElement('div');
        name.className = 'post-user-name';
        name.textContent = getUserDisplayName(post.profiles);
        name.dataset.userId = post.user_id;
        name.dataset.action = 'view-profile';
        name.style.cursor = 'pointer';
        info.appendChild(name);

        const handle = document.createElement('div');
        handle.className = 'post-user-id';
        handle.textContent = getUserHandle(post.profiles);
        info.appendChild(handle);

        header.appendChild(info);

        const time = document.createElement('div');
        time.className = 'post-time';
        const date = new Date(post.created_at);
        time.textContent = date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (post.is_edited) {
            const editedBadge = document.createElement('span');
            editedBadge.className = 'edited-badge';
            editedBadge.textContent = '已编辑';
            time.appendChild(editedBadge);
        }
        header.appendChild(time);

        card.appendChild(header);

        if (post.content) {
            const tagRegex = /#\w+/g;
            const tags = post.content.match(tagRegex);
            if (tags && tags.length > 0) {
                const tagsDiv = document.createElement('div');
                tagsDiv.className = 'post-tags';
                tags.forEach(tag => {
                    const tagEl = document.createElement('span');
                    tagEl.className = 'tag';
                    tagEl.dataset.tag = tag.substring(1);
                    tagEl.textContent = tag;
                    tagsDiv.appendChild(tagEl);
                });
                card.appendChild(tagsDiv);
            }
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'post-content';
        if (post.fileMap) {
            contentDiv.innerHTML = renderPostContentWithMedia(post.content, post.fileMap);
        } else {
            contentDiv.textContent = post.content || '';
        }
        card.appendChild(contentDiv);

        if (post.tags && post.tags.length && !post.content?.match(/#\w+/g)) {
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'post-tags';
            post.tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.className = 'tag';
                tagEl.dataset.tag = tag;
                tagEl.textContent = '#' + tag;
                tagsDiv.appendChild(tagEl);
            });
            card.appendChild(tagsDiv);
        }

        if (post.media && post.media.length) {
            const mediaGrid = document.createElement('div');
            mediaGrid.className = 'post-media-grid';
            post.media.forEach(file => {
                const item = document.createElement('div');
                item.className = 'media-item';
                item.dataset.fileUrl = file.url;
                item.dataset.fileType = file.type || 'file';
                if (file.type && file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    img.src = file.url;
                    img.alt = 'image';
                    item.appendChild(img);
                } else if (file.type && file.type.startsWith('video/')) {
                    item.classList.add('video');
                    const video = document.createElement('video');
                    video.src = file.url;
                    video.controls = true;
                    video.preload = 'metadata';
                    video.style.maxWidth = '100%';
                    item.appendChild(video);
                } else if (file.type && file.type.startsWith('audio/')) {
                    const audio = document.createElement('audio');
                    audio.src = file.url;
                    audio.controls = true;
                    audio.preload = 'metadata';
                    audio.style.maxWidth = '100%';
                    item.appendChild(audio);
                } else {
                    const icon = document.createElement('div');
                    icon.className = 'file-icon';
                    icon.innerHTML = Icons.file;
                    item.appendChild(icon);
                }
                mediaGrid.appendChild(item);
            });
            card.appendChild(mediaGrid);
        }

        if (showActions) {
            const actions = document.createElement('div');
            actions.className = 'post-actions';

            const likeBtn = document.createElement('button');
            likeBtn.className = `action-btn ${post.liked_by_me ? 'liked' : ''}`;
            likeBtn.dataset.action = 'like';
            likeBtn.dataset.postId = post.id;
            likeBtn.innerHTML = `${post.liked_by_me ? Icons.heartFilled : Icons.heart}<span class="count">${post.like_count || 0}</span>`;
            actions.appendChild(likeBtn);

            const commentBtn = document.createElement('button');
            commentBtn.className = 'action-btn';
            commentBtn.dataset.action = 'comment';
            commentBtn.dataset.postId = post.id;
            commentBtn.innerHTML = `${Icons.comment}<span class="count">${post.comment_count || 0}</span>`;
            if (!isDetail) {
                commentBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = 'post-detail.html?type=post&id=' + post.id;
                });
            }
            actions.appendChild(commentBtn);

            const favBtn = document.createElement('button');
            favBtn.className = `action-btn ${post.favorited_by_me ? 'favorited' : ''}`;
            favBtn.dataset.action = 'favorite';
            favBtn.dataset.postId = post.id;
            favBtn.innerHTML = `${post.favorited_by_me ? Icons.bookmarkFilled : Icons.bookmark}<span class="count">${post.favorite_count || 0}</span>`;
            actions.appendChild(favBtn);

            const shareBtn = document.createElement('button');
            shareBtn.className = 'action-btn';
            shareBtn.dataset.action = 'share';
            shareBtn.dataset.postId = post.id;
            shareBtn.innerHTML = Icons.share;
            actions.appendChild(shareBtn);

            // ===== 删除权限：仅作者，移除管理员 =====
            if (post.is_owner) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn';
                deleteBtn.dataset.action = 'delete';
                deleteBtn.dataset.postId = post.id;
                deleteBtn.innerHTML = Icons.trash;
                actions.appendChild(deleteBtn);
            } else {
                const reportBtn = document.createElement('button');
                reportBtn.className = 'action-btn';
                reportBtn.dataset.action = 'report';
                reportBtn.dataset.postId = post.id;
                reportBtn.innerHTML = Icons.flag;
                actions.appendChild(reportBtn);
            }

            card.appendChild(actions);
        }

        return card;
    }

    // ---------- 渲染评论项（删除权限：评论作者或帖子作者） ----------
    function renderCommentItem(comment, options = {}) {
        const { isReply = false } = options;
        const item = document.createElement('div');
        item.className = 'comment-item';

        const header = document.createElement('div');
        header.className = 'comment-header';

        const avatar = document.createElement('div');
        avatar.className = 'avatar-sm';
        avatar.dataset.userId = comment.user_id;
        avatar.dataset.action = 'view-profile';
        avatar.style.cursor = 'pointer';
        const avatarImg = document.createElement('img');
        const avatarUrl = comment.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.profiles?.username || 'U')}&background=667eea&color=fff&size=32`;
        avatarImg.src = avatarUrl;
        avatarImg.alt = comment.profiles?.username || 'avatar';
        avatar.appendChild(avatarImg);
        header.appendChild(avatar);

        const userInfo = document.createElement('span');
        userInfo.className = 'comment-user';
        userInfo.textContent = getUserDisplayName(comment.profiles);
        userInfo.dataset.userId = comment.user_id;
        userInfo.dataset.action = 'view-profile';
        userInfo.style.cursor = 'pointer';
        header.appendChild(userInfo);

        if (comment.reply_to_user) {
            const replyTo = document.createElement('span');
            replyTo.className = 'comment-reply-to';
            replyTo.textContent = '→ ' + getUserDisplayName(comment.reply_to_user);
            header.appendChild(replyTo);
        }

        const time = document.createElement('span');
        time.style.cssText = 'font-size:12px;color:var(--text-light);margin-left:auto;';
        time.textContent = new Date(comment.created_at).toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        header.appendChild(time);

        item.appendChild(header);

        const content = document.createElement('div');
        content.className = 'comment-content';
        content.textContent = comment.content || '';
        item.appendChild(content);

        const actions = document.createElement('div');
        actions.className = 'comment-actions';

        const likeBtn = document.createElement('button');
        likeBtn.className = 'action-btn';
        likeBtn.dataset.action = 'like-comment';
        likeBtn.dataset.commentId = comment.id;
        likeBtn.innerHTML = Icons.heart;
        actions.appendChild(likeBtn);

        const replyBtn = document.createElement('button');
        replyBtn.className = 'action-btn';
        replyBtn.dataset.action = 'reply-comment';
        replyBtn.dataset.commentId = comment.id;
        replyBtn.innerHTML = Icons.reply;
        actions.appendChild(replyBtn);

        const shareBtn = document.createElement('button');
        shareBtn.className = 'action-btn';
        shareBtn.dataset.action = 'share-comment';
        shareBtn.dataset.commentId = comment.id;
        shareBtn.innerHTML = Icons.share;
        actions.appendChild(shareBtn);

        // ===== 删除权限：评论作者 或 帖子作者，移除管理员 =====
        const canDelete = comment.user_id === comment.currentUserId || comment.is_owner;
        if (canDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn';
            deleteBtn.dataset.action = 'delete-comment';
            deleteBtn.dataset.commentId = comment.id;
            deleteBtn.innerHTML = Icons.trash;
            actions.appendChild(deleteBtn);
        } else {
            const reportBtn = document.createElement('button');
            reportBtn.className = 'action-btn';
            reportBtn.dataset.action = 'report-comment';
            reportBtn.dataset.commentId = comment.id;
            reportBtn.innerHTML = Icons.flag;
            actions.appendChild(reportBtn);
        }

        item.appendChild(actions);

        return item;
    }

    // ---------- 渲染通知 ----------
    function renderNotificationItem(notification) {
        const item = document.createElement('div');
        item.className = 'notification-card';
        if (!notification.is_read) {
            item.style.borderLeft = '4px solid var(--primary)';
        }

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-sm';
        avatarDiv.dataset.userId = notification.actor_id;
        avatarDiv.dataset.action = 'view-profile';
        avatarDiv.style.cursor = 'pointer';
        const avatarImg = document.createElement('img');
        const avatarUrl = notification.actor?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.actor?.username || 'U')}&background=667eea&color=fff&size=32`;
        avatarImg.src = avatarUrl;
        avatarImg.alt = 'actor';
        avatarDiv.appendChild(avatarImg);
        item.appendChild(avatarDiv);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'notification-content';

        const text = document.createElement('div');
        text.className = 'notification-text';
        let displayText = notification.content || '';
        if (notification.type === 'like') {
            displayText = `${getUserDisplayName(notification.actor)} 点赞了你的帖子`;
        } else if (notification.type === 'comment') {
            displayText = `${getUserDisplayName(notification.actor)} 评论了你的帖子`;
        } else if (notification.type === 'follow') {
            displayText = `${getUserDisplayName(notification.actor)} 关注了你`;
        } else if (notification.type === 'friend_request') {
            displayText = `${getUserDisplayName(notification.actor)} 向你发送了好友请求`;
        } else if (notification.type === 'admin_action') {
            displayText = `管理员: ${notification.content}`;
        } else if (notification.type === 'system') {
            displayText = notification.content;
        }
        text.textContent = displayText;
        contentDiv.appendChild(text);

        const time = document.createElement('div');
        time.className = 'notification-time';
        time.textContent = new Date(notification.created_at).toLocaleString();
        contentDiv.appendChild(time);

        item.appendChild(contentDiv);

        if (!notification.is_read) {
            const dot = document.createElement('div');
            dot.className = 'unread-dot';
            item.appendChild(dot);
        }

        return item;
    }

    // ---------- 渲染用户卡片 ----------
    function renderUserCard(user, options = {}) {
        const { showFollowBtn = false, isFollowing = false, showBlockBtn = false } = options;

        const card = document.createElement('div');
        card.className = 'user-card';

        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.dataset.userId = user.id;
        avatarDiv.dataset.action = 'view-profile';
        avatarDiv.style.cursor = 'pointer';
        const avatarImg = document.createElement('img');
        const avatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=667eea&color=fff&size=64`;
        avatarImg.src = avatarUrl;
        avatarImg.alt = user.username || 'avatar';
        avatarDiv.appendChild(avatarImg);
        card.appendChild(avatarDiv);

        const info = document.createElement('div');
        info.className = 'user-card-info';
        info.dataset.userId = user.id;
        info.dataset.action = 'view-profile';
        info.style.cursor = 'pointer';

        const name = document.createElement('div');
        name.className = 'post-user-name';
        name.textContent = getUserDisplayName(user);
        info.appendChild(name);

        const handle = document.createElement('div');
        handle.className = 'post-user-id';
        handle.textContent = getUserHandle(user);
        info.appendChild(handle);

        if (user.bio) {
            const bio = document.createElement('div');
            bio.style.cssText = 'font-size:13px;color:var(--text-secondary);margin-top:4px;';
            bio.textContent = user.bio;
            info.appendChild(bio);
        }

        card.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'user-card-actions';

        if (showFollowBtn) {
            const followBtn = document.createElement('button');
            followBtn.className = `btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm`;
            followBtn.dataset.action = isFollowing ? 'unfollow' : 'follow';
            followBtn.dataset.userId = user.id;
            followBtn.textContent = isFollowing ? '已关注' : '关注';
            actions.appendChild(followBtn);
        }

        if (showBlockBtn) {
            const blockBtn = document.createElement('button');
            blockBtn.className = 'btn btn-secondary btn-sm';
            blockBtn.dataset.action = 'block';
            blockBtn.dataset.userId = user.id;
            blockBtn.textContent = '拉黑';
            actions.appendChild(blockBtn);
        }

        card.appendChild(actions);

        return card;
    }

    // ---------- 渲染话题卡片 ----------
    function renderTopicCard(topic, options = {}) {
        const { showJoin = false } = options;

        const card = document.createElement('div');
        card.className = 'topic-card';

        const name = document.createElement('div');
        name.className = 'topic-name';
        name.textContent = topic.name;
        card.appendChild(name);

        if (topic.description) {
            const desc = document.createElement('div');
            desc.className = 'topic-desc';
            desc.textContent = topic.description;
            card.appendChild(desc);
        }

        const meta = document.createElement('div');
        meta.className = 'topic-meta';
        const creator = document.createElement('span');
        creator.textContent = '创建者: ' + getUserDisplayName(topic.creator);
        meta.appendChild(creator);

        const time = document.createElement('span');
        time.textContent = new Date(topic.created_at).toLocaleDateString();
        meta.appendChild(time);

        card.appendChild(meta);

        if (showJoin) {
            const joinBtn = document.createElement('button');
            joinBtn.className = 'btn btn-primary btn-sm';
            joinBtn.dataset.action = 'join-topic';
            joinBtn.dataset.topicId = topic.id;
            joinBtn.textContent = '加入讨论';
            card.appendChild(joinBtn);
        }

        return card;
    }

    // ---------- 渲染文件详情（旧版兼容） ----------
    function renderFileDetail(file) {
        const div = document.createElement('div');
        div.className = 'file-item';

        const icon = document.createElement('div');
        icon.className = 'file-icon';
        icon.innerHTML = Icons.file;
        div.appendChild(icon);

        const info = document.createElement('div');
        info.className = 'file-info';

        const name = document.createElement('div');
        name.className = 'file-name';
        name.textContent = file.file_name || '文件';
        info.appendChild(name);

        if (file.file_size) {
            const size = document.createElement('div');
            size.className = 'file-size';
            size.textContent = formatFileSize(file.file_size);
            info.appendChild(size);
        }

        div.appendChild(info);

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'file-download-btn';
        downloadBtn.textContent = '下载';
        downloadBtn.addEventListener('click', () => {
            window.open(file.url, '_blank');
        });
        div.appendChild(downloadBtn);

        return div;
    }

    // ---------- 导出 ----------
    window.BikanComponents = {
        Icons,
        getUserDisplayName,
        getUserHandle,
        getUserAvatarHTML,
        formatFileSize,
        openModal,
        showToast,
        renderFileCard,
        renderPostContentWithMedia,
        extractFileIdsFromContent,
        renderPostCard,
        renderCommentItem,
        renderNotificationItem,
        renderUserCard,
        renderTopicCard,
        renderFileDetail,
    };

})();
