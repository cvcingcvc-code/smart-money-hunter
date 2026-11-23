import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { DexSource, TransactionType } from '@/types';

export interface ParsedTradeResult {
  signature: string;
  blockTime: Date;
  slot: number;
  type: TransactionType;
  tokenAddress: string;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenAmount: number;
  solAmount: number;
  usdAmount: number | null; // null if not available
  feeSol: number;
  source: DexSource;
  rawData?: string;
  isPriceUnavailable: boolean;
}

const DEX_PROGRAM_IDS: Record<string, DexSource> = {
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'PUMPFUN',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'RAYDIUM',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'RAYDIUM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'RAYDIUM',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'JUPITER',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'ORCA',
};

// Known popular Solana tokens
const KNOWN_TOKENS: Record<string, { symbol: string; name: string }> = {
  'So11111111111111111111111111111111111111112': { symbol: 'WSOL', name: 'Wrapped SOL' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat' },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': { symbol: 'POPCAT', name: 'Popcat' },
  'MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5': { symbol: 'MEW', name: 'cat in a dogs world' },
};

export class SolanaTransactionParser {
  /**
   * Parse a transaction with metadata to extract trade direction and token amounts
   */
  public parseTransaction(
    tx: ParsedTransactionWithMeta,
    walletAddress: string
  ): ParsedTradeResult | null {
    if (!tx || !tx.meta) return null;
    if (tx.meta.err) return null; // Ignore failed on-chain transactions

    const signature = tx.transaction.signatures[0];
    const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000) : new Date();
    const slot = tx.slot || 0;
    const feeSol = (tx.meta.fee || 5000) / 1e9;

    // 1. Identify DEX program source
    let source: DexSource = 'UNKNOWN';
    const accountKeys = tx.transaction.message.accountKeys.map((k: any) =>
      typeof k === 'string' ? k : k.pubkey?.toBase58 ? k.pubkey.toBase58() : String(k.pubkey || k)
    );

    for (const key of accountKeys) {
      if (DEX_PROGRAM_IDS[key]) {
        source = DEX_PROGRAM_IDS[key];
        break;
      }
    }

    // 2. Identify target wallet index
    const walletIndex = accountKeys.findIndex((k) => k === walletAddress);
    if (walletIndex === -1) {
      return null;
    }

    // 3. Compute SOL balance change
    const preSol = (tx.meta.preBalances[walletIndex] || 0) / 1e9;
    const postSol = (tx.meta.postBalances[walletIndex] || 0) / 1e9;
    const isFeePayer = walletIndex === 0;
    // Net SOL delta excluding gas fee
    let solDelta = postSol - preSol;
    if (isFeePayer && solDelta < 0) {
      solDelta += feeSol; // Compensate fee to evaluate pure swap SOL amount
    }

    // 4. Compute Token balance changes
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Map token amounts by mint
    const tokenChanges = new Map<string, { delta: number; decimals: number }>();

    for (const post of postTokenBalances) {
      if (post.owner === walletAddress || post.accountIndex === walletIndex) {
        const mint = post.mint;
        if (mint === 'So11111111111111111111111111111111111111112') continue; // Skip WSOL
        const postAmount = post.uiTokenAmount.uiAmount || 0;
        const decimals = post.uiTokenAmount.decimals || 0;
        tokenChanges.set(mint, { delta: postAmount, decimals });
      }
    }

    for (const pre of preTokenBalances) {
      if (pre.owner === walletAddress || pre.accountIndex === walletIndex) {
        const mint = pre.mint;
        if (mint === 'So11111111111111111111111111111111111111112') continue;
        const preAmount = pre.uiTokenAmount.uiAmount || 0;
        const existing = tokenChanges.get(mint);
        if (existing) {
          existing.delta -= preAmount;
        } else {
          tokenChanges.set(mint, {
            delta: -preAmount,
            decimals: pre.uiTokenAmount.decimals || 0,
          });
        }
      }
    }

    // 5. Determine Trade Direction & Principal Token
    let principalMint = '';
    let principalTokenDelta = 0;

    tokenChanges.forEach((info, mint) => {
      if (Math.abs(info.delta) > Math.abs(principalTokenDelta)) {
        principalMint = mint;
        principalTokenDelta = info.delta;
      }
    });

    let tradeType: TransactionType = 'UNKNOWN';
    let solAmount = Math.abs(solDelta);
    let tokenAmount = Math.abs(principalTokenDelta);

    if (principalMint) {
      if (solDelta < -0.0001 && principalTokenDelta > 0) {
        tradeType = 'BUY';
      } else if (solDelta > 0.0001 && principalTokenDelta < 0) {
        tradeType = 'SELL';
      } else if (principalTokenDelta > 0) {
        tradeType = 'BUY'; // Possible received via DEX routing without direct SOL drop
      } else if (principalTokenDelta < 0) {
        tradeType = 'SELL';
      }
    } else {
      // No SPL token change detected, could be pure SOL transfer
      if (Math.abs(solDelta) > 0.001) {
        tradeType = 'TRANSFER';
        principalMint = 'So11111111111111111111111111111111111111112';
      }
    }

    if (tradeType === 'UNKNOWN') {
      return null;
    }

    const tokenMeta = KNOWN_TOKENS[principalMint];

    return {
      signature,
      blockTime,
      slot,
      type: tradeType,
      tokenAddress: principalMint,
      tokenSymbol: tokenMeta?.symbol || null,
      tokenName: tokenMeta?.name || null,
      tokenAmount,
      solAmount,
      usdAmount: null, // Public RPC doesn't carry historical USD quote; mark as null
      isPriceUnavailable: true,
      feeSol,
      source,
      rawData: JSON.stringify({
        fee: feeSol,
        slot,
        solDelta,
        principalTokenDelta,
      }),
    };
  }
}

export const transactionParser = new SolanaTransactionParser();
