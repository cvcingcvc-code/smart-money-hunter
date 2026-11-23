import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Smart Money Hunter | AI 链上钱包情报与模拟研报终端',
  description: '面向 Solana Meme 币研究团队的地址采集、链上分析、量化打标、监控与模拟复盘系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="bg-terminal-darkest text-terminal-text min-h-screen flex flex-col font-sans selection:bg-trade-accent/30 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-terminal-border/60 py-4 text-center text-xs text-terminal-muted bg-terminal-darkest/60">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              Smart Money Hunter © 2026 — 仅用于链上投研与量化模拟，不构成投资建议。
            </div>
            <div className="flex items-center space-x-3 text-[11px] font-mono">
              <span className="text-slate-400">网络: Solana Mainnet</span>
              <span>•</span>
              <span className="text-emerald-400">本地 SQLite 持久化</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
