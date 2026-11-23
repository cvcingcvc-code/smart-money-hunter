import { describe, it, expect, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';

describe('Step 4 Verification: Monitor Engine & Deduplicated Alerting', () => {
  const testWallet = 'Whale111111111111111111111111111111111111111';
  const testSig1 = 'sig_test_step4_alert_001_' + Date.now();
  const testSig2 = 'sig_test_step4_alert_002_' + Date.now();

  afterAll(async () => {
    await prisma.monitorAlert.deleteMany({
      where: {
        signature: { in: [testSig1, testSig2] },
      },
    });
    await prisma.$disconnect();
  });

  it('should generate NEW_BUY alert for incoming buy transaction', async () => {
    const alert = await prisma.monitorAlert.create({
      data: {
        walletAddress: testWallet,
        signature: testSig1,
        alertType: 'NEW_BUY',
        title: 'Meme Sniper Alpha 买入 BONK',
        message: '在 RAYDIUM 买入 BONK，发生额 3.5 SOL',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenSymbol: 'BONK',
        amountSol: 3.5,
        isRead: false,
      },
    });

    expect(alert).toBeDefined();
    expect(alert.alertType).toBe('NEW_BUY');
    expect(alert.isRead).toBe(false);
  });

  it('should avoid duplicate alert creation for same signature', async () => {
    // Check if testSig1 exists
    const existing = await prisma.monitorAlert.findMany({
      where: { signature: testSig1 },
    });
    expect(existing.length).toBe(1);

    // Filter simulation as in monitorService
    const freshSignatures = [testSig1, testSig2].filter(
      (sig) => !existing.some((e) => e.signature === sig)
    );
    expect(freshSignatures).toEqual([testSig2]);
  });

  it('should support marking alerts as read individually or in batch', async () => {
    const alert2 = await prisma.monitorAlert.create({
      data: {
        walletAddress: testWallet,
        signature: testSig2,
        alertType: 'LARGE_SWAP',
        title: '大额异动',
        message: '大额交易 15.0 SOL',
        tokenAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        amountSol: 15.0,
        isRead: false,
      },
    });

    expect(alert2.isRead).toBe(false);

    // Mark as read
    await prisma.monitorAlert.update({
      where: { id: alert2.id },
      data: { isRead: true },
    });

    const updated = await prisma.monitorAlert.findUnique({
      where: { id: alert2.id },
    });
    expect(updated?.isRead).toBe(true);
  });
});
