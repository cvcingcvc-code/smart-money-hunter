'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { shortenAddress, formatSol, formatDate } from '@/lib/utils';
import { WalletCategory } from '@/types';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncingAddress, setSyncingAddress] = useState<string | null>(null);

  // New Wallet Form State
  const [formAddress, setFormAddress] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formCategory, setFormCategory] = useState<WalletCategory>('MEME_TRADER');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoSync, setFormAutoSync] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch wallets
  const fetchWallets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);

      const res = await fetch(`/api/wallets?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setWallets(data.data);
      }
    } catch (err) {
      console.error('Failed to load wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWallets();
  };

  // Add new wallet
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: formAddress,
          label: formLabel,
          category: formCategory,
          notes: formNotes,
          autoSync: formAutoSync,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setFormError(data.error || '添加失败');
      } else {
        setIsModalOpen(false);
        setFormAddress('');
        setFormLabel('');
        setFormNotes('');
        fetchWallets();
      }
    } catch (err: any) {
      setFormError(err.message || '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  // Trigger manual sync
  const handleSyncWallet = async (address: string) => {
    try {
      setSyncingAddress(address);
      const res = await fetch(`/api/wallets/${address}/sync?limit=15`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchWallets();
      } else {
        alert(data.error || '同步失败');
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncingAddress(null);
    }
  };

  // Toggle active monitoring
  const handleToggleActive = async (address: string, current: boolean) => {
    try {
      await fetch(`/api/wallets/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      fetchWallets();
    } catch (err) {
      console.error('Toggle active failed:', err);
    }
  };

  // Delete wallet
  const handleDeleteWallet = async (address: string) => {
    if (!confirm(`确定要移除监控钱包 ${shortenAddress(address, 4)} 吗？`)) return;

    try {
      const res = await fetch(`/api/wallets/${address}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchWallets();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const categories = [
    { key: 'ALL', label: '全部' },
    { key: 'MEME_TRADER', label: 'Meme 交易者' },
    { key: 'SMART_MONEY', label: '聪明钱' },
    { key: 'SNIPER', label: '狙击者' },
    { key: 'KOL', label: 'KOL 地址' },
    { key: 'UNKNOWN', label: '未归类' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-trade-accent" />
            <span>钱包研究与库管理</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            录入目标 Solana 地址，抓取历史 Swap 流水并由规则引擎完成量化特征识别
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>录入新地址</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="terminal-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategoryFilter(c.key)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                categoryFilter === c.key
                  ? 'bg-trade-accent/20 text-trade-accent border border-trade-accent/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-terminal-dark'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索地址 / 标签 / 备注..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs rounded bg-terminal-dark border border-terminal-border text-slate-200 placeholder-slate-500 focus:outline-none focus:border-trade-accent w-48 sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="px-2.5 py-1 rounded bg-terminal-hover border border-terminal-border text-slate-300 text-xs hover:bg-slate-800 transition"
          >
            筛选
          </button>
        </form>
      </div>

      {/* Wallets Table */}
      <div className="terminal-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            正在载入钱包库数据...
          </div>
        ) : wallets.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            没有找到匹配的钱包地址。点击右上角“录入新地址”开始研究。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-terminal-dark border-b border-terminal-border text-slate-400 font-mono text-[11px] uppercase">
                <tr>
                  <th className="px-4 py-3">钱包地址 / 备注</th>
                  <th className="px-3 py-3">分类</th>
                  <th className="px-3 py-3">监控状态</th>
                  <th className="px-3 py-3">交易流水</th>
                  <th className="px-3 py-3">胜率 / 盈亏</th>
                  <th className="px-3 py-3">特征标签</th>
                  <th className="px-3 py-3">上次同步</th>
                  <th className="px-4 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terminal-border/60">
                {wallets.map((w) => {
                  const isSyncing = syncingAddress === w.address;
                  const metrics = w.metrics;
                  return (
                    <tr
                      key={w.id}
                      className="hover:bg-terminal-hover/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-medium text-white">
                            {shortenAddress(w.address, 4)}
                          </span>
                          <a
                            href={`https://solscan.io/account/${w.address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-300"
                            title="在 Solscan 查看"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {w.label || w.notes || '无备注'}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className="terminal-badge badge-cyan text-[10px]">
                          {w.category}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleToggleActive(w.address, w.isActive)}
                          className={`terminal-badge cursor-pointer ${
                            w.isActive ? 'badge-green' : 'badge-gray'
                          }`}
                        >
                          {w.isActive ? '活跃监控' : '已暂停'}
                        </button>
                      </td>

                      <td className="px-3 py-3 font-mono text-slate-300">
                        {w._count?.transactions || metrics?.totalTrades || 0} 笔
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {metrics?.winRate !== null && metrics?.winRate !== undefined ? (
                          <div className="space-y-0.5">
                            <div className="text-emerald-400 font-semibold">
                              {metrics.winRate.toFixed(1)}% 胜率
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {metrics.realizedPnlSol
                                ? formatSol(metrics.realizedPnlSol, 1)
                                : '0.0 SOL'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            待同步计算
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {w.tags && w.tags.length > 0 ? (
                            w.tags.slice(0, 2).map((t: any) => (
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

                      <td className="px-3 py-3 text-slate-400 font-mono text-[11px]">
                        {w.lastSyncedAt ? formatDate(w.lastSyncedAt) : '从未'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleSyncWallet(w.address)}
                            disabled={isSyncing}
                            className="p-1 rounded bg-terminal-dark hover:bg-terminal-border text-slate-300 hover:text-white transition disabled:opacity-50"
                            title="拉取最新链上交易"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                isSyncing ? 'animate-spin text-trade-accent' : ''
                              }`}
                            />
                          </button>
                          <Link
                            href={`/wallets/${w.address}`}
                            className="p-1 rounded bg-terminal-dark hover:bg-terminal-border text-trade-accent hover:text-cyan-300 transition"
                            title="查看详情画像"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDeleteWallet(w.address)}
                            className="p-1 rounded bg-terminal-dark hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
                            title="删除钱包"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Wallet Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="terminal-card bg-terminal-darkest border-terminal-border max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-terminal-border/80 pb-3">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>录入新 Solana 钱包</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddWallet} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  Solana 钱包地址 (Base58 公钥) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    钱包标签 / 别名
                  </label>
                  <input
                    type="text"
                    placeholder="例如：Meme Whale Alpha"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">
                    初步分类
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as WalletCategory)}
                    className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 focus:outline-none focus:border-emerald-400"
                  >
                    <option value="MEME_TRADER">Meme 交易者</option>
                    <option value="SMART_MONEY">聪明钱候选</option>
                    <option value="SNIPER">狙击手</option>
                    <option value="KOL">KOL / 社区喊单</option>
                    <option value="UNKNOWN">未归类</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  投研备注 (可选)
                </label>
                <textarea
                  rows={2}
                  placeholder="记录该钱包历史胜率、典型持仓或关联推特账号..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-terminal-dark border border-terminal-border text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={formAutoSync}
                  onChange={(e) => setFormAutoSync(e.target.checked)}
                  className="rounded bg-terminal-dark border-terminal-border text-emerald-500 focus:ring-0"
                />
                <label htmlFor="autoSync" className="text-slate-300 cursor-pointer">
                  添加后立即自动同步链上最近交易流水
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-terminal-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-terminal-dark hover:bg-terminal-border text-slate-300 text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition disabled:opacity-50"
                >
                  {submitting ? '验证并保存中...' : '确认录入'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
