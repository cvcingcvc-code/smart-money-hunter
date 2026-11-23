import prisma from '@/lib/prisma';
import { solanaRpc } from './rpc';
import { transactionParser, ParsedTradeResult } from './parser';

export interface SyncResult {
  address: string;
  totalFound: number;
  newParsed: number;
  skippedExisting: number;
  failedParse: number;
  error?: string;
}

export class SolanaSyncService {
  /**
   * Sync transactions for a specific wallet address from Solana RPC
   */
  public async syncWalletTransactions(
    address: string,
    limit = 20
  ): Promise<SyncResult> {
    try {
      console.log(`[SyncService] Starting sync for wallet ${address} (limit: ${limit})`);

      // 1. Fetch transaction signatures from RPC
      const signaturesInfo = await solanaRpc.getSignaturesForAddress(address, {
        limit,
      });

      if (!signaturesInfo || signaturesInfo.length === 0) {
        await prisma.wallet.update({
          where: { address },
          data: { lastSyncedAt: new Date() },
        });
        return {
          address,
          totalFound: 0,
          newParsed: 0,
          skippedExisting: 0,
          failedParse: 0,
        };
      }

      const signatures = signaturesInfo.map((s) => s.signature);

      // 2. Query existing transactions in DB
      const existing = await prisma.transaction.findMany({
        where: {
          signature: { in: signatures },
        },
        select: { signature: true },
      });
      const existingSet = new Set(existing.map((e) => e.signature));

      const newSignatures = signatures.filter((sig) => !existingSet.has(sig));

      let newParsedCount = 0;
      let failedParseCount = 0;

      // 3. Batch parse new transactions with throttle
      for (const sig of newSignatures) {
        try {
          const rawTx = await solanaRpc.getParsedTransaction(sig);
          if (!rawTx) {
            failedParseCount++;
            continue;
          }

          const parsed = transactionParser.parseTransaction(rawTx, address);
          if (!parsed) {
            failedParseCount++;
            continue;
          }

          // Save to database
          await prisma.transaction.create({
            data: {
              signature: parsed.signature,
              walletAddress: address,
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
          newParsedCount++;
        } catch (err) {
          console.error(`[SyncService] Error parsing tx ${sig}:`, err);
          failedParseCount++;
        }
      }

      // Update wallet lastSyncedAt
      await prisma.wallet.update({
        where: { address },
        data: { lastSyncedAt: new Date() },
      });

      console.log(
        `[SyncService] Sync finished for ${address}: ${newParsedCount} new, ${existingSet.size} existing, ${failedParseCount} skipped/failed`
      );

      return {
        address,
        totalFound: signatures.length,
        newParsed: newParsedCount,
        skippedExisting: existingSet.size,
        failedParse: failedParseCount,
      };
    } catch (error: any) {
      console.error(`[SyncService] Fatal sync failure for ${address}:`, error);
      return {
        address,
        totalFound: 0,
        newParsed: 0,
        skippedExisting: 0,
        failedParse: 0,
        error: error?.message || String(error),
      };
    }
  }
}

export const syncService = new SolanaSyncService();
