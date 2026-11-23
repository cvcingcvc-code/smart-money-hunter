import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { shortenAddress, formatSol, formatPercent } from '../src/lib/utils';

describe('Step 1 Verification: Database & Foundation Layer', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should have initialized at least 20 sample wallets', async () => {
    const count = await prisma.wallet.count();
    expect(count).toBeGreaterThanOrEqual(20);
  });

  it('should support querying candidate smart money with metrics and tags', async () => {
    const smartWallet = await prisma.wallet.findFirst({
      where: {
        tags: {
          some: { tag: 'CANDIDATE_SMART_MONEY' },
        },
      },
      include: {
        metrics: true,
        tags: true,
        transactions: true,
      },
    });

    expect(smartWallet).toBeDefined();
    expect(smartWallet?.metrics).toBeDefined();
    expect(smartWallet?.metrics?.winRate).toBeGreaterThanOrEqual(65);
    expect(smartWallet?.tags.length).toBeGreaterThanOrEqual(1);
  });

  it('should correctly format Solana utilities and addresses', () => {
    const address = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
    expect(shortenAddress(address, 4)).toBe('5Q54...e4j1');
    expect(formatSol(12.3456, 2)).toBe('12.35 SOL');
    expect(formatPercent(15.25)).toBe('+15.3%');
    expect(formatPercent(-5.4)).toBe('-5.4%');
  });

  it('should support CRUD operations on MonitorAlert, PaperTrade, and AiReport', async () => {
    // 1. MonitorAlert creation
    const alert = await prisma.monitorAlert.create({
      data: {
        walletAddress: 'Whale111111111111111111111111111111111111111',
        signature: 'test_alert_sig_' + Date.now(),
        alertType: 'NEW_BUY',
        title: '测试告警',
        message: '买入 2.0 SOL 代币',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      },
    });
    expect(alert.id).toBeDefined();

    // 2. PaperTrade creation
    const paperTrade = await prisma.paperTrade.create({
      data: {
        walletAddress: 'Whale111111111111111111111111111111111111111',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenSymbol: 'BONK',
        side: 'BUY',
        solAmount: 2.0,
        tokenAmount: 10000000,
        priceSol: 0.0000002,
        slippage: 0.015,
        feeSol: 0.0005,
      },
    });
    expect(paperTrade.id).toBeDefined();
    expect(paperTrade.status).toBe('FILLED');

    // 3. AiReport creation
    const report = await prisma.aiReport.create({
      data: {
        walletAddress: 'Whale111111111111111111111111111111111111111',
        tradingHabits: '高频日内短线，平均持仓小于 1 小时',
        potentialAdvantages: '极快开盘狙击能力',
        majorRisks: '高回撤与追高风险',
        dataReliability: 'MEDIUM',
        watchRecommendation: 'NEUTRAL',
        rawReport: '测试研报内容',
        modelName: 'gpt-4o-mini',
      },
    });
    expect(report.id).toBeDefined();
  });
});
