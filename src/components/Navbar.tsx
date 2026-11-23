'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radar,
  Wallet,
  Tag,
  Bell,
  LineChart,
  CalendarCheck,
  ShieldCheck,
  Terminal,
  Activity,
} from 'lucide-react';

const navItems = [
  { name: '仪表盘', href: '/', icon: Terminal },
  { name: '钱包追踪', href: '/wallets', icon: Wallet },
  { name: '标签画像', href: '/tags', icon: Tag },
  { name: '链上监控', href: '/monitor', icon: Bell },
  { name: '模拟复盘', href: '/paper-trading', icon: LineChart },
  { name: '每日复盘', href: '/daily-review', icon: CalendarCheck },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-terminal-border bg-terminal-darkest/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded bg-gradient-to-tr from-trade-accent to-emerald-500 text-terminal-darkest font-black shadow-lg shadow-cyan-500/20">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">
                  Smart Money Hunter
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Solana v1.0
                </span>
              </div>
              <span className="text-[10px] text-terminal-muted -mt-0.5">
                AI 链上钱包情报与模拟研报终端
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-terminal-card text-trade-accent border border-terminal-border shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-terminal-dark/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* System Status & Safeguards */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Safety Indicator */}
            <div className="hidden sm:flex items-center space-x-1 px-2 py-1 rounded bg-slate-900/80 border border-slate-800 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono text-slate-400">零私钥 / 纯模拟</span>
            </div>

            {/* Node Status */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-green" />
              <span className="text-[11px] font-mono">RPC 正常</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
export default Navbar;
