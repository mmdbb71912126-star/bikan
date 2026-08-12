# 必看

一个类似推特的社交网站，支持发布帖子、论坛讨论、社交互动、文件分享等功能。使用 Supabase 作为后端，前端为纯 HTML/CSS/JS。

## 功能特性

- **探索/发现**：广场（近期帖子随机展示）、热门、推荐、搜索
- **论坛**：用户创建话题，围绕话题讨论，话题需管理员审核
- **社交**：好友、私信（支持文件）、通知中心
- **个人与设置**：资料编辑、收藏、历史、反馈
- **关于**：管理员可编辑的内容页面
- **管理面板**：公告管理、举报处理、话题审核、推荐管理、关于编辑
- **帖子**：支持 Markdown、图片、视频、音频、文件等，点赞、评论、转发、收藏、举报
- **用户系统**：邮箱注册/登录、Google OAuth、密码重置

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Supabase（PostgreSQL + Auth + Storage）
- 部署：GitHub Pages / Vercel / Netlify 等静态托管

## 文件结构

bikan/
├── index.html # 登录/注册页
├── app.html # 主应用页面
├── update-password.html # 密码重置页面
├── css/
│ └── style.css # 全局样式
├── js/
│ ├── config.js # Supabase 配置与工具函数
│ ├── components.js # 通用 UI 组件与 SVG 图标
│ └── app.js # 核心应用逻辑
└── README.md


## 部署步骤

### 1. 创建 Supabase 项目

在 [supabase.com](https://supabase.com) 创建新项目，获取：

- Project URL（例如 `https://xxxx.supabase.co`）
- Anon Key（公开可读的 API key）

### 2. 配置数据库

在 Supabase SQL Editor 中执行以下步骤：

#### a) 创建表、函数、触发器、RLS 策略

执行项目中的 SQL 初始化脚本（见下文）。

#### b) 创建存储桶

执行以下 SQL 创建存储桶：

```sql
insert into storage.buckets (id, name, public)
values 
  ('avatars', 'avatars', true),
  ('posts', 'posts', true),
  ('messages', 'messages', false),
  ('announcements', 'announcements', true),
  ('reports', 'reports', false)
on conflict (id) do nothing;
