import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import SnowEffect from '@/components/SnowEffect';

export const metadata: Metadata = {
  title: 'Smart Money Hunter | 冬雪寒霜 • AI 链上钱包情报工作台',
  description: '面向 Solana Meme 币研究团队的地址采集、链上分析、量化打标、监控与模拟复盘系统 (Winter Frost Edition)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="min-h-screen flex flex-col font-sans selection:bg-roseScarf-500/40 selection:text-white">
        <SnowEffect />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-white/10 py-5 text-center text-xs text-terminal-muted bg-terminal-darkest/75 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-roseScarf-400" />
                <span className="text-slate-300">
                  Smart Money Hunter • 冬雪寒霜版 © 2026
                </span>
                <span className="text-slate-500">| 仅用于链上投研与量化模拟</span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] font-mono">
                <span className="text-frostIce-300">网络: Solana Mainnet</span>
                <span className="text-slate-600">•</span>
                <span className="text-roseScarf-300">零私钥 / 纯模拟撮合</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400">SQLite 持久化</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
