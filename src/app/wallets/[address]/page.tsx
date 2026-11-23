'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wallet,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  Tag,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldAlert,
  Percent,
  Layers,
  Activity,
  Bot,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { shortenAddress, formatSol, formatUsd, formatPercent, formatDate } from '@/lib/utils';

export default function WalletDetailPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;

  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'txs' | 'tags' | 'ai'>('txs');

  const fetchWalletDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wallets/${address}`);
      const data = await res.json();
      if (data.success) {
        setWallet(data.data);
      }
    } catch (err) {
      console.error('Failed to load wallet detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) fetchWalletDetail();
  }, [address]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`/api/wallets/${address}/sync?limit=25`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        // Also recalculate metrics & tags
        await fetch(`/api/wallets/${address}/calculate`, { method: 'POST' }).catch(() => {});
        fetchWalletDetail();
      } else {
        alert(data.error || '同步失败');
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAiReport = async () => {
    try {
      setAiGenerating(true);
      const res = await fetch(`/api/wallets/${address}/ai-report`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchWalletDetail();
        setActiveTab('ai');
      } else {
        alert(data.error || '生成研报失败');
      }
    } catch (err) {
      console.error('AI Report generation failed:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-trade-accent" />
        正在载入钱包投研档案...
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-slate-400 text-sm">未找到钱包 {address}</p>
        <Link href="/wallets" className="text-trade-accent text-xs hover:underline">
          &larr; 返回钱包库列表
        </Link>
      </div>
    );
  }

  const metrics = wallet.metrics;
  const tags = wallet.tags || [];
  const transactions = wallet.transactions || [];
  const latestAiReport = wallet.aiReports?.[0];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/wallets"
            className="p-1.5 rounded-lg bg-terminal-dark hover:bg-terminal-card border border-terminal-border text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold font-mono text-white">
                {shortenAddress(wallet.address, 6)}
              </h1>
              <span className="terminal-badge badge-rose text-[10px]">
                {wallet.category}
              </span>
              <span
                className={`terminal-badge text-[10px] ${
                  wallet.isActive ? 'badge-green' : 'badge-gray'
                }`}
              >
                {wallet.isActive ? '监控中' : '未监控'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {wallet.label || '无别名'} • 录入于 {formatDate(wallet.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-terminal-card hover:bg-terminal-hover border border-terminal-border text-slate-200 text-xs transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-trade-accent ${
                syncing ? 'animate-spin' : ''
              }`}
            />
            <span>{syncing ? '链上同步中...' : '同步最新交易'}</span>
          </button>

          <button
            onClick={handleGenerateAiReport}
            disabled={aiGenerating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition shadow-md shadow-purple-600/20 disabled:opacity-50"
          >
            <Bot className="w-4 h-4" />
            <span>{aiGenerating ? 'AI 分析中...' : '生成 AI 研报'}</span>
          </button>

          <a
            href={`https://solscan.io/account/${wallet.address}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-terminal-dark border border-terminal-border text-slate-400 hover:text-white text-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Solscan</span>
          </a>
        </div>
      </div>

      {/* Metrics Dossier Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Win Rate */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>胜率 (已平仓)</span>
            <Percent className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-emerald-400">
            {metrics?.winRate !== null && metrics?.winRate !== undefined
              ? `${metrics.winRate.toFixed(1)}%`
              : '不可用'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics?.sellTrades || 0} 笔卖单样本
          </div>
        </div>

        {/* Realized PnL */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>已实现盈亏</span>
            <TrendingUp className="w-3.5 h-3.5 text-trade-accent" />
          </div>
          <div
            className={`mt-1 text-lg font-bold font-mono ${
              (metrics?.realizedPnlSol || 0) >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {metrics?.realizedPnlSol !== null && metrics?.realizedPnlSol !== undefined
              ? `${metrics.realizedPnlSol >= 0 ? '+' : ''}${metrics.realizedPnlSol.toFixed(2)} SOL`
              : '不可用'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            估值: {formatUsd(metrics?.realizedPnlUsd)}
          </div>
        </div>

        {/* Total Trades */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>总交易数 (买/卖)</span>
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            {metrics?.totalTrades || transactions.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            买 {metrics?.buyTrades || 0} / 卖 {metrics?.sellTrades || 0}
          </div>
        </div>

        {/* Trade Frequency */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>日均交易频次</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            {metrics?.tradeFrequencyPerDay !== undefined
              ? `${metrics.tradeFrequencyPerDay.toFixed(1)} 笔/日`
              : '0 笔/日'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            持仓均长:{' '}
            {metrics?.avgHoldDurationHours
              ? `${metrics.avgHoldDurationHours.toFixed(1)}h`
              : '不可用'}
          </div>
        </div>

        {/* Concentration & Risk */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>持仓集中度</span>
            <Layers className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-1 text-lg font-bold font-mono text-white">
            {metrics?.concentrationScore !== undefined
              ? `${metrics.concentrationScore.toFixed(0)} / 100`
              : '0'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            风险指数: {metrics?.riskScore || 0}/100
          </div>
        </div>

        {/* Data Reliability */}
        <div className="terminal-card p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>数据可靠性</span>
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="mt-1">
            <span
              className={`terminal-badge text-[11px] ${
                metrics?.dataReliability === 'HIGH'
                  ? 'badge-green'
                  : metrics?.dataReliability === 'MEDIUM'
                  ? 'badge-cyan'
                  : 'badge-amber'
              }`}
            >
              {metrics?.dataReliability || 'INSUFFICIENT_DATA'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            样本量: {metrics?.sampleSize || transactions.length} 笔
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-terminal-border/80">
        <button
          onClick={() => setActiveTab('txs')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'txs'
              ? 'border-roseScarf-400 text-roseScarf-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>链上交易明细 ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tags')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'tags'
              ? 'border-roseScarf-400 text-roseScarf-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>规则标签透视 ({tags.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI 投研分析报告 {latestAiReport ? '✓' : ''}</span>
        </button>
      </div>

      {/* Tab 1: Transactions Table */}
      {activeTab === 'txs' && (
        <div className="terminal-card overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <p>暂无已解析的交易流水。</p>
              <button
                onClick={handleSync}
                className="inline-flex items-center px-3 py-1.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs hover:bg-emerald-500/30 transition"
              >
                从 Solana RPC 抓取交易
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-terminal-dark border-b border-terminal-border text-slate-400 font-mono text-[11px] uppercase">
                  <tr>
                    <th className="px-4 py-3">交易签名</th>
                    <th className="px-3 py-3">时间</th>
                    <th className="px-3 py-3">动作</th>
                    <th className="px-3 py-3">代币</th>
                    <th className="px-3 py-3">代币数量</th>
                    <th className="px-3 py-3">SOL 金额</th>
                    <th className="px-3 py-3">Gas 费</th>
                    <th className="px-3 py-3">路由协议</th>
                    <th className="px-4 py-3 text-right">链上凭证</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-border/60">
                  {transactions.map((tx: any) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-terminal-hover/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-slate-200">
                        {shortenAddress(tx.signature, 5)}
                      </td>
                      <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                        {formatDate(tx.blockTime)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`terminal-badge text-[10px] ${
                            tx.type === 'BUY'
                              ? 'badge-green'
                              : tx.type === 'SELL'
                              ? 'badge-red'
                              : 'badge-gray'
                          }`}
                        >
                          {tx.type === 'BUY'
                            ? '买入'
                            : tx.type === 'SELL'
                            ? '卖出'
                            : tx.type}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-medium text-white">
                        {tx.tokenSymbol || shortenAddress(tx.tokenAddress, 3)}
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-300">
                        {tx.tokenAmount ? tx.tokenAmount.toLocaleString() : '-'}
                      </td>
                      <td className="px-3 py-3 font-mono font-medium">
                        <span
                          className={
                            tx.type === 'BUY'
                              ? 'text-emerald-400'
                              : tx.type === 'SELL'
                              ? 'text-rose-400'
                              : 'text-slate-300'
                          }
                        >
                          {formatSol(tx.solAmount, 3)}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-slate-500 text-[11px]">
                        {tx.feeSol ? formatSol(tx.feeSol, 5) : '0.00005 SOL'}
                      </td>
                      <td className="px-3 py-3">
                        <span className="terminal-badge badge-purple text-[10px]">
                          {tx.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`https://solscan.io/tx/${tx.signature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-trade-accent hover:underline text-[11px]"
                        >
                          查看 &rarr;
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Rule Engine Tags */}
      {activeTab === 'tags' && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-terminal-dark/60 border border-terminal-border text-xs text-slate-300">
            <span className="font-semibold text-trade-accent">
              客观规则打标机制说明：
            </span>{' '}
            所有客观标签均由硬性量化指标触发，严格杜绝 AI 幻觉决定。每个标签均附带完整判定条件、实际参数值及有效样本量。
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tags.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-slate-500 text-xs">
                暂无触发的规则标签（可能是交易样本量不足或尚未完成计算）。
              </div>
            ) : (
              tags.map((tag: any) => (
                <div key={tag.id} className="terminal-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="terminal-badge badge-green text-xs font-bold">
                      {tag.displayName}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">
                      置信度: {(tag.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="space-y-1 text-xs">
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">触发规则:</span>{' '}
                      {tag.triggerCondition}
                    </div>
                    <div className="text-slate-400">
                      <span className="text-slate-500 font-medium">实际量化值:</span>{' '}
                      <span className="font-mono text-emerald-400">
                        {tag.metricValues}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] flex items-center justify-between pt-1 border-t border-terminal-border/60">
                      <span>样本量: {tag.sampleSize} 笔</span>
                      <span>计算时间: {formatDate(tag.calculatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: AI Intelligence Report */}
      {activeTab === 'ai' && (
        <div className="terminal-card p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-terminal-border/80 pb-3">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-bold text-white">
                AI 链上智能研报与钱包画像
              </h2>
            </div>
            <button
              onClick={handleGenerateAiReport}
              disabled={aiGenerating}
              className="text-xs px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition disabled:opacity-50"
            >
              {aiGenerating ? '研报生成中...' : '重新生成研报'}
            </button>
          </div>

          {!latestAiReport ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <p className="text-xs">
                尚未为该钱包生成 AI 投研报告。AI 将严格基于客观链上流水与指标进行结构化推演。
              </p>
              <button
                onClick={handleGenerateAiReport}
                disabled={aiGenerating}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs shadow-md transition disabled:opacity-50"
              >
                立即生成 AI 研报
              </button>
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Recommendation pill */}
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">继续观察建议：</span>
                <span
                  className={`terminal-badge ${
                    latestAiReport.watchRecommendation === 'RECOMMEND'
                      ? 'badge-green'
                      : latestAiReport.watchRecommendation === 'NEUTRAL'
                      ? 'badge-cyan'
                      : 'badge-red'
                  }`}
                >
                  {latestAiReport.watchRecommendation === 'RECOMMEND'
                    ? '建议重点跟进 (RECOMMEND)'
                    : latestAiReport.watchRecommendation === 'NEUTRAL'
                    ? '保持中性观察 (NEUTRAL)'
                    : '高危回避 (AVOID)'}
                </span>
                <span className="text-slate-500 font-mono text-[11px] ml-auto">
                  模型: {latestAiReport.modelName} • 生成于{' '}
                  {formatDate(latestAiReport.generatedAt)}
                </span>
              </div>

              {/* 4 Core Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                  <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    <span>钱包交易习惯</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {latestAiReport.tradingHabits}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                  <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>潜在核心优势</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {latestAiReport.potentialAdvantages}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                  <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>主要风险提示</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {latestAiReport.majorRisks}
                  </p>
                </div>

                <div className="p-3.5 rounded bg-terminal-dark/60 border border-terminal-border space-y-1">
                  <h3 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>数据可靠性与样本评价</span>
                  </h3>
                  <p className="text-slate-300 leading-relaxed">
                    {latestAiReport.dataReliability}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
