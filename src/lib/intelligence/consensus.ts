import prisma from '@/lib/prisma';
import { smartMoneyAlphaModel, AlphaConsensusEvaluation } from './alpha-model';

export interface ConsensusSignal {
  tokenAddress: string;
  tokenSymbol: string;
  participatingWallets: Array<{
    address: string;
    label?: string | null;
    buyAmountSol: number;
    buyTime: Date;
    alphaWeight?: number;
    winRate?: number;
  }>;
  consensusStrength: 'HIGH' | 'MEDIUM'; // HIGH: 3+ wallets, MEDIUM: 2 wallets
  walletCount: number;
  totalSolVolume: number;
  firstBuyTime: Date;
  lastBuyTime: Date;
  timeSpanMinutes: number;
  recommendedAction: 'CONSENSUS_BUY' | 'WATCH' | 'AVOID_DUMP';

  // 高阶阿尔法量化模型指标
  predictedWinRate: number; // 预测跟单胜率 (0 - 100%)
  winRateConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  cabalRiskScore: number; // 庄家/老鼠仓风险指数 (0 - 100)
  cabalRiskLevel: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  cabalReason?: string;
  kellySuggestedSol: number; // 凯利准则最优建议仓位
  alphaGrade: 'TIER_S' | 'TIER_A' | 'TIER_B' | 'TIER_D';
  weightedScore: number; // 阿尔法综合评分
}

export class SmartMoneyConsensusEngine {
  /**
   * Scan recent transactions across all candidate smart money wallets
   * to detect multi-wallet consensus on the same token within a sliding time window,
   * empowered by the Smart Money Alpha Model.
   */
  public async detectConsensusSignals(
    windowHours = 2,
    minWallets = 2
  ): Promise<ConsensusSignal[]> {
    const windowStart = new Date(Date.now() - windowHours * 3600 * 1000);

    // 1. Fetch all candidate smart money addresses with metrics
    const smartWallets = await prisma.wallet.findMany({
      where: {
        OR: [
          { tags: { some: { tag: 'CANDIDATE_SMART_MONEY' } } },
          { category: 'SMART_MONEY' },
        ],
      },
      select: {
        address: true,
        label: true,
        metrics: true,
      },
    });

    if (smartWallets.length === 0) return [];

    const smartWalletMap = new Map(smartWallets.map((w) => [w.address, w]));
    const smartAddresses = Array.from(smartWalletMap.keys());

    // 2. Fetch all BUY transactions by these smart money wallets in the time window
    const recentBuys = await prisma.transaction.findMany({
      where: {
        walletAddress: { in: smartAddresses },
        type: 'BUY',
        blockTime: { gte: windowStart },
        tokenAddress: { not: 'So11111111111111111111111111111111111111112' }, // Exclude WSOL
      },
      orderBy: { blockTime: 'asc' },
    });

    // 3. Group by tokenAddress
    const tokenGroups = new Map<string, typeof recentBuys>();
    for (const tx of recentBuys) {
      const existing = tokenGroups.get(tx.tokenAddress) || [];
      existing.push(tx);
      tokenGroups.set(tx.tokenAddress, existing);
    }

    const consensusSignals: ConsensusSignal[] = [];

    // 4. Evaluate consensus per token
    tokenGroups.forEach((txs, tokenAddress) => {
      // Group unique smart money wallets
      const walletMap = new Map<
        string,
        {
          address: string;
          label?: string | null;
          buyAmountSol: number;
          buyTime: Date;
          metrics?: any;
        }
      >();

      let totalSol = 0;
      let symbol = txs[0]?.tokenSymbol || 'TOKEN';

      for (const tx of txs) {
        if (tx.tokenSymbol && tx.tokenSymbol !== 'TOKEN') symbol = tx.tokenSymbol;
        totalSol += tx.solAmount;

        const walletInfo = smartWalletMap.get(tx.walletAddress);
        const existing = walletMap.get(tx.walletAddress);
        if (existing) {
          existing.buyAmountSol += tx.solAmount;
          if (tx.blockTime > existing.buyTime) existing.buyTime = tx.blockTime;
        } else {
          walletMap.set(tx.walletAddress, {
            address: tx.walletAddress,
            label: walletInfo?.label || null,
            metrics: walletInfo?.metrics || null,
            buyAmountSol: tx.solAmount,
            buyTime: tx.blockTime,
          });
        }
      }

      const uniqueWallets = Array.from(walletMap.values());

      // If at least minWallets smart wallets bought this token in window
      if (uniqueWallets.length >= minWallets) {
        const sortedTimes = txs.map((t) => t.blockTime.getTime()).sort((a, b) => a - b);
        const firstTime = new Date(sortedTimes[0]);
        const lastTime = new Date(sortedTimes[sortedTimes.length - 1]);
        const spanMinutes = Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60));

        // 调用高阶阿尔法量化评估模型
        const alphaEval = smartMoneyAlphaModel.evaluateConsensusAlpha({
          participatingWallets: uniqueWallets.map((w) => ({
            address: w.address,
            metrics: w.metrics
              ? {
                  winRate: w.metrics.winRate,
                  sampleSize: w.metrics.totalTrades,
                  realizedPnlSol: w.metrics.realizedPnlSol,
                  avgHoldDurationHours: w.metrics.avgHoldDurationHours,
                }
              : null,
            buyAmountSol: w.buyAmountSol,
            buyTime: w.buyTime,
          })),
          timeSpanMinutes: spanMinutes,
        });

        // 决策推荐动作
        let recommendedAction: ConsensusSignal['recommendedAction'] = 'WATCH';
        if (alphaEval.cabalRiskLevel === 'DANGEROUS') {
          recommendedAction = 'AVOID_DUMP';
        } else if (uniqueWallets.length >= 3 || alphaEval.alphaGrade === 'TIER_S') {
          recommendedAction = 'CONSENSUS_BUY';
        }

        // 注入加权权重
        const enhancedWallets = uniqueWallets.map((w) => {
          const matchedWeight = alphaEval.participatingAlphaWeights.find(
            (aw) => aw.address === w.address
          );
          return {
            address: w.address,
            label: w.label,
            buyAmountSol: parseFloat(w.buyAmountSol.toFixed(3)),
            buyTime: w.buyTime,
            alphaWeight: matchedWeight?.alphaWeight,
            winRate: matchedWeight?.winRate,
          };
        });

        consensusSignals.push({
          tokenAddress,
          tokenSymbol: symbol,
          participatingWallets: enhancedWallets,
          consensusStrength: uniqueWallets.length >= 3 ? 'HIGH' : 'MEDIUM',
          walletCount: uniqueWallets.length,
          totalSolVolume: parseFloat(totalSol.toFixed(3)),
          firstBuyTime: firstTime,
          lastBuyTime: lastTime,
          timeSpanMinutes: spanMinutes,
          recommendedAction,

          predictedWinRate: alphaEval.predictedWinRate,
          winRateConfidence: alphaEval.winRateConfidence,
          cabalRiskScore: alphaEval.cabalRiskScore,
          cabalRiskLevel: alphaEval.cabalRiskLevel,
          cabalReason: alphaEval.cabalReason,
          kellySuggestedSol: alphaEval.kellySuggestedSol,
          alphaGrade: alphaEval.alphaGrade,
          weightedScore: alphaEval.weightedScore,
        });
      }
    });

    // Sort by weightedScore desc, then wallet count desc
    return consensusSignals.sort((a, b) => {
      if (b.weightedScore !== a.weightedScore) return b.weightedScore - a.weightedScore;
      return b.walletCount - a.walletCount;
    });
  }
}

export const consensusEngine = new SmartMoneyConsensusEngine();
