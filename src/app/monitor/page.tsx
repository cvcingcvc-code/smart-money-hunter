'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  RefreshCw,
  CheckCheck,
  Filter,
  ExternalLink,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { shortenAddress, formatSol, formatDate } from '@/lib/utils';

export default function MonitorPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.set('type', typeFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/monitor/alerts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setAlerts(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [typeFilter]);

  // Auto-polling interval
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchAlerts();
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, typeFilter]);

  const handleManualPoll = async () => {
    try {
      setPolling(true);
      const res = await fetch('/api/monitor/poll?limit=15', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAlerts();
      }
    } catch (err) {
      console.error('Manual poll failed:', err);
    } finally {
      setPolling(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/monitor/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      fetchAlerts();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const filters = [
    { key: 'ALL', label: '全部告警' },
    { key: 'NEW_BUY', label: '聪明钱买入' },
    { key: 'NEW_SELL', label: '聪明钱卖出' },
    { key: 'LARGE_SWAP', label: '大额交易' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <span>链上信号监控台</span>
            </h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-rose-500/20 text-rose-400 border border-rose-500/40">
                {unreadCount} 条新事件
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            实时轮询已激活监控的 Solana 钱包，自动捕获买卖动作、生成告警事件与 Paper Trading 模拟信号
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualPoll}
            disabled={polling}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            <Play className={`w-3.5 h-3.5 ${polling ? 'animate-spin' : ''}`} />
            <span>{polling ? '正在全网巡检...' : '即时巡检链上'}</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-terminal-dark hover:bg-terminal-card border border-terminal-border text-slate-300 text-xs transition disabled:opacity-40"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>全部标为已读</span>
          </button>
        </div>
      </div>

      {/* Filter and Status Controls */}
      <div className="terminal-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                typeFilter === f.key
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-terminal-dark'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-1.5 text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded bg-terminal-dark border-terminal-border text-trade-accent focus:ring-0"
            />
            <span>每 10 秒自动刷新</span>
          </label>

          <button
            onClick={fetchAlerts}
            className="p-1 rounded bg-terminal-dark hover:bg-terminal-hover text-slate-400 hover:text-white transition"
            title="刷新数据"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Safety Banner */}
      <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            系统约束保障：监控模块仅记录链上客观事件并触发站内提醒，绝不自动执行任何真实链上交易。
          </span>
        </div>
        <Link
          href="/paper-trading"
          className="text-trade-accent hover:underline text-xs shrink-0 ml-2"
        >
          前往模拟复盘 &rarr;
        </Link>
      </div>

      {/* Alerts Feed */}
      <div className="terminal-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            正在载入最新监控事件...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center space-y-2 text-slate-500 text-xs">
            <p>暂无捕获到的监控告警事件。</p>
            <p className="text-slate-600">
              请确保已录入活跃钱包并开启监控，也可点击右上角「即时巡检链上」抓取最新签名。
            </p>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/60">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  alert.isRead ? 'bg-terminal-card/20' : 'bg-terminal-card/80'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <span
                      className={`terminal-badge ${
                        alert.alertType === 'NEW_BUY'
                          ? 'badge-green'
                          : alert.alertType === 'NEW_SELL'
                          ? 'badge-red'
                          : 'badge-purple'
                      }`}
                    >
                      {alert.alertType === 'NEW_BUY'
                        ? '买入'
                        : alert.alertType === 'NEW_SELL'
                        ? '卖出'
                        : '大额交易'}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white text-xs">
                        {alert.title}
                      </span>
                      {!alert.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-xs text-slate-300">{alert.message}</p>
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                      <Link
                        href={`/wallets/${alert.walletAddress}`}
                        className="font-mono text-trade-accent hover:underline"
                      >
                        {alert.wallet?.label || shortenAddress(alert.walletAddress, 4)}
                      </Link>
                      <span>•</span>
                      <span>发生时间: {formatDate(alert.createdAt)}</span>
                      <span>•</span>
                      <a
                        href={`https://solscan.io/tx/${alert.signature}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 flex items-center"
                      >
                        Solscan <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:self-center shrink-0">
                  <div className="text-right mr-2 hidden sm:block">
                    <div className="text-xs font-mono font-medium text-white">
                      {alert.amountSol ? formatSol(alert.amountSol, 2) : '-'}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {alert.tokenSymbol || shortenAddress(alert.tokenAddress, 3)}
                    </div>
                  </div>

                  <Link
                    href={`/paper-trading?wallet=${alert.walletAddress}&token=${alert.tokenAddress}&side=${
                      alert.alertType === 'NEW_BUY' ? 'BUY' : 'SELL'
                    }`}
                    className="px-2.5 py-1 rounded bg-terminal-dark hover:bg-terminal-border border border-terminal-border text-cyan-400 hover:text-cyan-300 text-xs transition"
                  >
                    模拟跟单 &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
