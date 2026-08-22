// ============================================================
//  数据操作 API - 对接 Supabase
// ============================================================
var App = App || {};
var supabase = App.supabase;

App.api = {

    // ---------- 设置 ----------
    loadSettings: async function() {
        try {
            var { data, error } = await supabase
                .from('settings')
                .select('key, value');
            if (error) throw error;
            var result = { site: {}, hero: {}, theme: {} };
            if (data) {
                data.forEach(function(row) {
                    if (row.key === 'site') result.site = row.value;
                    else if (row.key === 'hero') result.hero = row.value;
                    else if (row.key === 'theme') result.theme = row.value;
                });
            }
            return result;
        } catch (err) {
            console.error('加载设置失败:', err);
            return { site: { name: '必看网', version: 'v3.0' }, hero: {}, theme: {} };
        }
    },

    updateSetting: async function(key, value) {
        try {
            var { error } = await supabase
                .from('settings')
                .upsert({ key: key, value: value });
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('更新设置失败:', err);
            return false;
        }
    },

    // ---------- 分区 ----------
    loadSections: async function() {
        try {
            var { data, error } = await supabase
                .from('sections')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('加载分区失败:', err);
            return [];
        }
    },

    loadBookmarks: async function() {
        try {
            var { data, error } = await supabase
                .from('bookmarks')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('加载书签失败:', err);
            return [];
        }
    },

    loadHtmlPages: async function() {
        try {
            var { data, error } = await supabase
                .from('html_pages')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('加载 HTML 页面失败:', err);
            return [];
        }
    },

    loadHomeItems: async function() {
        try {
            var { data, error } = await supabase
                .from('home_items')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('加载首页项失败:', err);
            return [];
        }
    },

    // ---------- 创建 ----------
    createSection: async function(data) {
        try {
            var { error } = await supabase.from('sections').insert(data);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('创建分区失败:', err);
            return false;
        }
    },

    createHomeItem: async function(data) {
        try {
            var { error } = await supabase.from('home_items').insert(data);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('创建首页项失败:', err);
            return false;
        }
    },

    createBookmark: async function(data) {
        try {
            var { error } = await supabase.from('bookmarks').insert(data);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('创建书签失败:', err);
            return false;
        }
    },

    createHtmlPage: async function(data) {
        try {
            var { error } = await supabase.from('html_pages').insert(data);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('创建 HTML 页面失败:', err);
            return false;
        }
    },

    // ---------- 更新 ----------
    updateSection: async function(id, data) {
        try {
            var { error } = await supabase
                .from('sections')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('更新分区失败:', err);
            return false;
        }
    },

    updateHomeItem: async function(id, data) {
        try {
            var { error } = await supabase
                .from('home_items')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('更新首页项失败:', err);
            return false;
        }
    },

    updateBookmark: async function(id, data) {
        try {
            var { error } = await supabase
                .from('bookmarks')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('更新书签失败:', err);
            return false;
        }
    },

    updateHtmlPage: async function(id, data) {
        try {
            var { error } = await supabase
                .from('html_pages')
                .update(data)
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('更新 HTML 页面失败:', err);
            return false;
        }
    },

    // ---------- 删除 ----------
    deleteSection: async function(id) {
        try {
            var { error } = await supabase
                .from('sections')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除分区失败:', err);
            return false;
        }
    },

    deleteHomeItem: async function(id) {
        try {
            var { error } = await supabase
                .from('home_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除首页项失败:', err);
            return false;
        }
    },

    deleteBookmark: async function(id) {
        try {
            var { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除书签失败:', err);
            return false;
        }
    },

    deleteHtmlPage: async function(id) {
        try {
            var { error } = await supabase
                .from('html_pages')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除 HTML 页面失败:', err);
            return false;
        }
    },

    deleteBookmarksBySection: async function(sectionId) {
        try {
            var { error } = await supabase
                .from('bookmarks')
                .delete()
                .eq('section_id', sectionId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除分区书签失败:', err);
            return false;
        }
    },

    deleteHtmlPagesBySection: async function(sectionId) {
        try {
            var { error } = await supabase
                .from('html_pages')
                .delete()
                .eq('section_id', sectionId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('删除分区 HTML 页面失败:', err);
            return false;
        }
    },

    // ---------- 批量更新顺序 ----------
    updateHomeItemsOrder: async function(items) {
        try {
            for (var i = 0; i < items.length; i++) {
                await supabase
                    .from('home_items')
                    .update({ sort_order: i })
                    .eq('id', items[i].id);
            }
            return true;
        } catch (err) {
            console.error('更新首页排序失败:', err);
            return false;
        }
    },

    updateBookmarksOrder: async function(bookmarks) {
        try {
            for (var i = 0; i < bookmarks.length; i++) {
                await supabase
                    .from('bookmarks')
                    .update({ sort_order: i })
                    .eq('id', bookmarks[i].id);
            }
            return true;
        } catch (err) {
            console.error('更新书签排序失败:', err);
            return false;
        }
    },

    updateHtmlPagesOrder: async function(pages) {
        try {
            for (var i = 0; i < pages.length; i++) {
                await supabase
                    .from('html_pages')
                    .update({ sort_order: i })
                    .eq('id', pages[i].id);
            }
            return true;
        } catch (err) {
            console.error('更新 HTML 页面排序失败:', err);
            return false;
        }
    }
};
