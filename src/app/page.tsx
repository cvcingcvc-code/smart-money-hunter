import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  Bell,
  LineChart,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import prisma from '@/lib/prisma';
import { shortenAddress, formatSol, formatPercent, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Read baseline overview metrics safely
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
      {/* Top Banner & Notice */}
      <div className="relative overflow-hidden rounded-xl border border-terminal-border bg-gradient-to-r from-terminal-dark to-slate-900 p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-trade-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-trade-accent/15 text-trade-accent border border-trade-accent/30">
                链上情报终端 v1.0
              </span>
              <span className="text-xs text-slate-400">
                Solana Meme 币钱包研究与模拟复盘
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
              Smart Money Hunter 工作台
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              提供从公开 RPC 交易抓取、量化胜率与盈亏计算、7 大客观规则打标、AI
              辅助研报，到交易信号模拟复盘的一体化闭环体系。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/wallets"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20"
            >
              <Wallet className="w-4 h-4" />
              <span>录入新钱包</span>
            </Link>
            <Link
              href="/paper-trading"
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-terminal-card hover:bg-terminal-hover border border-terminal-border text-slate-200 text-xs transition"
            >
              <LineChart className="w-4 h-4 text-cyan-400" />
              <span>模拟盘回测</span>
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
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {totalWallets}
            </span>
            <span className="text-[11px] text-slate-400">
              ({activeMonitors} 监控中)
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>首期支持 20+ 样本</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">候选聪明钱</span>
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {smartMoneyCount}
            </span>
            <span className="text-[11px] text-slate-400">经规则引擎筛选</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span>胜率 ≥65% & PnL&gt;10 SOL</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">链上监控事件</span>
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {totalAlerts}
            </span>
            <span className="text-[11px] text-slate-400">买入/卖出告警</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-cyan-400">
            <Activity className="w-3.5 h-3.5 mr-1" />
            <span>增量防重轮询机制</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="terminal-card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">模拟复盘已实现盈亏</span>
            <div className="p-1.5 rounded bg-purple-500/10 text-purple-400">
              <LineChart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold font-mono ${
                paperRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {paperRealizedPnl >= 0 ? '+' : ''}
              {paperRealizedPnl.toFixed(2)} SOL
            </span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-slate-400">
            <span>{paperTradesCount} 笔已撮合模拟单 (含滑点)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Smart Money Radar + Live Monitor Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Candidate Smart Money Radar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                聪明钱雷达榜 (候选重点观察)
              </h2>
            </div>
            <Link
              href="/wallets"
              className="text-xs text-trade-accent hover:underline flex items-center"
            >
              查看全部钱包 ({totalWallets}) <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="terminal-card overflow-hidden">
            {candidateWallets.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center mb-3">
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
                  className="mt-4 inline-flex items-center px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-medium hover:bg-emerald-500/30 transition"
                >
                  去录入首批钱包
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-terminal-dark border-b border-terminal-border text-slate-400 uppercase font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-3">钱包地址 / 备注</th>
                      <th className="px-3 py-3">分类</th>
                      <th className="px-3 py-3">样本交易数</th>
                      <th className="px-3 py-3">胜率</th>
                      <th className="px-3 py-3">已实现盈亏</th>
                      <th className="px-3 py-3">核心标签</th>
                      <th className="px-3 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/60">
                    {candidateWallets.map((wallet) => {
                      const metrics = wallet.metrics;
                      const winRate = metrics?.winRate;
                      const pnl = metrics?.realizedPnlSol;
                      return (
                        <tr
                          key={wallet.id}
                          className="hover:bg-terminal-hover/50 transition-colors"
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
                            <span className="terminal-badge badge-cyan">
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
                              <span className="text-slate-500">不可得</span>
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
                              <span className="text-slate-500">不可得</span>
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
                          <td className="px-3 py-3 text-right">
                            <Link
                              href={`/wallets/${wallet.address}`}
                              className="text-trade-accent hover:underline text-xs"
                            >
                              详情研报 &rarr;
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

        {/* Right 1 Col: Live Monitor Feed & System Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white tracking-wide">
                实时链上监控流
              </h2>
            </div>
            <Link
              href="/monitor"
              className="text-xs text-trade-accent hover:underline flex items-center"
            >
              完整事件 <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="terminal-card p-4 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                暂无监控告警记录。
                <br />
                启动监控 Worker 后将实时捕获新买卖行为。
              </div>
            ) : (
              recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border/80 flex items-start justify-between gap-2"
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
                    <div className="text-xs font-mono text-slate-300">
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
          <div className="terminal-card p-3.5 bg-slate-900/60 border-slate-800 space-y-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>智能合约与合规安全声明</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
              <li>本系统绝不请求或保存任何私钥与助记词。</li>
              <li>不提供任何真实交易执行功能，所有交易仅限 Paper Trading。</li>
              <li>数据指标严谨标注：真实链上、模拟与不可用数据严格隔离。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
