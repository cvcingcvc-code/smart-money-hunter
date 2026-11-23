import { TransactionRecord } from '@/types';

export interface CalculatedWalletMetrics {
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  winRate: number | null; // null if not enough sell sample
  realizedPnlSol: number | null;
  realizedPnlUsd: number | null;
  avgHoldDurationHours: number | null;
  topTokens: Array<{ mint: string; symbol?: string; count: number; volumeSol: number }>;
  tradeFrequencyPerDay: number;
  earlyEntryCount: number;
  concentrationScore: number; // 0-100
  riskScore: number; // 0-100
  sampleSize: number;
  dataReliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
}

export function calculateMetricsFromTransactions(
  transactions: Array<{
    id: string;
    signature: string;
    type: string;
    tokenAddress: string;
    tokenSymbol?: string | null;
    tokenAmount: number;
    solAmount: number;
    usdAmount?: number | null;
    feeSol: number;
    blockTime: Date | string;
    source: string;
  }>
): CalculatedWalletMetrics {
  const totalTrades = transactions.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      winRate: null,
      realizedPnlSol: null,
      realizedPnlUsd: null,
      avgHoldDurationHours: null,
      topTokens: [],
      tradeFrequencyPerDay: 0,
      earlyEntryCount: 0,
      concentrationScore: 0,
      riskScore: 0,
      sampleSize: 0,
      dataReliability: 'INSUFFICIENT_DATA',
    };
  }

  // Sort ascending by time
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.blockTime).getTime() - new Date(b.blockTime).getTime()
  );

  let buyTrades = 0;
  let sellTrades = 0;
  let earlyEntryCount = 0;

  // Track per-token cost basis (FIFO queue)
  const tokenLedger: Record<
    string,
    Array<{ solCost: number; tokenAmount: number; time: number }>
  > = {};
  const tokenVolumes: Record<
    string,
    { symbol?: string; count: number; volumeSol: number }
  > = {};

  let totalRealizedPnlSol = 0;
  let winningTrades = 0;
  let closedTradesCount = 0;
  let totalHoldDurationHours = 0;

  for (const tx of sorted) {
    const mint = tx.tokenAddress;
    const time = new Date(tx.blockTime).getTime();

    if (!tokenVolumes[mint]) {
      tokenVolumes[mint] = {
        symbol: tx.tokenSymbol || undefined,
        count: 0,
        volumeSol: 0,
      };
    }
    tokenVolumes[mint].count++;
    tokenVolumes[mint].volumeSol += tx.solAmount;

    if (tx.source === 'PUMPFUN' && tx.type === 'BUY') {
      earlyEntryCount++;
    }

    if (tx.type === 'BUY') {
      buyTrades++;
      if (!tokenLedger[mint]) tokenLedger[mint] = [];
      tokenLedger[mint].push({
        solCost: tx.solAmount,
        tokenAmount: tx.tokenAmount,
        time,
      });
    } else if (tx.type === 'SELL') {
      sellTrades++;
      const queue = tokenLedger[mint];
      if (queue && queue.length > 0) {
        // Calculate realized PnL against FIFO entry
        let remainingTokensToSell = tx.tokenAmount;
        let costSolForThisSale = 0;
        let weightedHoldTimeHours = 0;

        while (queue.length > 0 && remainingTokensToSell > 0) {
          const entry = queue[0];
          const matchedAmount = Math.min(entry.tokenAmount, remainingTokensToSell);
          const ratio = entry.tokenAmount > 0 ? matchedAmount / entry.tokenAmount : 1;
          const matchedSolCost = entry.solCost * ratio;

          costSolForThisSale += matchedSolCost;
          const holdHours = Math.max(0, (time - entry.time) / (1000 * 3600));
          weightedHoldTimeHours += holdHours;

          entry.tokenAmount -= matchedAmount;
          entry.solCost -= matchedSolCost;
          remainingTokensToSell -= matchedAmount;

          if (entry.tokenAmount <= 0.000001) {
            queue.shift();
          }
        }

        const saleSol = tx.solAmount;
        const pnl = saleSol - costSolForThisSale;
        totalRealizedPnlSol += pnl;
        closedTradesCount++;
        totalHoldDurationHours += weightedHoldTimeHours;

        if (pnl > 0) {
          winningTrades++;
        }
      }
    }
  }

  // Calculate Win Rate
  const winRate =
    closedTradesCount > 0
      ? parseFloat(((winningTrades / closedTradesCount) * 100).toFixed(1))
      : null;

  // Holding duration
  const avgHoldDurationHours =
    closedTradesCount > 0
      ? parseFloat((totalHoldDurationHours / closedTradesCount).toFixed(1))
      : null;

  // Trade frequency per day
  const firstTxTime = new Date(sorted[0].blockTime).getTime();
  const lastTxTime = new Date(sorted[sorted.length - 1].blockTime).getTime();
  const spanDays = Math.max(0.5, (lastTxTime - firstTxTime) / (1000 * 3600 * 24));
  const tradeFrequencyPerDay = parseFloat((totalTrades / spanDays).toFixed(1));

  // Concentration Score (Share of top 2 tokens volume)
  const sortedTokens = Object.entries(tokenVolumes)
    .map(([mint, val]) => ({ mint, ...val }))
    .sort((a, b) => b.volumeSol - a.volumeSol);

  const totalVol = sortedTokens.reduce((acc, t) => acc + t.volumeSol, 0);
  let top2Vol = 0;
  if (sortedTokens.length > 0) top2Vol += sortedTokens[0].volumeSol;
  if (sortedTokens.length > 1) top2Vol += sortedTokens[1].volumeSol;

  const concentrationScore =
    totalVol > 0 ? Math.min(100, Math.round((top2Vol / totalVol) * 100)) : 0;

  // Risk Score: 0 - 100
  let riskScore = 20; // baseline
  if (winRate !== null) {
    if (winRate < 40) riskScore += 35;
    else if (winRate < 50) riskScore += 20;
    else if (winRate > 70) riskScore -= 10;
  }
  if (concentrationScore > 75) riskScore += 25;
  if (tradeFrequencyPerDay > 30) riskScore += 15;
  riskScore = Math.max(5, Math.min(95, riskScore));

  // Reliability rating
  let dataReliability: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA' =
    'INSUFFICIENT_DATA';
  if (totalTrades >= 20 && closedTradesCount >= 5) {
    dataReliability = 'HIGH';
  } else if (totalTrades >= 10 && closedTradesCount >= 2) {
    dataReliability = 'MEDIUM';
  } else if (totalTrades >= 5) {
    dataReliability = 'LOW';
  }

  return {
    totalTrades,
    buyTrades,
    sellTrades,
    winRate,
    realizedPnlSol: closedTradesCount > 0 ? parseFloat(totalRealizedPnlSol.toFixed(3)) : null,
    realizedPnlUsd: closedTradesCount > 0 ? parseFloat((totalRealizedPnlSol * 200).toFixed(2)) : null, // estimated with SOL ~$200
    avgHoldDurationHours,
    topTokens: sortedTokens.slice(0, 5),
    tradeFrequencyPerDay,
    earlyEntryCount,
    concentrationScore,
    riskScore,
    sampleSize: totalTrades,
    dataReliability,
  };
}
