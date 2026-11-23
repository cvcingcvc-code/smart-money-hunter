import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 20+ Solana sample wallets for Meme research
const initialWallets = [
  {
    address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    label: 'Raydium Protocol Master',
    category: 'UNKNOWN',
    notes: 'Raydium 核心流动性路由参考地址',
  },
  {
    address: 'Whale111111111111111111111111111111111111111',
    label: 'Meme Sniper Alpha',
    category: 'SNIPER',
    notes: '早期 Pump.fun 狙击地址，平均开盘 3 秒内买入',
  },
  {
    address: 'Smart333333333333333333333333333333333333333',
    label: 'Candidate Smart Money #1',
    category: 'SMART_MONEY',
    notes: '多轮 Meme 币波段获利，胜率 > 70%',
  },
  {
    address: 'Smart444444444444444444444444444444444444444',
    label: 'Candidate Smart Money #2',
    category: 'SMART_MONEY',
    notes: '重仓单个 Meme 币且止盈果断',
  },
  {
    address: 'Kol55555555555555555555555555555555555555555',
    label: 'Crypto Twitter KOL Tracker',
    category: 'KOL',
    notes: '链上喊单同频监控地址',
  },
  {
    address: 'HighFreq666666666666666666666666666666666666',
    label: 'High Frequency Bot 01',
    category: 'MEME_TRADER',
    notes: '高频套利与小额做市机器人',
  },
  {
    address: 'Risky777777777777777777777777777777777777777',
    label: 'Degen High Risk Gambler',
    category: 'MEME_TRADER',
    notes: '频繁追高，回撤较大',
  },
  {
    address: 'Early888888888888888888888888888888888888888',
    label: 'Early Buyer Specialist',
    category: 'SNIPER',
    notes: '专注于极低池子代币买入',
  },
  {
    address: 'Concen99999999999999999999999999999999999999',
    label: 'High Concentration Whale',
    category: 'MEME_TRADER',
    notes: '单币仓位占比 > 85%',
  },
  {
    address: 'Short101010101010101010101010101010101010101',
    label: 'Scalp Trader Quick Flip',
    category: 'MEME_TRADER',
    notes: '平均持仓时长低于 30 分钟',
  },
  {
    address: 'SolanaFund1111111111111111111111111111111111',
    label: 'Community Meme Treasury',
    category: 'KOL',
    notes: '社区金库冷热交互地址',
  },
  {
    address: 'BotTrader1212121212121212121212121212121212',
    label: 'Mev Arb Sandwich Searcher',
    category: 'UNKNOWN',
    notes: '链上套利交易者',
  },
  {
    address: 'BonkWhale1313131313131313131313131313131313',
    label: 'Bonk / Wif Early Diamond Hand',
    category: 'SMART_MONEY',
    notes: '历史持有周期超过 30 天的大户',
  },
  {
    address: 'PumpKing14141414141414141414141414141414141',
    label: 'Pump.fun Internal Scalper',
    category: 'MEME_TRADER',
    notes: '只在 Pump 曲线内交易',
  },
  {
    address: 'DevWallet1515151515151515151515151515151515',
    label: 'Meme Deployer Suspicious',
    category: 'UNKNOWN',
    notes: '发币方关联关联地址',
  },
  {
    address: 'AlphaFinder16161616161616161616161616161616',
    label: 'Alpha Signal Follower',
    category: 'SMART_MONEY',
    notes: '多地址协同操作',
  },
  {
    address: 'CopyTrade1717171717171717171717171717171717',
    label: 'Follow Bot 07',
    category: 'MEME_TRADER',
    notes: '跟单型机器人',
  },
  {
    address: 'SwingKing1818181818181818181818181818181818',
    label: 'Meme Swing Trader',
    category: 'SMART_MONEY',
    notes: '波段策略执行者',
  },
  {
    address: 'TestAddress19191919191919191919191919191919',
    label: 'Testing Address Beta',
    category: 'MEME_TRADER',
    notes: '样本对照组测试地址',
  },
  {
    address: 'TestAddress20202020202020202020202020202020',
    label: 'Newbie Inactive Wallet',
    category: 'UNKNOWN',
    notes: '数据不足对照组钱包',
  },
  {
    address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    label: 'Raydium Liquidity Pool V4',
    category: 'UNKNOWN',
    notes: '知名公开 AMM 路由池合约地址',
  },
];

async function main() {
  console.log('Seeding initial wallets and sample data...');

  for (const w of initialWallets) {
    await prisma.wallet.upsert({
      where: { address: w.address },
      update: {
        label: w.label,
        category: w.category,
        notes: w.notes,
      },
      create: {
        address: w.address,
        label: w.label,
        category: w.category,
        notes: w.notes,
        isActive: true,
      },
    });
  }

  // Seed sample metrics & tags for Candidate Smart Money #1
  const smart1 = 'Smart333333333333333333333333333333333333333';
  await prisma.walletMetrics.upsert({
    where: { walletAddress: smart1 },
    update: {},
    create: {
      walletAddress: smart1,
      totalTrades: 28,
      buyTrades: 16,
      sellTrades: 12,
      winRate: 75.0,
      realizedPnlSol: 42.65,
      realizedPnlUsd: 8530.0,
      avgHoldDurationHours: 4.5,
      tradeFrequencyPerDay: 7.2,
      earlyEntryCount: 9,
      concentrationScore: 48.0,
      riskScore: 25.0,
      sampleSize: 28,
      dataReliability: 'HIGH',
    },
  });

  await prisma.walletTag.upsert({
    where: {
      walletAddress_tag: {
        walletAddress: smart1,
        tag: 'CANDIDATE_SMART_MONEY',
      },
    },
    update: {},
    create: {
      walletAddress: smart1,
      tag: 'CANDIDATE_SMART_MONEY',
      displayName: '候选聪明钱',
      triggerCondition: '胜率 >= 65% 且 已实现盈亏 > 10 SOL 且 样本量 >= 10',
      metricValues: JSON.stringify({ winRate: 75.0, realizedPnlSol: 42.65, sampleSize: 28 }),
      sampleSize: 28,
      confidence: 0.95,
    },
  });

  await prisma.walletTag.upsert({
    where: {
      walletAddress_tag: {
        walletAddress: smart1,
        tag: 'EARLY_BUYER',
      },
    },
    update: {},
    create: {
      walletAddress: smart1,
      tag: 'EARLY_BUYER',
      displayName: '早期买入',
      triggerCondition: '早期买入次数 >= 3 且 占比 >= 20%',
      metricValues: JSON.stringify({ earlyEntryCount: 9, totalBuys: 16, ratio: 0.56 }),
      sampleSize: 28,
      confidence: 0.9,
    },
  });

  // Seed sample transactions
  await prisma.transaction.upsert({
    where: { signature: 'sig_seed_smart1_buy_pepe' },
    update: {},
    create: {
      signature: 'sig_seed_smart1_buy_pepe',
      walletAddress: smart1,
      blockTime: new Date(Date.now() - 3600 * 1000 * 5),
      slot: 312000100,
      type: 'BUY',
      tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      tokenSymbol: 'BONK',
      tokenName: 'Bonk',
      tokenAmount: 50000000,
      solAmount: 5.5,
      usdAmount: 1100,
      feeSol: 0.00005,
      source: 'RAYDIUM',
    },
  });

  await prisma.transaction.upsert({
    where: { signature: 'sig_seed_smart1_sell_pepe' },
    update: {},
    create: {
      signature: 'sig_seed_smart1_sell_pepe',
      walletAddress: smart1,
      blockTime: new Date(Date.now() - 3600 * 1000 * 2),
      slot: 312004200,
      type: 'SELL',
      tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      tokenSymbol: 'BONK',
      tokenName: 'Bonk',
      tokenAmount: 50000000,
      solAmount: 9.8,
      usdAmount: 1960,
      feeSol: 0.00005,
      source: 'RAYDIUM',
    },
  });

  // Seed sample alerts
  await prisma.monitorAlert.create({
    data: {
      walletAddress: smart1,
      signature: 'sig_seed_alert_01',
      alertType: 'NEW_BUY',
      title: '聪明钱新建仓',
      message: '买入 5.5 SOL 的 BONK 代币',
      tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      tokenSymbol: 'BONK',
      amountSol: 5.5,
      isRead: false,
    },
  });

  console.log(`Database seeded successfully! Total wallets: ${initialWallets.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
