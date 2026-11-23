import prisma from '@/lib/prisma';
import { solanaRpc } from '../solana/rpc';
import { transactionParser } from '../solana/parser';
import { walletAnalyzer } from '../intelligence/analyzer';

export interface PollResult {
  walletsChecked: number;
  newAlertsCount: number;
  newTransactionsCount: number;
  details: Array<{
    address: string;
    newTrades: number;
    alertsCreated: number;
  }>;
}

export class WalletMonitorService {
  /**
   * Run one round of incremental monitoring across all active wallets
   */
  public async pollActiveWallets(maxWallets = 15): Promise<PollResult> {
    const activeWallets = await prisma.wallet.findMany({
      where: { isActive: true },
      take: maxWallets,
      orderBy: { lastSyncedAt: 'asc' }, // Prioritize least recently checked
    });

    let totalAlerts = 0;
    let totalTxs = 0;
    const details: PollResult['details'] = [];

    for (const wallet of activeWallets) {
      let walletNewTxs = 0;
      let walletNewAlerts = 0;

      try {
        // 1. Fetch latest 10 signatures
        const sigInfos = await solanaRpc.getSignaturesForAddress(wallet.address, {
          limit: 10,
        });

        if (!sigInfos || sigInfos.length === 0) {
          await prisma.wallet.update({
            where: { address: wallet.address },
            data: { lastSyncedAt: new Date() },
          });
          continue;
        }

        const signatures = sigInfos.map((s) => s.signature);

        // 2. Query known signatures to avoid duplicate alerts and double parsing
        const [existingTxs, existingAlerts] = await Promise.all([
          prisma.transaction.findMany({
            where: { signature: { in: signatures } },
            select: { signature: true },
          }),
          prisma.monitorAlert.findMany({
            where: { signature: { in: signatures } },
            select: { signature: true },
          }),
        ]);

        const knownSet = new Set([
          ...existingTxs.map((t) => t.signature),
          ...existingAlerts.map((a) => a.signature),
        ]);

        const freshSignatures = signatures.filter((sig) => !knownSet.has(sig));

        for (const sig of freshSignatures) {
          try {
            const rawTx = await solanaRpc.getParsedTransaction(sig);
            if (!rawTx) continue;

            const parsed = transactionParser.parseTransaction(rawTx, wallet.address);
            if (!parsed) continue;

            // Save transaction
            await prisma.transaction.create({
              data: {
                signature: parsed.signature,
                walletAddress: wallet.address,
                blockTime: parsed.blockTime,
                slot: parsed.slot,
                type: parsed.type,
                tokenAddress: parsed.tokenAddress,
                tokenSymbol: parsed.tokenSymbol,
                tokenName: parsed.tokenName,
                tokenAmount: parsed.tokenAmount,
                solAmount: parsed.solAmount,
                usdAmount: parsed.usdAmount,
                feeSol: parsed.feeSol,
                source: parsed.source,
                rawData: parsed.rawData,
              },
            });
            walletNewTxs++;

            // Create Monitor Alert if it's BUY or SELL
            if (parsed.type === 'BUY' || parsed.type === 'SELL') {
              const isLarge = parsed.solAmount >= 10.0;
              const alertType = isLarge
                ? 'LARGE_SWAP'
                : parsed.type === 'BUY'
                ? 'NEW_BUY'
                : 'NEW_SELL';

              const actionName = parsed.type === 'BUY' ? '买入' : '卖出';
              const tokenLabel =
                parsed.tokenSymbol || parsed.tokenAddress.slice(0, 6);

              await prisma.monitorAlert.create({
                data: {
                  walletAddress: wallet.address,
                  signature: parsed.signature,
                  alertType,
                  title: `${wallet.label || '监控钱包'} ${actionName} ${tokenLabel}`,
                  message: `在 ${parsed.source} ${actionName} ${
                    parsed.tokenAmount > 0
                      ? parsed.tokenAmount.toLocaleString() + ' 个'
                      : ''
                  } ${tokenLabel}，发生额 ${parsed.solAmount.toFixed(3)} SOL`,
                  tokenAddress: parsed.tokenAddress,
                  tokenSymbol: parsed.tokenSymbol,
                  amountSol: parsed.solAmount,
                  isRead: false,
                },
              });
              walletNewAlerts++;
            }
          } catch (txErr) {
            console.error(`[Monitor] Error parsing tx ${sig}:`, txErr);
          }
        }

        // If new transactions were found, refresh metrics
        if (walletNewTxs > 0) {
          await walletAnalyzer.analyzeWallet(wallet.address).catch(() => {});
        }

        await prisma.wallet.update({
          where: { address: wallet.address },
          data: { lastSyncedAt: new Date() },
        });
      } catch (walletErr) {
        console.error(`[Monitor] Error monitoring wallet ${wallet.address}:`, walletErr);
      }

      totalAlerts += walletNewAlerts;
      totalTxs += walletNewTxs;
      details.push({
        address: wallet.address,
        newTrades: walletNewTxs,
        alertsCreated: walletNewAlerts,
      });
    }

    return {
      walletsChecked: activeWallets.length,
      newAlertsCount: totalAlerts,
      newTransactionsCount: totalTxs,
      details,
    };
  }
}

export const monitorService = new WalletMonitorService();
