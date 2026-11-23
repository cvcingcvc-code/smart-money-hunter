import { describe, it, expect } from 'vitest';
import { calculateMetricsFromTransactions } from '../src/lib/intelligence/metrics';
import { ruleEngine } from '../src/lib/intelligence/rules';

describe('Step 3 Verification: Metrics Calculation & Objective Rule Engine', () => {
  const baseTime = 1715000000000;
  const bonkMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
  const wifMint = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm';

  it('should correctly calculate win rate, realized PnL and metrics from transactions', () => {
    const mockTxs = [
      // Trade 1: BONK Buy 2 SOL, Sell 4 SOL (Win: +2 SOL, hold 2 hours)
      {
        id: '1',
        signature: 'tx1',
        type: 'BUY',
        tokenAddress: bonkMint,
        tokenSymbol: 'BONK',
        tokenAmount: 1000,
        solAmount: 2.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime),
        source: 'RAYDIUM',
      },
      {
        id: '2',
        signature: 'tx2',
        type: 'SELL',
        tokenAddress: bonkMint,
        tokenSymbol: 'BONK',
        tokenAmount: 1000,
        solAmount: 4.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 2 * 3600 * 1000),
        source: 'RAYDIUM',
      },
      // Trade 2: WIF Buy 5 SOL, Sell 12 SOL (Win: +7 SOL, hold 1 hour, Pump.fun early)
      {
        id: '3',
        signature: 'tx3',
        type: 'BUY',
        tokenAddress: wifMint,
        tokenSymbol: 'WIF',
        tokenAmount: 500,
        solAmount: 5.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 3 * 3600 * 1000),
        source: 'PUMPFUN',
      },
      {
        id: '4',
        signature: 'tx4',
        type: 'SELL',
        tokenAddress: wifMint,
        tokenSymbol: 'WIF',
        tokenAmount: 500,
        solAmount: 12.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 4 * 3600 * 1000),
        source: 'RAYDIUM',
      },
      // Trade 3: Buy 3 SOL, Sell 1.5 SOL (Loss: -1.5 SOL)
      {
        id: '5',
        signature: 'tx5',
        type: 'BUY',
        tokenAddress: bonkMint,
        tokenSymbol: 'BONK',
        tokenAmount: 200,
        solAmount: 3.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 5 * 3600 * 1000),
        source: 'RAYDIUM',
      },
      {
        id: '6',
        signature: 'tx6',
        type: 'SELL',
        tokenAddress: bonkMint,
        tokenSymbol: 'BONK',
        tokenAmount: 200,
        solAmount: 1.5,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 6 * 3600 * 1000),
        source: 'RAYDIUM',
      },
      // Add 2 more early buys on Pump to reach early buyer threshold & sample size 8
      {
        id: '7',
        signature: 'tx7',
        type: 'BUY',
        tokenAddress: 'OtherMint11111111111111111111111111111111111',
        tokenSymbol: 'MEME1',
        tokenAmount: 10000,
        solAmount: 1.0,
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 7 * 3600 * 1000),
        source: 'PUMPFUN',
      },
      {
        id: '8',
        signature: 'tx8',
        type: 'SELL',
        tokenAddress: 'OtherMint11111111111111111111111111111111111',
        tokenSymbol: 'MEME1',
        tokenAmount: 10000,
        solAmount: 3.5, // Win: +2.5 SOL
        feeSol: 0.00005,
        blockTime: new Date(baseTime + 8 * 3600 * 1000),
        source: 'RAYDIUM',
      },
    ];

    const metrics = calculateMetricsFromTransactions(mockTxs);

    expect(metrics.totalTrades).toBe(8);
    expect(metrics.buyTrades).toBe(4);
    expect(metrics.sellTrades).toBe(4);
    // 3 wins (+2, +7, +2.5) out of 4 sales -> 75% win rate
    expect(metrics.winRate).toBe(75.0);
    // Realized PnL: 2 + 7 - 1.5 + 2.5 = 10.0 SOL
    expect(metrics.realizedPnlSol).toBeCloseTo(10.0, 1);
    expect(metrics.earlyEntryCount).toBe(2);
    expect(metrics.avgHoldDurationHours).toBeLessThan(3.0);
  });

  it('should evaluate rules and trigger CANDIDATE_SMART_MONEY, EARLY_BUYER, and SHORT_TERM_TRADER', () => {
    const candidateMetrics = {
      totalTrades: 12,
      buyTrades: 6,
      sellTrades: 6,
      winRate: 80.0,
      realizedPnlSol: 15.5,
      realizedPnlUsd: 3100.0,
      avgHoldDurationHours: 1.8,
      topTokens: [],
      tradeFrequencyPerDay: 8.5,
      earlyEntryCount: 3,
      concentrationScore: 70,
      riskScore: 20,
      sampleSize: 12,
      dataReliability: 'MEDIUM' as const,
    };

    const rules = ruleEngine.evaluateRules(candidateMetrics);
    const triggered = rules.filter((r) => r.isTriggered).map((r) => r.tag);

    expect(triggered).toContain('CANDIDATE_SMART_MONEY');
    expect(triggered).toContain('EARLY_BUYER');
    expect(triggered).toContain('SHORT_TERM_TRADER');
    expect(triggered).toContain('HIGH_CONCENTRATION');
    expect(triggered).not.toContain('INSUFFICIENT_DATA');
    expect(triggered).not.toContain('HIGH_RISK');

    // Verify explanation metadata
    const smartTag = rules.find((r) => r.tag === 'CANDIDATE_SMART_MONEY');
    expect(smartTag?.displayName).toBe('候选聪明钱');
    expect(smartTag?.triggerCondition).toBeDefined();
    expect(smartTag?.sampleSize).toBe(12);
    expect(smartTag?.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should trigger INSUFFICIENT_DATA when sample size is below threshold', () => {
    const smallMetrics = {
      totalTrades: 3,
      buyTrades: 3,
      sellTrades: 0,
      winRate: null,
      realizedPnlSol: null,
      realizedPnlUsd: null,
      avgHoldDurationHours: null,
      topTokens: [],
      tradeFrequencyPerDay: 1.0,
      earlyEntryCount: 0,
      concentrationScore: 40,
      riskScore: 50,
      sampleSize: 3,
      dataReliability: 'INSUFFICIENT_DATA' as const,
    };

    const rules = ruleEngine.evaluateRules(smallMetrics);
    const insufficient = rules.find((r) => r.tag === 'INSUFFICIENT_DATA');

    expect(insufficient?.isTriggered).toBe(true);
    expect(rules.find((r) => r.tag === 'CANDIDATE_SMART_MONEY')?.isTriggered).toBe(false);
  });
});
