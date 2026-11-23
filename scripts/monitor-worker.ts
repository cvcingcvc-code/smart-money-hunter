import 'dotenv/config';
import { monitorService } from '../src/lib/monitor/scheduler';

const INTERVAL_SEC = parseInt(process.env.MONITOR_POLL_INTERVAL_SEC || '30', 10);

async function runWorker() {
  console.log('====================================================');
  console.log('  Smart Money Hunter — Solana 链上监控后台 Worker  ');
  console.log(`  轮询周期: 每 ${INTERVAL_SEC} 秒 | 增量签名去重模式  `);
  console.log('  安全限制: 严禁自动执行真实交易，纯信号监听与记录  ');
  console.log('====================================================\n');

  let isRunning = true;

  const shutdown = () => {
    console.log('\n[Worker] 收到退出信号，正在安全停止...');
    isRunning = false;
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  let round = 1;

  while (isRunning) {
    const startTime = Date.now();
    console.log(`[Round #${round}] [${new Date().toLocaleTimeString()}] 开始巡检活跃监控钱包...`);

    try {
      const result = await monitorService.pollActiveWallets(20);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(
        `[Round #${round}] 完成: 检查 ${result.walletsChecked} 个钱包 | 新增交易 ${result.newTransactionsCount} 笔 | 新增告警 ${result.newAlertsCount} 条 (耗时 ${elapsed}s)`
      );

      if (result.newAlertsCount > 0) {
        for (const detail of result.details) {
          if (detail.alertsCreated > 0) {
            console.log(
              `  -> 钱包 ${detail.address.slice(0, 6)}...: +${detail.alertsCreated} 告警, +${detail.newTrades} 笔新交易`
            );
          }
        }
      }
    } catch (err) {
      console.error(`[Round #${round}] 轮询异常:`, err);
    }

    round++;
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_SEC * 1000));
  }
}

runWorker().catch((err) => {
  console.error('[Worker Fatal]', err);
  process.exit(1);
});
