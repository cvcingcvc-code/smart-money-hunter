import 'dotenv/config';
import { walletScanner } from '../src/lib/scanner/wallet-scanner';

async function main() {
  console.log('================================================================');
  console.log('  Smart Money Hunter — 100个赚钱钱包自动检测与批量分析引擎  ');
  console.log('  冬雪寒霜特别版 • 链上公开交易流挖掘 & 7大客观量化打标         ');
  console.log('================================================================\n');

  const startTime = Date.now();
  console.log('[1/3] 正在启动 100 个 Solana 活跃钱包链上检测扫描...');

  // Start scan
  const scanPromise = walletScanner.runFullScan(100);

  // Monitor progress
  const interval = setInterval(() => {
    const p = walletScanner.getProgress();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\r[${elapsed}s] 状态: ${p.status} | 已发现: ${p.discoveredCount}/100 | 已深度分析: ${p.analyzedCount}/100 | 盈利钱包: ${p.profitableCount} | 候选聪明钱: ${p.smartMoneyCount}`
    );
  }, 500);

  const finalProgress = await scanPromise;
  clearInterval(interval);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\n[2/3] 扫描分析完成！耗时: ${totalTime} 秒`);
  console.log(`----------------------------------------------------------------`);
  console.log(`总共检测钱包: ${finalProgress.discoveredCount}`);
  console.log(`完成指标计算与规则打标: ${finalProgress.analyzedCount}`);
  console.log(`已实现净盈利钱包 (PnL > 0): ${finalProgress.profitableCount} 个`);
  console.log(`锁定候选聪明钱大户 (胜率≥65% & PnL≥10 SOL): ${finalProgress.smartMoneyCount} 个`);
  console.log(`----------------------------------------------------------------\n`);

  console.log('[3/3] 正在拉取 Top 15 赚钱钱包排行榜与特征画像:\n');
  const topWallets = await walletScanner.getTopProfitableWallets(15);

  console.log(
    `排名 | 钱包地址 (Base58)                  | 别名               | 胜率   | 已实现盈利   | 样本交易 | 核心客观标签`
  );
  console.log(
    `-----+-------------------------------------+--------------------+--------+--------------+----------+--------------------`
  );

  for (const [idx, w] of topWallets.entries()) {
    const rank = `#${idx + 1}`.padEnd(4);
    const addr = w.address.slice(0, 35).padEnd(35);
    const label = (w.label || '未命名').slice(0, 18).padEnd(18);
    const winRate = w.metrics?.winRate ? `${w.metrics.winRate.toFixed(1)}%`.padEnd(6) : 'N/A   ';
    const pnl = w.metrics?.realizedPnlSol
      ? `+${w.metrics.realizedPnlSol.toFixed(2)} SOL`.padEnd(12)
      : '0.00 SOL    ';
    const trades = `${w.metrics?.totalTrades || 0}笔`.padEnd(8);
    const tagNames = w.tags.map((t) => t.displayName).join(', ');

    console.log(`${rank} | ${addr} | ${label} | ${winRate} | ${pnl} | ${trades} | ${tagNames}`);
  }

  console.log(`\n全部 100 个钱包数据已持久化至本地 SQLite 数据库中。`);
  console.log(`可在 Web 端工作台导航至「聪明钱雷达挖掘 (/scanner)」查看可视化漏斗与 AI 研报！\n`);
}

main().catch((err) => {
  console.error('[Scanner CLI Fatal Error]:', err);
  process.exit(1);
});
