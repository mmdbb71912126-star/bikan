// ============================================================
// 首页渲染
// ============================================================

// 渲染卡片网格
function renderCards(cards, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!cards || cards.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${getIcon('empty')}</span>
        <h3>暂无内容</h3>
        <p>管理员可以添加新的卡片</p>
      </div>
    `;
    return;
  }

  container.innerHTML = cards.map(card => `
    <div class="card" onclick="location.href='detail.html?id=${card.id}'">
      <img src="${card.image_url}" alt="${card.title}" loading="lazy" />
      <div class="card-gradient"></div>
      <span class="card-title">${card.title}</span>
    </div>
  `).join('');
}

// 初始化首页
async function initMainPage() {
  // 检查登录状态
  const isLoggedIn = await checkAuth();
  
  // 获取管理员按钮容器
  const adminActions = document.getElementById('adminActions');
  
  if (isLoggedIn) {
    const user = await getCurrentUser();
    if (user && isAdmin(user.email)) {
      // 显示管理员按钮
      adminActions.innerHTML = `
        <button class="btn-admin btn-admin-secondary" onclick="location.href='admin.html?action=category'">
          ${renderIcon('plus')}
          <span class="btn-text">添加分类</span>
        </button>
        <button class="btn-admin btn-admin-primary" onclick="location.href='admin.html?action=card'">
          ${renderIcon('plus')}
          <span class="btn-text">添加卡片</span>
        </button>
      `;
    }
  }

  // 加载卡片数据
  const result = await getCards();
  if (!result.success) {
    console.error('加载卡片失败:', result.error);
    return;
  }

  const cards = result.data;

  // 按分类分组
  const categories = cards.filter(c => c.category === 'category');
  const histories = cards.filter(c => c.category === 'history');
  const recommends = cards.filter(c => c.category === 'recommend');

  // 渲染
  renderCards(categories, 'categoryGrid');
  renderCards(histories, 'historyGrid');
  renderCards(recommends, 'recommendGrid');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initMainPage);
