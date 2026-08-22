// ============================================================
//  Supabase 配置
// ============================================================
var App = App || {};

App.CONFIG = {
    SUPABASE_URL: 'https://qziqskgvzabuynduyuqy.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6aXFza2d2emFidXluZHV5dXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Njg4ODQsImV4cCI6MjEwMjQ0NDg4NH0.-LYORLfz-xpr1dMD_T-P8LzvgqTJngc0Hd52wSORhXs'
};

// 初始化 Supabase 客户端
var supabase = window.supabase.createClient(
    App.CONFIG.SUPABASE_URL,
    App.CONFIG.SUPABASE_ANON_KEY
);
App.supabase = supabase;
