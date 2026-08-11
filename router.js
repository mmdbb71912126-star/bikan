// router.js - 路由与核心控制器
const SUPABASE_URL = 'https://bazpyoiklkoajdhfkwly.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lTx_tYITroL8_jVVR4EjAA_Eg61lBFT';
const MAIN_ADMIN_EMAIL = '3948677391@qq.com';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUserRole = 'user';
let currentPage = 'home';
let currentTab = '推荐';
let allContents = [];
let allNotifications = [];
let allReports = [];
let pendingCount = 0;
let isSubmitting = false;
let uploadedFiles = [];
let uploadedUrls = [];
let uploadedTags = [];
let currentSearchQuery = '';
let isMainAdmin = false;
let detailContentId = null;
let detailContentData = null;
let detailComments = [];
let avatarFileToUpload = null;
let currentReportContentId = null;
let currentAdminTab = 'users';
let allFriends = [];
let friendRequests = [];
let currentChatFriendId = null;
let chatMessages = [];
let _isRedirecting = false;

function toggleSidebar() {
    const sideNav = document.getElementById('sideNav');
    if (sideNav) sideNav.classList.toggle('collapsed');
}

function navigateTo(page, id) {
    if (page === 'detail' && id) {
        currentPage = 'detail';
        detailContentId = id;
        const url = new URL(window.location);
        url.searchParams.set('page', 'detail');
        url.searchParams.set('id', id);
        window.history.pushState({ page: 'detail', id: id }, '', url);
        if (typeof window.renderDetailFromRouter === 'function') {
            window.renderDetailFromRouter(id);
        }
        return;
    }

    currentPage = page;
    const url = new URL(window.location);
    if (page === 'home') {
        url.searchParams.delete('page');
        url.searchParams.delete('id');
    } else {
        url.searchParams.set('page', page);
        url.searchParams.delete('id');
    }
    window.history.pushState({ page: page }, '', url);

    document.querySelectorAll('#sideNav .nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    const sideNav = document.getElementById('sideNav');
    const toggleBtn = document.getElementById('sidebarToggle');

    // 核心修复：进入个人中心/管理中心时强制隐藏侧边栏和折叠按钮
    if (['profile', 'admin'].includes(page)) {
        if (sideNav) sideNav.classList.add('hidden');
        if (toggleBtn) toggleBtn.classList.add('hidden');
    } else {
        if (sideNav) sideNav.classList.remove('hidden');
        if (toggleBtn) toggleBtn.classList.remove('hidden');
    }

    if (typeof window.renderPage === 'function') {
        window.renderPage(page);
    }
}

(async function checkAuth() {
    if (_isRedirecting) return;
    console.log('🔍 检查登录状态...');
    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        if (sessionError || !session) {
            console.log('❌ 无 session，跳转到登录页');
            _isRedirecting = true;
            window.location.href = '/login.html';
            return;
        }
        const { data: userData, error: userError } = await supabaseClient.auth.getUser();
        if (userError || !userData.user) {
            await supabaseClient.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            _isRedirecting = true;
            window.location.href = '/login.html';
            return;
        }
        currentUser = userData.user;
        console.log('✅ 登录用户:', currentUser.email);
        const { data: profile } = await supabaseClient.from('profiles').select('is_banned, ban_expires_at, role').eq('id', currentUser.id).single();
        if (profile?.is_banned) {
            const expires = profile.ban_expires_at ? new Date(profile.ban_expires_at) : null;
            if (!expires || expires > new Date()) {
                await supabaseClient.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/login.html?banned=true';
                return;
            }
        }
        currentUserRole = profile?.role || 'user';
        isMainAdmin = currentUser.email === MAIN_ADMIN_EMAIL;
        const app = document.getElementById('app');
        if (app) app.classList.remove('hidden');
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || 'home';
        const id = params.get('id');
        if (page === 'detail' && id) {
            navigateTo('detail', id);
        } else {
            navigateTo(page);
        }
    } catch (err) {
        console.error('❌ 认证失败:', err);
        _isRedirecting = true;
        window.location.href = '/login.html';
    }
})();

window.addEventListener('popstate', function(event) {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page') || 'home';
    const id = params.get('id');
    if (page === 'detail' && id) {
        navigateTo('detail', id);
    } else {
        navigateTo(page);
    }
});

window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.currentUser = currentUser;
window.currentUserRole = currentUserRole;
window.supabaseClient = supabaseClient;
window.MAIN_ADMIN_EMAIL = MAIN_ADMIN_EMAIL;
window.ICONS = ICONS;
