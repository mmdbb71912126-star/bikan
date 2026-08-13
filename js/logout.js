// ============================================================
// js/logout.js
// 独立处理退出登录按钮和用户信息展示
// 依赖：config.js, components.js
// ============================================================

(function() {
    console.log('[必看] logout.js 加载');

    const cfg = window.BikanConfig;
    const comp = window.BikanComponents;

    if (!cfg || !cfg.sdkReady) {
        console.warn('[必看] config 未就绪，退出按钮不可用');
        return;
    }

    const supabase = cfg.supabaseClient;

    async function updateUserFooter() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
        if (profile) {
            const avatarEl = document.getElementById('userAvatarSmall');
            const nameEl = document.getElementById('userDisplayName');
            const emailEl = document.getElementById('userEmail');
            if (avatarEl && comp.getUserAvatarHTML) avatarEl.innerHTML = comp.getUserAvatarHTML(profile, 'avatar-sm');
            if (nameEl) nameEl.textContent = profile.nickname || profile.username || '用户';
            if (emailEl) emailEl.textContent = session.user.email || (profile.username ? '@' + profile.username : '');
        }
    }

    function bindLogoutButton() {
        const btn = document.getElementById('staticLogoutBtn');
        if (btn) {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                console.log('[必看] 退出登录按钮被点击');
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await supabase.from('profiles').update({ is_online: false }).eq('id', session.user.id);
                }
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            });
            console.log('[必看] 退出按钮绑定成功');
        } else {
            console.warn('[必看] 未找到 staticLogoutBtn，请检查 app.html');
        }
    }

    updateUserFooter();
    bindLogoutButton();
})();
