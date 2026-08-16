// ============================================================
// js/editor.js
// 必看 · 剪辑 - 编辑页面逻辑
// ============================================================

(function() {

    // ---------- DOM 引用 ----------
    const projectTitleEl = document.getElementById('projectTitle');
    const videoPreviewEl = document.getElementById('videoPreview');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsCloseBtn = document.getElementById('settingsCloseBtn');
    const settingsContent = document.getElementById('settingsContent');
    const confirmOverlay = document.getElementById('confirmOverlay');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    let currentProject = null;
    let confirmCallback = null; // 用于导出确认回调

    // ============================================================
    // 1. 加载项目
    // ============================================================
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    async function loadProject() {
        if (!projectId) {
            projectTitleEl.textContent = '无项目 ID';
            return;
        }
        try {
            const project = await dbGet('projects', projectId);
            if (project) {
                currentProject = project;
                projectTitleEl.textContent = project.name;
                // 根据背景设置预览区背景
                if (project.bg === 'black') {
                    videoPreviewEl.style.background = '#000';
                } else if (project.bg === 'white') {
                    videoPreviewEl.style.background = '#fff';
                } else {
                    videoPreviewEl.style.background = '#0d130d';
                }
                // 更新设置界面中的值（如果有）
                updateSettingsUI();
            } else {
                projectTitleEl.textContent = '项目不存在';
            }
        } catch (err) {
            console.error('加载项目失败:', err);
            projectTitleEl.textContent = '加载失败';
        }
    }

    // ============================================================
    // 2. 设置界面
    // ============================================================
    const sections = {
        shortcuts: {
            label: '快捷键',
            icon: '⌨️', // 实际用 SVG
            render: function() {
                return `
                    <div class="settings-section">
                        <h3>快捷键</h3>
                        <div class="shortcut-grid">
                            <div class="shortcut-item">
                                <kbd>Space</kbd>
                                <span>播放/暂停</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>I</kbd>
                                <span>标记入点</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>O</kbd>
                                <span>标记出点</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>←</kbd> / <kbd>→</kbd>
                                <span>逐帧后退/前进</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl+S</kbd>
                                <span>保存项目</span>
                            </div>
                            <div class="shortcut-item">
                                <kbd>Ctrl+E</kbd>
                                <span>导出视频</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        },
        video: {
            label: '视频设置',
            icon: '🎬',
            render: function() {
                if (!currentProject) return '<p>加载中...</p>';
                return `
                    <div class="settings-section">
                        <h3>视频设置</h3>
                        <div class="form-group">
                            <label>分辨率</label>
                            <select id="settingsResolution">
                                <option value="480" ${currentProject.resolution === 480 ? 'selected' : ''}>480p</option>
                                <option value="720" ${currentProject.resolution === 720 ? 'selected' : ''}>720p</option>
                                <option value="1080" ${currentProject.resolution === 1080 ? 'selected' : ''}>1080p</option>
                                <option value="2160" ${currentProject.resolution === 2160 ? 'selected' : ''}>4K</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>帧数 (fps)</label>
                            <select id="settingsFps">
                                <option value="24" ${currentProject.fps === 24 ? 'selected' : ''}>24</option>
                                <option value="30" ${currentProject.fps === 30 ? 'selected' : ''}>30</option>
                                <option value="60" ${currentProject.fps === 60 ? 'selected' : ''}>60</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>背景</label>
                            <select id="settingsBg">
                                <option value="black" ${currentProject.bg === 'black' ? 'selected' : ''}>纯黑</option>
                                <option value="white" ${currentProject.bg === 'white' ? 'selected' : ''}>纯白</option>
                                <option value="transparent" ${currentProject.bg === 'transparent' ? 'selected' : ''}>透明</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>比例</label>
                            <select id="settingsRatio">
                                <option value="16:9" ${currentProject.ratio === '16:9' ? 'selected' : ''}>16:9</option>
                                <option value="9:16" ${currentProject.ratio === '9:16' ? 'selected' : ''}>9:16</option>
                                <option value="1:1" ${currentProject.ratio === '1:1' ? 'selected' : ''}>1:1</option>
                                <option value="4:3" ${currentProject.ratio === '4:3' ? 'selected' : ''}>4:3</option>
                                <option value="21:9" ${currentProject.ratio === '21:9' ? 'selected' : ''}>21:9</option>
                                <option value="custom" ${currentProject.ratio === 'custom' ? 'selected' : ''}>自定义</option>
                            </select>
                        </div>
                        <div class="form-group" id="settingsCustomRatioGroup" style="${currentProject.ratio === 'custom' ? 'display:block' : 'display:none'}">
                            <label>自定义比例 (宽:高)</label>
                            <input type="text" id="settingsCustomRatio" value="${currentProject.ratio === 'custom' ? currentProject.ratioValue || '' : ''}" placeholder="例如 16:9" />
                        </div>

                        <hr />

                        <h4>封面设置</h4>
                        <div class="form-group">
                            <label>封面图片</label>
                            <div class="cover-upload-area" id="coverUploadArea">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                                    <circle cx="8.5" cy="8.5" r="1.5"/>
                                    <polyline points="21 15 16 10 5 21"/>
                                </svg>
                                <span>点击上传或拖拽图片</span>
                            </div>
                            <input type="file" id="coverFileInput" accept="image/*" style="display:none;" />
                            <div id="coverPreview" style="margin-top:8px; display:none;">
                                <img id="coverPreviewImg" src="" alt="封面预览" style="max-width:200px; max-height:120px; border-radius:6px; border:1px solid #1d3a1d;" />
                                <button class="btn btn-danger btn-sm" id="removeCoverBtn" style="margin-top:4px;">移除封面</button>
                            </div>
                        </div>
                        <button class="btn btn-primary" id="saveVideoSettingsBtn">保存设置</button>
                    </div>
                `;
            }
        },
        'save-exit': {
            label: '保存并退出',
            icon: '💾',
            render: function() {
                return `
                    <div class="settings-section">
                        <h3>保存并退出</h3>
                        <p style="color:#6a8a6a; margin-bottom:16px;">保存当前项目进度并返回首页。</p>
                        <button class="btn btn-primary" id="saveAndExitBtn">💾 保存并退出</button>
                        <button class="btn btn-outline" id="exitWithoutSaveBtn" style="margin-left:12px;">不保存直接退出</button>
                    </div>
                `;
            }
        },
        export: {
            label: '导出',
            icon: '📤',
            render: function() {
                return `
                    <div class="settings-section">
                        <h3>导出视频</h3>
                        <p style="color:#6a8a6a; margin-bottom:16px;">将当前编辑的视频导出为 MP4 文件。</p>
                        <div class="form-group">
                            <label>导出分辨率</label>
                            <select id="exportResolution">
                                <option value="480">480p</option>
                                <option value="720" selected>720p</option>
                                <option value="1080">1080p</option>
                                <option value="2160">4K</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>帧数</label>
                            <select id="exportFps">
                                <option value="24">24</option>
                                <option value="30" selected>30</option>
                                <option value="60">60</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" id="exportBtn">导出视频</button>
                    </div>
                `;
            }
        }
    };

    // 渲染设置内容
    function renderSettingsSection(sectionKey) {
        const section = sections[sectionKey];
        if (!section) return;
        settingsContent.innerHTML = section.render();
        // 重新绑定事件
        bindSettingsEvents(sectionKey);
    }

    // 绑定设置界面中的事件
    function bindSettingsEvents(sectionKey) {
        if (sectionKey === 'video') {
            // 比例切换
            const ratioSelect = document.getElementById('settingsRatio');
            const customGroup = document.getElementById('settingsCustomRatioGroup');
            if (ratioSelect) {
                ratioSelect.addEventListener('change', function() {
                    customGroup.style.display = this.value === 'custom' ? 'block' : 'none';
                });
            }
            // 封面上传
            const coverArea = document.getElementById('coverUploadArea');
            const coverInput = document.getElementById('coverFileInput');
            const coverPreview = document.getElementById('coverPreview');
            const coverPreviewImg = document.getElementById('coverPreviewImg');
            const removeCoverBtn = document.getElementById('removeCoverBtn');

            if (coverArea) {
                coverArea.addEventListener('click', function() {
                    coverInput.click();
                });
                // 拖拽支持（简化）
                coverArea.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#2ecc71';
                });
                coverArea.addEventListener('dragleave', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#1d3a1d';
                });
                coverArea.addEventListener('drop', function(e) {
                    e.preventDefault();
                    this.style.borderColor = '#1d3a1d';
                    const files = e.dataTransfer.files;
                    if (files.length > 0 && files[0].type.startsWith('image/')) {
                        handleCoverFile(files[0]);
                    } else {
                        showToast('请上传图片文件', 'error');
                    }
                });
            }
            if (coverInput) {
                coverInput.addEventListener('change', function() {
                    if (this.files.length > 0) {
                        handleCoverFile(this.files[0]);
                    }
                });
            }
            if (removeCoverBtn) {
                removeCoverBtn.addEventListener('click', function() {
                    currentProject.thumbnail = null;
                    coverPreview.style.display = 'none';
                    coverPreviewImg.src = '';
                    showToast('封面已移除', 'success');
                });
            }

            // 保存视频设置
            const saveBtn = document.getElementById('saveVideoSettingsBtn');
            if (saveBtn) {
                saveBtn.addEventListener('click', function() {
                    saveVideoSettings();
                });
            }
        }

        if (sectionKey === 'save-exit') {
            document.getElementById('saveAndExitBtn')?.addEventListener('click', function() {
                saveAndExit();
            });
            document.getElementById('exitWithoutSaveBtn')?.addEventListener('click', function() {
                exitWithoutSave();
            });
        }

        if (sectionKey === 'export') {
            document.getElementById('exportBtn')?.addEventListener('click', function() {
                showConfirmDialog('确认导出', '确定要导出当前视频吗？', function() {
                    performExport();
                });
            });
        }
    }

    // 处理封面文件
    function handleCoverFile(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            currentProject.thumbnail = dataUrl;
            const coverPreview = document.getElementById('coverPreview');
            const coverPreviewImg = document.getElementById('coverPreviewImg');
            coverPreview.style.display = 'block';
            coverPreviewImg.src = dataUrl;
            showToast('封面已更新', 'success');
        };
        reader.readAsDataURL(file);
    }

    // 保存视频设置
    async function saveVideoSettings() {
        if (!currentProject) return;
        const resolution = parseInt(document.getElementById('settingsResolution').value, 10);
        const fps = parseInt(document.getElementById('settingsFps').value, 10);
        const bg = document.getElementById('settingsBg').value;
        let ratio = document.getElementById('settingsRatio').value;
        let ratioValue = null;
        if (ratio === 'custom') {
            ratioValue = document.getElementById('settingsCustomRatio').value.trim();
            if (!ratioValue || !ratioValue.match(/^\d+:\d+$/)) {
                showToast('请输入正确的比例格式，例如 16:9', 'error');
                return;
            }
        }

        currentProject.resolution = resolution;
        currentProject.fps = fps;
        currentProject.bg = bg;
        currentProject.ratio = ratio;
        if (ratio === 'custom') {
            currentProject.ratioValue = ratioValue;
        } else {
            delete currentProject.ratioValue;
        }
        currentProject.updatedAt = Date.now();

        try {
            await dbPut('projects', currentProject);
            showToast('设置已保存', 'success');
            // 更新预览区背景
            if (bg === 'black') videoPreviewEl.style.background = '#000';
            else if (bg === 'white') videoPreviewEl.style.background = '#fff';
            else videoPreviewEl.style.background = '#0d130d';
            // 重新渲染当前设置页面，更新显示
            renderSettingsSection('video');
        } catch (err) {
            console.error('保存设置失败:', err);
            showToast('保存失败，请重试', 'error');
        }
    }

    // 保存并退出
    async function saveAndExit() {
        if (currentProject) {
            currentProject.updatedAt = Date.now();
            try {
                await dbPut('projects', currentProject);
                showToast('项目已保存', 'success');
            } catch (err) {
                console.error('保存失败:', err);
                showToast('保存失败，请重试', 'error');
                return;
            }
        }
        window.location.href = 'index.html';
    }

    function exitWithoutSave() {
        if (confirm('确定不保存直接退出吗？')) {
            window.location.href = 'index.html';
        }
    }

    // ============================================================
    // 3. 自定义确认弹窗（用于导出）
    // ============================================================
    function showConfirmDialog(title, message, callback) {
        confirmTitle.textContent = title || '确认';
        confirmMessage.textContent = message || '确定要继续吗？';
        confirmCallback = callback || null;
        confirmOverlay.style.display = 'flex';
    }

    function hideConfirmDialog() {
        confirmOverlay.style.display = 'none';
        confirmCallback = null;
    }

    confirmOkBtn.addEventListener('click', function() {
        if (typeof confirmCallback === 'function') {
            confirmCallback();
        }
        hideConfirmDialog();
    });

    confirmCancelBtn.addEventListener('click', hideConfirmDialog);
    confirmOverlay.addEventListener('click', function(e) {
        if (e.target === this) hideConfirmDialog();
    });

    // 导出功能（暂为模拟）
    function performExport() {
        showToast('正在导出视频... (模拟)', 'info');
        setTimeout(() => {
            showToast('导出完成！', 'success');
        }, 2000);
    }

    // ============================================================
    // 4. 设置界面开关
    // ============================================================
    function openSettings() {
        settingsOverlay.style.display = 'flex';
        // 默认选中第一个
        const firstNav = document.querySelector('.settings-nav-item');
        if (firstNav) {
            setActiveNav(firstNav.dataset.section);
        }
        // 设置 body 滚动禁止（可选）
        document.body.style.overflow = 'hidden';
    }

    function closeSettings() {
        settingsOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function setActiveNav(sectionKey) {
        document.querySelectorAll('.settings-nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.section === sectionKey);
        });
        renderSettingsSection(sectionKey);
    }

    // 侧边栏导航事件
    document.querySelectorAll('.settings-nav-item').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveNav(this.dataset.section);
        });
    });

    // 设置按钮事件
    settingsBtn.addEventListener('click', openSettings);
    settingsCloseBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', function(e) {
        if (e.target === this) closeSettings();
    });

    // ============================================================
    // 5. Toast 提示（自定义，与首页风格一致）
    // ============================================================
    let toastTimer = null;

    function showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();
        if (toastTimer) clearTimeout(toastTimer);

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        if (type === 'error') toast.style.borderColor = '#662222';
        else if (type === 'success') toast.style.borderColor = '#1d6b4c';
        else toast.style.borderColor = '#1d3a1d';

        document.body.appendChild(toast);

        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            setTimeout(() => toast.remove(), 400);
            toastTimer = null;
        }, 3000);
    }

    // ============================================================
    // 6. 工具函数（storage.js 中必须有 dbPut）
    // ============================================================
    // 注意：storage.js 需要包含 dbPut 函数，用于更新项目
    // 如果还没有，请在 storage.js 中添加：
    /*
    function dbPut(storeName, data) {
        return openDB().then(db => {
            return new Promise((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.put(data);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
                tx.oncomplete = () => db.close();
            });
        });
    }
    */

    // ============================================================
    // 7. 启动
    // ============================================================
    document.addEventListener('DOMContentLoaded', loadProject);

})();
