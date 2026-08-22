// ============================================================
//  导航逻辑 - 页面切换、路由管理、页面栈
// ============================================================
var App = App || {};
var utils = App.utils;
var render = App.render;

App.navigation = {

    // ---------- 状态 ----------
    _sections: [],
    _homeItems: [],
    _settings: {},
    _isNavigating: false,

    // ---------- 初始化 ----------
    init: function(sections, homeItems, settings) {
        this._sections = sections || [];
        this._homeItems = homeItems || [];
        this._settings = settings || {};

        // 绑定 render 回调
        var self = this;

        render.onSectionClick(function(sectionId) {
            self.navigateTo('section', sectionId);
        });

        render.onChildClick(function(childId, parentId) {
            var parent = self._findSectionById(parentId);
            if (!parent) return;
            var child = parent.children.find(function(c) { return c.id === childId; });
            if (!child) return;
            if (child.isHtml) {
                self.navigateTo('subsection', parentId, childId);
            } else {
                self.navigateTo('bookmarks', parentId, childId);
            }
        });

        render.onSectionCardClick(function(sectionId) {
            self.navigateTo('section', sectionId);
        });

        render.onGoBack(function() {
            self.goBack();
        });

        render.onNavigate(function(page, sectionId, subId) {
            self._updateHash(page, sectionId, subId);
        });

        render.onSubClick(function(childId, sectionId) {
            var section = self._findSectionById(sectionId);
            if (!section) return;
            var child = section.children.find(function(c) { return c.id === childId; });
            if (!child) return;
            if (child.isHtml) {
                self.navigateTo('subsection', sectionId, childId);
            } else {
                self.navigateTo('bookmarks', sectionId, childId);
            }
        });

        render.onSwitchToBookmarks(function(subId, sectionId) {
            self.navigateTo('bookmarks', sectionId, subId);
        });

        // 监听 hash 变化
        window.addEventListener('hashchange', function() {
            if (self._isNavigating) return;
            self._handleHashChange();
        });

        // 键盘事件
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                if (self._onEscape) self._onEscape();
            }
        });

        // 初始路由
        var initialPath = self._getHashPath();
        if (initialPath && initialPath !== '/') {
            self._handleHashChange();
        } else {
            self.navigateTo('home');
        }
    },

    // ---------- 查找 ----------
    _findSectionById: function(id) {
        var nodes = this._sections;

        function find(nodes, id) {
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].id === id) return nodes[i];
                if (nodes[i].children) {
                    var found = find(nodes[i].children, id);
                    if (found) return found;
                }
            }
            return null;
        }
        return find(nodes, id);
    },

    // ---------- 导航 ----------
    navigateTo: function(page, sectionId, subId) {
        if (this._isNavigating) return;
        this._isNavigating = true;

        // 更新 render 状态
        render.navigateTo(page, sectionId, subId);

        this._isNavigating = false;
    },

    goBack: function() {
        if (this._isNavigating) return;
        this._isNavigating = true;

        render.goBack();

        this._isNavigating = false;
    },

    // ---------- 路由 ----------
    _getHashPath: function() {
        var hash = window.location.hash || '#/';
        return hash.replace('#', '');
    },

    _parseHash: function(path) {
        var parts = path.split('/').filter(Boolean);
        var page = parts[0] || 'home';
        var sectionId = parts[1] || null;
        var subId = parts[2] || null;
        return { page: page, sectionId: sectionId, subId: subId };
    },

    _updateHash: function(page, sectionId, subId) {
        var hash = '/';
        if (page === 'section' && sectionId) {
            hash = '/section/' + sectionId;
        } else if (page === 'subsection' && sectionId && subId) {
            hash = '/subsection/' + sectionId + '/' + subId;
        } else if (page === 'bookmarks' && sectionId && subId) {
            hash = '/bookmarks/' + sectionId + '/' + subId;
        }
        if (window.location.hash !== '#' + hash) {
            window.history.pushState(null, '', '#' + hash);
        }
    },

    _handleHashChange: function() {
        if (this._isNavigating) return;
        var path = this._getHashPath();
        var parsed = this._parseHash(path);

        if (parsed.page === 'home') {
            this.navigateTo('home');
        } else if (parsed.page === 'section' && parsed.sectionId) {
            var sec = this._findSectionById(parsed.sectionId);
            if (sec) {
                this.navigateTo('section', parsed.sectionId);
            } else {
                this.navigateTo('home');
            }
        } else if (parsed.page === 'subsection' && parsed.sectionId && parsed.subId) {
            var sec2 = this._findSectionById(parsed.sectionId);
            if (sec2) {
                var sub = sec2.children.find(function(c) { return c.id === parsed.subId; });
                if (sub && sub.isHtml) {
                    this.navigateTo('subsection', parsed.sectionId, parsed.subId);
                } else {
                    this.navigateTo('section', parsed.sectionId);
                }
            } else {
                this.navigateTo('home');
            }
        } else if (parsed.page === 'bookmarks' && parsed.sectionId && parsed.subId) {
            var sec3 = this._findSectionById(parsed.sectionId);
            if (sec3) {
                var sub2 = sec3.children.find(function(c) { return c.id === parsed.subId; });
                if (sub2 && !sub2.isHtml) {
                    this.navigateTo('bookmarks', parsed.sectionId, parsed.subId);
                } else {
                    this.navigateTo('section', parsed.sectionId);
                }
            } else {
                this.navigateTo('home');
            }
        } else {
            this.navigateTo('home');
        }
    },

    // ---------- 浏览器历史 ----------
    pushState: function(page, sectionId, subId) {
        this._updateHash(page, sectionId, subId);
    },

    // ---------- 更新数据 ----------
    updateData: function(sections, homeItems, settings) {
        if (sections) this._sections = sections;
        if (homeItems) this._homeItems = homeItems;
        if (settings) this._settings = settings;

        render.setData(this._sections, this._homeItems, this._settings);

        // 获取当前状态
        var state = render.getState();
        var current = state.pageStack[state.pageStack.length - 1];

        // 重新渲染当前页
        if (current === 'home') {
            render.renderHome();
        } else if (current === 'section') {
            if (state.currentSectionId) render.renderSection(state.currentSectionId);
        } else if (current === 'subsection') {
            if (state.currentSubId && state.currentSectionId) {
                render.renderSubSection(state.currentSubId, state.currentSectionId);
            }
        } else if (current === 'bookmarks') {
            if (state.currentSubId && state.currentSectionId) {
                render.renderBookmarks(state.currentSubId, state.currentSectionId);
            }
        }
        render.renderSidebar();
    },

    // ---------- 面包屑（可选） ----------
    getBreadcrumb: function() {
        var state = render.getState();
        var stack = state.pageStack;
        var result = [];

        if (stack.includes('home')) {
            result.push({ name: '首页', path: 'home' });
        }
        if (stack.includes('section') && state.currentSectionId) {
            var sec = this._findSectionById(state.currentSectionId);
            if (sec) {
                result.push({ name: sec.name, path: 'section', id: sec.id });
            }
        }
        if ((stack.includes('subsection') || stack.includes('bookmarks')) && state.currentSubId) {
            var parent = this._findSectionById(state.currentSectionId);
            if (parent) {
                var sub = parent.children.find(function(c) { return c.id === state.currentSubId; });
                if (sub) {
                    result.push({ name: sub.name, path: stack[stack.length - 1], id: sub.id });
                }
            }
        }

        return result;
    },

    // ---------- Escape 回调 ----------
    onEscape: function(callback) {
        this._onEscape = callback;
    },

    // ---------- 获取当前页面 ----------
    getCurrentPage: function() {
        var state = render.getState();
        return {
            page: state.pageStack[state.pageStack.length - 1],
            sectionId: state.currentSectionId,
            subId: state.currentSubId
        };
    },

    // ---------- 判断是否在首页 ----------
    isHome: function() {
        var state = render.getState();
        return state.pageStack.length === 1 && state.pageStack[0] === 'home';
    },

    // ---------- 判断是否在分区详情 ----------
    isSection: function() {
        var state = render.getState();
        return state.pageStack.length >= 2 && state.pageStack[state.pageStack.length - 1] === 'section';
    },

    // ---------- 判断是否在子分区 ----------
    isSubSection: function() {
        var state = render.getState();
        return state.pageStack.length >= 3 && state.pageStack[state.pageStack.length - 1] === 'subsection';
    },

    // ---------- 判断是否在书签列表 ----------
    isBookmarks: function() {
        var state = render.getState();
        return state.pageStack.length >= 3 && state.pageStack[state.pageStack.length - 1] === 'bookmarks';
    },

    // ---------- 跳转到首页（强制） ----------
    goHome: function() {
        this.navigateTo('home');
    },

    // ---------- 刷新当前页 ----------
    refreshCurrent: function() {
        var current = this.getCurrentPage();
        if (current.page === 'home') {
            render.renderHome();
        } else if (current.page === 'section' && current.sectionId) {
            render.renderSection(current.sectionId);
        } else if (current.page === 'subsection' && current.sectionId && current.subId) {
            render.renderSubSection(current.subId, current.sectionId);
        } else if (current.page === 'bookmarks' && current.sectionId && current.subId) {
            render.renderBookmarks(current.subId, current.sectionId);
        }
        render.renderSidebar();
    }
};
