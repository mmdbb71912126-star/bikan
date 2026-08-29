// ============================================================
// 认证管理
// ============================================================

// 检查登录状态
async function checkAuth() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session !== null;
  } catch (error) {
    console.error('检查登录状态失败:', error);
    return false;
  }
}

// 获取当前用户
async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

// 登录
async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('登录失败:', error);
    return { success: false, error: error.message };
  }
}

// 退出登录
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('退出失败:', error);
    return { success: false, error: error.message };
  }
}

// 检查是否为管理员（通过邮箱判断）
function isAdmin(email) {
  return email === '3948677391@qq.com';
}
