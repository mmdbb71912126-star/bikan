// 全局状态
let currentCategory = 'all';
let allLinks = [];
let categories = [];
let isAdmin = false;

// 初始化（立即执行，因为脚本在 body 末尾）
(async () => {
  await loadCategories();
  await loadLinks();
  bindEvents();
  checkAdminStatus();
})();

// 加载分类
async function loadCategories() {
  const { data } = await supabase.from('categories').select('*').order('sort_order');
  categories = data || [];
  renderCategoryTabs();
}

// 加载链接
async function loadLinks() {
  const { data } = await supabase.from('links').select('*').eq('is_active', true).order('sort_order');
  allLinks = data || [];
  renderLinks();
}

// 渲染分类标签
function renderCategoryTabs() {
  const tabsEl = document.getElementById('categoryTabs');
  tabsEl.innerHTML = '<div class="category-tab active" data-id="all">全部</div>';
  categories.forEach(cat => {
    tabsEl.innerHTML += `<div class="category-tab" data-id="${cat.id}">${cat.name}</div>`;
  });
}

// 渲染链接
function renderLinks(filter = '') {
  const gridEl = document.getElementById('linksGrid');
  let links = allLinks;
  
  if (currentCategory !== 'all') {
    links = links.filter(l => l.category_id === currentCategory);
  }
  
  if (filter) {
    const kw = filter.toLowerCase();
    links = links.filter(l => 
      l.title.toLowerCase().includes(kw) || 
      (l.description && l.description.toLowerCase().includes(kw))
    );
  }
  
  if (links.length === 0) {
    gridEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:40px;">暂无链接</p>';
    return;
  }
  
  gridEl.innerHTML = links.map(link => `
    <a href="${link.url}" target="_blank" class="link-card">
      <div class="link-title">${link.title}</div>
      <div class="link-desc">${link.description || ''}</div>
    </a>
  `).join('');
}

function bindEvents() {
  document.getElementById('categoryTabs').addEventListener('click', (e) => {
    if (e.target.classList.contains('category-tab')) {
      document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.id;
      renderLinks(document.getElementById('searchInput').value);
    }
  });
  
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderLinks(e.target.value);
  });
  
  document.getElementById('adminBtn').addEventListener('click', () => {
    if (isAdmin) {
      document.getElementById('adminPanel').style.display = 'block';
      loadAdminLinks();
    } else {
      document.getElementById('loginModal').style.display = 'flex';
    }
  });
  
  document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('loginModal').style.display = 'none';
  });
  
  document.getElementById('adminLoginBtn').addEventListener('click', adminLogin);
  document.getElementById('logoutBtn').addEventListener('click', adminLogout);
  document.getElementById('addLinkBtn').addEventListener('click', addLink);
}

async function checkAdminStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user.email === 'mmdbb71912126@gmail.com') {
    isAdmin = true;
    document.getElementById('adminBtn').textContent = '管理';
  }
}

async function adminLogin() {
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const msgEl = document.getElementById('loginMsg');
  
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    msgEl.textContent = '登录失败: ' + error.message;
    return;
  }
  
  if (email !== 'mmdbb71912126@gmail.com') {
    msgEl.textContent = '无管理员权限';
    await supabase.auth.signOut();
    return;
  }
  
  isAdmin = true;
  document.getElementById('loginModal').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'block';
  loadAdminLinks();
}

async function adminLogout() {
  await supabase.auth.signOut();
  isAdmin = false;
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminBtn').textContent = '管理';
}

async function loadAdminLinks() {
  const selectEl = document.getElementById('newCategory');
  selectEl.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  
  const { data } = await supabase.from('links').select('*').order('created_at', { ascending: false });
  const listEl = document.getElementById('adminLinksList');
  
  if (!data || data.length === 0) {
    listEl.innerHTML = '<p style="color:#9ca3af;font-size:13px;">暂无链接</p>';
    return;
  }
  
  listEl.innerHTML = data.map(link => `
    <div class="admin-link-item">
      <span>${link.title}</span>
      <button data-id="${link.id}">删除</button>
    </div>
  `).join('');
  
  listEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => deleteLink(btn.dataset.id));
  });
}

async function addLink() {
  const title = document.getElementById('newTitle').value;
  const url = document.getElementById('newUrl').value;
  const description = document.getElementById('newDesc').value;
  const category_id = document.getElementById('newCategory').value;
  
  if (!title || !url || !category_id) {
    alert('请填写完整信息');
    return;
  }
  
  await supabase.from('links').insert({ title, url, description, category_id });
  
  document.getElementById('newTitle').value = '';
  document.getElementById('newUrl').value = '';
  document.getElementById('newDesc').value = '';
  
  await loadLinks();
  await loadAdminLinks();
}

async function deleteLink(id) {
  if (!confirm('确定删除这个链接吗？')) return;
  await supabase.from('links').delete().eq('id', id);
  await loadLinks();
  await loadAdminLinks();
}
