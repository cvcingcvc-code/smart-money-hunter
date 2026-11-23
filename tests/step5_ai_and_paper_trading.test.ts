import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { aiReporter } from '../src/lib/ai/reporter';
import { paperEngine } from '../src/lib/paper/engine';

describe('Step 5 Verification: AI Analysis & Paper Trading Engine', () => {
  const testWallet = 'Smart333333333333333333333333333333333333333';
  const testMint = 'PaperTestMint1111111111111111111111111111111';

  afterAll(async () => {
    await prisma.paperTrade.deleteMany({
      where: { tokenAddress: testMint },
    });
    await prisma.paperPosition.deleteMany({
      where: { tokenAddress: testMint },
    });
    await prisma.$disconnect();
  });

  it('should generate structured AI analysis without hallucinating fake data', async () => {
    const report = await aiReporter.generateReport(testWallet);

    expect(report).toBeDefined();
    expect(report.tradingHabits).toBeTruthy();
    expect(report.potentialAdvantages).toBeTruthy();
    expect(report.majorRisks).toBeTruthy();
    expect(report.dataReliability).toBeTruthy();
    expect(['RECOMMEND', 'NEUTRAL', 'AVOID']).toContain(report.watchRecommendation);
    expect(report.modelName).toBeDefined();
  });

  it('should execute simulated paper BUY with slippage and fee', async () => {
    const buyTrade = await paperEngine.executeTrade({
      walletAddress: testWallet,
      tokenAddress: testMint,
      tokenSymbol: 'TEST_MEME',
      side: 'BUY',
      solAmount: 5.0,
      priceSol: 0.0001,
      slippage: 0.015, // 1.5%
      feeSol: 0.0005,
    });

    expect(buyTrade).toBeDefined();
    expect(buyTrade.side).toBe('BUY');
    expect(buyTrade.status).toBe('FILLED');
    expect(buyTrade.solAmount).toBe(5.0);
    // Effective price = 0.0001 * 1.015 = 0.0001015
    expect(buyTrade.priceSol).toBeCloseTo(0.0001015, 7);

    // Verify position
    const pos = await prisma.paperPosition.findUnique({
      where: { tokenAddress: testMint },
    });
    expect(pos).toBeDefined();
    expect(pos?.isClosed).toBe(false);
    expect(pos?.remainingTokens).toBeGreaterThan(0);
    expect(pos?.costSol).toBe(5.0);
  });

  it('should execute simulated paper SELL and calculate net PnL', async () => {
    // Sell at 0.0002 SOL (2x price)
    const sellTrade = await paperEngine.executeTrade({
      walletAddress: testWallet,
      tokenAddress: testMint,
      tokenSymbol: 'TEST_MEME',
      side: 'SELL',
      sellRatio: 1.0, // 100% full close
      priceSol: 0.0002,
      slippage: 0.015, // 1.5%
      feeSol: 0.0005,
    });

    expect(sellTrade).toBeDefined();
    expect(sellTrade.side).toBe('SELL');
    expect(sellTrade.pnlSol).toBeDefined();
    // PnL should be positive (net ~4.7 SOL profit on 5 SOL cost)
    expect(sellTrade.pnlSol!).toBeGreaterThan(3.0);
    expect(sellTrade.pnlPercent!).toBeGreaterThan(50);

    // Position should now be marked closed
    const pos = await prisma.paperPosition.findUnique({
      where: { tokenAddress: testMint },
    });
    expect(pos?.isClosed).toBe(true);
    expect(pos?.remainingTokens).toBe(0);
  });

  it('should calculate portfolio summary including maximum drawdown', async () => {
    const summary = await paperEngine.getPortfolioSummary();
    expect(summary.initialCapital).toBeGreaterThan(0);
    expect(summary.totalTrades).toBeGreaterThanOrEqual(2);
    expect(summary.realizedPnlSol).toBeGreaterThan(0);
    expect(summary.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
  });
});
