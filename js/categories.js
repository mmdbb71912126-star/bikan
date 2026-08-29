// ============================================================
// 分类 CRUD 操作
// ============================================================

// 获取所有分类
async function getCategories() {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('获取分类失败:', error);
    return { success: false, error: error.message };
  }
}

// 新增分类
async function addCategory(categoryData) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('新增分类失败:', error);
    return { success: false, error: error.message };
  }
}

// 更新分类
async function updateCategory(id, categoryData) {
  try {
    const { data, error } = await supabase
      .from('categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('更新分类失败:', error);
    return { success: false, error: error.message };
  }
}

// 删除分类
async function deleteCategory(id) {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('删除分类失败:', error);
    return { success: false, error: error.message };
  }
}
