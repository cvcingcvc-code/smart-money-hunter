import prisma from '@/lib/prisma';
import { paperEngine } from './engine';

export interface ExitConfig {
  stopLossPct?: number; // default -20% (-0.20)
  takeProfitPct?: number; // default +50% (+0.50)
  maxHoldHours?: number; // default 2.0 hours
  followSmartMoneySell?: boolean; // default true: exit immediately on smart money sell
  slippage?: number; // default 0.015 (1.5%)
  feeSol?: number; // default 0.0005 SOL
}

export interface ExitTriggerResult {
  tokenAddress: string;
  tokenSymbol: string;
  ruleTriggered: 'FIRST_SELL_EXIT' | 'STOP_LOSS' | 'TAKE_PROFIT' | 'TIME_DECAY' | 'NONE';
  reason: string;
  sellRatio: number;
  pnlSol?: number | null;
  executed: boolean;
}

export class SmartExitEngine {
  /**
   * Evaluate all open positions against the 4-layer exit rules and execute simulated exits
   */
  public async evaluateAndExecuteExits(config?: ExitConfig): Promise<ExitTriggerResult[]> {
    const stopLoss = config?.stopLossPct ?? -0.20; // -20%
    const takeProfit = config?.takeProfitPct ?? 0.50; // +50%
    const maxHoldHours = config?.maxHoldHours ?? 2.0;
    const followSell = config?.followSmartMoneySell ?? true;
    const slippage = config?.slippage ?? 0.015;

    const openPositions = await prisma.paperPosition.findMany({
      where: {
        isClosed: false,
        remainingTokens: { gt: 0 },
      },
    });

    const results: ExitTriggerResult[] = [];

    for (const pos of openPositions) {
      const tokenAddress = pos.tokenAddress;
      const symbol = pos.tokenSymbol || 'TOKEN';
      const now = Date.now();
      const holdHours = (now - pos.openedAt.getTime()) / (1000 * 3600);

      // Estimate current price: if currentPriceSol is set, use it; otherwise use latest transaction price or avgPrice
      let currentPriceSol = pos.currentPriceSol || pos.avgPriceSol;

      // Check latest transaction price in DB for this token
      const latestTx = await prisma.transaction.findFirst({
        where: { tokenAddress },
        orderBy: { blockTime: 'desc' },
      });
      if (latestTx && latestTx.tokenAmount > 0) {
        currentPriceSol = latestTx.solAmount / latestTx.tokenAmount;
      }

      // Calculate unrealized PnL ratio
      const currentValuationSol = pos.remainingTokens * currentPriceSol;
      const unrealizedPnlSol = currentValuationSol - pos.costSol;
      const returnRatio = pos.costSol > 0 ? unrealizedPnlSol / pos.costSol : 0;

      let ruleTriggered: ExitTriggerResult['ruleTriggered'] = 'NONE';
      let reason = '持仓正常，未触发出场条件';
      let sellRatio = 0;

      // 1. RULE 1: First-Sell Panic Protection (检测聪明钱是否开始减仓砸盘)
      if (followSell) {
        const smartSell = await prisma.transaction.findFirst({
          where: {
            tokenAddress,
            type: 'SELL',
            blockTime: { gte: pos.openedAt },
            wallet: {
              OR: [
                { tags: { some: { tag: 'CANDIDATE_SMART_MONEY' } } },
                { category: 'SMART_MONEY' },
              ],
            },
          },
          include: { wallet: true },
        });

        if (smartSell) {
          ruleTriggered = 'FIRST_SELL_EXIT';
          reason = `🚨 聪明钱 [${smartSell.wallet?.label || smartSell.walletAddress.slice(0, 6)}] 开始减仓砸盘，执行紧急避险市价全平`;
          sellRatio = 1.0;
        }
      }

      // 2. RULE 2: Hard Stop-Loss (硬性止损)
      if (ruleTriggered === 'NONE' && returnRatio <= stopLoss) {
        ruleTriggered = 'STOP_LOSS';
        reason = `🛑 触及硬性止损线 (${(returnRatio * 100).toFixed(1)}% <= ${(stopLoss * 100).toFixed(1)}%)，果断割肉离场`;
        sellRatio = 1.0;
      }

      // 3. RULE 3: Take-Profit Lock (保本止盈)
      if (ruleTriggered === 'NONE' && returnRatio >= takeProfit) {
        ruleTriggered = 'TAKE_PROFIT';
        reason = `🎯 触及阶段性止盈线 (${(returnRatio * 100).toFixed(1)}% >= +${(takeProfit * 100).toFixed(1)}%)，平仓 50% 锁定本金`;
        sellRatio = 0.50; // Sell half to secure cost
      }

      // 4. RULE 4: Time-Decay (持仓时效衰减，防范流动性枯竭)
      if (ruleTriggered === 'NONE' && holdHours >= maxHoldHours && returnRatio < 0.15) {
        ruleTriggered = 'TIME_DECAY';
        reason = `⏳ 持仓已达 ${holdHours.toFixed(1)} 小时未爆发，执行流动性撤离规避死锁`;
        sellRatio = 1.0;
      }

      // Execute exit if triggered
      if (ruleTriggered !== 'NONE' && sellRatio > 0) {
        try {
          const executedTrade = await paperEngine.executeTrade({
            tokenAddress,
            tokenSymbol: symbol,
            side: 'SELL',
            sellRatio,
            priceSol: currentPriceSol,
            slippage,
            feeSol: 0.0005,
            latencyMs: 1200,
          });

          results.push({
            tokenAddress,
            tokenSymbol: symbol,
            ruleTriggered,
            reason,
            sellRatio,
            pnlSol: executedTrade.pnlSol,
            executed: true,
          });
        } catch (err: any) {
          console.error(`[ExitEngine] Error executing exit for ${symbol}:`, err);
          results.push({
            tokenAddress,
            tokenSymbol: symbol,
            ruleTriggered,
            reason: `${reason} (撮合失败: ${err.message})`,
            sellRatio,
            executed: false,
          });
        }
      } else {
        results.push({
          tokenAddress,
          tokenSymbol: symbol,
          ruleTriggered: 'NONE',
          reason,
          sellRatio: 0,
          executed: false,
        });
      }
    }

    return results;
  }
}

export const smartExitEngine = new SmartExitEngine();
