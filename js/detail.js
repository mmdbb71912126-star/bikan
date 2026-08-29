// ============================================================
// 详情页渲染
// ============================================================

// 获取 URL 参数
function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// 渲染详情页
async function initDetailPage() {
  const id = getParam('id');
  
  if (!id) {
    document.getElementById('detailContent').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${getIcon('error')}</span>
        <h3>无效的卡片</h3>
        <p>请从首页点击卡片进入</p>
        <button onclick="location.href='index.html'" style="margin-top:16px;padding:10px 24px;background:#007aff;color:#fff;border-radius:100px;font-size:14px;font-weight:500;">返回首页</button>
      </div>
    `;
    return;
  }

  // 加载卡片数据
  const result = await getCard(id);
  
  if (!result.success || !result.data) {
    document.getElementById('detailContent').innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">${getIcon('error')}</span>
        <h3>卡片不存在</h3>
        <p>可能已被管理员删除</p>
        <button onclick="location.href='index.html'" style="margin-top:16px;padding:10px 24px;background:#007aff;color:#fff;border-radius:100px;font-size:14px;font-weight:500;">返回首页</button>
      </div>
    `;
    return;
  }

  const card = result.data;

  // 分类名称映射
  const categoryMap = {
    'category': '分类',
    'history': '历史',
    'recommend': '推荐'
  };

  // 渲染详情
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-container">
      <div class="detail-image">
        <img src="${card.image_url}" alt="${card.title}" />
      </div>
      <div class="detail-info">
        <div class="detail-category">${categoryMap[card.category] || card.category}</div>
        <h1 class="detail-title">${card.title}</h1>
        ${card.description ? `<p class="detail-description">${card.description}</p>` : ''}
        <div class="detail-meta">
          <span>添加于 ${new Date(card.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
        ${card.link_url ? `<a href="${card.link_url}" target="_blank" class="detail-link">访问链接 →</a>` : ''}
      </div>
    </div>
  `;
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initDetailPage);
