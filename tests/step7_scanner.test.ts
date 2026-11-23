import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { walletScanner } from '../src/lib/scanner/wallet-scanner';
import { solanaRpc } from '../src/lib/solana/rpc';

describe('Step 7 Verification: 100 Wallets Scanner & Batch Profitability Analyzer', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should discover unique valid Solana Base58 wallet addresses', async () => {
    const addresses = await walletScanner.discoverWallets(25);

    expect(addresses.length).toBeGreaterThanOrEqual(25);
    // Every address must be a valid Solana public key
    for (const addr of addresses) {
      expect(solanaRpc.validateAddress(addr)).toBe(true);
    }

    // Verify all addresses are unique
    const uniqueSet = new Set(addresses);
    expect(uniqueSet.size).toBe(addresses.length);
  }, 15000);

  it('should run batch analysis, compute metrics, and identify profitable smart money', async () => {
    // Run scanner on a small batch of 12 wallets for fast test execution
    const progress = await walletScanner.runFullScan(12);

    expect(progress.status).toBe('COMPLETED');
    expect(progress.discoveredCount).toBe(12);
    expect(progress.analyzedCount).toBe(12);
    expect(progress.profitableCount).toBeGreaterThan(0);

    // Query top profitable wallets
    const topWallets = await walletScanner.getTopProfitableWallets(5);
    expect(topWallets.length).toBeGreaterThan(0);

    // Ensure ranked descending by realizedPnlSol
    for (let i = 0; i < topWallets.length - 1; i++) {
      const currentPnl = topWallets[i].metrics?.realizedPnlSol || 0;
      const nextPnl = topWallets[i + 1].metrics?.realizedPnlSol || 0;
      expect(currentPnl).toBeGreaterThanOrEqual(nextPnl);
    }
  }, 20000);
});
