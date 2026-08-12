export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="w-full max-w-md p-8 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center space-y-6">
          <h1 className="text-2xl font-bold text-[#f0f0f0]">欢迎回来</h1>
          
          <button className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-100 transition-all">
            <span>使用 Google 账户继续</span>
          </button>

          <div className="w-full flex items-center gap-4 text-[#a0a0a0]">
            <hr className="flex-1 border-[#2a2a2a]"/><span>或</span><hr className="flex-1 border-[#2a2a2a]"/>
          </div>

          <div className="w-full space-y-4">
            <input type="email" placeholder="邮箱地址" className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f0f0f0] placeholder-[#a0a0a0]" />
            <input type="password" placeholder="密码" className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-[#f0f0f0] placeholder-[#a0a0a0]" />
            <button className="w-full py-3 bg-[#2d6a4f] hover:bg-[#40916c] text-white font-semibold rounded-xl transition-all">登录</button>
          </div>

          <div className="text-sm text-[#a0a0a0]">
            没有账号？<a href="/register" className="text-[#2d6a4f] hover:underline ml-1">点我注册</a>
          </div>
        </div>
      </div>
    </div>
  );
}
