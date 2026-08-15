// ============================================================
// js/config.js
// 必看 - 配置与全局工具函数
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
        console.log('[config] Supabase SDK 加载成功');
    } else {
        throw new Error('Supabase SDK 未加载');
    }
} catch (e) {
    console.error('[config] Supabase 初始化失败:', e.message);
}

// ---------- 路由常量 ----------
const ROUTES = {
    EXPLORE: 'explore',
    FORUM: 'forum',
    SOCIAL: 'social',
    PROFILE: 'profile',
    ABOUT: 'about',
    ADMIN: 'admin',
};

const EXPLORE_TABS = {
    SQUARE: 'square',
    HOT: 'hot',
    RECOMMENDED: 'recommended',
    SEARCH: 'search',
};

const FILE_TYPES = {
    IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    VIDEO: ['video/mp4', 'video/webm', 'video/ogg'],
    AUDIO: ['audio/mpeg', 'audio/ogg', 'audio/wav'],
};

// ---------- 文件上传函数 ----------
async function uploadFile(file, bucket = 'files', path = '') {
    if (!supabaseClient) throw new Error('Supabase 未初始化');
    if (!file) throw new Error('请选择文件');

    // 生成唯一文件名
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { data, error } = await supabaseClient.storage
        .from(bucket)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) throw error;

    // 获取公开 URL
    const { data: urlData } = supabaseClient.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return {
        url: urlData.publicUrl,
        path: filePath,
        name: file.name,
        type: file.type,
        size: file.size,
    };
}

// ---------- 批量上传文件 ----------
async function uploadFiles(files, bucket = 'files', path = '') {
    const results = [];
    for (const file of files) {
        try {
            const result = await uploadFile(file, bucket, path);
            results.push(result);
        } catch (e) {
            console.error('上传文件失败:', file.name, e);
            throw e;
        }
    }
    return results;
}

// ---------- 从帖子内容中提取文件 ID ----------
function extractFileIdsFromContent(content) {
    if (!content) return [];
    const ids = [];
    const regex = /\[(img|video|audio|file)\]([^\]]+)\[\/\1\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        ids.push(match[2]);
    }
    return [...new Set(ids)];
}

// ---------- 批量获取文件信息 ----------
async function fetchFilesByIds(fileIds) {
    if (!fileIds || fileIds.length === 0) return {};
    if (!supabaseClient) return {};

    try {
        const { data, error } = await supabaseClient
            .from('user_files')
            .select('*')
            .in('id', fileIds);
        if (error) throw error;

        const fileMap = {};
        (data || []).forEach(file => {
            fileMap[file.id] = file;
        });
        return fileMap;
    } catch (e) {
        console.error('获取文件信息失败:', e);
        return {};
    }
}

// ---------- 获取用户文件库 ----------
async function getUserFiles(userId) {
    if (!supabaseClient || !userId) return [];
    try {
        const { data, error } = await supabaseClient
            .from('user_files')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('获取文件库失败:', e);
        return [];
    }
}

// ---------- 删除文件 ----------
async function deleteFileFromStorage(fileUrl) {
    if (!supabaseClient) return;
    try {
        // 从 URL 中提取路径
        const url = new URL(fileUrl);
        const pathParts = url.pathname.split('/');
        // 路径格式: /storage/v1/object/public/bucket/path/to/file
        // 或者 /storage/v1/object/public/bucket/path
        // 简单处理：找到 bucket 后的部分
        const bucketIndex = pathParts.indexOf('files');
        if (bucketIndex !== -1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/');
            if (filePath) {
                const { error } = await supabaseClient.storage
                    .from('files')
                    .remove([filePath]);
                if (error) console.error('删除存储文件失败:', error);
            }
        }
    } catch (e) {
        console.error('删除文件失败:', e);
    }
}

// ---------- 导出 ----------
window.BikanConfig = {
    supabaseClient,
    sdkReady,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ROUTES,
    EXPLORE_TABS,
    FILE_TYPES,
    uploadFile,
    uploadFiles,
    extractFileIdsFromContent,
    fetchFilesByIds,
    getUserFiles,
    deleteFileFromStorage,
};
