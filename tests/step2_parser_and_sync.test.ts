import { describe, it, expect } from 'vitest';
import { solanaRpc } from '../src/lib/solana/rpc';
import { transactionParser } from '../src/lib/solana/parser';
import { ParsedTransactionWithMeta } from '@solana/web3.js';

describe('Step 2 Verification: Solana RPC & Transaction Parser', () => {
  it('should validate valid Solana Base58 public keys and reject invalid ones', () => {
    // Valid Solana addresses
    expect(solanaRpc.validateAddress('5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1')).toBe(true);
    expect(solanaRpc.validateAddress('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')).toBe(true);

    // Invalid addresses
    expect(solanaRpc.validateAddress('0x1234567890abcdef')).toBe(false);
    expect(solanaRpc.validateAddress('not_an_address')).toBe(false);
    expect(solanaRpc.validateAddress('')).toBe(false);
  });

  it('should correctly parse a Raydium BUY transaction from balance changes', () => {
    const walletAddress = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
    const tokenMint = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'; // BONK

    const mockTx: ParsedTransactionWithMeta = {
      slot: 310000000,
      blockTime: 1715000000,
      transaction: {
        signatures: ['sig_mock_buy_tx_12345'],
        message: {
          accountKeys: [
            { pubkey: { toBase58: () => walletAddress } } as any,
            { pubkey: { toBase58: () => '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' } } as any, // Raydium
          ],
          instructions: [],
          recentBlockhash: 'mock_blockhash',
        },
      },
      meta: {
        err: null,
        fee: 5000,
        preBalances: [10 * 1e9, 100 * 1e9],
        postBalances: [7.5 * 1e9, 102.5 * 1e9], // Wallet spent ~2.5 SOL
        preTokenBalances: [
          {
            accountIndex: 0,
            mint: tokenMint,
            owner: walletAddress,
            uiTokenAmount: { uiAmount: 0, decimals: 5, amount: '0' },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 0,
            mint: tokenMint,
            owner: walletAddress,
            uiTokenAmount: { uiAmount: 1000000, decimals: 5, amount: '100000000000' },
          },
        ],
      },
    };

    const parsed = transactionParser.parseTransaction(mockTx, walletAddress);
    expect(parsed).toBeDefined();
    expect(parsed?.type).toBe('BUY');
    expect(parsed?.tokenAddress).toBe(tokenMint);
    expect(parsed?.tokenSymbol).toBe('BONK');
    expect(parsed?.tokenAmount).toBe(1000000);
    expect(parsed?.solAmount).toBeCloseTo(2.5, 2);
    expect(parsed?.feeSol).toBeCloseTo(0.000005, 6);
    expect(parsed?.source).toBe('RAYDIUM');
    expect(parsed?.isPriceUnavailable).toBe(true);
    expect(parsed?.usdAmount).toBeNull();
  });

  it('should correctly parse a Pump.fun SELL transaction', () => {
    const walletAddress = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
    const tokenMint = 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'; // WIF

    const mockTx: ParsedTransactionWithMeta = {
      slot: 310000500,
      blockTime: 1715003600,
      transaction: {
        signatures: ['sig_mock_sell_tx_67890'],
        message: {
          accountKeys: [
            { pubkey: { toBase58: () => walletAddress } } as any,
            { pubkey: { toBase58: () => '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' } } as any, // Pump.fun
          ],
          instructions: [],
          recentBlockhash: 'mock_blockhash_2',
        },
      },
      meta: {
        err: null,
        fee: 5000,
        preBalances: [5 * 1e9, 50 * 1e9],
        postBalances: [9.2 * 1e9, 45.8 * 1e9], // Wallet received ~4.2 SOL
        preTokenBalances: [
          {
            accountIndex: 0,
            mint: tokenMint,
            owner: walletAddress,
            uiTokenAmount: { uiAmount: 5000, decimals: 6, amount: '5000000000' },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 0,
            mint: tokenMint,
            owner: walletAddress,
            uiTokenAmount: { uiAmount: 0, decimals: 6, amount: '0' },
          },
        ],
      },
    };

    const parsed = transactionParser.parseTransaction(mockTx, walletAddress);
    expect(parsed).toBeDefined();
    expect(parsed?.type).toBe('SELL');
    expect(parsed?.tokenAddress).toBe(tokenMint);
    expect(parsed?.tokenSymbol).toBe('WIF');
    expect(parsed?.tokenAmount).toBe(5000);
    expect(parsed?.solAmount).toBeCloseTo(4.2, 2);
    expect(parsed?.source).toBe('PUMPFUN');
  });

  it('should return null for failed on-chain transactions', () => {
    const walletAddress = '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1';
    const mockFailedTx: ParsedTransactionWithMeta = {
      slot: 310000999,
      blockTime: 1715005000,
      transaction: {
        signatures: ['sig_mock_failed_tx'],
        message: {
          accountKeys: [{ pubkey: { toBase58: () => walletAddress } } as any],
          instructions: [],
          recentBlockhash: 'mock_blockhash',
        },
      },
      meta: {
        err: { InstructionError: [0, 'CustomError'] },
        fee: 5000,
        preBalances: [10 * 1e9],
        postBalances: [9.999995 * 1e9],
      },
    };

    const parsed = transactionParser.parseTransaction(mockFailedTx, walletAddress);
    expect(parsed).toBeNull();
  });
});
