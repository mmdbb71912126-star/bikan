// ============================================================
//  主初始化入口 - 整合所有模块
// ============================================================
var App = App || {};
var utils = App.utils;
var api = App.api;
var render = App.render;
var navigation = App.navigation;

App.main = {

    // ---------- 状态 ----------
    _initialized: false,
    _currentUser: null,
    _isLoading: false,

    // ---------- 初始化 ----------
    init: async function() {
        if (this._initialized) return;

        // 清除跳转标记（来自登录页）
        sessionStorage.removeItem('_bikan_redirecting');
        sessionStorage.removeItem('_bikan_redirect_time');

        // 检查登录状态（带重试）
        var user = await this._checkAuth();
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        this._currentUser = user;
        utils.setCurrentUser(user);
        console.log('✅ 当前用户:', user.email);

        // 加载数据
        await this._loadAllData();

        // 初始化渲染器和导航器
        this._initRenderAndNavigation();

        // 绑定事件
        this._bindEvents();

        // 显示应用
        var app = document.getElementById('app');
        if (app) app.classList.add('visible');

        this._initialized = true;
        console.log('✅ 必看网 v3.0 已加载');
    },

    // ---------- 认证 ----------
    _checkAuth: async function() {
        var retries = 0;
        while (retries < 3) {
            try {
                var { data, error } = await App.supabase.auth.getUser();
                if (error) {
                    console.log('获取用户失败，重试中...', retries + 1);
                } else if (data.user) {
                    return data.user;
                }
            } catch (err) {
                console.log('获取用户异常，重试中...', retries + 1);
            }
            retries++;
            await utils.sleep(300);
        }
        return null;
    },

    // ---------- 数据加载 ----------
    _loadAllData: async function() {
        this._isLoading = true;
        utils.showToast('加载数据中...', '');

        try {
            // 并行加载所有数据
            var [settingsData, sectionsData, homeItemsData, bookmarksData, htmlPagesData] = await Promise.all([
                api.loadSettings(),
                api.loadSections(),
                api.loadHomeItems(),
                api.loadBookmarks(),
                api.loadHtmlPages()
            ]);

            // 处理设置
            var settings = settingsData || { site: {}, hero: {}, theme: {} };
            if (!settings.site) settings.site = { name: '必看网', version: 'v3.0' };
            if (!settings.hero) settings.hero = { badge: '✦ 精选优质网站', title: '发现好网站', subtitle: '从必看网开始', highlight: '好网站' };

            // 处理分区数据 - 构建树形结构
            var sections = this._buildTree(sectionsData || [], bookmarksData || [], htmlPagesData || []);

            // 处理首页项
            var homeItems = homeItemsData || [];

            // 存储数据到全局
            utils.setData(sections, homeItems, settings);
            App._sections = sections;
            App._homeItems = homeItems;
            App._settings = settings;

            this._isLoading = false;
            utils.showToast('数据加载完成', 'success');

        } catch (err) {
            console.error('加载数据失败:', err);
            this._isLoading = false;
            utils.showToast('数据加载失败，请刷新重试', 'error');
        }
    },

    // ---------- 构建树 ----------
    _buildTree: function(sectionsData, bookmarksData, htmlPagesData) {
        // 按 section_id 分组书签
        var bookmarksMap = {};
        bookmarksData.forEach(function(b) {
            if (!bookmarksMap[b.section_id]) bookmarksMap[b.section_id] = [];
            bookmarksMap[b.section_id].push(b);
        });

        // 按 section_id 分组 HTML 页面
        var htmlMap = {};
        htmlPagesData.forEach(function(h) {
            if (!htmlMap[h.section_id]) htmlMap[h.section_id] = [];
            htmlMap[h.section_id].push(h);
        });

        // 添加 children 字段
        sectionsData.forEach(function(sec) {
            sec.bookmarks = bookmarksMap[sec.id] || [];
            sec.htmlPages = htmlMap[sec.id] || [];
            sec.children = [];
        });

        // 构建父子关系
        var rootSections = [];
        var childrenMap = {};

        sectionsData.forEach(function(sec) {
            if (sec.parent_id) {
                if (!childrenMap[sec.parent_id]) childrenMap[sec.parent_id] = [];
                childrenMap[sec.parent_id].push(sec);
            } else {
                rootSections.push(sec);
            }
        });

        // 递归构建树
        function buildTree(sec) {
            var children = childrenMap[sec.id] || [];
            sec.children = children.map(function(c) {
                c.bookmarks = c.bookmarks || [];
                c.htmlPages = c.htmlPages || [];
                return buildTree(c);
            });
            return sec;
        }

        rootSections.forEach(function(sec) {
            buildTree(sec);
        });

        return rootSections;
    },

    // ---------- 初始化渲染器和导航器 ----------
    _initRenderAndNavigation: function() {
        var sections = App._sections || [];
        var homeItems = App._homeItems || [];
        var settings = App._settings || { site: {}, hero: {} };

        // 初始化渲染器
        render.setData(sections, homeItems, settings);
        render.setState({
            currentSectionId: null,
            currentSubId: null,
            pageStack: ['home'],
            isManageMode: false,
            expandedNodes: {}
        });

        // 初始化导航器
        navigation.init(sections, homeItems, settings);

        // 渲染首页
        render.renderHome();

        // 更新管理模式 UI
        render.setManageMode(false);
    },

    // ---------- 绑定事件 ----------
    _bindEvents: function() {
        var self = this;

        // 品牌点击返回首页
        var brandHome = document.getElementById('brandHome');
        if (brandHome) {
            brandHome.addEventListener('click', function() {
                navigation.goHome();
            });
        }

        // 返回按钮
        var backBtns = document.querySelectorAll('.back-btn');
        backBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                navigation.goBack();
            });
        });

        // 管理模式切换
        var modeToggle = document.getElementById('modeToggle');
        if (modeToggle) {
            modeToggle.addEventListener('click', function() {
                render.toggleManageMode();
                var isManage = render.getManageMode();
                var indicator = document.getElementById('modeIndicator');
                if (indicator) {
                    indicator.textContent = isManage ? '⚙️ 管理' : '👁️ 浏览';
                }
                utils.showToast(isManage ? '已进入管理模式' : '已切换浏览模式', 'success');
            });
        }

        // 侧边栏折叠
        var sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                var sidebar = document.getElementById('appSidebar');
                if (!sidebar) return;
                sidebar.classList.toggle('collapsed');
                this.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
            });
        }

        // 退出登录
        var logoutBtn = document.getElementById('navLogout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function() {
                self._logout();
            });
        }

        // 添加分类
        var addSectionBtns = document.querySelectorAll('#navManage, #toolAddSection, #btnAddSection');
        addSectionBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                self._showAddSectionModal();
            });
        });

        // 添加公告
        var addAnnouncementBtn = document.getElementById('toolAddAnnouncement');
        if (addAnnouncementBtn) {
            addAnnouncementBtn.addEventListener('click', function() {
                self._showAddAnnouncementModal();
            });
        }

        // 添加分割线
        var addDividerBtn = document.getElementById('toolAddDivider');
        if (addDividerBtn) {
            addDividerBtn.addEventListener('click', function() {
                self._showAddDividerModal();
            });
        }

        // 添加子分区
        var detailAddSub = document.getElementById('detailAddSub');
        if (detailAddSub) {
            detailAddSub.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSectionId) {
                    self._showAddSubModal(state.currentSectionId);
                }
            });
        }

        // 添加 HTML 页面
        var subAddHtml = document.getElementById('subAddHtmlPage');
        if (subAddHtml) {
            subAddHtml.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSubId && state.currentSectionId) {
                    self._showAddHtmlPageModal(state.currentSubId, state.currentSectionId);
                }
            });
        }

        // 添加书签
        var bmAddBookmark = document.getElementById('bmAddBookmark');
        if (bmAddBookmark) {
            bmAddBookmark.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSubId && state.currentSectionId) {
                    self._showAddBookmarkModal(state.currentSubId, state.currentSectionId);
                }
            });
        }

        // 编辑分区
        var detailEditSection = document.getElementById('detailEditSection');
        if (detailEditSection) {
            detailEditSection.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSectionId) {
                    self._showEditSectionModal(state.currentSectionId);
                }
            });
        }

        // 删除分区
        var detailDeleteSection = document.getElementById('detailDeleteSection');
        if (detailDeleteSection) {
            detailDeleteSection.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSectionId) {
                    self._confirmDeleteSection(state.currentSectionId);
                }
            });
        }

        // 编辑子分区
        var editSubBtns = document.querySelectorAll('#subEditSub, #bmEditSub');
        editSubBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSubId && state.currentSectionId) {
                    self._showEditSubModal(state.currentSubId, state.currentSectionId);
                }
            });
        });

        // 删除子分区
        var deleteSubBtns = document.querySelectorAll('#subDeleteSub, #bmDeleteSub');
        deleteSubBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var state = render.getState();
                if (state.currentSubId && state.currentSectionId) {
                    self._confirmDeleteSub(state.currentSubId, state.currentSectionId);
                }
            });
        });

        // 备份
        var backupBtn = document.getElementById('navBackup');
        if (backupBtn) {
            backupBtn.addEventListener('click', function() {
                self._exportBackup();
            });
        }

        // 恢复
        var restoreBtn = document.getElementById('navRestore');
        if (restoreBtn) {
            restoreBtn.addEventListener('click', function() {
                document.getElementById('restoreFileInput').click();
            });
        }
        var restoreFileInput = document.getElementById('restoreFileInput');
        if (restoreFileInput) {
            restoreFileInput.addEventListener('change', function(e) {
                if (this.files && this.files[0]) {
                    self._importBackup(this.files[0]);
                    this.value = '';
                }
            });
        }

        // 导入旧数据
        var importDataBtn = document.getElementById('navImportData');
        if (importDataBtn) {
            importDataBtn.addEventListener('click', function() {
                self._importOldData();
            });
        }

        // 导出 HTML（简化版）
        var exportBtn = document.getElementById('navExport');
        if (exportBtn) {
            exportBtn.addEventListener('click', function() {
                utils.showToast('🌐 导出功能：请使用「备份」导出 JSON 数据', 'error');
            });
        }

        // 快捷键
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                render.toggleManageMode();
                var isManage = render.getManageMode();
                var indicator = document.getElementById('modeIndicator');
                if (indicator) {
                    indicator.textContent = isManage ? '⚙️ 管理' : '👁️ 浏览';
                }
                utils.showToast(isManage ? '已进入管理模式' : '已切换浏览模式', 'success');
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.custom-modal-overlay.open').forEach(function(el) {
                    el.classList.remove('open');
                });
                var fullscreen = document.getElementById('fullscreenHtmlOverlay');
                if (fullscreen) fullscreen.classList.remove('open');
            }
        });

        // 渲染器回调绑定
        this._bindRenderCallbacks();
    },

    // ---------- 渲染器回调 ----------
    _bindRenderCallbacks: function() {
        var self = this;

        // 编辑首页项
        render.onEditHomeItem(function(itemId) {
            self._showEditHomeItemModal(itemId);
        });

        // 删除首页项
        render.onDeleteHomeItem(function(itemId) {
            self._confirmDeleteHomeItem(itemId);
        });

        // 重排首页项
        render.onReorderHomeItems(function(fromId, toId) {
            self._reorderHomeItems(fromId, toId);
        });

        // 编辑子分区
        render.onEditSub(function(subId, sectionId) {
            self._showEditSubModal(subId, sectionId);
        });

        // 删除子分区
        render.onDeleteSub(function(subId, sectionId) {
            self._confirmDeleteSub(subId, sectionId);
        });

        // 编辑 HTML 页面
        render.onEditHtmlPage(function(subId, sectionId, pageId) {
            self._showEditHtmlPageModal(subId, sectionId, pageId);
        });

        // 删除 HTML 页面
        render.onDeleteHtmlPage(function(subId, sectionId, pageId) {
            self._confirmDeleteHtmlPage(subId, sectionId, pageId);
        });

        // 移动书签
        render.onMoveBookmark(function(subId, index, direction) {
            self._moveBookmark(subId, index, direction);
        });

        // 编辑书签
        render.onEditBookmark(function(bmId, subId) {
            self._showEditBookmarkModal(bmId, subId);
        });

        // 删除书签
        render.onDeleteBookmark(function(bmId, subId) {
            self._confirmDeleteBookmark(bmId, subId);
        });
    },

    // ---------- 模态框工具 ----------
    _showModal: function(title, fields, confirmLabel, onConfirm) {
        return new Promise(function(resolve) {
            var overlay = document.getElementById('customModal');
            var titleEl = document.getElementById('customModalTitle');
            var body = document.getElementById('customModalBody');
            var confirmBtn = document.getElementById('customModalConfirm');
            var cancelBtn = document.getElementById('customModalCancel');

            titleEl.textContent = title || '输入';
            body.innerHTML = '';

            fields.forEach(function(f) {
                var group = document.createElement('div');
                group.className = 'form-group';

                if (f.type === 'checkbox') {
                    group.style.display = 'flex';
                    group.style.alignItems = 'center';
                    group.style.gap = '8px';
                    group.style.padding = '4px 0';

                    var input = document.createElement('input');
                    input.type = 'checkbox';
                    if (f.value) input.checked = true;
                    input.id = f.id || 'modal_input_' + Date.now();

                    var labelSpan = document.createElement('span');
                    labelSpan.textContent = f.label || '';
                    labelSpan.style.color = 'var(--text-secondary)';
                    labelSpan.style.fontSize = '0.85rem';

                    group.appendChild(labelSpan);
                    group.appendChild(input);
                    body.appendChild(group);
                    return;
                }

                var label = document.createElement('label');
                label.textContent = f.label || '';
                group.appendChild(label);

                var input;
                if (f.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.rows = 3;
                    if (f.value) input.value = f.value;
                } else if (f.type === 'select') {
                    input = document.createElement('select');
                    if (f.options) {
                        f.options.forEach(function(opt) {
                            var o = document.createElement('option');
                            o.value = opt.value;
                            o.textContent = opt.label;
                            if (opt.value === f.value) o.selected = true;
                            input.appendChild(o);
                        });
                    }
                } else if (f.type === 'file') {
                    input = document.createElement('input');
                    input.type = 'file';
                    input.id = f.id || 'modal_input_' + Date.now();
                    input.accept = f.accept || '*';
                    input.style.padding = '6px 0';
                    group.appendChild(input);
                    body.appendChild(group);
                    return;
                } else {
                    input = document.createElement('input');
                    input.type = 'text';
                    if (f.value) input.value = f.value;
                }

                input.id = f.id || 'modal_input_' + Date.now();
                input.placeholder = f.placeholder || '';
                group.appendChild(input);
                body.appendChild(group);
            });

            overlay.classList.add('open');

            var newConfirm = function() {
                var results = {};
                fields.forEach(function(f) {
                    var el = document.getElementById(f.id);
                    if (el) {
                        if (f.type === 'checkbox') {
                            results[f.id] = el.checked;
                        } else if (f.type === 'file') {
                            results[f.id] = el.files[0] || null;
                        } else {
                            results[f.id] = el.value;
                        }
                    }
                });
                overlay.classList.remove('open');
                if (onConfirm) onConfirm(results);
                resolve(results);
            };

            var newCancel = function() {
                overlay.classList.remove('open');
                resolve(null);
            };

            confirmBtn.onclick = newConfirm;
            cancelBtn.onclick = newCancel;
            overlay.onclick = function(e) {
                if (e.target === overlay) newCancel();
            };

            var firstInput = body.querySelector('input:not([type="checkbox"]), textarea, select');
            if (firstInput) {
                firstInput.focus();
                firstInput.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        newConfirm();
                    }
                });
            }
        });
    },

    _showConfirm: function(msg, title) {
        return new Promise(function(resolve) {
            var overlay = document.getElementById('confirmModal');
            document.getElementById('confirmModalTitle').textContent = title || '确认操作';
            document.getElementById('confirmModalMsg').textContent = msg;
            overlay.classList.add('open');

            var okBtn = document.getElementById('confirmModalOk');
            var cancelBtn = document.getElementById('confirmModalCancel');

            var newOk = function() {
                overlay.classList.remove('open');
                resolve(true);
            };
            var newCancel = function() {
                overlay.classList.remove('open');
                resolve(false);
            };

            okBtn.onclick = newOk;
            cancelBtn.onclick = newCancel;
            overlay.onclick = function(e) {
                if (e.target === overlay) newCancel();
            };
        });
    },

    // ---------- 业务逻辑 ----------

    // 添加分类
    _showAddSectionModal: function() {
        var self = this;
        var sections = App._sections || [];
        var parentOptions = [{ value: '', label: '（根级）' }];
        sections.forEach(function(s) {
            parentOptions.push({ value: s.id, label: s.name });
        });

        var fields = [
            { id: 'sec_name', label: '分类名称', type: 'text', value: '' },
            { id: 'sec_parent', label: '父分区', type: 'select', value: '', options: parentOptions },
            { id: 'sec_isHtml', label: 'HTML 模式（子分区只能导入 HTML）', type: 'checkbox', value: false }
        ];

        this._showModal('新建分类', fields, '创建', async function(results) {
            var name = results.sec_name.trim();
            if (!name) {
                utils.showToast('请输入名称', 'error');
                return;
            }

            var parentId = results.sec_parent || '';
            var isHtmlParent = results.sec_isHtml === true;

            var newSec = {
                id: utils.generateId(),
                name: name,
                icon: '',
                isHtmlParent: isHtmlParent,
                parent_id: parentId || null,
                sort_order: sections.length,
                children: []
            };

            var success = await api.createSection({
                id: newSec.id,
                name: newSec.name,
                icon: newSec.icon,
                is_html_parent: newSec.isHtmlParent,
                parent_id: newSec.parent_id,
                sort_order: newSec.sort_order
            });

            if (!success) {
                utils.showToast('创建失败', 'error');
                return;
            }

            // 添加首页引用
            var homeItemId = utils.generateId();
            await api.createHomeItem({
                id: homeItemId,
                type: 'section_ref',
                section_id: newSec.id,
                sort_order: (App._homeItems || []).length
            });

            // 刷新数据
            await self._reloadData();
            utils.showToast('分类已创建' + (isHtmlParent ? '（HTML 模式）' : ''), 'success');
        });
    },

    // 添加子分区
    _showAddSubModal: function(sectionId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) {
            utils.showToast('分区不存在', 'error');
            return;
        }

        var isForcedHtml = section.isHtmlParent || false;
        var fields = [
            { id: 'sub_name', label: '子分区名称', type: 'text', value: '' }
        ];
        if (!isForcedHtml) {
            fields.push({
                id: 'sub_isHtml',
                label: 'HTML 模式（可添加多个 HTML 页面）',
                type: 'checkbox',
                value: false
            });
        }

        this._showModal('新建子分区', fields, '创建', async function(results) {
            var name = results.sub_name.trim();
            if (!name) {
                utils.showToast('请输入名称', 'error');
                return;
            }

            var childIsHtml = isForcedHtml || (results.sub_isHtml === true);
            var children = section.children || [];
            var newChild = {
                id: utils.generateId(),
                name: name,
                icon: '',
                isHtml: childIsHtml,
                parent_id: sectionId,
                sort_order: children.length,
                children: [],
                bookmarks: [],
                htmlPages: []
            };

            var success = await api.createSection({
                id: newChild.id,
                name: newChild.name,
                icon: newChild.icon,
                is_html_parent: false,
                parent_id: newChild.parent_id,
                sort_order: newChild.sort_order
            });

            if (!success) {
                utils.showToast('创建失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo(childIsHtml ? 'subsection' : 'bookmarks', sectionId, newChild.id);
            utils.showToast('子分区已创建', 'success');
        });
    },

    // 添加公告
    _showAddAnnouncementModal: function() {
        var self = this;
        var fields = [
            { id: 'ann_content', label: '公告内容', type: 'textarea', value: '📢 新公告' },
            { id: 'ann_position', label: '位置', type: 'select', value: 'between',
                options: [{ value: 'top', label: '页面顶部' }, { value: 'between', label: '分区之间' },
                { value: 'bottom', label: '页面底部' }] }
        ];

        this._showModal('添加公告', fields, '添加', async function(results) {
            var content = results.ann_content.trim();
            if (!content) {
                utils.showToast('请输入内容', 'error');
                return;
            }

            var newItem = {
                id: utils.generateId(),
                type: 'announcement',
                content: content,
                position: results.ann_position || 'between',
                sort_order: (App._homeItems || []).length
            };

            var success = await api.createHomeItem(newItem);
            if (!success) {
                utils.showToast('添加失败', 'error');
                return;
            }

            await self._reloadData();
            utils.showToast('公告已添加', 'success');
        });
    },

    // 添加分割线
    _showAddDividerModal: function() {
        var self = this;
        var fields = [{ id: 'div_content', label: '分割线文字（可选）', type: 'text', value: '' }];

        this._showModal('添加分割线', fields, '添加', async function(results) {
            var content = results.div_content.trim() || '';

            var newItem = {
                id: utils.generateId(),
                type: 'divider',
                content: content,
                position: 'between',
                sort_order: (App._homeItems || []).length
            };

            var success = await api.createHomeItem(newItem);
            if (!success) {
                utils.showToast('添加失败', 'error');
                return;
            }

            await self._reloadData();
            utils.showToast('分割线已添加', 'success');
        });
    },

    // 添加 HTML 页面
    _showAddHtmlPageModal: function(subId, sectionId) {
        var self = this;
        var fields = [{ id: 'page_name', label: '页面名称', type: 'text', value: '' }];

        this._showModal('命名 HTML 页面', fields, '下一步', async function(result) {
            var name = result.page_name.trim();
            if (!name) {
                utils.showToast('请输入页面名称', 'error');
                return;
            }

            // 第二步：输入 HTML 内容
            var contentFields = [
                { id: 'html_content', label: '粘贴 HTML 代码', type: 'textarea', value: '' },
                { id: 'html_file', label: '或上传 HTML 文件', type: 'file' }
            ];

            var overlay = document.getElementById('customModal');
            var titleEl = document.getElementById('customModalTitle');
            var body = document.getElementById('customModalBody');
            var confirmBtn = document.getElementById('customModalConfirm');
            var cancelBtn = document.getElementById('customModalCancel');

            titleEl.textContent = '导入 HTML 内容';
            body.innerHTML = '';

            var textareaGroup = document.createElement('div');
            textareaGroup.className = 'form-group';
            var label1 = document.createElement('label');
            label1.textContent = '粘贴 HTML 代码';
            textareaGroup.appendChild(label1);
            var textarea = document.createElement('textarea');
            textarea.id = 'html_content';
            textarea.rows = 8;
            textarea.style.minHeight = '200px';
            textarea.style.fontFamily = 'monospace';
            textarea.style.fontSize = '0.8rem';
            textarea.value = '';
            textareaGroup.appendChild(textarea);
            body.appendChild(textareaGroup);

            var fileGroup = document.createElement('div');
            fileGroup.className = 'form-group';
            var label2 = document.createElement('label');
            label2.textContent = '或上传 HTML 文件';
            fileGroup.appendChild(label2);
            var fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'html_file';
            fileInput.accept = '.html,.htm';
            fileInput.style.padding = '6px 0';
            fileGroup.appendChild(fileInput);
            body.appendChild(fileGroup);

            overlay.classList.add('open');

            var newConfirm = async function() {
                var content = document.getElementById('html_content').value;
                var file = document.getElementById('html_file').files[0];

                if (file) {
                    var reader = new FileReader();
                    reader.onload = async function(e) {
                        var page = {
                            id: utils.generateId(),
                            name: name,
                            content: e.target.result
                        };
                        await self._saveHtmlPage(subId, sectionId, page);
                        overlay.classList.remove('open');
                    };
                    reader.readAsText(file);
                } else if (content.trim()) {
                    var page = {
                        id: utils.generateId(),
                        name: name,
                        content: content
                    };
                    await self._saveHtmlPage(subId, sectionId, page);
                    overlay.classList.remove('open');
                } else {
                    utils.showToast('请粘贴 HTML 代码或选择文件', 'error');
                }
            };

            var newCancel = function() {
                overlay.classList.remove('open');
            };

            confirmBtn.onclick = newConfirm;
            cancelBtn.onclick = newCancel;
            overlay.onclick = function(e) {
                if (e.target === overlay) newCancel();
            };
        });
    },

    _saveHtmlPage: async function(subId, sectionId, page) {
        var success = await api.createHtmlPage({
            id: page.id,
            section_id: subId,
            name: page.name,
            content: page.content,
            sort_order: 0
        });

        if (success) {
            await this._reloadData();
            navigation.navigateTo('subsection', sectionId, subId);
            utils.showToast('HTML 页面已添加', 'success');
        } else {
            utils.showToast('添加失败', 'error');
        }
    },

    // 添加书签
    _showAddBookmarkModal: function(subId, sectionId) {
        var self = this;
        var fields = [
            { id: 'bm_name', label: '名称', type: 'text', value: '' },
            { id: 'bm_url', label: '网址', type: 'text', value: '' },
            { id: 'bm_desc', label: '介绍', type: 'textarea', value: '' },
            { id: 'bm_stars', label: '星级 (1-5)', type: 'text', value: '3' },
            { id: 'bm_vpn', label: 'VPN', type: 'select', value: 'no',
                options: [{ value: 'no', label: '无需' }, { value: 'yes', label: '需要' }] }
        ];

        this._showModal('添加网址', fields, '添加', async function(results) {
            var name = results.bm_name.trim();
            var url = results.bm_url.trim();

            if (!name || !url) {
                utils.showToast('请填写名称和网址', 'error');
                return;
            }
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

            var stars = parseInt(results.bm_stars) || 3;
            if (stars < 1) stars = 1;
            if (stars > 5) stars = 5;

            var section = self._findSectionById(sectionId);
            if (!section) {
                utils.showToast('分区不存在', 'error');
                return;
            }
            var sub = section.children.find(function(c) { return c.id === subId; });
            if (!sub) {
                utils.showToast('子分区不存在', 'error');
                return;
            }

            var bookmarks = sub.bookmarks || [];
            var newBm = {
                id: utils.generateId(),
                section_id: subId,
                name: name,
                url: url,
                description: results.bm_desc || '',
                stars: stars,
                requires_vpn: results.bm_vpn === 'yes',
                icon: '',
                sort_order: bookmarks.length
            };

            var success = await api.createBookmark(newBm);
            if (!success) {
                utils.showToast('添加失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo('bookmarks', sectionId, subId);
            utils.showToast('网址已添加', 'success');
        });
    },

    // ---------- 编辑功能 ----------

    _showEditSectionModal: function(sectionId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) return;

        var fields = [
            { id: 'sec_name', label: '分类名称', type: 'text', value: section.name || '' },
            { id: 'sec_isHtml', label: 'HTML 模式', type: 'checkbox', value: section.isHtmlParent || false }
        ];

        this._showModal('编辑分区', fields, '保存', async function(results) {
            var name = results.sec_name.trim();
            if (!name) {
                utils.showToast('请输入名称', 'error');
                return;
            }

            var isHtmlParent = results.sec_isHtml === true;
            var success = await api.updateSection(sectionId, {
                name: name,
                is_html_parent: isHtmlParent
            });

            if (!success) {
                utils.showToast('更新失败', 'error');
                return;
            }

            // 如果切换了 HTML 模式，需要处理子分区
            if (isHtmlParent !== section.isHtmlParent) {
                // 获取所有子分区
                var children = section.children || [];
                for (var i = 0; i < children.length; i++) {
                    var child = children[i];
                    if (isHtmlParent) {
                        // 切换到 HTML 模式：删除所有书签
                        await api.deleteBookmarksBySection(child.id);
                        await api.updateSection(child.id, { is_html_parent: false });
                    } else {
                        // 切换到普通模式：删除所有 HTML 页面
                        await api.deleteHtmlPagesBySection(child.id);
                        await api.updateSection(child.id, { is_html_parent: false });
                    }
                }
            }

            await self._reloadData();
            navigation.navigateTo('section', sectionId);
            utils.showToast('已更新', 'success');
        });
    },

    _showEditSubModal: function(subId, sectionId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) return;
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) return;

        var isForcedHtml = section.isHtmlParent === true;
        var fields = [
            { id: 'sub_name', label: '名称', type: 'text', value: sub.name || '' }
        ];
        if (!isForcedHtml) {
            fields.push({
                id: 'sub_isHtml',
                label: 'HTML 模式',
                type: 'checkbox',
                value: sub.isHtml || false
            });
        }

        this._showModal('编辑子分区', fields, '保存', async function(results) {
            var name = results.sub_name.trim();
            if (!name) {
                utils.showToast('请输入名称', 'error');
                return;
            }

            var updates = { name: name };
            if (!isForcedHtml) {
                var newIsHtml = results.sub_isHtml === true;
                if (newIsHtml !== sub.isHtml) {
                    if (newIsHtml) {
                        await api.deleteBookmarksBySection(subId);
                    } else {
                        await api.deleteHtmlPagesBySection(subId);
                    }
                }
                sub.isHtml = newIsHtml;
            }

            var success = await api.updateSection(subId, updates);
            if (!success) {
                utils.showToast('更新失败', 'error');
                return;
            }

            await self._reloadData();
            if (sub.isHtml) {
                navigation.navigateTo('subsection', sectionId, subId);
            } else {
                navigation.navigateTo('bookmarks', sectionId, subId);
            }
            utils.showToast('已更新', 'success');
        });
    },

    _showEditHomeItemModal: function(itemId) {
        var self = this;
        var item = (App._homeItems || []).find(function(it) { return it.id === itemId; });
        if (!item) return;

        var fields = [];
        var title = '';

        if (item.type === 'announcement') {
            title = '编辑公告';
            fields.push({
                id: 'edit_content',
                label: '公告内容',
                type: 'textarea',
                value: item.content || ''
            });
            fields.push({
                id: 'edit_position',
                label: '位置',
                type: 'select',
                value: item.position || 'between',
                options: [{ value: 'top', label: '页面顶部' }, { value: 'between', label: '分区之间' },
                { value: 'bottom', label: '页面底部' }]
            });
        } else if (item.type === 'divider') {
            title = '编辑分割线';
            fields.push({
                id: 'edit_content',
                label: '分割线文字（可选）',
                type: 'text',
                value: item.content || ''
            });
        } else if (item.type === 'section_ref') {
            title = '编辑分区引用';
            var sections = App._sections || [];
            var secOptions = sections.map(function(s) {
                return { value: s.id, label: s.name };
            });
            fields.push({
                id: 'edit_section',
                label: '选择分区',
                type: 'select',
                value: item.section_id || '',
                options: secOptions
            });
        }

        this._showModal(title, fields, '保存', async function(results) {
            var updates = {};
            if (item.type === 'announcement') {
                updates.content = results.edit_content || '';
                updates.position = results.edit_position || 'between';
            } else if (item.type === 'divider') {
                updates.content = results.edit_content || '';
            } else if (item.type === 'section_ref') {
                updates.section_id = results.edit_section || '';
            }

            var success = await api.updateHomeItem(itemId, updates);
            if (!success) {
                utils.showToast('更新失败', 'error');
                return;
            }

            await self._reloadData();
            utils.showToast('已更新', 'success');
        });
    },

    _showEditHtmlPageModal: function(subId, sectionId, pageId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) return;
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) return;
        var page = (sub.htmlPages || []).find(function(p) { return p.id === pageId; });
        if (!page) return;

        var fields = [
            { id: 'page_name', label: '页面名称', type: 'text', value: page.name || '' },
            { id: 'html_content', label: 'HTML 内容', type: 'textarea', value: page.content || '' }
        ];

        this._showModal('编辑 HTML 页面', fields, '保存', async function(results) {
            var name = results.page_name.trim();
            var content = results.html_content.trim();

            if (!name) {
                utils.showToast('请输入名称', 'error');
                return;
            }
            if (!content) {
                utils.showToast('请输入 HTML 内容', 'error');
                return;
            }

            var success = await api.updateHtmlPage(pageId, { name: name, content: content });
            if (!success) {
                utils.showToast('更新失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo('subsection', sectionId, subId);
            utils.showToast('已更新', 'success');
        });
    },

    _showEditBookmarkModal: function(bmId, subId) {
        var self = this;
        var state = render.getState();
        var section = this._findSectionById(state.currentSectionId);
        if (!section) return;
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) return;
        var bm = (sub.bookmarks || []).find(function(b) { return b.id === bmId; });
        if (!bm) return;

        var fields = [
            { id: 'bm_name', label: '名称', type: 'text', value: bm.name || '' },
            { id: 'bm_url', label: '网址', type: 'text', value: bm.url || '' },
            { id: 'bm_desc', label: '介绍', type: 'textarea', value: bm.description || '' },
            { id: 'bm_stars', label: '星级 (1-5)', type: 'text', value: String(bm.stars || 3) },
            { id: 'bm_vpn', label: 'VPN', type: 'select', value: bm.requiresVpn ? 'yes' : 'no',
                options: [{ value: 'no', label: '无需' }, { value: 'yes', label: '需要' }] }
        ];

        this._showModal('编辑书签', fields, '保存', async function(results) {
            var name = results.bm_name.trim();
            var url = results.bm_url.trim();

            if (!name || !url) {
                utils.showToast('请填写名称和网址', 'error');
                return;
            }
            if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

            var stars = parseInt(results.bm_stars) || 3;
            if (stars < 1) stars = 1;
            if (stars > 5) stars = 5;

            var success = await api.updateBookmark(bmId, {
                name: name,
                url: url,
                description: results.bm_desc || '',
                stars: stars,
                requires_vpn: results.bm_vpn === 'yes'
            });

            if (!success) {
                utils.showToast('更新失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo('bookmarks', state.currentSectionId, subId);
            utils.showToast('已更新', 'success');
        });
    },

    // ---------- 删除功能 ----------

    _confirmDeleteSection: function(sectionId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) return;

        this._showConfirm('删除分类「' + section.name + '」及其所有内容？', '确认删除').then(async function(ok) {
            if (!ok) return;

            // 删除所有子分区
            if (section.children) {
                for (var i = 0; i < section.children.length; i++) {
                    var child = section.children[i];
                    if (child.isHtml) {
                        await api.deleteHtmlPagesBySection(child.id);
                    } else {
                        await api.deleteBookmarksBySection(child.id);
                    }
                    await api.deleteSection(child.id);
                }
            }

            await api.deleteSection(sectionId);
            await api.deleteHomeItemBySection(sectionId);

            await self._reloadData();
            navigation.goHome();
            utils.showToast('已删除', 'success');
        });
    },

    _confirmDeleteSub: function(subId, sectionId) {
        var self = this;
        var section = this._findSectionById(sectionId);
        if (!section) return;
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) return;

        this._showConfirm('删除子分区「' + sub.name + '」及其所有内容？', '确认删除').then(async function(ok) {
            if (!ok) return;

            if (sub.isHtml) {
                await api.deleteHtmlPagesBySection(subId);
            } else {
                await api.deleteBookmarksBySection(subId);
            }
            await api.deleteSection(subId);

            await self._reloadData();
            navigation.navigateTo('section', sectionId);
            utils.showToast('已删除', 'success');
        });
    },

    _confirmDeleteHomeItem: function(itemId) {
        var self = this;
        var item = (App._homeItems || []).find(function(it) { return it.id === itemId; });
        if (!item) return;

        var name = item.type === 'announcement' ? '公告' : (item.type === 'divider' ? '分割线' : '分区');
        this._showConfirm('确定删除此' + name + '？', '确认删除').then(async function(ok) {
            if (!ok) return;

            var success = await api.deleteHomeItem(itemId);
            if (!success) {
                utils.showToast('删除失败', 'error');
                return;
            }

            await self._reloadData();
            utils.showToast('已删除', 'success');
        });
    },

    _confirmDeleteHtmlPage: function(subId, sectionId, pageId) {
        var self = this;
        this._showConfirm('删除此 HTML 页面？', '确认删除').then(async function(ok) {
            if (!ok) return;

            var success = await api.deleteHtmlPage(pageId);
            if (!success) {
                utils.showToast('删除失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo('subsection', sectionId, subId);
            utils.showToast('已删除', 'success');
        });
    },

    _confirmDeleteBookmark: function(bmId, subId) {
        var self = this;
        var state = render.getState();

        this._showConfirm('删除此书签？', '确认删除').then(async function(ok) {
            if (!ok) return;

            var success = await api.deleteBookmark(bmId);
            if (!success) {
                utils.showToast('删除失败', 'error');
                return;
            }

            await self._reloadData();
            navigation.navigateTo('bookmarks', state.currentSectionId, subId);
            utils.showToast('已删除', 'success');
        });
    },

    // ---------- 排序 ----------

    _reorderHomeItems: async function(fromId, toId) {
        var items = App._homeItems || [];
        var fromIndex = items.findIndex(function(it) { return it.id === fromId; });
        var toIndex = items.findIndex(function(it) { return it.id === toId; });

        if (fromIndex === -1 || toIndex === -1) return;

        var temp = items[fromIndex];
        items[fromIndex] = items[toIndex];
        items[toIndex] = temp;

        var success = await api.updateHomeItemsOrder(items);
        if (success) {
            App._homeItems = items;
            render.refresh(App._sections, App._homeItems, App._settings);
            utils.showToast('已调整顺序', 'success');
        }
    },

    _moveBookmark: async function(subId, index, direction) {
        var state = render.getState();
        var section = this._findSectionById(state.currentSectionId);
        if (!section) return;
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) return;

        var bookmarks = sub.bookmarks || [];
        if (direction === 'up' && index > 0) {
            var temp = bookmarks[index];
            bookmarks[index] = bookmarks[index - 1];
            bookmarks[index - 1] = temp;
        } else if (direction === 'down' && index < bookmarks.length - 1) {
            var temp2 = bookmarks[index];
            bookmarks[index] = bookmarks[index + 1];
            bookmarks[index + 1] = temp2;
        } else {
            return;
        }

        var success = await api.updateBookmarksOrder(bookmarks);
        if (success) {
            await this._reloadData();
            navigation.navigateTo('bookmarks', state.currentSectionId, subId);
            utils.showToast('已调整顺序', 'success');
        }
    },

    // ---------- 导入导出 ----------

    _exportBackup: async function() {
        try {
            var allData = {
                sections: App._sections || [],
                homeItems: App._homeItems || [],
                settings: App._settings || {},
                exportedAt: new Date().toISOString()
            };

            // 获取所有书签和 HTML 页面
            var { data: bookmarks } = await App.supabase.from('bookmarks').select('*');
            var { data: htmlPages } = await App.supabase.from('html_pages').select('*');
            allData.bookmarks = bookmarks || [];
            allData.htmlPages = htmlPages || [];

            var jsonStr = JSON.stringify(allData, null, 2);
            var name = (App._settings.site && App._settings.site.name) || '必看网';
            var filename = name + '_备份_' + utils.formatDate() + '.json';
            utils.downloadFile(jsonStr, filename, 'application/json');
            utils.showToast('备份已导出', 'success');
        } catch (err) {
            console.error('导出失败:', err);
            utils.showToast('导出失败: ' + err.message, 'error');
        }
    },

    _importBackup: function(file) {
        var self = this;
        var reader = new FileReader();

        reader.onload = async function(e) {
            try {
                var imported = JSON.parse(e.target.result);
                if (!imported.sections) {
                    throw new Error('无效的数据格式');
                }

                var ok = await self._showConfirm('将覆盖当前所有数据，确定继续？', '⚠️ 恢复确认');
                if (!ok) return;

                // 清空现有数据
                await App.supabase.from('home_items').delete().neq('id', '');
                await App.supabase.from('bookmarks').delete().neq('id', '');
                await App.supabase.from('html_pages').delete().neq('id', '');
                await App.supabase.from('sections').delete().neq('id', '');

                // 导入分区
                for (var si = 0; si < imported.sections.length; si++) {
                    var sec = imported.sections[si];
                    await App.supabase.from('sections').insert({
                        id: sec.id || utils.generateId(),
                        name: sec.name || '未命名',
                        icon: sec.icon || '',
                        is_html_parent: sec.isHtmlParent || false,
                        parent_id: sec.parent_id || null,
                        sort_order: sec.sort_order || 0
                    });
                }

                // 导入首页项
                if (imported.homeItems) {
                    for (var hi = 0; hi < imported.homeItems.length; hi++) {
                        var item = imported.homeItems[hi];
                        await App.supabase.from('home_items').insert({
                            id: item.id || utils.generateId(),
                            type: item.type || 'section_ref',
                            content: item.content || '',
                            position: item.position || 'between',
                            section_id: item.section_id || null,
                            sort_order: item.sort_order || 0
                        });
                    }
                }

                // 导入书签
                if (imported.bookmarks) {
                    for (var bi = 0; bi < imported.bookmarks.length; bi++) {
                        var bm = imported.bookmarks[bi];
                        await App.supabase.from('bookmarks').insert({
                            id: bm.id || utils.generateId(),
                            section_id: bm.section_id,
                            name: bm.name || '未命名',
                            url: bm.url || '',
                            description: bm.description || '',
                            stars: bm.stars || 3,
                            requires_vpn: bm.requires_vpn || false,
                            icon: bm.icon || '',
                            sort_order: bm.sort_order || 0
                        });
                    }
                }

                // 导入 HTML 页面
                if (imported.htmlPages) {
                    for (var hpi = 0; hpi < imported.htmlPages.length; hpi++) {
                        var hp = imported.htmlPages[hpi];
                        await App.supabase.from('html_pages').insert({
                            id: hp.id || utils.generateId(),
                            section_id: hp.section_id,
                            name: hp.name || '页面',
                            content: hp.content || '',
                            sort_order: hp.sort_order || 0
                        });
                    }
                }

                // 导入设置
                if (imported.settings) {
                    if (imported.settings.site) {
                        await App.supabase.from('settings').upsert({ key: 'site', value: imported.settings.site });
                    }
                    if (imported.settings.hero) {
                        await App.supabase.from('settings').upsert({ key: 'hero', value: imported.settings.hero });
                    }
                    if (imported.settings.theme) {
                        await App.supabase.from('settings').upsert({ key: 'theme', value: imported.settings.theme });
                    }
                }

                await self._reloadData();
                utils.showToast('数据恢复成功', 'success');

            } catch (err) {
                console.error('恢复失败:', err);
                utils.showToast('恢复失败: ' + err.message, 'error');
            }
        };

        reader.readAsText(file);
        document.getElementById('restoreFileInput').value = '';
    },

    _importOldData: async function() {
        var self = this;
        try {
            var oldData = localStorage.getItem('bikan_data_v10');
            if (!oldData) {
                utils.showToast('未找到旧数据，请确认之前使用过此浏览器', 'error');
                return;
            }

            var data = JSON.parse(oldData);
            if (!data.sections || data.sections.length === 0) {
                utils.showToast('旧数据为空', 'error');
                return;
            }

            var ok = await this._showConfirm(
                '将导入 ' + data.sections.length + ' 个分区及其所有书签。\n会追加到现有数据中。',
                '导入确认'
            );
            if (!ok) return;

            var importedCount = 0;
            var sections = App._sections || [];

            for (var si = 0; si < data.sections.length; si++) {
                var oldSec = data.sections[si];
                var existing = sections.find(function(s) {
                    return s.name === oldSec.name && !s.parent_id;
                });

                var parentId = null;
                if (!existing) {
                    var newSec = {
                        id: utils.generateId(),
                        name: oldSec.name || '未命名',
                        icon: oldSec.icon || '',
                        isHtmlParent: oldSec.isHtmlParent || false,
                        parent_id: null,
                        sort_order: sections.length,
                        children: []
                    };

                    await App.supabase.from('sections').insert({
                        id: newSec.id,
                        name: newSec.name,
                        icon: newSec.icon,
                        is_html_parent: newSec.isHtmlParent,
                        parent_id: newSec.parent_id,
                        sort_order: newSec.sort_order
                    });

                    await App.supabase.from('home_items').insert({
                        id: utils.generateId(),
                        type: 'section_ref',
                        section_id: newSec.id,
                        sort_order: (App._homeItems || []).length
                    });

                    parentId = newSec.id;
                    importedCount++;
                } else {
                    parentId = existing.id;
                }

                // 导入子分区
                if (oldSec.children && oldSec.children.length > 0) {
                    for (var ci = 0; ci < oldSec.children.length; ci++) {
                        var oldChild = oldSec.children[ci];
                        var newChild = {
                            id: utils.generateId(),
                            name: oldChild.name || '未命名',
                            icon: oldChild.icon || '',
                            isHtml: oldChild.isHtml || false,
                            parent_id: parentId,
                            sort_order: ci,
                            children: [],
                            bookmarks: [],
                            htmlPages: []
                        };

                        await App.supabase.from('sections').insert({
                            id: newChild.id,
                            name: newChild.name,
                            icon: newChild.icon,
                            is_html_parent: false,
                            parent_id: newChild.parent_id,
                            sort_order: newChild.sort_order
                        });

                        if (oldChild.isHtml && oldChild.htmlPages) {
                            for (var hi = 0; hi < oldChild.htmlPages.length; hi++) {
                                var hp = oldChild.htmlPages[hi];
                                await App.supabase.from('html_pages').insert({
                                    id: utils.generateId(),
                                    section_id: newChild.id,
                                    name: hp.name || '页面',
                                    content: hp.content || '',
                                    sort_order: hi
                                });
                            }
                        } else if (oldChild.bookmarks) {
                            for (var bi = 0; bi < oldChild.bookmarks.length; bi++) {
                                var bm = oldChild.bookmarks[bi];
                                await App.supabase.from('bookmarks').insert({
                                    id: utils.generateId(),
                                    section_id: newChild.id,
                                    name: bm.name || '未命名',
                                    url: bm.url || '',
                                    description: bm.description || '',
                                    stars: Math.max(1, Math.min(5, parseInt(bm.stars) || 3)),
                                    requires_vpn: (bm.requiresVpn === true || bm.requiresVpn === 'yes') ? true :
                                        false,
                                    icon: bm.icon || '',
                                    sort_order: bi
                                });
                            }
                        }
                        importedCount++;
                    }
                }
            }

            await this._reloadData();
            utils.showToast('导入成功！共导入 ' + importedCount + ' 个分区/子分区', 'success');

        } catch (err) {
            console.error('导入失败:', err);
            utils.showToast('导入失败: ' + err.message, 'error');
        }
    },

    // ---------- 退出登录 ----------
    _logout: async function() {
        var ok = await this._showConfirm('确定要退出登录吗？', '退出确认');
        if (!ok) return;

        try {
            await App.supabase.auth.signOut();
            sessionStorage.removeItem('_bikan_redirecting');
            sessionStorage.removeItem('_bikan_redirect_time');
            window.location.href = 'index.html';
        } catch (err) {
            utils.showToast('退出失败: ' + err.message, 'error');
        }
    },

    // ---------- 刷新数据 ----------
    _reloadData: async function() {
        await this._loadAllData();
        var sections = App._sections || [];
        var homeItems = App._homeItems || [];
        var settings = App._settings || {};

        render.setData(sections, homeItems, settings);
        render.refresh(sections, homeItems, settings);

        navigation.updateData(sections, homeItems, settings);
    },

    // ---------- 查找 ----------
    _findSectionById: function(id) {
        var nodes = App._sections || [];

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
    }
};
