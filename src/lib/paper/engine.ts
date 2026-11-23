import prisma from '@/lib/prisma';

export interface ExecutePaperTradeParams {
  walletAddress?: string; // Target smart wallet followed (if any)
  tokenAddress: string;
  tokenSymbol?: string;
  side: 'BUY' | 'SELL';
  solAmount?: number; // for BUY
  sellRatio?: number; // for SELL: 0.1 to 1.0 (default 1.0 = 100%)
  priceSol: number; // Token price in SOL
  slippage?: number; // default 0.015 (1.5%)
  feeSol?: number; // default 0.0005 SOL
  latencyMs?: number; // default 1200ms
}

export class PaperTradingEngine {
  /**
   * Execute simulated Paper Trade with realistic fee, slippage, and latency model
   */
  public async executeTrade(params: ExecutePaperTradeParams) {
    const slippage = params.slippage ?? 0.015;
    const feeSol = params.feeSol ?? 0.0005;
    const latencyMs = params.latencyMs ?? 1200;
    const priceSol = Math.max(0.0000000001, params.priceSol);

    if (params.side === 'BUY') {
      const solAmount = params.solAmount || 1.0;
      if (solAmount <= feeSol) {
        throw new Error(`买入金额 (${solAmount} SOL) 必须大于模拟交易手续费 (${feeSol} SOL)`);
      }

      // Slippage for BUY: price increases against buyer
      const effectivePriceSol = priceSol * (1 + slippage);
      const investableSol = solAmount - feeSol;
      const tokenAmount = investableSol / effectivePriceSol;

      // 1. Create PaperTrade record
      const trade = await prisma.paperTrade.create({
        data: {
          walletAddress: params.walletAddress || null,
          tokenAddress: params.tokenAddress,
          tokenSymbol: params.tokenSymbol || 'TOKEN',
          side: 'BUY',
          solAmount,
          tokenAmount,
          priceSol: effectivePriceSol,
          slippage,
          feeSol,
          latencyMs,
          status: 'FILLED',
          pnlSol: null,
          pnlPercent: null,
        },
      });

      // 2. Update or create PaperPosition
      const existingPos = await prisma.paperPosition.findUnique({
        where: { tokenAddress: params.tokenAddress },
      });

      if (existingPos && !existingPos.isClosed) {
        const newTotalTokens = existingPos.remainingTokens + tokenAmount;
        const newTotalCost = existingPos.costSol + solAmount;
        await prisma.paperPosition.update({
          where: { tokenAddress: params.tokenAddress },
          data: {
            remainingTokens: newTotalTokens,
            costSol: newTotalCost,
            avgPriceSol: newTotalCost / newTotalTokens,
            currentPriceSol: priceSol,
            isClosed: false,
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.paperPosition.upsert({
          where: { tokenAddress: params.tokenAddress },
          update: {
            tokenSymbol: params.tokenSymbol || 'TOKEN',
            remainingTokens: tokenAmount,
            costSol: solAmount,
            avgPriceSol: effectivePriceSol,
            currentPriceSol: priceSol,
            isClosed: false,
            openedAt: new Date(),
            updatedAt: new Date(),
          },
          create: {
            tokenAddress: params.tokenAddress,
            tokenSymbol: params.tokenSymbol || 'TOKEN',
            remainingTokens: tokenAmount,
            costSol: solAmount,
            avgPriceSol: effectivePriceSol,
            currentPriceSol: priceSol,
            realizedPnlSol: 0,
            isClosed: false,
          },
        });
      }

      return trade;
    } else {
      // SELL execution
      const position = await prisma.paperPosition.findUnique({
        where: { tokenAddress: params.tokenAddress },
      });

      if (!position || position.isClosed || position.remainingTokens <= 0) {
        throw new Error(`当前无 ${params.tokenSymbol || params.tokenAddress} 可卖出的持仓头寸`);
      }

      const ratio = Math.min(1.0, Math.max(0.01, params.sellRatio ?? 1.0));
      const tokensToSell = position.remainingTokens * ratio;

      // Slippage for SELL: price decreases against seller
      const effectivePriceSol = priceSol * (1 - slippage);
      const grossSol = tokensToSell * effectivePriceSol;
      const netSol = Math.max(0, grossSol - feeSol);

      const costBasis = position.costSol * ratio;
      const pnlSol = netSol - costBasis;
      const pnlPercent = costBasis > 0 ? (pnlSol / costBasis) * 100 : 0;

      // 1. Create PaperTrade record
      const trade = await prisma.paperTrade.create({
        data: {
          walletAddress: params.walletAddress || null,
          tokenAddress: params.tokenAddress,
          tokenSymbol: params.tokenSymbol || position.tokenSymbol || 'TOKEN',
          side: 'SELL',
          solAmount: netSol,
          tokenAmount: tokensToSell,
          priceSol: effectivePriceSol,
          slippage,
          feeSol,
          latencyMs,
          status: 'FILLED',
          pnlSol,
          pnlPercent,
        },
      });

      // 2. Update Position
      const remainingTokens = position.remainingTokens - tokensToSell;
      const remainingCost = position.costSol - costBasis;
      const isClosed = remainingTokens <= 0.000001;

      await prisma.paperPosition.update({
        where: { tokenAddress: params.tokenAddress },
        data: {
          remainingTokens: isClosed ? 0 : remainingTokens,
          costSol: isClosed ? 0 : remainingCost,
          currentPriceSol: priceSol,
          realizedPnlSol: position.realizedPnlSol + pnlSol,
          isClosed,
          updatedAt: new Date(),
        },
      });

      return trade;
    }
  }

  /**
   * Calculate Portfolio Statistics and Maximum Drawdown (MDD)
   */
  public async getPortfolioSummary() {
    const initialCapital = parseFloat(
      process.env.PAPER_INITIAL_CAPITAL_SOL || '100.0'
    );

    const [trades, positions] = await Promise.all([
      prisma.paperTrade.findMany({ orderBy: { executedAt: 'asc' } }),
      prisma.paperPosition.findMany(),
    ]);

    let realizedPnlSol = 0;
    let winningTrades = 0;
    let sellTradesCount = 0;

    // Track equity curve for Maximum Drawdown (MDD)
    let runningEquity = initialCapital;
    let peakEquity = initialCapital;
    let maxDrawdownSol = 0;
    let maxDrawdownPercent = 0;

    for (const t of trades) {
      if (t.side === 'SELL' && t.pnlSol !== null) {
        realizedPnlSol += t.pnlSol;
        sellTradesCount++;
        if (t.pnlSol > 0) winningTrades++;

        runningEquity += t.pnlSol;
        if (runningEquity > peakEquity) {
          peakEquity = runningEquity;
        } else {
          const ddSol = peakEquity - runningEquity;
          const ddPct = (ddSol / peakEquity) * 100;
          if (ddPct > maxDrawdownPercent) {
            maxDrawdownPercent = ddPct;
            maxDrawdownSol = ddSol;
          }
        }
      }
    }

    const openPositions = positions.filter((p) => !p.isClosed && p.remainingTokens > 0);
    const totalCostInOpenPositions = openPositions.reduce((acc, p) => acc + p.costSol, 0);

    const winRate =
      sellTradesCount > 0
        ? parseFloat(((winningTrades / sellTradesCount) * 100).toFixed(1))
        : null;

    return {
      initialCapital,
      realizedPnlSol: parseFloat(realizedPnlSol.toFixed(3)),
      winRate,
      totalTrades: trades.length,
      closedTrades: sellTradesCount,
      openPositionsCount: openPositions.length,
      openPositionsCost: parseFloat(totalCostInOpenPositions.toFixed(3)),
      maxDrawdownPercent: parseFloat(maxDrawdownPercent.toFixed(2)),
      maxDrawdownSol: parseFloat(maxDrawdownSol.toFixed(3)),
      trades,
      positions,
    };
  }
}

export const paperEngine = new PaperTradingEngine();
