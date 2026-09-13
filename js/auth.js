const msgEl = document.getElementById('msg');

function showMsg(text, ok = false) {
  msgEl.textContent = text;
  msgEl.style.color = ok ? '#10b981' : '#ef4444';
}

document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showMsg('请填写邮箱和密码');

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showMsg(error.message);
  location.href = '/chat.html';
};

document.getElementById('signupBtn').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) return showMsg('请填写邮箱和密码');

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return showMsg(error.message);
  showMsg('注册成功，请查收验证邮件或直接登录', true);
};

supabase.auth.getSession().then(({ data }) => {
  if (data.session) location.href = '/chat.html';
});
