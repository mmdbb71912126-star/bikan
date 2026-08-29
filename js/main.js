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
