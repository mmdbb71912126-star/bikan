// ============================================================
// 管理后台逻辑
// ============================================================

// 获取 URL 参数
function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// 检查管理员权限
async function checkAdminAccess() {
  const isLoggedIn = await checkAuth();
  if (!isLoggedIn) {
    window.location.href = 'login.html?redirect=admin';
    return false;
  }
  
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) {
    alert('你没有管理员权限');
    window.location.href = 'index.html';
    return false;
  }
  
  return true;
}

// 加载所有卡片（表格形式）
async function loadAdminCards() {
  const result = await getCards();
  if (!result.success) {
    document.getElementById('cardTableBody').innerHTML = `
      <tr><td colspan="5" style="text-align:center;padding:40px;color:#86868b;">加载失败，请刷新重试</td></tr>
    `;
    return;
  }

  const cards = result.data;
  
  if (cards.length === 0) {
    document.getElementById('cardTableBody').innerHTML = `
      <tr><td colspan="5" style="text-align:center;padding:40px;color:#86868b;">暂无卡片，点击「添加卡片」创建</td></tr>
    `;
    return;
  }

  const categoryMap = {
    'category': '分类',
    'history': '历史',
    'recommend': '推荐'
  };

  document.getElementById('cardTableBody').innerHTML = cards.map(card => `
    <tr>
      <td><img src="${card.image_url}" alt="${card.title}" style="width:60px;height:45px;object-fit:cover;border-radius:8px;" /></td>
      <td><strong>${card.title}</strong></td>
      <td><span style="background:#f0f0f5;padding:2px 12px;border-radius:100px;font-size:12px;">${categoryMap[card.category] || card.category}</span></td>
      <td style="color:#86868b;font-size:13px;">${new Date(card.created_at).toLocaleDateString('zh-CN')}</td>
      <td>
        <button onclick="editCard('${card.id}')" style="padding:6px 12px;background:#f0f0f5;border-radius:8px;margin-right:6px;font-size:13px;">${getIcon('edit')}</button>
        <button onclick="deleteCardHandler('${card.id}')" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:13px;">${getIcon('delete')}</button>
      </td>
    </tr>
  `).join('');
}

// 删除卡片
async function deleteCardHandler(id) {
  if (!confirm('确定要删除这张卡片吗？')) return;
  
  const result = await deleteCard(id);
  if (result.success) {
    alert('删除成功！');
    loadAdminCards();
  } else {
    alert('删除失败：' + result.error);
  }
}

// 编辑卡片（弹窗形式）
async function editCard(id) {
  const result = await getCard(id);
  if (!result.success) {
    alert('获取卡片信息失败');
    return;
  }
  
  const card = result.data;
  
  // 获取分类列表
  const catResult = await getCategories();
  const categories = catResult.success ? catResult.data : [];
  
  const categoryOptions = categories.map(c => 
    `<option value="${c.name}" ${c.name === card.category ? 'selected' : ''}>${c.name}</option>`
  ).join('');
  
  const html = `
    <div class="modal-overlay" id="editModal">
      <div class="modal">
        <div class="modal-header">
          <h3>编辑卡片</h3>
          <button onclick="closeModal()">${getIcon('close')}</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>标题</label>
            <input type="text" id="editTitle" value="${card.title}" />
          </div>
          <div class="form-group">
            <label>分类</label>
            <select id="editCategory">${categoryOptions}</select>
          </div>
          <div class="form-group">
            <label>图片链接</label>
            <input type="url" id="editImageUrl" value="${card.image_url}" />
          </div>
          <div class="form-group">
            <label>描述（可选）</label>
            <textarea id="editDescription" rows="3">${card.description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>跳转链接（可选）</label>
            <input type="url" id="editLinkUrl" value="${card.link_url || ''}" />
          </div>
          <div class="form-group">
            <label>排序（数字越小越靠前）</label>
            <input type="number" id="editSortOrder" value="${card.sort_order || 0}" />
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="closeModal()" style="padding:10px 24px;background:#f0f0f5;border-radius:100px;font-size:14px;">取消</button>
          <button onclick="saveEdit('${card.id}')" style="padding:10px 24px;background:#007aff;color:#fff;border-radius:100px;font-size:14px;">保存</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', html);
}

// 保存编辑
async function saveEdit(id) {
  const title = document.getElementById('editTitle').value.trim();
  const category = document.getElementById('editCategory').value;
  const image_url = document.getElementById('editImageUrl').value.trim();
  const description = document.getElementById('editDescription').value.trim();
  const link_url = document.getElementById('editLinkUrl').value.trim();
  const sort_order = parseInt(document.getElementById('editSortOrder').value) || 0;
  
  if (!title || !image_url || !category) {
    alert('请填写标题、分类和图片链接');
    return;
  }
  
  const result = await updateCard(id, {
    title,
    category,
    image_url,
    description: description || null,
    link_url: link_url || null,
    sort_order
  });
  
  if (result.success) {
    alert('保存成功！');
    closeModal();
    loadAdminCards();
  } else {
    alert('保存失败：' + result.error);
  }
}

// 关闭弹窗
function closeModal() {
  const modal = document.getElementById('editModal');
  if (modal) modal.remove();
}

// 显示添加卡片表单
function showAddCard() {
  document.getElementById('addCardForm').style.display = 'block';
  document.getElementById('addCategoryForm').style.display = 'none';
  document.getElementById('formTitle').textContent = '添加卡片';
}

// 显示添加分类表单
async function showAddCategory() {
  document.getElementById('addCardForm').style.display = 'none';
  document.getElementById('addCategoryForm').style.display = 'block';
  document.getElementById('formTitle').textContent = '添加分类';
}

// 提交卡片
async function submitCard() {
  const title = document.getElementById('cardTitle').value.trim();
  const category = document.getElementById('cardCategory').value;
  const image_url = document.getElementById('cardImageUrl').value.trim();
  const description = document.getElementById('cardDescription').value.trim();
  const link_url = document.getElementById('cardLinkUrl').value.trim();
  const sort_order = parseInt(document.getElementById('cardSortOrder').value) || 0;
  
  if (!title || !image_url || !category) {
    alert('请填写标题、分类和图片链接');
    return;
  }
  
  const result = await addCard({
    title,
    category,
    image_url,
    description: description || null,
    link_url: link_url || null,
    sort_order
  });
  
  if (result.success) {
    alert('添加成功！');
    document.getElementById('cardTitle').value = '';
    document.getElementById('cardImageUrl').value = '';
    document.getElementById('cardDescription').value = '';
    document.getElementById('cardLinkUrl').value = '';
    document.getElementById('cardSortOrder').value = '0';
    loadAdminCards();
  } else {
    alert('添加失败：' + result.error);
  }
}

// 提交分类
async function submitCategory() {
  const name = document.getElementById('categoryName').value.trim();
  const icon = document.getElementById('categoryIcon').value.trim();
  const sort_order = parseInt(document.getElementById('categorySortOrder').value) || 0;
  
  if (!name) {
    alert('请填写分类名称');
    return;
  }
  
  const result = await addCategory({ name, icon: icon || null, sort_order });
  
  if (result.success) {
    alert('添加成功！');
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryIcon').value = '';
    document.getElementById('categorySortOrder').value = '0';
    // 刷新分类下拉列表
    await loadCategorySelects();
    loadAdminCards();
  } else {
    alert('添加失败：' + result.error);
  }
}

// 加载分类下拉列表
async function loadCategorySelects() {
  const result = await getCategories();
  if (!result.success) return;
  
  const options = result.data.map(c => 
    `<option value="${c.name}">${c.icon || '📁'} ${c.name}</option>`
  ).join('');
  
  const selects = document.querySelectorAll('.category-select');
  selects.forEach(sel => {
    const currentVal = sel.value;
    sel.innerHTML = options;
    sel.value = currentVal;
  });
}

// 初始化管理后台
async function initAdminPage() {
  // 权限检查
  const hasAccess = await checkAdminAccess();
  if (!hasAccess) return;
  
  // 根据 URL 参数显示对应表单
  const action = getParam('action');
  if (action === 'card') {
    showAddCard();
  } else if (action === 'category') {
    await showAddCategory();
  }
  
  // 加载分类下拉列表
  await loadCategorySelects();
  
  // 加载卡片列表
  await loadAdminCards();
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initAdminPage);
