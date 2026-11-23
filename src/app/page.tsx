import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Bell,
  LineChart,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { shortenAddress, formatSol, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let totalWallets = 0;
  let smartMoneyCount = 0;
  let activeMonitors = 0;
  let totalAlerts = 0;
  let recentAlerts: any[] = [];
  let candidateWallets: any[] = [];
  let paperTradesCount = 0;
  let paperRealizedPnl = 0;

  try {
    totalWallets = await prisma.wallet.count();
    activeMonitors = await prisma.wallet.count({ where: { isActive: true } });
    smartMoneyCount = await prisma.walletTag.count({
      where: { tag: 'CANDIDATE_SMART_MONEY' },
    });
    totalAlerts = await prisma.monitorAlert.count();
    recentAlerts = await prisma.monitorAlert.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: { wallet: true },
    });
    candidateWallets = await prisma.wallet.findMany({
      where: {
        tags: {
          some: { tag: 'CANDIDATE_SMART_MONEY' },
        },
      },
      include: {
        metrics: true,
        tags: true,
      },
      take: 5,
    });
    paperTradesCount = await prisma.paperTrade.count();
    const paperClosedPositions = await prisma.paperPosition.findMany();
    paperRealizedPnl = paperClosedPositions.reduce(
      (acc, pos) => acc + (pos.realizedPnlSol || 0),
      0
    );
  } catch (err) {
    console.error('Failed to load dashboard metrics from Prisma:', err);
  }

  return (
    <div className="space-y-6">
      {/* Top Hero Banner — Winter Anime Frost Atmosphere */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-terminal-darkest/85 via-slate-900/80 to-roseScarf-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-80 h-full opacity-20 pointer-events-none overflow-hidden">
          <img
            src="/images/winter-girl.jpg"
            alt="Winter Aesthetic"
            className="w-full h-full object-cover object-[70%_25%] blur-[1px]"
          />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40">
                ❄️ 冬雪寒霜 • 链上寻踪
              </span>
              <span className="text-xs text-slate-400">
                Solana Meme 币情报与模拟复盘终端
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Smart Money Hunter 工作台
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              集公开 RPC 交易抓取、量化胜率与盈亏差分分析、7 大客观规则打标、AI
              辅助画像研报与仿真 Paper Trading 于一体。在银白霜雪般的冷静理性中，捕捉链上真实聪明钱。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/wallets"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-roseScarf-500 to-roseScarf-600 hover:from-roseScarf-400 hover:to-roseScarf-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-950/40 border border-rose-300/30"
            >
              <Wallet className="w-4 h-4" />
              <span>录入新钱包</span>
            </Link>
            <Link
              href="/paper-trading"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 text-xs transition backdrop-blur-md"
            >
              <LineChart className="w-4 h-4 text-frostIce-300" />
              <span>模拟盘复盘</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">已录入钱包</span>
            <div className="p-2 rounded-lg bg-frostIce-500/10 text-frostIce-300 border border-frostIce-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {totalWallets}
            </span>
            <span className="text-[11px] text-slate-400">
              ({activeMonitors} 监控中)
            </span>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-frostIce-300">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-frostIce-400" />
            <span>预置 21 个高质量研究样本</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">候选聪明钱</span>
            <div className="p-2 rounded-lg bg-roseScarf-500/15 text-roseScarf-300 border border-roseScarf-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-roseScarf-300">
              {smartMoneyCount}
            </span>
            <span className="text-[11px] text-slate-400">经规则引擎硬性筛选</span>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-slate-400">
            <span>胜率 ≥65% & PnL&gt;10 SOL</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">链上监控事件</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {totalAlerts}
            </span>
            <span className="text-[11px] text-slate-400">买卖预警</span>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-frostIce-300">
            <Activity className="w-3.5 h-3.5 mr-1" />
            <span>签名去重轮询调度</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">模拟复盘已实现盈亏</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold font-mono ${
                paperRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {paperRealizedPnl >= 0 ? '+' : ''}
              {paperRealizedPnl.toFixed(2)} SOL
            </span>
          </div>
          <div className="mt-2.5 flex items-center text-[11px] text-slate-400">
            <span>{paperTradesCount} 笔模拟撮合 (含滑点与手续费)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Smart Money Radar + Live Monitor Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Candidate Smart Money Radar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-roseScarf-300" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                聪明钱雷达榜 (候选重点观察)
              </h2>
            </div>
            <Link
              href="/wallets"
              className="text-xs text-roseScarf-300 hover:text-roseScarf-200 flex items-center transition"
            >
              查看全部钱包 ({totalWallets}) <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="terminal-card overflow-hidden">
            {candidateWallets.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-white/5 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-medium text-slate-200">
                  暂无匹配的候选聪明钱钱包
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  前往钱包管理页面添加 Solana 地址并同步链上交易，规则引擎将自动完成多维度指标计算并打上可解释标签。
                </p>
                <Link
                  href="/wallets"
                  className="mt-4 inline-flex items-center px-3.5 py-1.5 rounded-lg bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40 text-xs font-medium hover:bg-roseScarf-500/30 transition"
                >
                  去录入首批钱包
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-terminal-darkest/60 border-b border-white/10 text-slate-400 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-3">钱包地址 / 别名</th>
                      <th className="px-3 py-3">分类</th>
                      <th className="px-3 py-3">样本交易</th>
                      <th className="px-3 py-3">胜率</th>
                      <th className="px-3 py-3">已实现盈亏</th>
                      <th className="px-3 py-3">核心标签</th>
                      <th className="px-4 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {candidateWallets.map((wallet) => {
                      const metrics = wallet.metrics;
                      const winRate = metrics?.winRate;
                      const pnl = metrics?.realizedPnlSol;
                      return (
                        <tr
                          key={wallet.id}
                          className="hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono font-medium text-white">
                              {shortenAddress(wallet.address, 5)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {wallet.label || '未命名'}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="terminal-badge badge-rose text-[10px]">
                              {wallet.category}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-slate-300">
                            {metrics?.totalTrades || 0}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {winRate !== null && winRate !== undefined ? (
                              <span
                                className={
                                  winRate >= 60
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-slate-300'
                                }
                              >
                                {winRate.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-500">待计算</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono">
                            {pnl !== null && pnl !== undefined ? (
                              <span
                                className={
                                  pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }
                              >
                                {pnl >= 0 ? '+' : ''}
                                {pnl.toFixed(2)} SOL
                              </span>
                            ) : (
                              <span className="text-slate-500">待计算</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {wallet.tags.slice(0, 2).map((t: any) => (
                                <span
                                  key={t.id}
                                  className="terminal-badge badge-green text-[10px]"
                                >
                                  {t.displayName}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/wallets/${wallet.address}`}
                              className="text-roseScarf-300 hover:underline text-xs"
                            >
                              投研画像 &rarr;
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Monitor Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-300" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                实时链上监控流
              </h2>
            </div>
            <Link
              href="/monitor"
              className="text-xs text-roseScarf-300 hover:text-roseScarf-200 flex items-center transition"
            >
              全部信号 <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="terminal-card p-4 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                暂无监控告警记录。
                <br />
                启动监控 Worker 或在监控台点击即时巡检。
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded-lg bg-white/5 border border-white/5 flex items-start justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`terminal-badge ${
                          alert.alertType === 'NEW_BUY'
                            ? 'badge-green'
                            : 'badge-red'
                        }`}
                      >
                        {alert.alertType === 'NEW_BUY' ? '买入' : '卖出'}
                      </span>
                      <span className="font-mono text-slate-200 text-xs font-semibold">
                        {alert.tokenSymbol || shortenAddress(alert.tokenAddress, 3)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {alert.wallet?.label || shortenAddress(alert.walletAddress, 4)}: {alert.message}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-slate-200">
                      {alert.amountSol ? formatSol(alert.amountSol, 2) : '-'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDate(alert.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* System Safety Guarantees Widget */}
          <div className="terminal-card p-4 bg-slate-900/60 border-white/10 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-roseScarf-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>安全规范与纪律声明</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>本系统绝不请求或保存任何私钥与助记词。</li>
              <li>不提供任何真实交易执行功能，所有撮合限 Paper Trading。</li>
              <li>严格区分真实链上数据、模拟数据与缺失数据。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
