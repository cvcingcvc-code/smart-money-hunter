import prisma from '@/lib/prisma';
import { consensusEngine, ConsensusSignal } from '../intelligence/consensus';
import { smartExitEngine, ExitTriggerResult } from './exit-strategy';
import { paperEngine } from './engine';

export interface ConsensusTradeCycleResult {
  detectedSignals: ConsensusSignal[];
  autoBuysExecuted: Array<{
    tokenAddress: string;
    tokenSymbol: string;
    solAmount: number;
    walletCount: number;
    tradeId: string;
  }>;
  exitsEvaluated: ExitTriggerResult[];
  timestamp: Date;
}

export class ConsensusTraderService {
  /**
   * Run one complete consensus trading cycle:
   * 1. Detect multi-wallet consensus on tokens
   * 2. Auto-buy consensus tokens that don't have open positions yet
   * 3. Evaluate 4-layer smart exits on all current open positions
   */
  public async runTradingCycle(options?: {
    minWallets?: number;
    buyAmountSol?: number;
    stopLossPct?: number;
    takeProfitPct?: number;
    maxHoldHours?: number;
  }): Promise<ConsensusTradeCycleResult> {
    const minWallets = options?.minWallets ?? 2;
    const buySol = options?.buyAmountSol ?? 2.0;

    // 1. Detect consensus signals
    const signals = await consensusEngine.detectConsensusSignals(4, minWallets);

    const autoBuys: ConsensusTradeCycleResult['autoBuysExecuted'] = [];

    // 2. Process buys for strong consensus tokens
    for (const sig of signals) {
      if (sig.walletCount >= minWallets) {
        // Check if we already have an open position in this token
        const existingPos = await prisma.paperPosition.findUnique({
          where: { tokenAddress: sig.tokenAddress },
        });

        if (!existingPos || existingPos.isClosed || existingPos.remainingTokens <= 0) {
          try {
            // Find reference price from latest buy
            const latestTx = await prisma.transaction.findFirst({
              where: { tokenAddress: sig.tokenAddress, type: 'BUY' },
              orderBy: { blockTime: 'desc' },
            });

            let priceSol = 0.00000045;
            if (latestTx && latestTx.tokenAmount > 0 && latestTx.solAmount > 0) {
              priceSol = latestTx.solAmount / latestTx.tokenAmount;
            }
            priceSol = Math.max(0.0000000001, priceSol);

            const trade = await paperEngine.executeTrade({
              tokenAddress: sig.tokenAddress,
              tokenSymbol: sig.tokenSymbol,
              side: 'BUY',
              solAmount: buySol,
              priceSol,
              slippage: 0.015, // 1.5% slippage
              feeSol: 0.0005,
              latencyMs: 1200,
            });

            autoBuys.push({
              tokenAddress: sig.tokenAddress,
              tokenSymbol: sig.tokenSymbol,
              solAmount: buySol,
              walletCount: sig.walletCount,
              tradeId: trade.id,
            });
          } catch (buyErr) {
            console.error(`[ConsensusTrader] Error executing auto-buy for ${sig.tokenSymbol}:`, buyErr);
          }
        }
      }
    }

    // 3. Evaluate smart exits on all open positions
    const exits = await smartExitEngine.evaluateAndExecuteExits({
      stopLossPct: options?.stopLossPct,
      takeProfitPct: options?.takeProfitPct,
      maxHoldHours: options?.maxHoldHours,
    });

    return {
      detectedSignals: signals,
      autoBuysExecuted: autoBuys,
      exitsEvaluated: exits,
      timestamp: new Date(),
    };
  }
}

export const consensusTrader = new ConsensusTraderService();
