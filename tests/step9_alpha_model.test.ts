import { describe, it, expect } from 'vitest';
import { smartMoneyAlphaModel } from '../src/lib/intelligence/alpha-model';
import { smartExitEngine } from '../src/lib/paper/exit-strategy';
import { Keypair } from '@solana/web3.js';
import prisma from '../src/lib/prisma';

describe('Step 9: Smart Money Alpha Model & Advanced Inference Capabilities', () => {
  const testWalletWhale = Keypair.generate().publicKey.toBase58();
  const testWalletNovice = Keypair.generate().publicKey.toBase58();
  const testTokenAlpha = 'TestTokenAlpha11111111111111111111111111111';

  it('1. should calculate higher alpha weight for high-winrate experienced whale vs low-sample novice', () => {
    // 顶级鲸鱼: 80% 胜率, 40 笔样本, 35 SOL 净利润
    const whaleWeight = smartMoneyAlphaModel.calculateWalletAlphaWeight({
      winRate: 80,
      sampleSize: 40,
      realizedPnlSol: 35.0,
      avgHoldDurationHours: 2.5,
    });

    // 新手钱包: 50% 胜率, 2 笔样本, 0.1 SOL 净利润
    const noviceWeight = smartMoneyAlphaModel.calculateWalletAlphaWeight({
      winRate: 50,
      sampleSize: 2,
      realizedPnlSol: 0.1,
      avgHoldDurationHours: 1.0,
    });

    expect(whaleWeight).toBeGreaterThan(0.7);
    expect(noviceWeight).toBeLessThan(0.45);
    expect(whaleWeight).toBeGreaterThan(noviceWeight * 1.5);
  });

  it('2. should detect cabal/wash trading risk when buys are clustered in <= 5 seconds with symmetric amounts', () => {
    const now = new Date();
    // 两个钱包在 2 秒内同买，且金额精确为 3.00 SOL
    const suspiciousTxs = [
      {
        walletAddress: testWalletWhale,
        blockTime: now,
        solAmount: 3.0,
      },
      {
        walletAddress: testWalletNovice,
        blockTime: new Date(now.getTime() + 2000), // 2s later
        solAmount: 3.0,
      },
    ];

    const cabalResult = smartMoneyAlphaModel.detectCabalRisk(suspiciousTxs);
    expect(cabalResult.riskScore).toBeGreaterThanOrEqual(70);
    expect(cabalResult.level).toBe('DANGEROUS');
    expect(cabalResult.reason).toContain('同一区块脚本协同');

    // 正常独立钱包在 20 分钟后以自然非对称金额买入 (5.2 SOL vs 1.8 SOL)
    const naturalTxs = [
      {
        walletAddress: testWalletWhale,
        blockTime: now,
        solAmount: 5.2,
      },
      {
        walletAddress: testWalletNovice,
        blockTime: new Date(now.getTime() + 20 * 60 * 1000), // 20 mins later
        solAmount: 1.8,
      },
    ];

    const naturalResult = smartMoneyAlphaModel.detectCabalRisk(naturalTxs);
    expect(naturalResult.riskScore).toBeLessThan(45);
    expect(naturalResult.level).toBe('SAFE');
  });

  it('3. should calculate sensible position sizes using Half-Kelly criterion', () => {
    // 75% 预测胜率, 赔率 2.2
    const highWinSizing = smartMoneyAlphaModel.calculateKellySizing(75, 2.2, 100.0, 0.05);

    // 25% 预测胜率, 赔率 2.2 -> 负期望值 (f* <= 0)，触发防守最低下注 0.5 SOL
    const negativeWinSizing = smartMoneyAlphaModel.calculateKellySizing(25, 2.2, 100.0, 0.05);

    expect(highWinSizing).toBeGreaterThan(2.0); // 高确定性下注更积极
    expect(negativeWinSizing).toBe(0.5); // 负期望值时防守最低仓位
    expect(highWinSizing).toBeGreaterThan(negativeWinSizing);
  });

  it('4. should evaluate full consensus alpha with prediction, grading, and confidence', () => {
    const evaluation = smartMoneyAlphaModel.evaluateConsensusAlpha({
      participatingWallets: [
        {
          address: testWalletWhale,
          metrics: { winRate: 75, sampleSize: 25, realizedPnlSol: 20, avgHoldDurationHours: 1.5 },
          buyAmountSol: 6.0,
          buyTime: new Date(),
        },
        {
          address: testWalletNovice,
          metrics: { winRate: 70, sampleSize: 20, realizedPnlSol: 15, avgHoldDurationHours: 2.0 },
          buyAmountSol: 2.0,
          buyTime: new Date(Date.now() + 10 * 60 * 1000), // 10 mins later
        },
      ],
      timeSpanMinutes: 10,
    });

    expect(evaluation.predictedWinRate).toBeGreaterThan(60);
    expect(['TIER_S', 'TIER_A']).toContain(evaluation.alphaGrade);
    expect(evaluation.kellySuggestedSol).toBeGreaterThan(1.0);
    expect(evaluation.cabalRiskLevel).toBe('SAFE');
  });

  it('5. should trigger dynamic TRAILING_STOP rule when price pulls back 25% from peak', async () => {
    // Clean up
    await prisma.paperTrade.deleteMany({ where: { tokenAddress: testTokenAlpha } });
    await prisma.paperPosition.deleteMany({ where: { tokenAddress: testTokenAlpha } });
    await prisma.transaction.deleteMany({ where: { tokenAddress: testTokenAlpha } });

    // Establish position bought at 0.0001 SOL
    const openedAt = new Date(Date.now() - 40 * 60 * 1000);
    await prisma.paperPosition.create({
      data: {
        tokenAddress: testTokenAlpha,
        tokenSymbol: 'ALPHA_DOGE',
        remainingTokens: 100000,
        costSol: 10.0,
        avgPriceSol: 0.0001,
        currentPriceSol: 0.000135, // Current price is +35% above cost, but pulled back from 0.00020 (+100%)
        isClosed: false,
        openedAt,
      },
    });

    // Ensure wallet exists for foreign key
    await prisma.wallet.upsert({
      where: { address: testWalletWhale },
      update: {},
      create: { address: testWalletWhale, label: 'Whale', category: 'SMART_MONEY' },
    });

    // Record historical peak buy transaction at price 0.00020 SOL (20 SOL for 100,000 tokens)
    await prisma.transaction.create({
      data: {
        signature: 'sig_peak_' + Date.now(),
        walletAddress: testWalletWhale,
        blockTime: new Date(Date.now() - 20 * 60 * 1000),
        slot: 9001,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenAlpha,
        tokenSymbol: 'ALPHA_DOGE',
        tokenAmount: 100000,
        solAmount: 20.0, // Peak price = 0.00020 SOL
        feeSol: 0.0005,
      },
    });

    // Current price latest transaction at 0.000135 SOL (Pullback from 0.00020 is (0.00020 - 0.000135) / 0.00020 = 32.5% >= 25%)
    await prisma.transaction.create({
      data: {
        signature: 'sig_current_' + Date.now(),
        walletAddress: testWalletWhale,
        blockTime: new Date(),
        slot: 9002,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenAlpha,
        tokenSymbol: 'ALPHA_DOGE',
        tokenAmount: 100000,
        solAmount: 13.5,
        feeSol: 0.0005,
      },
    });

    // Evaluate exit
    const exits = await smartExitEngine.evaluateAndExecuteExits({
      followSmartMoneySell: false,
      trailingStopPct: 0.25,
    });

    const alphaExit = exits.find((e) => e.tokenAddress === testTokenAlpha);
    expect(alphaExit).toBeDefined();
    expect(alphaExit?.ruleTriggered).toBe('TRAILING_STOP');
    expect(alphaExit?.sellRatio).toBe(1.0);
    expect(alphaExit?.executed).toBe(true);

    // Clean up
    await prisma.paperTrade.deleteMany({ where: { tokenAddress: testTokenAlpha } });
    await prisma.paperPosition.deleteMany({ where: { tokenAddress: testTokenAlpha } });
    await prisma.transaction.deleteMany({ where: { tokenAddress: testTokenAlpha } });
    await prisma.wallet.deleteMany({ where: { address: testWalletWhale } });
  });
});
