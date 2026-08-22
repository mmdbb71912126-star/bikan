// ============================================================
//  渲染函数 - 侧边栏、首页、分区、书签等
// ============================================================
var App = App || {};
var utils = App.utils;
var icons = App.icons;
var api = App.api;

App.render = {

    // ---------- 引用 ----------
    _sections: [],
    _homeItems: [],
    _settings: {},
    _expandedNodes: {},
    _currentSectionId: null,
    _currentSubId: null,
    _pageStack: ['home'],
    _isManageMode: false,

    // ---------- 设置数据 ----------
    setData: function(sections, homeItems, settings) {
        this._sections = sections || [];
        this._homeItems = homeItems || [];
        this._settings = settings || {};
    },

    setState: function(state) {
        this._currentSectionId = state.currentSectionId || null;
        this._currentSubId = state.currentSubId || null;
        this._pageStack = state.pageStack || ['home'];
        this._isManageMode = state.isManageMode || false;
        this._expandedNodes = state.expandedNodes || {};
    },

    getState: function() {
        return {
            currentSectionId: this._currentSectionId,
            currentSubId: this._currentSubId,
            pageStack: this._pageStack,
            isManageMode: this._isManageMode,
            expandedNodes: this._expandedNodes
        };
    },

    // ---------- 侧边栏 ----------
    renderSidebar: function() {
        var container = document.getElementById('sidebarTree');
        if (!container) return;
        container.innerHTML = '';

        var self = this;
        this._sections.forEach(function(sec) {
            var li = self._buildTreeItem(sec);
            container.appendChild(li);
        });

        var totalEl = document.getElementById('sidebarTotal');
        if (totalEl) totalEl.textContent = this._sections.length;

        var activeId = this._currentSubId || this._currentSectionId;
        if (activeId) {
            document.querySelectorAll('.sidebar-tree .node').forEach(function(el) {
                el.classList.toggle('active', el.dataset.id === activeId);
            });
        }
    },

    _buildTreeItem: function(section) {
        var li = document.createElement('li');
        li.className = 'tree-item';
        li.dataset.id = section.id;

        var hasChildren = section.children && section.children.length > 0;
        var isOpen = this._expandedNodes[section.id] !== false;

        var nodeDiv = document.createElement('div');
        nodeDiv.className = 'node';
        nodeDiv.dataset.id = section.id;

        // Toggle
        var toggle = document.createElement('span');
        toggle.className = 'toggle-icon' + (isOpen ? ' open' : '');
        toggle.textContent = hasChildren ? '▶' : '·';
        toggle.style.opacity = hasChildren ? '1' : '0.2';
        var self = this;
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            if (hasChildren) {
                self._expandedNodes[section.id] = !isOpen;
                self.renderSidebar();
            }
        });

        // Icon
        var iconSpan = document.createElement('span');
        iconSpan.className = 'node-icon';
        if (section.icon) {
            iconSpan.innerHTML = '<img src="' + section.icon + '" alt="" />';
        } else if (section.isHtmlParent) {
            iconSpan.innerHTML = icons.documentSmall();
        } else if (hasChildren) {
            iconSpan.innerHTML = icons.folderSmall();
        } else {
            iconSpan.innerHTML = icons.documentSmall();
        }

        // Name
        var name = document.createElement('span');
        name.className = 'node-name';
        name.textContent = section.name;

        // Badge
        var badge = document.createElement('span');
        badge.className = 'node-badge';
        if (section.isHtmlParent) {
            badge.textContent = 'HTML';
        } else if (hasChildren) {
            var totalBookmarks = 0;
            section.children.forEach(function(c) {
                if (!c.isHtml) totalBookmarks += (c.bookmarks || []).length;
                else totalBookmarks += (c.htmlPages || []).length;
            });
            badge.textContent = totalBookmarks;
        } else {
            badge.textContent = '0';
        }

        nodeDiv.appendChild(toggle);
        nodeDiv.appendChild(iconSpan);
        nodeDiv.appendChild(name);
        nodeDiv.appendChild(badge);

        nodeDiv.addEventListener('click', function(e) {
            if (e.target.closest('.toggle-icon')) return;
            if (self._onSectionClick) self._onSectionClick(section.id);
        });

        li.appendChild(nodeDiv);

        if (hasChildren) {
            var ul = document.createElement('ul');
            ul.className = 'children' + (isOpen ? ' open' : '');
            var self2 = this;
            section.children.forEach(function(child) {
                var childLi = self2._buildChildItem(child, section.id);
                ul.appendChild(childLi);
            });
            li.appendChild(ul);
        }

        return li;
    },

    _buildChildItem: function(child, parentId) {
        var li = document.createElement('li');
        li.className = 'tree-item';
        li.dataset.id = child.id;

        var nodeDiv = document.createElement('div');
        nodeDiv.className = 'node';
        nodeDiv.dataset.id = child.id;
        nodeDiv.style.paddingLeft = '8px';

        var iconSpan = document.createElement('span');
        iconSpan.className = 'node-icon';
        if (child.icon) {
            iconSpan.innerHTML = '<img src="' + child.icon + '" alt="" />';
        } else {
            iconSpan.innerHTML = icons.documentSmall();
        }

        var name = document.createElement('span');
        name.className = 'node-name';
        name.textContent = child.name;

        var badge = document.createElement('span');
        badge.className = 'node-badge';
        if (child.isHtml) {
            badge.textContent = (child.htmlPages || []).length;
        } else {
            badge.textContent = (child.bookmarks || []).length;
        }

        nodeDiv.appendChild(iconSpan);
        nodeDiv.appendChild(name);
        nodeDiv.appendChild(badge);

        var self = this;
        nodeDiv.addEventListener('click', function(e) {
            if (e.target.closest('.toggle-icon')) return;
            if (self._onChildClick) self._onChildClick(child.id, parentId);
        });

        li.appendChild(nodeDiv);
        return li;
    },

    // 点击回调
    onSectionClick: function(callback) {
        this._onSectionClick = callback;
    },

    onChildClick: function(callback) {
        this._onChildClick = callback;
    },

    // ---------- 首页 ----------
    renderHome: function() {
        var totalSections = this._sections.length;
        var totalSubs = this._countSubSections();
        var totalBookmarks = this._countAllBookmarks();

        var statNumbers = document.querySelectorAll('#heroStats .num');
        if (statNumbers.length >= 3) {
            utils.animateNumber(statNumbers[0], totalSections);
            utils.animateNumber(statNumbers[1], totalSubs);
            utils.animateNumber(statNumbers[2], totalBookmarks);
        }

        this._renderContentGrid();
        this.renderSidebar();
        this._updateLayers();
        this._applySettingsToUI();
    },

    _countAllBookmarks: function() {
        var total = 0;
        this._sections.forEach(function(sec) {
            if (sec.children) {
                sec.children.forEach(function(c) {
                    if (c.isHtml) {
                        total += (c.htmlPages || []).length;
                    } else {
                        total += (c.bookmarks || []).length;
                    }
                });
            }
        });
        return total;
    },

    _countSubSections: function() {
        var total = 0;
        this._sections.forEach(function(sec) {
            if (sec.children) total += sec.children.length;
        });
        return total;
    },

    _renderContentGrid: function() {
        var container = document.getElementById('homeContentGrid');
        if (!container) return;
        container.innerHTML = '';

        var items = this._homeItems || [];
        if (items.length === 0) {
            if (this._isManageMode) {
                container.innerHTML =
                    '<div class="empty-state" style="padding:10px 0;"><div class="empty-icon">' +
                    icons.emptyFolder() +
                    '</div><div class="empty-text" style="font-size:0.7rem;">暂无内容，点击下方添加</div></div>';
            }
            return;
        }

        var self = this;
        items.forEach(function(item, index) {
            var wrapper = document.createElement('div');
            wrapper.className = 'grid-item';
            wrapper.dataset.id = item.id;
            wrapper.dataset.type = item.type;
            wrapper.dataset.index = index;

            if (self._isManageMode) {
                wrapper.draggable = true;
                wrapper.addEventListener('dragstart', self._onDragStart.bind(self));
                wrapper.addEventListener('dragend', self._onDragEnd.bind(self));
                wrapper.addEventListener('dragover', self._onDragOver.bind(self));
                wrapper.addEventListener('dragenter', self._onDragEnter.bind(self));
                wrapper.addEventListener('dragleave', self._onDragLeave.bind(self));
                wrapper.addEventListener('drop', self._onDrop.bind(self));
                var handle = document.createElement('span');
                handle.className = 'drag-handle';
                handle.innerHTML = icons.dragHandle();
                handle.title = '拖拽排序';
                wrapper.appendChild(handle);
            }

            if (item.type === 'announcement') {
                var posClass = item.position === 'top' ? 'top' : (item.position === 'bottom' ? 'bottom' : '');
                wrapper.innerHTML +=
                    '<div class="item-announcement ' + posClass + '">' +
                    '<span class="announce-icon">' + icons.announcement() + '</span>' +
                    '<span class="announce-text">' + utils.escapeHtml(item.content || '公告内容') + '</span>' +
                    '</div>';
                if (self._isManageMode) {
                    var annEl = wrapper.querySelector('.item-announcement');
                    if (annEl) {
                        annEl.style.cursor = 'pointer';
                        annEl.addEventListener('click', function(e) {
                            if (e.target.closest('.item-actions') || e.target.closest('.drag-handle')) return;
                            if (self._onEditHomeItem) self._onEditHomeItem(item.id);
                        });
                    }
                }
            } else if (item.type === 'divider') {
                var text = item.content || '';
                var textHtml = text ? '<span class="divider-text">' + utils.escapeHtml(text) + '</span>' :
                    '<span class="divider-text empty">━ 分割线 ━</span>';
                wrapper.innerHTML +=
                    '<div class="item-divider"><span class="line"></span>' + textHtml + '<span class="line"></span></div>';
                if (self._isManageMode) {
                    var divEl = wrapper.querySelector('.item-divider');
                    if (divEl) {
                        divEl.style.cursor = 'pointer';
                        divEl.addEventListener('click', function(e) {
                            if (e.target.closest('.item-actions') || e.target.closest('.drag-handle')) return;
                            if (self._onEditHomeItem) self._onEditHomeItem(item.id);
                        });
                    }
                }
            } else if (item.type === 'section_ref') {
                var section = self._findSectionById(item.section_id);
                if (!section) {
                    wrapper.innerHTML =
                        '<div style="color:var(--text-muted);font-size:0.7rem;">分区已删除</div>';
                } else {
                    var total = 0;
                    if (section.children) {
                        section.children.forEach(function(c) {
                            if (c.isHtml) {
                                total += (c.htmlPages || []).length;
                            } else {
                                total += (c.bookmarks || []).length;
                            }
                        });
                    }
                    var iconHtml = section.icon ? '<img src="' + section.icon + '" alt="" />' :
                        (section.isHtmlParent ? icons.document() :
                            (section.children && section.children.length > 0 ? icons.folder() : icons.document()));
                    var descText = section.isHtmlParent ? 'HTML 模式' : '共 ' + total + ' 个条目';
                    var subCount = section.isHtmlParent ? 'HTML 子分区' : (section.children ? section.children.length :
                        0) + ' 个子分区';
                    wrapper.innerHTML +=
                        '<div class="item-section" data-section-id="' + section.id + '">' +
                        '<div class="card-glow"></div>' +
                        '<div class="card-top">' +
                        '<div class="card-icon">' + iconHtml + '</div>' +
                        '<span class="card-count-badge">' + (section.isHtmlParent ? '📄' : (section.children ?
                            section.children.length : 0)) + ' 个子分区</span>' +
                        '</div>' +
                        '<div class="card-name">' + utils.escapeHtml(section.name) + '</div>' +
                        '<div class="card-desc">' + descText + '</div>' +
                        '<div class="card-footer">' +
                        '<span class="sub-count">' + subCount + '</span>' +
                        '<span class="arrow">' + icons.arrowRight() + '</span>' +
                        '</div>' +
                        '</div>';
                    var cardEl = wrapper.querySelector('.item-section');
                    if (cardEl) {
                        cardEl.addEventListener('click', function(e) {
                            if (e.target.closest('.item-actions') || e.target.closest('.drag-handle')) return;
                            if (self._onSectionCardClick) self._onSectionCardClick(section.id);
                        });
                    }
                }
            }

            if (self._isManageMode) {
                var actions = document.createElement('div');
                actions.className = 'item-actions';
                var editLabel = item.type === 'announcement' ? '编辑公告' : (item.type === 'divider' ?
                    '编辑分割线' : '编辑分区');
                actions.innerHTML =
                    '<button class="btn-icon" data-action="editItem" title="' + editLabel + '">' +
                    icons.edit() +
                    '</button>' +
                    '<button class="btn-icon danger" data-action="deleteItem" title="删除">' +
                    icons.delete() +
                    '</button>';
                wrapper.appendChild(actions);
                actions.querySelector('[data-action="editItem"]').addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (self._onEditHomeItem) self._onEditHomeItem(item.id);
                });
                actions.querySelector('[data-action="deleteItem"]').addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (self._onDeleteHomeItem) self._onDeleteHomeItem(item.id);
                });
            }
            container.appendChild(wrapper);
        });
    },

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

    _getParent: function(id) {
        for (var i = 0; i < this._sections.length; i++) {
            if (this._sections[i].id === id) return null;
            if (this._sections[i].children) {
                for (var j = 0; j < this._sections[i].children.length; j++) {
                    if (this._sections[i].children[j].id === id) return this._sections[i];
                }
            }
        }
        return null;
    },

    // 首页卡片点击回调
    onSectionCardClick: function(callback) {
        this._onSectionCardClick = callback;
    },

    onEditHomeItem: function(callback) {
        this._onEditHomeItem = callback;
    },

    onDeleteHomeItem: function(callback) {
        this._onDeleteHomeItem = callback;
    },

    // ---------- 拖拽 ----------
    _dragData: null,

    _onDragStart: function(e) {
        var el = e.target.closest('.grid-item');
        if (!el) return;
        if (e.target.closest('button') || e.target.closest('.item-actions')) {
            e.preventDefault();
            return;
        }
        this._dragData = { id: el.dataset.id, fromIndex: parseInt(el.dataset.index) };
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', el.dataset.id);
        e.dataTransfer.dropEffect = 'move';
    },

    _onDragEnd: function(e) {
        var el = e.target.closest('.grid-item');
        if (!el) return;
        el.classList.remove('dragging');
        el.style.opacity = '1';
        document.querySelectorAll('.grid-item.drag-over').forEach(function(el2) {
            el2.classList.remove('drag-over');
        });
        this._dragData = null;
    },

    _onDragOver: function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var target = e.target.closest('.grid-item');
        if (!target) return;
        if (this._dragData && this._dragData.id === target.dataset.id) return;
        target.classList.add('drag-over');
    },

    _onDragEnter: function(e) {
        e.preventDefault();
        var target = e.target.closest('.grid-item');
        if (!target) return;
        if (this._dragData && this._dragData.id === target.dataset.id) return;
        target.classList.add('drag-over');
    },

    _onDragLeave: function(e) {
        var target = e.target.closest('.grid-item');
        if (!target) return;
        var related = e.relatedTarget;
        if (related && related.closest && related.closest('.grid-item') === target) return;
        target.classList.remove('drag-over');
    },

    _onDrop: function(e) {
        e.preventDefault();
        var target = e.target.closest('.grid-item');
        if (!target) return;
        target.classList.remove('drag-over');
        if (!this._dragData) return;
        if (this._dragData.id === target.dataset.id) return;
        if (this._onReorderHomeItems) {
            this._onReorderHomeItems(this._dragData.id, target.dataset.id);
        }
        this._dragData = null;
    },

    onReorderHomeItems: function(callback) {
        this._onReorderHomeItems = callback;
    },

    // ---------- 分区详情 ----------
    renderSection: function(sectionId) {
        var section = this._findSectionById(sectionId);
        if (!section) {
            utils.showToast('分区不存在', 'error');
            if (this._onGoBack) this._onGoBack();
            return;
        }

        var iconHtml = section.icon ? '<img src="' + section.icon + '" alt="" />' :
            (section.isHtmlParent ? icons.document() : icons.folder());
        var detailIcon = document.getElementById('detailIcon');
        if (detailIcon) detailIcon.innerHTML = iconHtml;

        var detailName = document.getElementById('detailName');
        if (detailName) detailName.textContent = section.name + (section.isHtmlParent ? ' (HTML)' : '');

        var total = 0;
        if (section.children) {
            section.children.forEach(function(c) {
                if (c.isHtml) {
                    total += (c.htmlPages || []).length;
                } else {
                    total += (c.bookmarks || []).length;
                }
            });
        }
        var detailMeta = document.getElementById('detailMeta');
        if (detailMeta) {
            detailMeta.textContent = (section.children ? section.children.length : 0) +
                ' 个子分区 · 共 ' + total + ' 个条目';
        }

        var detailActions = document.getElementById('detailActions');
        if (detailActions) {
            detailActions.className = 'detail-actions' + (this._isManageMode ? ' visible' : '');
        }

        var list = document.getElementById('sectionSubList');
        if (!list) return;
        list.innerHTML = '';

        if (!section.children || section.children.length === 0) {
            list.innerHTML =
                '<div class="empty-state" style="padding:24px 20px;">' +
                '<div class="empty-icon">' + icons.emptyFolder() + '</div>' +
                '<div class="empty-text">暂无子分区</div>' +
                '</div>';
            return;
        }

        var self = this;
        section.children.forEach(function(child) {
            var item = document.createElement('div');
            item.className = 'sub-item';
            item.dataset.id = child.id;

            var iconHtml2 = child.icon ? '<img src="' + child.icon + '" alt="" />' :
                (child.isHtml ? icons.document() : icons.document());
            var descText = child.isHtml ? (child.htmlPages || []).length + ' 个 HTML 页面' :
                (child.bookmarks || []).length + ' 个网址';

            var actionsHtml = '';
            if (self._isManageMode) {
                actionsHtml =
                    '<div class="sub-actions visible">' +
                    '<button class="btn-icon" data-action="editSub">' + icons.edit() + '</button>' +
                    '<button class="btn-icon danger" data-action="deleteSub">' + icons.delete() + '</button>' +
                    '</div>';
            }

            item.innerHTML =
                '<div class="sub-icon">' + iconHtml2 + '</div>' +
                '<div class="sub-info">' +
                '<div class="sub-name">' + utils.escapeHtml(child.name) + '</div>' +
                '<div class="sub-desc">' + descText + '</div>' +
                '</div>' +
                '<div class="sub-right">' +
                '<span class="sub-count">' + descText + '</span>' +
                '<span class="arrow">' + icons.arrowRight() + '</span>' +
                actionsHtml +
                '</div>';

            item.addEventListener('click', function(e) {
                if (e.target.closest('button')) return;
                if (self._onSubClick) self._onSubClick(child.id, sectionId);
            });

            if (self._isManageMode) {
                var editBtn = item.querySelector('[data-action="editSub"]');
                if (editBtn) {
                    editBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (self._onEditSub) self._onEditSub(child.id, sectionId);
                    });
                }
                var delBtn = item.querySelector('[data-action="deleteSub"]');
                if (delBtn) {
                    delBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (self._onDeleteSub) self._onDeleteSub(child.id, sectionId);
                    });
                }
            }

            list.appendChild(item);
        });

        this.renderSidebar();
        document.querySelectorAll('.sidebar-tree .node').forEach(function(el) {
            el.classList.toggle('active', el.dataset.id === sectionId);
        });
    },

    onSubClick: function(callback) {
        this._onSubClick = callback;
    },

    onEditSub: function(callback) {
        this._onEditSub = callback;
    },

    onDeleteSub: function(callback) {
        this._onDeleteSub = callback;
    },

    // ---------- HTML 子分区 ----------
    renderSubSection: function(subId, sectionId) {
        var section = this._findSectionById(sectionId);
        if (!section) {
            if (this._onGoBack) this._onGoBack();
            return;
        }
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) {
            if (this._onGoBack) this._onGoBack();
            return;
        }

        var effectiveIsHtml = sub.isHtml || section.isHtmlParent;

        var iconHtml = sub.icon ? '<img src="' + sub.icon + '" alt="" />' : icons.document();
        var subDetailIcon = document.getElementById('subDetailIcon');
        if (subDetailIcon) subDetailIcon.innerHTML = iconHtml;

        var subDetailName = document.getElementById('subDetailName');
        if (subDetailName) subDetailName.textContent = sub.name + (section.isHtmlParent ? ' (HTML)' : '');

        var metaText = effectiveIsHtml ? (sub.htmlPages || []).length + ' 个 HTML 页面' :
            '共 ' + (sub.bookmarks || []).length + ' 个网址';
        var subDetailMeta = document.getElementById('subDetailMeta');
        if (subDetailMeta) subDetailMeta.textContent = metaText;

        var actions = document.getElementById('subDetailActions');
        if (actions) {
            actions.className = 'detail-actions' + (this._isManageMode ? ' visible' : '');
        }

        var addHtmlBtn = document.getElementById('subAddHtmlPage');
        if (addHtmlBtn) {
            addHtmlBtn.style.display = effectiveIsHtml ? 'flex' : 'none';
        }

        var contentContainer = document.getElementById('subSectionContent');
        if (!contentContainer) return;
        contentContainer.innerHTML = '';

        if (effectiveIsHtml) {
            var listContainer = document.createElement('div');
            listContainer.className = 'bm-list';
            var pages = sub.htmlPages || [];

            if (pages.length === 0) {
                listContainer.innerHTML =
                    '<div class="empty-state" style="padding:24px 20px;">' +
                    '<div class="empty-icon">' + icons.emptyDocument() + '</div>' +
                    '<div class="empty-text">暂无 HTML 页面</div>' +
                    (this._isManageMode ? '<div class="empty-sub">点击「添加 HTML 页面」创建</div>' : '') +
                    '</div>';
            } else {
                var self = this;
                pages.forEach(function(page, index) {
                    var item = document.createElement('div');
                    item.className = 'bm-item';
                    item.style.cursor = 'pointer';

                    var actionsHtml = '';
                    if (self._isManageMode) {
                        actionsHtml =
                            '<div class="bm-actions visible">' +
                            '<button class="btn-icon" data-action="editHtmlPage" title="编辑">' +
                            icons.edit() + '</button>' +
                            '<button class="btn-icon danger" data-action="deleteHtmlPage" title="删除">' +
                            icons.delete() + '</button>' +
                            '</div>';
                    }

                    item.innerHTML =
                        '<span class="bm-index">' + (index + 1) + '</span>' +
                        '<div class="bm-icon">' + icons.document() + '</div>' +
                        '<div class="bm-info">' +
                        '<div class="bm-name">' + utils.escapeHtml(page.name) + '</div>' +
                        '<div class="bm-url" style="font-size:0.6rem;">点击全屏查看</div>' +
                        '</div>' +
                        '<div class="bm-right">' + actionsHtml + '</div>';

                    item.addEventListener('click', function(e) {
                        if (e.target.closest('button')) return;
                        utils.openFullscreenHtml(page.content, page.name);
                    });

                    if (self._isManageMode) {
                        var editBtn = item.querySelector('[data-action="editHtmlPage"]');
                        if (editBtn) {
                            editBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                if (self._onEditHtmlPage) self._onEditHtmlPage(subId, sectionId, page.id);
                            });
                        }
                        var delBtn = item.querySelector('[data-action="deleteHtmlPage"]');
                        if (delBtn) {
                            delBtn.addEventListener('click', function(e) {
                                e.stopPropagation();
                                if (self._onDeleteHtmlPage) self._onDeleteHtmlPage(subId, sectionId, page.id);
                            });
                        }
                    }

                    listContainer.appendChild(item);
                });
            }
            contentContainer.appendChild(listContainer);
        } else {
            // 如果是普通书签模式，跳转到书签列表
            if (this._onSwitchToBookmarks) {
                this._onSwitchToBookmarks(subId, sectionId);
            }
        }

        this.renderSidebar();
        document.querySelectorAll('.sidebar-tree .node').forEach(function(el) {
            el.classList.toggle('active', el.dataset.id === subId);
        });
    },

    onEditHtmlPage: function(callback) {
        this._onEditHtmlPage = callback;
    },

    onDeleteHtmlPage: function(callback) {
        this._onDeleteHtmlPage = callback;
    },

    onSwitchToBookmarks: function(callback) {
        this._onSwitchToBookmarks = callback;
    },

    // ---------- 书签列表 ----------
    renderBookmarks: function(subId, sectionId) {
        var section = this._findSectionById(sectionId);
        if (!section) {
            if (this._onGoBack) this._onGoBack();
            return;
        }
        var sub = section.children.find(function(c) { return c.id === subId; });
        if (!sub) {
            if (this._onGoBack) this._onGoBack();
            return;
        }

        var iconHtml = sub.icon ? '<img src="' + sub.icon + '" alt="" />' : icons.document();
        var bmDetailIcon = document.getElementById('bmDetailIcon');
        if (bmDetailIcon) bmDetailIcon.innerHTML = iconHtml;

        var bmDetailName = document.getElementById('bmDetailName');
        if (bmDetailName) bmDetailName.textContent = sub.name;

        var bmDetailMeta = document.getElementById('bmDetailMeta');
        if (bmDetailMeta) {
            bmDetailMeta.textContent = '共 ' + (sub.bookmarks || []).length + ' 个网址';
        }

        var bmDetailActions = document.getElementById('bmDetailActions');
        if (bmDetailActions) {
            bmDetailActions.className = 'detail-actions' + (this._isManageMode ? ' visible' : '');
        }

        var list = document.getElementById('bookmarkList');
        if (!list) return;
        list.innerHTML = '';

        var bookmarks = sub.bookmarks || [];
        if (bookmarks.length === 0) {
            list.innerHTML =
                '<div class="empty-state" style="padding:24px 20px;">' +
                '<div class="empty-icon">' + icons.emptyStar() + '</div>' +
                '<div class="empty-text">暂无书签</div>' +
                '</div>';
            return;
        }

        var self = this;
        bookmarks.forEach(function(bm, index) {
            var item = document.createElement('div');
            item.className = 'bm-item';

            var starsHtml = '';
            for (var i = 1; i <= 5; i++) {
                if (i <= bm.stars) {
                    starsHtml += '<span class="filled">' + icons.starFilled() + '</span>';
                } else {
                    starsHtml += '<span>' + icons.starEmpty() + '</span>';
                }
            }

            var vpnText = bm.requiresVpn ? '需VPN' : '无需VPN';
            var vpnClass = bm.requiresVpn ? 'yes' : 'no';
            var iconHtml2 = bm.icon ? '<img src="' + bm.icon + '" alt="" />' : icons.starEmpty();

            var actionsHtml = '';
            if (self._isManageMode) {
                actionsHtml =
                    '<div class="bm-actions visible">' +
                    '<button class="btn-icon" data-action="moveUp" ' +
                    (index === 0 ? 'disabled style="opacity:0.2"' : '') + '>' +
                    icons.arrowUp() + '</button>' +
                    '<button class="btn-icon" data-action="moveDown" ' +
                    (index === bookmarks.length - 1 ? 'disabled style="opacity:0.2"' : '') + '>' +
                    icons.arrowDown() + '</button>' +
                    '<button class="btn-icon" data-action="editBookmark">' + icons.edit() + '</button>' +
                    '<button class="btn-icon danger" data-action="deleteBookmark">' + icons.delete() +
                    '</button>' +
                    '</div>';
            }

            item.innerHTML =
                '<span class="bm-index">' + (index + 1) + '</span>' +
                '<div class="bm-icon">' + iconHtml2 + '</div>' +
                '<div class="bm-info">' +
                '<a href="' + utils.escapeHtml(bm.url) + '" target="_blank" class="bm-name">' +
                utils.escapeHtml(bm.name) + ' ↗</a>' +
                '<span class="bm-url">' + utils.escapeHtml(bm.url) + '</span>' +
                (bm.description ? '<div class="bm-desc">' + utils.escapeHtml(bm.description) + '</div>' : '') +
                '</div>' +
                '<div class="bm-right">' +
                '<div class="stars">' + starsHtml + '</div>' +
                '<span class="vpn-badge ' + vpnClass + '">' + vpnText + '</span>' +
                actionsHtml +
                '</div>';

            item.addEventListener('click', function(e) {
                if (e.target.closest('a') || e.target.closest('button')) return;
                window.open(bm.url, '_blank');
            });

            if (self._isManageMode) {
                var upBtn = item.querySelector('[data-action="moveUp"]');
                if (upBtn) {
                    upBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (index > 0 && self._onMoveBookmark) {
                            self._onMoveBookmark(subId, index, 'up');
                        }
                    });
                }
                var downBtn = item.querySelector('[data-action="moveDown"]');
                if (downBtn) {
                    downBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (index < bookmarks.length - 1 && self._onMoveBookmark) {
                            self._onMoveBookmark(subId, index, 'down');
                        }
                    });
                }
                var editBtn = item.querySelector('[data-action="editBookmark"]');
                if (editBtn) {
                    editBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (self._onEditBookmark) self._onEditBookmark(bm.id, subId);
                    });
                }
                var delBtn = item.querySelector('[data-action="deleteBookmark"]');
                if (delBtn) {
                    delBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        if (self._onDeleteBookmark) self._onDeleteBookmark(bm.id, subId);
                    });
                }
            }

            list.appendChild(item);
        });

        this.renderSidebar();
        document.querySelectorAll('.sidebar-tree .node').forEach(function(el) {
            el.classList.toggle('active', el.dataset.id === subId);
        });
    },

    onMoveBookmark: function(callback) {
        this._onMoveBookmark = callback;
    },

    onEditBookmark: function(callback) {
        this._onEditBookmark = callback;
    },

    onDeleteBookmark: function(callback) {
        this._onDeleteBookmark = callback;
    },

    // ---------- 页面层 ----------
    _updateLayers: function() {
        var layers = {
            home: document.getElementById('layerHome'),
            section: document.getElementById('layerSection'),
            subsection: document.getElementById('layerSubSection'),
            bookmarks: document.getElementById('layerBookmarks')
        };

        Object.keys(layers).forEach(function(key) {
            var el = layers[key];
            if (!el) return;
            el.classList.add('hidden');
            el.classList.remove('bg-mode');
        });

        var self = this;
        this._pageStack.forEach(function(page, index) {
            var el = layers[page];
            if (!el) return;
            el.classList.remove('hidden');
            el.classList.remove('bg-mode');
            el.className = 'page-layer';
            el.classList.add('depth-' + index);
            if (index < self._pageStack.length - 1) el.classList.add('bg-mode');
        });

        var topPage = this._pageStack[this._pageStack.length - 1];
        if (topPage) {
            var topEl = layers[topPage];
            if (topEl) topEl.classList.remove('bg-mode');
        }
    },

    // 切换到指定页面
    navigateTo: function(page, sectionId, subId) {
        if (page === 'home') {
            this._pageStack = ['home'];
            this._currentSectionId = null;
            this._currentSubId = null;
        } else if (page === 'section' && sectionId) {
            this._pageStack = ['home', 'section'];
            this._currentSectionId = sectionId;
            this._currentSubId = null;
        } else if (page === 'subsection' && sectionId && subId) {
            this._pageStack = ['home', 'section', 'subsection'];
            this._currentSectionId = sectionId;
            this._currentSubId = subId;
        } else if (page === 'bookmarks' && sectionId && subId) {
            this._pageStack = ['home', 'section', 'bookmarks'];
            this._currentSectionId = sectionId;
            this._currentSubId = subId;
        }

        this._updateLayers();
        this._renderCurrentPage();

        if (this._onNavigate) this._onNavigate(page, sectionId, subId);
    },

    goBack: function() {
        if (this._pageStack.length <= 1) return;
        this._pageStack.pop();
        var current = this._pageStack[this._pageStack.length - 1];
        if (current === 'home') {
            this._currentSectionId = null;
            this._currentSubId = null;
        } else if (current === 'section') {
            this._currentSubId = null;
        }
        this._updateLayers();
        this._renderCurrentPage();

        if (this._onGoBack) this._onGoBack();
    },

    onGoBack: function(callback) {
        this._onGoBack = callback;
    },

    onNavigate: function(callback) {
        this._onNavigate = callback;
    },

    _renderCurrentPage: function() {
        var current = this._pageStack[this._pageStack.length - 1];
        if (current === 'home') {
            this.renderHome();
        } else if (current === 'section') {
            if (this._currentSectionId) this.renderSection(this._currentSectionId);
        } else if (current === 'subsection') {
            if (this._currentSubId && this._currentSectionId) {
                this.renderSubSection(this._currentSubId, this._currentSectionId);
            }
        } else if (current === 'bookmarks') {
            if (this._currentSubId && this._currentSectionId) {
                this.renderBookmarks(this._currentSubId, this._currentSectionId);
            }
        }
        this._updateManageModeUI();
    },

    // ---------- 管理模式 UI ----------
    _updateManageModeUI: function() {
        var indicator = document.getElementById('modeIndicator');
        if (indicator) {
            indicator.textContent = this._isManageMode ? '⚙️ 管理' : '👁️ 浏览';
        }
        var toggle = document.getElementById('modeToggle');
        if (toggle) {
            toggle.classList.toggle('active', this._isManageMode);
        }
        var toolbar = document.getElementById('manageToolbar');
        if (toolbar) {
            toolbar.classList.toggle('visible', this._isManageMode);
        }
        var addBtn = document.getElementById('btnAddSection');
        if (addBtn) {
            addBtn.classList.toggle('visible', this._isManageMode);
        }
    },

    setManageMode: function(enabled) {
        this._isManageMode = enabled;
        this._updateManageModeUI();
        this._renderCurrentPage();
    },

    toggleManageMode: function() {
        this.setManageMode(!this._isManageMode);
    },

    getManageMode: function() {
        return this._isManageMode;
    },

    // ---------- 设置应用到 UI ----------
    _applySettingsToUI: function() {
        var settings = this._settings || {};
        if (settings.site) {
            var nameEl = document.getElementById('brandName');
            if (nameEl) nameEl.textContent = settings.site.name || '必看网';
            var versionEl = document.getElementById('brandVersion');
            if (versionEl) versionEl.textContent = settings.site.version || 'v3.0';
        }
        if (settings.hero) {
            var badgeEl = document.getElementById('heroBadge');
            if (badgeEl) badgeEl.textContent = settings.hero.badge || '✦ 精选优质网站';

            var title = settings.hero.title || '发现好网站';
            var highlight = settings.hero.highlight || '好网站';
            var titleHtml;
            if (title.includes(highlight)) {
                var parts = title.split(highlight);
                titleHtml = parts[0] + '<span class="highlight" id="heroHighlight">' + highlight + '</span>' +
                    parts.slice(1).join(highlight);
            } else {
                titleHtml = title;
            }
            var titleEl = document.getElementById('heroTitle');
            if (titleEl) titleEl.innerHTML = titleHtml;

            var subEl = document.getElementById('heroSub');
            if (subEl) subEl.textContent = settings.hero.subtitle || '从必看网开始';
        }
        if (settings.theme) {
            var root = document.documentElement;
            if (settings.theme.primaryColor) {
                root.style.setProperty('--color-primary', settings.theme.primaryColor);
            }
        }
    },

    // ---------- 刷新 ----------
    refresh: function(sections, homeItems, settings) {
        if (sections) this._sections = sections;
        if (homeItems) this._homeItems = homeItems;
        if (settings) this._settings = settings;
        this._renderCurrentPage();
        this.renderSidebar();
    }
};
