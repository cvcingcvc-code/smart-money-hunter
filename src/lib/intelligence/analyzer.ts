import prisma from '@/lib/prisma';
import { calculateMetricsFromTransactions } from './metrics';
import { ruleEngine } from './rules';

export class WalletAnalyzer {
  /**
   * Recalculate metrics and sync tags for a wallet in DB
   */
  public async analyzeWallet(address: string) {
    // 1. Fetch all transactions for this wallet
    const transactions = await prisma.transaction.findMany({
      where: { walletAddress: address },
      orderBy: { blockTime: 'asc' },
    });

    // 2. Compute metrics
    const metrics = calculateMetricsFromTransactions(transactions as any);

    // 3. Upsert metrics to DB
    const savedMetrics = await prisma.walletMetrics.upsert({
      where: { walletAddress: address },
      update: {
        totalTrades: metrics.totalTrades,
        buyTrades: metrics.buyTrades,
        sellTrades: metrics.sellTrades,
        winRate: metrics.winRate,
        realizedPnlSol: metrics.realizedPnlSol,
        realizedPnlUsd: metrics.realizedPnlUsd,
        avgHoldDurationHours: metrics.avgHoldDurationHours,
        topTokens: JSON.stringify(metrics.topTokens),
        tradeFrequencyPerDay: metrics.tradeFrequencyPerDay,
        earlyEntryCount: metrics.earlyEntryCount,
        concentrationScore: metrics.concentrationScore,
        riskScore: metrics.riskScore,
        sampleSize: metrics.sampleSize,
        dataReliability: metrics.dataReliability,
        calculatedAt: new Date(),
      },
      create: {
        walletAddress: address,
        totalTrades: metrics.totalTrades,
        buyTrades: metrics.buyTrades,
        sellTrades: metrics.sellTrades,
        winRate: metrics.winRate,
        realizedPnlSol: metrics.realizedPnlSol,
        realizedPnlUsd: metrics.realizedPnlUsd,
        avgHoldDurationHours: metrics.avgHoldDurationHours,
        topTokens: JSON.stringify(metrics.topTokens),
        tradeFrequencyPerDay: metrics.tradeFrequencyPerDay,
        earlyEntryCount: metrics.earlyEntryCount,
        concentrationScore: metrics.concentrationScore,
        riskScore: metrics.riskScore,
        sampleSize: metrics.sampleSize,
        dataReliability: metrics.dataReliability,
        calculatedAt: new Date(),
      },
    });

    // 4. Evaluate rules
    const ruleResults = ruleEngine.evaluateRules(metrics);
    const triggeredTags = ruleResults.filter((r) => r.isTriggered);

    // 5. Sync tags: remove existing and re-insert triggered tags
    await prisma.walletTag.deleteMany({
      where: { walletAddress: address },
    });

    for (const tag of triggeredTags) {
      await prisma.walletTag.create({
        data: {
          walletAddress: address,
          tag: tag.tag,
          displayName: tag.displayName,
          triggerCondition: tag.triggerCondition,
          metricValues: JSON.stringify(tag.metricValues),
          sampleSize: tag.sampleSize,
          confidence: tag.confidence,
          calculatedAt: new Date(),
        },
      });
    }

    return {
      metrics: savedMetrics,
      tags: triggeredTags,
    };
  }
}

export const walletAnalyzer = new WalletAnalyzer();
