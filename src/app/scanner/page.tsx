'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Radar,
  Play,
  TrendingUp,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Percent,
} from 'lucide-react';
import { shortenAddress, formatSol, formatPercent } from '@/lib/utils';

export default function ScannerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/scanner/status');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.progress?.status === 'SCANNING' || json.progress?.status === 'ANALYZING') {
          setScanning(true);
        } else {
          setScanning(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scanner status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Poll progress when scanning
  useEffect(() => {
    let timer: any;
    if (scanning) {
      timer = setInterval(() => {
        fetchStatus();
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [scanning]);

  const handleStartScan = async () => {
    try {
      setScanning(true);
      const res = await fetch('/api/scanner/run?count=100', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        fetchStatus();
      } else {
        alert(json.error || '启动扫描失败');
        setScanning(false);
      }
    } catch (err) {
      console.error('Start scan error:', err);
      setScanning(false);
    }
  };

  const progress = data?.progress;
  const stats = data?.stats;
  const topProfitable = data?.topProfitable || [];

  const targetCount = progress?.targetCount || 100;
  const analyzedCount = progress?.analyzedCount || 0;
  const percentComplete = Math.min(
    100,
    Math.round((analyzedCount / Math.max(1, targetCount)) * 100)
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-terminal-darkest/90 via-slate-900/80 to-roseScarf-950/40 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40">
                ⚡ 自动量化雷达
              </span>
              <span className="text-xs text-slate-400">
                Solana 热门流动性池与活跃交易地址深度扫描
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
              <Radar className="w-6 h-6 text-roseScarf-400" />
              <span>100 个赚钱钱包自动检测与批量分析引擎</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              一键从 Raydium、Pump.fun 与链上流动性池中自动挖掘 100 个活跃 Solana
              交易地址，自动解析买卖流水、持仓周期、胜率与已实现盈亏，精准筛选出真正持续赚钱的「候选聪明钱」。
            </p>
          </div>

          <button
            onClick={handleStartScan}
            disabled={scanning}
            className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-gradient-to-r from-roseScarf-500 to-roseScarf-600 hover:from-roseScarf-400 hover:to-roseScarf-500 text-white font-semibold text-xs transition shadow-lg shadow-rose-950/40 border border-rose-300/30 disabled:opacity-50 shrink-0"
          >
            <Play className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? '全网正在批量检测分析中...' : '一键自动检测分析 100 个钱包'}</span>
          </button>
        </div>
      </div>

      {/* Real-time Scan Progress Bar */}
      {(scanning || (progress && progress.status !== 'IDLE')) && (
        <div className="terminal-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">批量扫描与量化分析流水线</span>
              <span
                className={`terminal-badge ${
                  progress?.status === 'COMPLETED'
                    ? 'badge-green'
                    : progress?.status === 'FAILED'
                    ? 'badge-red'
                    : 'badge-rose'
                }`}
              >
                {progress?.status === 'SCANNING'
                  ? '正在挖掘链上地址...'
                  : progress?.status === 'ANALYZING'
                  ? '正在多维量化分析...'
                  : progress?.status === 'COMPLETED'
                  ? '已完成 100 个钱包分析'
                  : progress?.status || '进行中'}
              </span>
            </div>
            <div className="font-mono text-slate-300">
              进度: <span className="text-roseScarf-300 font-bold">{analyzedCount}</span> /{' '}
              {targetCount} ({percentComplete}%)
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-roseScarf-500 to-frostIce-300 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${percentComplete}%` }}
            />
          </div>

          {progress?.currentWallet && (
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>当前正在差分计算: {shortenAddress(progress.currentWallet, 8)}</span>
              <span>已锁定盈利钱包: {progress.profitableCount || 0} 个</span>
            </div>
          )}
        </div>
      )}

      {/* Funnel Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="terminal-card p-4">
          <span className="text-slate-400 text-xs">全库收录钱包</span>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {stats?.totalWallets || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            含自动雷达发现样本
          </span>
        </div>

        <div className="terminal-card p-4">
          <span className="text-slate-400 text-xs">净盈利赚钱钱包 (PnL &gt; 0)</span>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
            {stats?.profitableCount || progress?.profitableCount || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            胜率与盈亏闭环计算
          </span>
        </div>

        <div className="terminal-card p-4">
          <span className="text-slate-400 text-xs">候选聪明钱大户</span>
          <div className="mt-2 text-2xl font-bold font-mono text-roseScarf-300">
            {stats?.candidateSmartMoney || progress?.smartMoneyCount || 0}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            胜率≥65% & PnL≥10 SOL
          </span>
        </div>

        <div className="terminal-card p-4">
          <span className="text-slate-400 text-xs">客观打标规则覆盖</span>
          <div className="mt-2 text-2xl font-bold font-mono text-frostIce-300">
            7 大客观规则
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            严禁 AI 主观幻觉
          </span>
        </div>
      </div>

      {/* Top Profitable Wallets Leaderboard */}
      <div className="terminal-card overflow-hidden">
        <div className="px-5 py-4 bg-terminal-darkest/70 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-roseScarf-300" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              自动挖掘 Top 赚钱钱包排行榜 (按已实现利润排序)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            已显示前 {topProfitable.length} 名
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-roseScarf-400" />
            正在载入赚钱钱包排行榜...
          </div>
        ) : topProfitable.length === 0 ? (
          <div className="p-12 text-center space-y-3 text-slate-500 text-xs">
            <p>暂未运行 100 个钱包批量扫描，或尚未发现盈利样本。</p>
            <button
              onClick={handleStartScan}
              disabled={scanning}
              className="px-4 py-2 rounded-xl bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40 text-xs font-semibold hover:bg-roseScarf-500/30 transition"
            >
              立即启动 100 个钱包扫描
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-terminal-darkest/60 border-b border-white/10 text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">排名</th>
                  <th className="px-3 py-3">钱包地址 / 别名</th>
                  <th className="px-3 py-3">分类</th>
                  <th className="px-3 py-3">样本交易</th>
                  <th className="px-3 py-3">胜率 (已平仓)</th>
                  <th className="px-3 py-3">已实现盈利 (SOL)</th>
                  <th className="px-3 py-3">客观规则标签</th>
                  <th className="px-4 py-3 text-right">投研研报</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {topProfitable.map((wallet: any, idx: number) => {
                  const metrics = wallet.metrics;
                  const winRate = metrics?.winRate;
                  const pnl = metrics?.realizedPnlSol;

                  return (
                    <tr
                      key={wallet.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-400">
                        {idx === 0 ? (
                          <span className="text-amber-300">🥇 #1</span>
                        ) : idx === 1 ? (
                          <span className="text-slate-200">🥈 #2</span>
                        ) : idx === 2 ? (
                          <span className="text-amber-600">🥉 #3</span>
                        ) : (
                          `#${idx + 1}`
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="font-mono font-medium text-white flex items-center space-x-1.5">
                          <span>{shortenAddress(wallet.address, 5)}</span>
                          <a
                            href={`https://solscan.io/account/${wallet.address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
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
                        {metrics?.totalTrades || 0} 笔
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {winRate !== null && winRate !== undefined ? (
                          <span
                            className={
                              winRate >= 65
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-300'
                            }
                          >
                            {winRate.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-mono font-bold text-emerald-400">
                        {pnl !== null && pnl !== undefined
                          ? `+${pnl.toFixed(2)} SOL`
                          : '-'}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {wallet.tags && wallet.tags.length > 0 ? (
                            wallet.tags.slice(0, 2).map((t: any) => (
                              <span
                                key={t.id}
                                className="terminal-badge badge-green text-[10px]"
                              >
                                {t.displayName}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500 text-[11px]">无</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/wallets/${wallet.address}`}
                          className="inline-flex items-center space-x-1 text-roseScarf-300 hover:text-roseScarf-200 text-xs font-semibold"
                        >
                          <span>查看画像</span>
                          <ArrowRight className="w-3.5 h-3.5" />
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
  );
}
