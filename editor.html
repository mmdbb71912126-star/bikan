<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>必看 · 剪辑 · 编辑</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #0a0f0a;
            color: #e2e8e0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        /* 顶部导航（极简，只放返回按钮和项目名） */
        .editor-header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 8px 20px;
            background: #111811;
            border-bottom: 1px solid #1a2a1a;
            flex-shrink: 0;
            min-height: 50px;
        }

        .editor-header .back-btn {
            background: none;
            border: none;
            color: #5a7a5a;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-family: inherit;
        }
        .editor-header .back-btn:hover {
            color: #e2e8e0;
            background: #1a2a1a;
        }

        .editor-header .back-btn svg {
            width: 20px;
            height: 20px;
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .editor-header .project-title {
            font-size: 16px;
            font-weight: 500;
            color: #b0c8b0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        /* 视频预览区域 - 占上半部分 1/4 高度 */
        .video-preview-area {
            flex: 0 0 25vh;         /* 固定 25vh 高度 */
            width: 100%;
            background: #0d130d;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 1px solid #1a2a1a;
            position: relative;
            overflow: hidden;
        }

        .video-preview-area video,
        .video-preview-area img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            background: repeating-conic-gradient(#2a3a2a 0% 25%, #1a2a1a 0% 50%) 0 0 / 20px 20px;
        }

        .video-preview-area .placeholder {
            color: #3a5a3a;
            font-size: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        .video-preview-area .placeholder svg {
            width: 64px;
            height: 64px;
            fill: #2a4a2a;
        }

        /* 下方区域（占剩余空间） - 暂时空白，只留一个提示 */
        .editor-workspace {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3a5a3a;
            font-size: 16px;
            background: #0a0f0a;
        }

        /* 响应式 */
        @media (max-width: 640px) {
            .video-preview-area {
                flex: 0 0 30vh;
            }
            .editor-header .project-title {
                font-size: 14px;
                max-width: 140px;
            }
        }
    </style>
</head>
<body>

    <!-- 顶部栏 -->
    <header class="editor-header">
        <button class="back-btn" id="backBtn">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
            返回
        </button>
        <span class="project-title" id="projectTitle">加载中...</span>
    </header>

    <!-- 视频预览区域（占 1/4 高度） -->
    <div class="video-preview-area" id="videoPreview">
        <div class="placeholder">
            <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
            <span>暂未导入视频</span>
        </div>
    </div>

    <!-- 工作区（下半部分，占剩余高度） -->
    <div class="editor-workspace">
        编辑功能开发中...
    </div>

    <script>
        // ============================================================
        // 1. 获取项目 ID 并加载项目数据
        // ============================================================
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('id');

        const projectTitleEl = document.getElementById('projectTitle');
        const videoPreviewEl = document.getElementById('videoPreview');

        const DB_NAME = 'VideoEditorDB';
        const DB_VERSION = 2;

        function openDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }

        function dbGet(storeName, id) {
            return openDB().then(db => {
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(storeName, 'readonly');
                    const store = tx.objectStore(storeName);
                    const req = store.get(id);
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                    tx.oncomplete = () => db.close();
                });
            });
        }

        async function loadProject() {
            if (!projectId) {
                projectTitleEl.textContent = '无项目 ID';
                return;
            }
            try {
                const project = await dbGet('projects', projectId);
                if (project) {
                    projectTitleEl.textContent = project.name;
                    // 可以在这里根据 project 参数调整预览区域背景等
                    // 例如背景色：
                    if (project.bg === 'black') {
                        videoPreviewEl.style.background = '#000';
                    } else if (project.bg === 'white') {
                        videoPreviewEl.style.background = '#fff';
                    } else {
                        videoPreviewEl.style.background = '#0d130d'; // 透明时显示灰白格子 (在CSS中已定义)
                    }
                } else {
                    projectTitleEl.textContent = '项目不存在';
                }
            } catch (err) {
                console.error('加载项目失败:', err);
                projectTitleEl.textContent = '加载失败';
            }
        }

        // ============================================================
        // 2. 返回首页
        // ============================================================
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        // ============================================================
        // 3. 启动
        // ============================================================
        document.addEventListener('DOMContentLoaded', loadProject);
    </script>

</body>
</html>
