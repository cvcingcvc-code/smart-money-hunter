'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Tag,
  Zap,
  Clock,
  Sparkles,
  TrendingDown,
  Layers,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { shortenAddress, formatDate } from '@/lib/utils';

const TAG_CONFIGS = [
  {
    tag: 'CANDIDATE_SMART_MONEY',
    name: '候选聪明钱',
    icon: Sparkles,
    color: 'badge-green',
    threshold: '胜率 ≥ 65% 且 已实现盈亏 ≥ 10.0 SOL 且 样本量 ≥ 8',
    desc: '在多笔交易闭环中展现持续正期望收益与稳健胜率的大户钱包。',
  },
  {
    tag: 'EARLY_BUYER',
    name: '早期买入',
    icon: Zap,
    color: 'badge-cyan',
    threshold: '开盘极早期（Pump.fun/内盘开盘）买入次数 ≥ 2',
    desc: '具备极早发现新池子并果断开仓的能力，通常为狙击或一手消息源。',
  },
  {
    tag: 'HIGH_FREQUENCY',
    name: '高频交易',
    icon: Clock,
    color: 'badge-purple',
    threshold: '日均交易频次 ≥ 15 笔/日 或 样本内总交易数 ≥ 30 笔',
    desc: '日内交易极频繁，通常为算法做市机器人或网格刷量脚本。',
  },
  {
    tag: 'SHORT_TERM_TRADER',
    name: '短线交易',
    icon: Clock,
    color: 'badge-amber',
    threshold: '平均持仓时长 ≤ 3.0 小时 且 平仓卖单 ≥ 2 笔',
    desc: '超短线快速获利即走或止损果断，不进行长期持币。',
  },
  {
    tag: 'HIGH_CONCENTRATION',
    name: '高集中度',
    icon: Layers,
    color: 'badge-purple',
    threshold: '前 2 大代币占总流水比例 ≥ 65%',
    desc: '持仓极其集中，偏好重仓单一标的，博取高倍赔率。',
  },
  {
    tag: 'HIGH_RISK',
    name: '高风险',
    icon: TrendingDown,
    color: 'badge-red',
    threshold: '胜率 < 35% (样本≥5) 或 风险指数 ≥ 60',
    desc: '存在频繁追高踩坑、深度套牢或大幅回撤特征，需谨慎跟单。',
  },
  {
    tag: 'INSUFFICIENT_DATA',
    name: '数据不足',
    icon: ShieldAlert,
    color: 'badge-gray',
    threshold: '样本量 < 5 笔 或 缺乏平仓卖单记录',
    desc: '流水样本过少，不足以构成客观统计结论，不作主观臆断。',
  },
];

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState<string>('CANDIDATE_SMART_MONEY');
  const [tagStats, setTagStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTagStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/wallets?limit=100');
        const data = await res.json();
        if (data.success) {
          setTagStats(data.data);
        }
      } catch (err) {
        console.error('Failed to load wallets for tags:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTagStats();
  }, []);

  // Filter wallets that have selectedTag
  const matchedWallets = tagStats.filter((w) =>
    w.tags?.some((t: any) => t.tag === selectedTag)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center space-x-2">
          <Tag className="w-5 h-5 text-roseScarf-300" />
          <span>7 大客观规则打标系统</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          系统完全基于链上客观指标、数学公式与阈值进行标签判定，严禁 AI
          随意虚构标签，支持完整可溯源证据链。
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TAG_CONFIGS.map((cfg) => {
          const Icon = cfg.icon;
          const isSelected = selectedTag === cfg.tag;
          const count = tagStats.filter((w) =>
            w.tags?.some((t: any) => t.tag === cfg.tag)
          ).length;

          return (
            <div
              key={cfg.tag}
              onClick={() => setSelectedTag(cfg.tag)}
              className={`terminal-card p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-roseScarf-400 bg-white/10 shadow-lg ring-1 ring-roseScarf-500/30'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-roseScarf-500/10 text-roseScarf-300 border border-roseScarf-500/20">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-white text-sm">
                    {cfg.name}
                  </span>
                </div>
                <span className={`terminal-badge ${cfg.color}`}>
                  {count} 个钱包
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {cfg.desc}
              </p>

              <div className="mt-3 pt-2.5 border-t border-terminal-border/60 text-[11px] text-slate-400">
                <span className="text-slate-500 font-mono">判定阈值: </span>
                <span className="font-mono text-slate-300">{cfg.threshold}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matching Wallets for Selected Tag */}
      <div className="terminal-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-trade-accent" />
            <h2 className="text-sm font-bold text-white">
              触发「{TAG_CONFIGS.find((c) => c.tag === selectedTag)?.name}」标签的钱包 (
              {matchedWallets.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            点击进入钱包详情查看完整证据链
          </span>
        </div>

        {matchedWallets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            当前暂无钱包触发此标签。可在钱包管理页点击“同步交易”更新最新链上流水。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchedWallets.map((wallet) => {
              const matchedTagObj = wallet.tags?.find(
                (t: any) => t.tag === selectedTag
              );
              return (
                <div
                  key={wallet.id}
                  className="p-3.5 rounded bg-terminal-dark/60 border border-terminal-border hover:border-slate-600 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-white text-xs">
                      {shortenAddress(wallet.address, 5)}
                    </span>
                    <span className="terminal-badge badge-cyan text-[10px]">
                      {wallet.category}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    {wallet.label || '无别名'}
                  </div>

                  {matchedTagObj && (
                    <div className="p-2 rounded bg-terminal-darker text-[11px] font-mono text-emerald-400 border border-emerald-500/20">
                      触发参数: {matchedTagObj.metricValues}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-terminal-border/60">
                    <span>样本量: {matchedTagObj?.sampleSize || 0} 笔</span>
                    <Link
                      href={`/wallets/${wallet.address}`}
                      className="text-trade-accent hover:underline flex items-center"
                    >
                      查看研报 <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
