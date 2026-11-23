'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  TrendingUp,
  Sparkles,
  Bot,
  Activity,
  LineChart,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { shortenAddress, formatSol, formatDate } from '@/lib/utils';

export default function DailyReviewPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/daily-review');
      const data = await res.json();
      if (data.success) {
        setReviews(data.data);
      }
    } catch (err) {
      console.error('Failed to load daily reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleGenerateTodayReview = async () => {
    try {
      setGenerating(true);
      const res = await fetch('/api/daily-review', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchReviews();
      } else {
        alert(data.error || '生成复盘失败');
      }
    } catch (err) {
      console.error('Generate review failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const latestReview = reviews[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-trade-accent" />
              <span>每日投研复盘简报</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              数据驱动 / 自动聚合
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            汇总当日链上监控钱包的信号捕获、候选聪明钱表现排名、Paper Trading 模拟盈亏与宏观市场观察
          </p>
        </div>

        <button
          onClick={handleGenerateTodayReview}
          disabled={generating}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
        >
          <Sparkles className="w-4 h-4" />
          <span>{generating ? '正在聚合数据生成中...' : '生成今日复盘报告'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          正在载入每日复盘记录...
        </div>
      ) : !latestReview ? (
        <div className="terminal-card p-12 text-center space-y-3">
          <CalendarCheck className="w-10 h-10 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-white">暂无今日复盘报告</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            点击上方按钮，系统将自动汇总全库钱包流水、规则打标结果与模拟盘执行记录，生成结构化复盘简报。
          </p>
          <button
            onClick={handleGenerateTodayReview}
            disabled={generating}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition"
          >
            立即生成今日复盘
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Today's Review Dossier */}
          <div className="terminal-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-terminal-border/80 pb-4">
              <div>
                <span className="text-[11px] font-mono text-trade-accent">
                  复盘周期: {latestReview.reviewDate}
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Solana Meme 币钱包投研每日总结
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                归档于: {formatDate(latestReview.createdAt)}
              </span>
            </div>

            {/* Executive Summary */}
            <div className="p-4 rounded-lg bg-terminal-dark/60 border border-terminal-border space-y-2">
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>核心执行摘要 (Executive Summary)</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {latestReview.summary}
              </p>
            </div>

            {/* Market Insight & Paper Trading performance */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-terminal-dark/60 border border-terminal-border space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>链上市场观察与异动特征</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {latestReview.marketInsight}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-terminal-dark/60 border border-terminal-border space-y-2">
                <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <LineChart className="w-3.5 h-3.5 text-purple-400" />
                  <span>模拟跟单与 Paper Trading 复盘表现</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {latestReview.paperTradeStats}
                </p>
              </div>
            </div>

            {/* Top Performers */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center space-x-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>当日重点观察与候选聪明钱榜单</span>
              </h3>
              <div className="p-3 rounded-lg bg-terminal-dark/40 border border-terminal-border text-xs text-slate-300 font-mono whitespace-pre-line">
                {latestReview.topPerformers}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
