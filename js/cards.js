// ============================================================
// 卡片 CRUD 操作
// ============================================================

// 获取所有卡片
async function getCards() {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取卡片失败:', error);
    return { success: false, error: error.message };
  }
}

// 按分类获取卡片
async function getCardsByCategory(category) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('category', category)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取卡片失败:', error);
    return { success: false, error: error.message };
  }
}

// 获取单张卡片
async function getCard(id) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取卡片失败:', error);
    return { success: false, error: error.message };
  }
}

// 新增卡片
async function addCard(cardData) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .insert([cardData])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('新增卡片失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新卡片
async function updateCard(id, cardData) {
  try {
    const { data, error } = await supabase
      .from('cards')
      .update(cardData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('更新卡片失败:', error);
    return { success: false, error: error.message };
  }
}

// 删除卡片
async function deleteCard(id) {
  try {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('删除卡片失败:', error);
    return { success: false, error: error.message };
  }
}
