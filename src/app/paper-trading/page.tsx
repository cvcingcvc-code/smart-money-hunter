'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  ShieldCheck,
  Zap,
  Clock,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Radar,
  Users,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  ShieldAlert,
} from 'lucide-react';
import { shortenAddress, formatSol, formatPercent, formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

function PaperTradingContent() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get('token') || '';
  const initialWallet = searchParams.get('wallet') || '';
  const initialSide = searchParams.get('side') === 'SELL' ? 'SELL' : 'BUY';

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [tokenAddress, setTokenAddress] = useState(initialToken);
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [targetWallet, setTargetWallet] = useState(initialWallet);
  const [solAmount, setSolAmount] = useState('2.0');
  const [priceSol, setPriceSol] = useState('0.00000045');
  const [sellRatio, setSellRatio] = useState('1.0');
  const [slippage, setSlippage] = useState('0.015');

  // Consensus & Auto-Exit State
  const [consensusSignals, setConsensusSignals] = useState<any[]>([]);
  const [loadingConsensus, setLoadingConsensus] = useState(false);
  const [consensusHours, setConsensusHours] = useState('4');
  const [consensusMinWallets, setConsensusMinWallets] = useState('2');
  const [runningAutoCycle, setRunningAutoCycle] = useState(false);
  const [cycleReport, setCycleReport] = useState<any>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/paper');
      const data = await res.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error('Failed to load paper summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConsensus = async () => {
    try {
      setLoadingConsensus(true);
      const res = await fetch(
        `/api/consensus/signals?hours=${consensusHours}&minWallets=${consensusMinWallets}`
      );
      const data = await res.json();
      if (data.success) {
        setConsensusSignals(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load consensus signals:', err);
    } finally {
      setLoadingConsensus(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchConsensus();
  }, [consensusHours, consensusMinWallets]);

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: targetWallet || undefined,
          tokenAddress,
          tokenSymbol: tokenSymbol || undefined,
          side,
          solAmount: side === 'BUY' ? solAmount : undefined,
          sellRatio: side === 'SELL' ? sellRatio : undefined,
          priceSol,
          slippage,
          feeSol: 0.0005,
          latencyMs: 1200,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error || '模拟交易撮合失败');
      } else {
        setSuccessMsg(data.message || '模拟交易已撮合');
        fetchSummary();
      }
    } catch (err: any) {
      setErrorMsg(err.message || '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  // Run Auto Consensus Follow & Smart Exit Cycle
  const handleRunAutoCycle = async () => {
    setRunningAutoCycle(true);
    setCycleReport(null);
    try {
      const res = await fetch('/api/consensus/auto-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minWallets: parseInt(consensusMinWallets, 10),
          buyAmountSol: 2.0,
          stopLossPct: -0.20,
          takeProfitPct: 0.50,
          maxHoldHours: 2.0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCycleReport(data.data);
        fetchSummary();
        fetchConsensus();
      } else {
        alert(data.error || '执行巡检失败');
      }
    } catch (err: any) {
      alert(`巡检网络异常: ${err.message}`);
    } finally {
      setRunningAutoCycle(false);
    }
  };

  const openPositions =
    summary?.positions?.filter((p: any) => !p.isClosed && p.remainingTokens > 0) || [];
  const tradeHistory = summary?.trades || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <LineChart className="w-5 h-5 text-roseScarf-300" />
              <span>Paper Trading 模拟复盘与共识跟单控制台</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-roseScarf-500/20 text-roseScarf-300 border border-roseScarf-500/40">
              多聪明钱共识 × 4层智能出场
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            采用真实链上流水进行回溯复盘，引入 1.5% 滑点、0.0005 SOL 手续费及 1.2s 延迟。唯有多钱包共识买入与首笔减仓立即逃生纪律方能稳定跑赢噪音。
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchSummary}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-terminal-dark hover:bg-terminal-card border border-terminal-border text-slate-300 text-xs transition self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新净值</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="terminal-card p-3">
          <span className="text-slate-400 text-[11px]">初始虚拟本金</span>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            {formatSol(summary?.initialCapital || 100.0, 1)}
          </div>
          <span className="text-[10px] text-slate-500">免充值 / 零私钥</span>
        </div>

        <div className="terminal-card p-3">
          <span className="text-slate-400 text-[11px]">已实现总盈亏</span>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              (summary?.realizedPnlSol || 0) >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {(summary?.realizedPnlSol || 0) >= 0 ? '+' : ''}
            {summary?.realizedPnlSol !== undefined
              ? `${summary.realizedPnlSol.toFixed(2)} SOL`
              : '0.00 SOL'}
          </div>
          <span className="text-[10px] text-slate-400">
            {summary?.closedTrades || 0} 笔已平仓
          </span>
        </div>

        <div className="terminal-card p-3">
          <span className="text-slate-400 text-[11px]">策略模拟胜率</span>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-400">
            {summary?.winRate !== null && summary?.winRate !== undefined
              ? `${summary.winRate.toFixed(1)}%`
              : '暂无平仓'}
          </div>
          <span className="text-[10px] text-slate-500">
            胜单 / 已平仓单比例
          </span>
        </div>

        <div className="terminal-card p-3">
          <span className="text-slate-400 text-[11px]">最大回撤 (MDD)</span>
          <div className="mt-1 text-lg font-bold font-mono text-rose-400">
            -{summary?.maxDrawdownPercent || 0}%
          </div>
          <span className="text-[10px] text-slate-400">
            峰值回撤: {formatSol(summary?.maxDrawdownSol || 0, 2)}
          </span>
        </div>

        <div className="terminal-card p-3">
          <span className="text-slate-400 text-[11px]">当前在仓头寸</span>
          <div className="mt-1 text-lg font-bold font-mono text-iceBlue-300">
            {openPositions.length} 个标的
          </div>
          <span className="text-[10px] text-slate-400">
            在仓成本: {formatSol(summary?.openPositionsCost || 0, 2)}
          </span>
        </div>
      </div>

      {/* TOP SECTION: Multi-Wallet Consensus Radar & Exit Guardian Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consensus Radar (2 cols) */}
        <div className="lg:col-span-2 terminal-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-terminal-border/80 pb-3">
            <div className="flex items-center space-x-2">
              <Radar className="w-5 h-5 text-roseScarf-400 animate-pulse" />
              <div>
                <h2 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span>多聪明钱共识信号雷达</span>
                  <span className="text-[10px] font-normal text-roseScarf-300 font-mono bg-roseScarf-500/10 px-2 py-0.5 rounded border border-roseScarf-500/20">
                    同向共振 $\ge 2$ 钱包
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  单一钱包跟单胜率 &lt; 30%，唯有同时间窗口内 $\ge 2$ 个独立聪明钱同时建仓方可确认主升共识
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto text-xs">
              <select
                value={consensusHours}
                onChange={(e) => setConsensusHours(e.target.value)}
                className="px-2.5 py-1 rounded bg-terminal-dark border border-terminal-border text-slate-200 text-xs focus:outline-none"
              >
                <option value="2">近 2 小时窗口</option>
                <option value="4">近 4 小时窗口</option>
                <option value="12">近 12 小时窗口</option>
                <option value="24">近 24 小时窗口</option>
              </select>

              <select
                value={consensusMinWallets}
                onChange={(e) => setConsensusMinWallets(e.target.value)}
                className="px-2.5 py-1 rounded bg-terminal-dark border border-terminal-border text-slate-200 text-xs focus:outline-none"
              >
                <option value="2">$\ge 2$ 个聪明钱</option>
                <option value="3">$\ge 3$ 个强共识</option>
              </select>

              <button
                onClick={fetchConsensus}
                className="p-1 rounded bg-terminal-dark border border-terminal-border text-slate-300 hover:text-white"
                title="重新扫描共识"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConsensus ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Signals List */}
          {consensusSignals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs space-y-2">
              <Users className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
              <p>在当前 {consensusHours} 小时窗口内，尚未检测到 $\ge {consensusMinWallets}$ 个候选聪明钱共识买入的代币。</p>
              <p className="text-[11px] text-slate-600">
                （提示：系统已严格过滤单钱包老鼠仓自嗨交易，仅展示多方交叉验证标的）
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {consensusSignals.map((sig) => (
                <div
                  key={sig.tokenAddress}
                  className="p-3.5 rounded-lg bg-terminal-dark/80 border border-terminal-border hover:border-roseScarf-400/50 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">
                        {sig.tokenSymbol || 'TOKEN'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                          sig.consensusStrength === 'HIGH'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-iceBlue-500/20 text-iceBlue-300 border border-iceBlue-500/40'
                        }`}
                      >
                        {sig.consensusStrength === 'HIGH' ? '🔥 3+ 强共识' : '⚡ 2 钱包共识'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {shortenAddress(sig.tokenAddress, 4)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <div>
                        参与聪明钱：
                        <span className="text-white font-mono font-medium">
                          {sig.walletCount} 个独立地址
                        </span>
                      </div>
                      <div>
                        共识买入量：
                        <span className="text-emerald-400 font-mono font-semibold">
                          {formatSol(sig.totalSolVolume, 2)}
                        </span>
                      </div>
                      <div>
                        时间跨度：
                        <span className="text-slate-300 font-mono">
                          {sig.timeSpanMinutes} 分钟内
                        </span>
                      </div>
                    </div>

                    {/* Participating smart wallets tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sig.participatingWallets?.map((w: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-slate-300 font-mono"
                        >
                          {w.label || shortenAddress(w.address, 3)} ({formatSol(w.buyAmountSol, 1)})
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => {
                        setSide('BUY');
                        setTokenAddress(sig.tokenAddress);
                        setTokenSymbol(sig.tokenSymbol || '');
                        setSolAmount('2.0');
                      }}
                      className="px-3 py-1.5 rounded bg-terminal-card hover:bg-terminal-hover border border-terminal-border text-slate-200 text-xs transition"
                    >
                      填入下单板 &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4-Layer Exit Guardian & Auto Cycle (1 col) */}
        <div className="terminal-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 border-b border-terminal-border/80 pb-3">
              <ShieldAlert className="w-5 h-5 text-roseScarf-400" />
              <div>
                <h3 className="text-sm font-bold text-white">4 层智能出场风控体系</h3>
                <p className="text-[11px] text-slate-400">杜绝“跟得进、逃不出”的踩踏陷阱</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                <div className="flex items-center justify-between text-rose-300 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Flame className="w-3.5 h-3.5" />
                    <span>第 1 道：首笔减仓全平</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">已防御</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  任一聪明钱只要开始卖出第一笔，不问数量立即 100% 卖出全平，绝不当接盘侠。
                </p>
              </div>

              <div className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                <div className="flex items-center justify-between text-rose-300 font-semibold">
                  <span className="flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>第 2 道：-20% 硬性止损</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">已设防</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  若由于假共识砸盘导致浮亏达到 20%，立即强平，保留元气。
                </p>
              </div>

              <div className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-semibold">
                  <span className="flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>第 3 道：+50% 保本止盈</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">已设防</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  浮盈触及 50% 时平仓一半锁定成本，剩余仓位让利润继续奔跑。
                </p>
              </div>

              <div className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                <div className="flex items-center justify-between text-iceBlue-300 font-semibold">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>第 4 道：2小时时效衰减</span>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-400">已设防</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  持仓满 2 小时未爆发直接离场，规避 Meme 币流动性枯竭死锁。
                </p>
              </div>
            </div>
          </div>

          {/* Run Cycle Button */}
          <div className="space-y-2 pt-2 border-t border-terminal-border/80">
            <button
              onClick={handleRunAutoCycle}
              disabled={runningAutoCycle}
              className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-roseScarf-600 to-roseScarf-500 hover:from-roseScarf-500 hover:to-roseScarf-400 text-white font-semibold text-xs transition shadow-lg shadow-roseScarf-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {runningAutoCycle ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>正在执行共识捕获与风控巡检...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>立即执行共识跟单与出场巡检</span>
                </>
              )}
            </button>

            {/* Cycle Report Output */}
            {cycleReport && (
              <div className="p-3 rounded bg-terminal-dark border border-emerald-500/40 text-[11px] space-y-1.5 animate-fadeIn">
                <div className="text-emerald-400 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>巡检已执行完毕</span>
                </div>
                <div className="text-slate-300">
                  发现共识标的：<span className="font-mono font-bold text-white">{cycleReport.detectedSignals?.length || 0}</span> 个
                </div>
                <div className="text-slate-300">
                  自动建仓执行：<span className="font-mono font-bold text-cyan-400">{cycleReport.autoBuysExecuted?.length || 0}</span> 笔
                </div>
                <div className="text-slate-300">
                  出场风控巡检：<span className="font-mono font-bold text-amber-400">{cycleReport.exitsEvaluated?.length || 0}</span> 个在仓标的
                </div>
                {cycleReport.exitsEvaluated?.filter((e: any) => e.executed).map((ex: any, idx: number) => (
                  <div key={idx} className="p-1.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono text-[10px]">
                    {ex.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Order Form + Open Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trade Simulation Form */}
        <div className="terminal-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-terminal-border/80 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>仿真下单终端</span>
            </h2>
            <div className="flex rounded p-0.5 bg-terminal-dark border border-terminal-border">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  side === 'BUY'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                买入 (BUY)
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  side === 'SELL'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                卖出 (SELL)
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleExecuteTrade} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">
                代币合约地址 (Mint) *
              </label>
              <input
                type="text"
                required
                placeholder="例如：DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  代币符号 (Symbol)
                </label>
                <input
                  type="text"
                  placeholder="例如：BONK"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  跟单钱包 (可选)
                </label>
                <input
                  type="text"
                  placeholder="例如：Whale111..."
                  value={targetWallet}
                  onChange={(e) => setTargetWallet(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {side === 'BUY' ? (
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  投入金额 (SOL) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  卖出比例 *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['0.25', '0.50', '1.0'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSellRatio(r)}
                      className={`py-1.5 rounded font-mono border transition ${
                        sellRatio === r
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold'
                          : 'bg-terminal-dark border-terminal-border text-slate-400 hover:text-white'
                      }`}
                    >
                      {parseFloat(r) * 100}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  代币单价 (SOL/Token) *
                </label>
                <input
                  type="number"
                  step="0.0000000001"
                  required
                  value={priceSol}
                  onChange={(e) => setPriceSol(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  模拟滑点 (Slippage)
                </label>
                <select
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="0.010">1.0% (标准池子)</option>
                  <option value="0.015">1.5% (推荐默认)</option>
                  <option value="0.030">3.0% (高波动 Meme)</option>
                </select>
              </div>
            </div>

            {/* Simulated Constraints notice */}
            <div className="p-2.5 rounded bg-terminal-dark/60 border border-terminal-border text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>网络与 Gas 预估：</span>
                <span className="font-mono text-slate-300">0.0005 SOL</span>
              </div>
              <div className="flex justify-between">
                <span>模拟信号排队延迟：</span>
                <span className="font-mono text-slate-300">1200 ms</span>
              </div>
              <div className="flex justify-between">
                <span>滑点后实际成交价：</span>
                <span className="font-mono text-iceBlue-300">
                  {side === 'BUY'
                    ? (parseFloat(priceSol) * (1 + parseFloat(slippage))).toFixed(10)
                    : (parseFloat(priceSol) * (1 - parseFloat(slippage))).toFixed(10)}{' '}
                  SOL
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2 rounded-lg font-semibold text-xs transition disabled:opacity-50 shadow-md ${
                side === 'BUY'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20'
              }`}
            >
              {submitting
                ? '撮合中...'
                : side === 'BUY'
                ? '确认模拟买入 (Paper Buy)'
                : '确认模拟平仓 (Paper Sell)'}
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Open Positions & History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Open Positions Card */}
          <div className="terminal-card overflow-hidden">
            <div className="px-4 py-3 bg-terminal-dark border-b border-terminal-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                当前在仓头寸 (Open Positions)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {openPositions.length} 个活跃持仓
              </span>
            </div>

            {openPositions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                当前无活跃持仓。可从上方共识雷达挑选标的，或直接执行一键巡检建立跟单头寸。
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-terminal-dark/60 text-slate-400 font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">代币标的</th>
                      <th className="px-3 py-2.5">持仓数量</th>
                      <th className="px-3 py-2.5">平均买入价</th>
                      <th className="px-3 py-2.5">总成本</th>
                      <th className="px-3 py-2.5">建仓时间</th>
                      <th className="px-4 py-2.5 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/60">
                    {openPositions.map((pos: any) => (
                      <tr
                        key={pos.id}
                        className="hover:bg-terminal-hover/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {pos.tokenSymbol || 'TOKEN'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {shortenAddress(pos.tokenAddress, 4)}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-300">
                          {pos.remainingTokens.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-300">
                          {pos.avgPriceSol.toFixed(9)} SOL
                        </td>
                        <td className="px-3 py-3 font-mono font-medium text-white">
                          {formatSol(pos.costSol, 3)}
                        </td>
                        <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                          {formatDate(pos.openedAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setSide('SELL');
                              setTokenAddress(pos.tokenAddress);
                              setTokenSymbol(pos.tokenSymbol || '');
                              setPriceSol(pos.avgPriceSol.toString());
                            }}
                            className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 text-[11px] transition"
                          >
                            平仓卖出 &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trade History Card */}
          <div className="terminal-card overflow-hidden">
            <div className="px-4 py-3 bg-terminal-dark border-b border-terminal-border flex items-center justify-between">
              <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                模拟撮合交易流水 (Audit Log)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                共 {tradeHistory.length} 笔交易
              </span>
            </div>

            {tradeHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                暂无模拟交易历史记录。
              </div>
            ) : (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-terminal-dark/60 text-slate-400 font-mono text-[11px] sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5">时间</th>
                      <th className="px-3 py-2.5">动作</th>
                      <th className="px-3 py-2.5">标的</th>
                      <th className="px-3 py-2.5">数量</th>
                      <th className="px-3 py-2.5">成交价 (含滑点)</th>
                      <th className="px-3 py-2.5">金额</th>
                      <th className="px-4 py-2.5 text-right">已实现盈亏</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terminal-border/60">
                    {tradeHistory.map((t: any) => (
                      <tr
                        key={t.id}
                        className="hover:bg-terminal-hover/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono text-slate-400 text-[11px]">
                          {formatDate(t.executedAt)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`terminal-badge text-[10px] ${
                              t.side === 'BUY' ? 'badge-green' : 'badge-red'
                            }`}
                          >
                            {t.side === 'BUY' ? '买入' : '平仓卖出'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-white">
                          {t.tokenSymbol || shortenAddress(t.tokenAddress, 3)}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">
                          {t.tokenAmount.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-300">
                          {t.priceSol.toFixed(9)} SOL
                        </td>
                        <td className="px-3 py-2.5 font-mono text-white">
                          {formatSol(t.solAmount, 3)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-medium">
                          {t.pnlSol !== null && t.pnlSol !== undefined ? (
                            <span
                              className={
                                t.pnlSol >= 0
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }
                            >
                              {t.pnlSol >= 0 ? '+' : ''}
                              {t.pnlSol.toFixed(3)} SOL ({formatPercent(t.pnlPercent)})
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaperTradingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 text-xs">
          正在载入模拟盘终端...
        </div>
      }
    >
      <PaperTradingContent />
    </Suspense>
  );
}
