// ============================================================
// Supabase 配置
// ============================================================

const SUPABASE_CONFIG = {
  url: 'https://qziqskgvzabuynduyuqy.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6aXFza2d2emFidXluZHV5dXF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4Njg4ODQsImV4cCI6MjEwMjQ0NDg4NH0.-LYORLfz-xpr1dMD_T-P8LzvgqTJngc0Hd52wSORhXs'
};

// 初始化 Supabase 客户端
const supabase = window.supabase.createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey
);
