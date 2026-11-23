import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../src/lib/prisma';
import { consensusEngine } from '../src/lib/intelligence/consensus';
import { smartExitEngine } from '../src/lib/paper/exit-strategy';
import { consensusTrader } from '../src/lib/paper/consensus-trader';
import { Keypair } from '@solana/web3.js';

describe('Step 8: Multi-Wallet Consensus & 4-Layer Exit Strategy Engine', () => {
  const testWalletA = Keypair.generate().publicKey.toBase58();
  const testWalletB = Keypair.generate().publicKey.toBase58();
  const dummyWalletC = Keypair.generate().publicKey.toBase58();
  const testTokenConsensus = 'TestTokenConsensus11111111111111111111111';
  const testTokenSingle = 'TestTokenSingle111111111111111111111111111';

  beforeEach(async () => {
    // Clean up test data
    await prisma.paperTrade.deleteMany({
      where: {
        tokenAddress: { in: [testTokenConsensus, testTokenSingle] },
      },
    });
    await prisma.paperPosition.deleteMany({
      where: {
        tokenAddress: { in: [testTokenConsensus, testTokenSingle] },
      },
    });
    await prisma.transaction.deleteMany({
      where: {
        tokenAddress: { in: [testTokenConsensus, testTokenSingle] },
      },
    });
    await prisma.walletTag.deleteMany({
      where: {
        walletAddress: { in: [testWalletA, testWalletB, dummyWalletC] },
      },
    });
    await prisma.wallet.deleteMany({
      where: {
        address: { in: [testWalletA, testWalletB, dummyWalletC] },
      },
    });
  });

  it('1. should detect multi-wallet consensus when >= 2 smart wallets buy the same token', async () => {
    // 1. Create 2 Smart Wallets with CANDIDATE_SMART_MONEY tag
    await prisma.wallet.create({
      data: {
        address: testWalletA,
        label: 'Smart Whale A',
        category: 'SMART_MONEY',
        tags: {
          create: [
            {
              tag: 'CANDIDATE_SMART_MONEY',
              displayName: '候选聪明钱',
              triggerCondition: 'Winrate >= 60%',
              metricValues: JSON.stringify({ winRate: 75 }),
              sampleSize: 20,
              confidence: 0.9,
            },
          ],
        },
      },
    });

    await prisma.wallet.create({
      data: {
        address: testWalletB,
        label: 'Smart Whale B',
        category: 'SMART_MONEY',
        tags: {
          create: [
            {
              tag: 'CANDIDATE_SMART_MONEY',
              displayName: '候选聪明钱',
              triggerCondition: 'Winrate >= 60%',
              metricValues: JSON.stringify({ winRate: 80 }),
              sampleSize: 25,
              confidence: 0.95,
            },
          ],
        },
      },
    });

    // 2. Insert BUY transactions for testTokenConsensus from both wallets
    const now = new Date();
    await prisma.transaction.create({
      data: {
        signature: 'sig_a_' + Date.now(),
        walletAddress: testWalletA,
        blockTime: new Date(now.getTime() - 10 * 60 * 1000), // 10 mins ago
        slot: 1001,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        tokenAmount: 1000000,
        solAmount: 5.0,
        feeSol: 0.0005,
      },
    });

    await prisma.transaction.create({
      data: {
        signature: 'sig_b_' + Date.now(),
        walletAddress: testWalletB,
        blockTime: new Date(now.getTime() - 5 * 60 * 1000), // 5 mins ago
        slot: 1002,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        tokenAmount: 2000000,
        solAmount: 8.0,
        feeSol: 0.0005,
      },
    });

    // Single buy for another token from wallet A only
    await prisma.transaction.create({
      data: {
        signature: 'sig_c_' + Date.now(),
        walletAddress: testWalletA,
        blockTime: new Date(now.getTime() - 2 * 60 * 1000),
        slot: 1003,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenSingle,
        tokenSymbol: 'SINGLE_TOKEN',
        tokenAmount: 500000,
        solAmount: 1.0,
        feeSol: 0.0005,
      },
    });

    // Run consensus detection
    const signals = await consensusEngine.detectConsensusSignals(2, 2);

    // The consensus token should be detected
    const consensusSig = signals.find((s) => s.tokenAddress === testTokenConsensus);
    expect(consensusSig).toBeDefined();
    expect(consensusSig?.walletCount).toBe(2);
    expect(consensusSig?.totalSolVolume).toBe(13.0);
    expect(consensusSig?.consensusStrength).toBe('MEDIUM'); // 2 wallets = MEDIUM

    // The single token should NOT be in consensus signals
    const singleSig = signals.find((s) => s.tokenAddress === testTokenSingle);
    expect(singleSig).toBeUndefined();
  });

  it('2. should trigger FIRST_SELL_EXIT rule when smart money begins selling', async () => {
    // 1. Establish an open paper position
    const openedAt = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
    await prisma.paperPosition.create({
      data: {
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        remainingTokens: 100000,
        costSol: 2.0,
        avgPriceSol: 0.00002,
        currentPriceSol: 0.00002,
        isClosed: false,
        openedAt,
      },
    });

    // Ensure wallet A is recorded as smart money
    const existingWallet = await prisma.wallet.findUnique({ where: { address: testWalletA } });
    if (!existingWallet) {
      await prisma.wallet.create({
        data: {
          address: testWalletA,
          label: 'Smart Whale A',
          category: 'SMART_MONEY',
        },
      });
    }

    // 2. Insert a SELL transaction from Smart Whale A after our position opened
    await prisma.transaction.create({
      data: {
        signature: 'sig_sell_' + Date.now(),
        walletAddress: testWalletA,
        blockTime: new Date(Date.now() - 5 * 60 * 1000),
        slot: 2001,
        type: 'SELL',
        source: 'RAYDIUM',
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        tokenAmount: 500000,
        solAmount: 6.0,
        feeSol: 0.0005,
      },
    });

    // 3. Evaluate exit rules
    const exitResults = await smartExitEngine.evaluateAndExecuteExits();
    const tokenExit = exitResults.find((r) => r.tokenAddress === testTokenConsensus);

    expect(tokenExit).toBeDefined();
    expect(tokenExit?.ruleTriggered).toBe('FIRST_SELL_EXIT');
    expect(tokenExit?.sellRatio).toBe(1.0);
    expect(tokenExit?.executed).toBe(true);

    // Verify position is now closed
    const updatedPos = await prisma.paperPosition.findUnique({
      where: { tokenAddress: testTokenConsensus },
    });
    expect(updatedPos?.isClosed).toBe(true);
    expect(updatedPos?.remainingTokens).toBe(0);
  });

  it('3. should trigger STOP_LOSS rule when unrealized loss exceeds 20%', async () => {
    // 1. Establish an open paper position with high cost
    await prisma.paperPosition.create({
      data: {
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        remainingTokens: 100000,
        costSol: 10.0,
        avgPriceSol: 0.0001,
        currentPriceSol: 0.00006, // 40% loss
        isClosed: false,
        openedAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    });

    // Create dummyWalletC to satisfy foreign key constraint
    await prisma.wallet.create({
      data: {
        address: dummyWalletC,
        label: 'Normal Trader C',
        category: 'GENERAL',
      },
    });

    // Add a latest low price transaction
    await prisma.transaction.create({
      data: {
        signature: 'sig_low_' + Date.now(),
        walletAddress: dummyWalletC,
        blockTime: new Date(),
        slot: 3001,
        type: 'BUY',
        source: 'RAYDIUM',
        tokenAddress: testTokenConsensus,
        tokenSymbol: 'CONSENSUS_DOGE',
        tokenAmount: 100000,
        solAmount: 6.0, // price = 0.00006 SOL, loss = 40%
        feeSol: 0.0005,
      },
    });

    // Evaluate with followSmartMoneySell = false to test pure STOP_LOSS
    const exitResults = await smartExitEngine.evaluateAndExecuteExits({
      followSmartMoneySell: false,
      stopLossPct: -0.20,
    });

    const tokenExit = exitResults.find((r) => r.tokenAddress === testTokenConsensus);
    expect(tokenExit).toBeDefined();
    expect(tokenExit?.ruleTriggered).toBe('STOP_LOSS');
    expect(tokenExit?.executed).toBe(true);
  });

  it('4. should run complete ConsensusTrader cycle (detect -> auto-buy -> auto-exit)', async () => {
    // Clean slate for testTokenConsensus
    await prisma.paperPosition.deleteMany({ where: { tokenAddress: testTokenConsensus } });

    // Run cycle
    const cycleResult = await consensusTrader.runTradingCycle({
      minWallets: 2,
      buyAmountSol: 1.5,
    });

    expect(cycleResult).toBeDefined();
    expect(Array.isArray(cycleResult.detectedSignals)).toBe(true);
    expect(Array.isArray(cycleResult.autoBuysExecuted)).toBe(true);
    expect(Array.isArray(cycleResult.exitsEvaluated)).toBe(true);
  });
});
