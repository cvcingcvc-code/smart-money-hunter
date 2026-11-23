import prisma from '@/lib/prisma';

export interface ConsensusSignal {
  tokenAddress: string;
  tokenSymbol: string;
  participatingWallets: Array<{
    address: string;
    label?: string | null;
    buyAmountSol: number;
    buyTime: Date;
  }>;
  consensusStrength: 'HIGH' | 'MEDIUM'; // HIGH: 3+ wallets, MEDIUM: 2 wallets
  walletCount: number;
  totalSolVolume: number;
  firstBuyTime: Date;
  lastBuyTime: Date;
  timeSpanMinutes: number;
  recommendedAction: 'CONSENSUS_BUY' | 'WATCH';
}

export class SmartMoneyConsensusEngine {
  /**
   * Scan recent transactions across all candidate smart money wallets
   * to detect multi-wallet consensus on the same token within a sliding time window.
   */
  public async detectConsensusSignals(
    windowHours = 2,
    minWallets = 2
  ): Promise<ConsensusSignal[]> {
    const windowStart = new Date(Date.now() - windowHours * 3600 * 1000);

    // 1. Fetch all candidate smart money addresses
    const smartWallets = await prisma.wallet.findMany({
      where: {
        OR: [
          { tags: { some: { tag: 'CANDIDATE_SMART_MONEY' } } },
          { category: 'SMART_MONEY' },
        ],
      },
      select: { address: true, label: true },
    });

    if (smartWallets.length === 0) return [];

    const smartAddressMap = new Map(smartWallets.map((w) => [w.address, w.label]));
    const smartAddresses = Array.from(smartAddressMap.keys());

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
      // Find unique smart money wallets
      const walletMap = new Map<
        string,
        { address: string; label?: string | null; buyAmountSol: number; buyTime: Date }
      >();

      let totalSol = 0;
      let symbol = txs[0]?.tokenSymbol || 'TOKEN';

      for (const tx of txs) {
        if (tx.tokenSymbol && tx.tokenSymbol !== 'TOKEN') symbol = tx.tokenSymbol;
        totalSol += tx.solAmount;

        const existing = walletMap.get(tx.walletAddress);
        if (existing) {
          existing.buyAmountSol += tx.solAmount;
          if (tx.blockTime > existing.buyTime) existing.buyTime = tx.blockTime;
        } else {
          walletMap.set(tx.walletAddress, {
            address: tx.walletAddress,
            label: smartAddressMap.get(tx.walletAddress) || null,
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

        consensusSignals.push({
          tokenAddress,
          tokenSymbol: symbol,
          participatingWallets: uniqueWallets,
          consensusStrength: uniqueWallets.length >= 3 ? 'HIGH' : 'MEDIUM',
          walletCount: uniqueWallets.length,
          totalSolVolume: parseFloat(totalSol.toFixed(3)),
          firstBuyTime: firstTime,
          lastBuyTime: lastTime,
          timeSpanMinutes: spanMinutes,
          recommendedAction: uniqueWallets.length >= 3 ? 'CONSENSUS_BUY' : 'WATCH',
        });
      }
    });

    // Sort by wallet count desc, then total volume desc
    return consensusSignals.sort((a, b) => {
      if (b.walletCount !== a.walletCount) return b.walletCount - a.walletCount;
      return b.totalSolVolume - a.totalSolVolume;
    });
  }
}

export const consensusEngine = new SmartMoneyConsensusEngine();
