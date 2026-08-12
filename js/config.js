// ============================================================
// js/config.js
// 必看 - Supabase 配置与通用工具函数
// ============================================================

// ---------- Supabase 配置 ----------
const SUPABASE_URL = 'https://bazpyoiklkoajdhfkwly.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lTx_tYITroL8_jVVR4EjAA_Eg61lBFT';

// ---------- 初始化 Supabase 客户端 ----------
let supabaseClient = null;
let sdkReady = false;

try {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        sdkReady = true;
        console.log('[必看] Supabase SDK 加载成功');
    } else {
        throw new Error('Supabase SDK 未加载，请检查网络或刷新页面');
    }
} catch (e) {
    console.error('[必看] Supabase 初始化失败:', e.message);
    // 显示调试信息（如果有 debugInfo 元素）
    const debugInfo = document.getElementById('debugInfo');
    if (debugInfo) {
        debugInfo.style.display = 'block';
        debugInfo.innerHTML = '<strong>⚠️ 错误：</strong> ' + e.message;
    }
}

// ---------- 常量定义 ----------
const CURRENT_USER_ID = null; // 登录后由全局状态设置
let currentUser = null;       // 当前登录用户信息（profiles 表）

// 分区路由常量
const ROUTES = {
    EXPLORE: 'explore',
    FORUM: 'forum',
    SOCIAL: 'social',
    PROFILE: 'profile',
    ABOUT: 'about',
    ADMIN: 'admin'   // 管理员专用
};

// 探索/发现 二级分区
const EXPLORE_TABS = {
    SQUARE: 'square',       // 广场
    HOT: 'hot',            // 热门
    RECOMMENDED: 'recommended', // 推荐
    SEARCH: 'search'       // 搜索
};

// 文件类型分类
const FILE_TYPES = {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    FILE: 'file',
    TEXT: 'text'
};

// ---------- 工具函数 ----------

/**
 * 获取当前登录用户（从 session）
 */
async function getCurrentUser() {
    if (!sdkReady) return null;
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) return null;
    return session.user;
}

/**
 * 获取当前用户资料（profiles 表）
 */
async function getCurrentProfile() {
    if (!sdkReady) return null;
    const user = await getCurrentUser();
    if (!user) return null;
    const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (error) {
        console.error('获取用户资料失败:', error);
        return null;
    }
    currentUser = data;
    return data;
}

/**
 * 检查是否管理员
 */
async function checkIsAdmin() {
    if (!currentUser) return false;
    return currentUser.is_admin === true;
}

/**
 * 时间格式化：相对时间（如 3分钟前）
 */
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return '刚刚';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + '分钟前';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + '小时前';
    const days = Math.floor(hours / 24);
    if (days < 30) return days + '天前';
    const months = Math.floor(days / 30);
    if (months < 12) return months + '个月前';
    const years = Math.floor(months / 12);
    return years + '年前';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 判断文件类型
 */
function getFileType(mimeType) {
    if (!mimeType) return FILE_TYPES.FILE;
    if (mimeType.startsWith('image/')) return FILE_TYPES.IMAGE;
    if (mimeType.startsWith('video/')) return FILE_TYPES.VIDEO;
    if (mimeType.startsWith('audio/')) return FILE_TYPES.AUDIO;
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('xml')) return FILE_TYPES.TEXT;
    return FILE_TYPES.FILE;
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 转义 HTML（防止 XSS）
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 简单校验邮箱格式
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * 生成随机 UUID（备用，一般由数据库生成）
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 从 URL 中提取文件扩展名
 */
function getFileExtension(filename) {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * 上传文件到 Supabase Storage
 * @param {File} file - 浏览器文件对象
 * @param {string} bucket - 存储桶名称
 * @param {string} folder - 文件夹路径
 */
async function uploadFile(file, bucket, folder = 'uploads') {
    if (!sdkReady) throw new Error('SDK 未就绪');
    const ext = getFileExtension(file.name);
    const fileName = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + (ext ? '.' + ext : '');
    const filePath = folder + '/' + fileName;
    
    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });
    
    if (error) throw error;
    
    // 获取公开 URL
    const { data: publicUrlData } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath);
    
    return {
        path: filePath,
        url: publicUrlData.publicUrl,
        name: file.name,
        size: file.size,
        mimeType: file.type,
        type: getFileType(file.type)
    };
}

/**
 * 批量上传文件
 */
async function uploadFiles(files, bucket, folder = 'uploads') {
    const uploadPromises = Array.from(files).map(file => uploadFile(file, bucket, folder));
    return Promise.all(uploadPromises);
}

// 导出全局对象（供其他文件使用）
window.BikanConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    sdkReady,
    supabaseClient,
    ROUTES,
    EXPLORE_TABS,
    FILE_TYPES,
    getCurrentUser,
    getCurrentProfile,
    checkIsAdmin,
    timeAgo,
    formatFileSize,
    getFileType,
    debounce,
    escapeHtml,
    isValidEmail,
    generateUUID,
    getFileExtension,
    uploadFile,
    uploadFiles
};

console.log('[必看] config.js 加载完成');
