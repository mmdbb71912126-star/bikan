import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white">
      <h1 className="text-5xl font-bold mb-4 text-[#2d6a4f]">Bikan</h1>
      <p className="text-[#a0a0a0] mb-8 text-lg">分享世界 · 连接你我</p>
      <div className="flex gap-6">
        <Link href="/login" className="px-8 py-3 bg-[#2d6a4f] hover:bg-[#40916c] text-white rounded-xl font-semibold transition-all">
          去登录
        </Link>
        <Link href="/register" className="px-8 py-3 border border-[#2a2a2a] hover:bg-[#1a1a1a] text-white rounded-xl font-semibold transition-all">
          去注册
        </Link>
      </div>
    </div>
  );
}
