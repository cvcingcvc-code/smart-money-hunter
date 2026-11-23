import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { walletAnalyzer } from '../src/lib/intelligence/analyzer';
import { aiReporter } from '../src/lib/ai/reporter';
import { paperEngine } from '../src/lib/paper/engine';

describe('Step 6 Verification: Full Lifecycle End-to-End Integration', () => {
  const e2eWallet = 'E2EIntegrationTester111111111111111111111111';
  const e2eToken = 'E2ETokenDezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7Ya';

  afterAll(async () => {
    await prisma.wallet.deleteMany({ where: { address: e2eWallet } });
    await prisma.paperTrade.deleteMany({ where: { tokenAddress: e2eToken } });
    await prisma.paperPosition.deleteMany({ where: { tokenAddress: e2eToken } });
    await prisma.$disconnect();
  });

  it('Stage 1: should register a new Solana research wallet', async () => {
    const wallet = await prisma.wallet.create({
      data: {
        address: e2eWallet,
        label: 'E2E Full Loop Test Wallet',
        category: 'SMART_MONEY',
        notes: 'End-to-End integration verification subject',
        isActive: true,
      },
    });

    expect(wallet.id).toBeDefined();
    expect(wallet.address).toBe(e2eWallet);
  });

  it('Stage 2: should ingest parsed buy & sell transactions and compute metrics', async () => {
    const now = Date.now();

    // 1 Buy trade (+5.0 SOL cost for 50,000 tokens)
    await prisma.transaction.create({
      data: {
        signature: 'sig_e2e_buy_' + now,
        walletAddress: e2eWallet,
        blockTime: new Date(now - 3600 * 1000 * 4),
        type: 'BUY',
        tokenAddress: e2eToken,
        tokenSymbol: 'E2ETOKEN',
        tokenAmount: 50000,
        solAmount: 5.0,
        feeSol: 0.00005,
        source: 'PUMPFUN',
      },
    });

    // 1 Sell trade (sold for 18.0 SOL -> profit +13.0 SOL)
    await prisma.transaction.create({
      data: {
        signature: 'sig_e2e_sell_' + now,
        walletAddress: e2eWallet,
        blockTime: new Date(now - 3600 * 1000 * 2),
        type: 'SELL',
        tokenAddress: e2eToken,
        tokenSymbol: 'E2ETOKEN',
        tokenAmount: 50000,
        solAmount: 18.0,
        feeSol: 0.00005,
        source: 'RAYDIUM',
      },
    });

    // Run analyzer
    const { metrics, tags } = await walletAnalyzer.analyzeWallet(e2eWallet);

    expect(metrics).toBeDefined();
    expect(metrics.totalTrades).toBe(2);
    expect(metrics.buyTrades).toBe(1);
    expect(metrics.sellTrades).toBe(1);
    expect(metrics.winRate).toBe(100.0);
    expect(metrics.realizedPnlSol).toBeCloseTo(13.0, 1);
  });

  it('Stage 3: should evaluate objective tags and generate structured AI report', async () => {
    const aiReport = await aiReporter.generateReport(e2eWallet);

    expect(aiReport).toBeDefined();
    expect(aiReport.tradingHabits).toBeTruthy();
    expect(aiReport.potentialAdvantages).toBeTruthy();
    expect(aiReport.majorRisks).toBeTruthy();
    expect(['RECOMMEND', 'NEUTRAL', 'AVOID']).toContain(aiReport.watchRecommendation);
  });

  it('Stage 4: should simulate copy-trade in Paper Trading engine', async () => {
    // 1. Paper Buy
    const buy = await paperEngine.executeTrade({
      walletAddress: e2eWallet,
      tokenAddress: e2eToken,
      tokenSymbol: 'E2ETOKEN',
      side: 'BUY',
      solAmount: 3.0,
      priceSol: 0.0001,
      slippage: 0.015,
      feeSol: 0.0005,
    });
    expect(buy.status).toBe('FILLED');

    // 2. Paper Sell
    const sell = await paperEngine.executeTrade({
      walletAddress: e2eWallet,
      tokenAddress: e2eToken,
      tokenSymbol: 'E2ETOKEN',
      side: 'SELL',
      sellRatio: 1.0,
      priceSol: 0.0003, // 3x price
      slippage: 0.015,
      feeSol: 0.0005,
    });
    expect(sell.status).toBe('FILLED');
    expect(sell.pnlSol).toBeGreaterThan(4.0);

    // 3. Verify portfolio summary
    const portfolio = await paperEngine.getPortfolioSummary();
    expect(portfolio.totalTrades).toBeGreaterThanOrEqual(2);
    expect(portfolio.realizedPnlSol).toBeGreaterThan(0);
  });
});
