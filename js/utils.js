// ============================================================
//  工具函数
// ============================================================
var App = App || {};

App.utils = {

    // 生成唯一 ID
    generateId: function() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // HTML 转义
    escapeHtml: function(s) {
        if (!s) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    },

    // 格式化日期
    formatDate: function() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    },

    // 延时
    sleep: function(ms) {
        return new Promise(function(r) { setTimeout(r, ms); });
    },

    // Toast 通知
    showToast: function(msg, type) {
        type = type || '';
        var t = document.getElementById('toast');
        if (App.utils._toastTimer) clearTimeout(App.utils._toastTimer);
        t.textContent = msg;
        t.className = 'toast ' + type + ' show';
        App.utils._toastTimer = setTimeout(function() {
            t.classList.remove('show');
        }, 2500);
    },

    // 数字动画
    animateNumber: function(el, target) {
        if (target === 0) {
            el.textContent = '0';
            return;
        }
        var current = 0,
            duration = 700,
            start = performance.now();

        function update(now) {
            var progress = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3);
            var val = Math.round(eased * target);
            el.textContent = val;
            if (progress < 1) requestAnimationFrame(update);
            else el.textContent = target;
        }
        requestAnimationFrame(update);
    },

    // 下载文件
    downloadFile: function(content, filename, mime) {
        var blob = new Blob(['\uFEFF' + content], { type: mime });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    },

    // 打开全屏 HTML
    openFullscreenHtml: function(htmlContent, title) {
        var overlay = document.getElementById('fullscreenHtmlOverlay');
        var iframe = document.getElementById('fsHtmlIframe');
        var titleEl = document.getElementById('fsHtmlTitle');
        titleEl.textContent = title || 'HTML 页面';
        iframe.srcdoc = htmlContent;
        overlay.classList.add('open');

        var closeBtn = document.getElementById('fsHtmlClose');
        var closeHandler = function() {
            overlay.classList.remove('open');
            iframe.srcdoc = '';
            closeBtn.removeEventListener('click', closeHandler);
            overlay.removeEventListener('click', overlayClick);
            document.removeEventListener('keydown', keyHandler);
        };
        var overlayClick = function(e) {
            if (e.target === overlay) closeHandler();
        };
        var keyHandler = function(e) {
            if (e.key === 'Escape') closeHandler();
        };
        closeBtn.addEventListener('click', closeHandler);
        overlay.addEventListener('click', overlayClick);
        document.addEventListener('keydown', keyHandler);
    },

    // 获取当前用户
    getCurrentUser: function() {
        return App._currentUser || null;
    },

    // 设置当前用户
    setCurrentUser: function(user) {
        App._currentUser = user;
    },

    // 获取数据引用
    getData: function() {
        return {
            sections: App._sections || [],
            homeItems: App._homeItems || [],
            settings: App._settings || { site: {}, hero: {} }
        };
    },

    // 设置数据引用
    setData: function(sections, homeItems, settings) {
        App._sections = sections || [];
        App._homeItems = homeItems || [];
        App._settings = settings || { site: {}, hero: {} };
    }
};
