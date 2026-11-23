'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Wallet,
  Tag,
  Bell,
  LineChart,
  CalendarCheck,
  ShieldCheck,
  Terminal,
  Sparkles,
} from 'lucide-react';

const navItems = [
  { name: '仪表盘', href: '/', icon: Terminal },
  { name: '钱包追踪', href: '/wallets', icon: Wallet },
  { name: '规则打标', href: '/tags', icon: Tag },
  { name: '链上监控', href: '/monitor', icon: Bell },
  { name: '模拟复盘', href: '/paper-trading', icon: LineChart },
  { name: '每日复盘', href: '/daily-review', icon: CalendarCheck },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-terminal-darkest/75 backdrop-blur-xl shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 py-2">
          {/* Brand & Anime Icon */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-roseScarf-400/60 shadow-rose-glow group-hover:scale-105 transition-transform duration-300">
              <img
                src="/images/winter-girl.jpg"
                alt="Smart Money Hunter"
                className="w-full h-full object-cover object-[70%_25%]"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white group-hover:text-roseScarf-300 transition-colors">
                  Smart Money Hunter
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40">
                  冬雪寒霜 v1.0
                </span>
              </div>
              <span className="text-[10px] text-slate-400 -mt-0.5 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-roseScarf-400" />
                Solana 链上情报与模拟复盘终端
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
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
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-roseScarf-500/25 text-roseScarf-200 border border-roseScarf-400/40 shadow-sm shadow-rose-900/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-roseScarf-300' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* System Status Indicators */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Safety Indicator */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 border border-white/10 text-slate-300 backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-mono text-slate-300">零私钥 / 仿真沙盒</span>
            </div>

            {/* Solana Node */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-roseScarf-950/40 border border-roseScarf-800/40 text-roseScarf-300 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-roseScarf-400 pulse-rose" />
              <span className="text-[11px] font-mono">RPC 正常</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
export default Navbar;
