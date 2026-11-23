import { Connection, PublicKey, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from '@solana/web3.js';

// Multiple public endpoints with fallback
const RPC_ENDPOINTS = [
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  process.env.SOLANA_BACKUP_RPC_URL || 'https://solana-rpc.publicnode.com',
];

class SolanaRpcClient {
  private currentEndpointIndex = 0;
  private connection: Connection;
  private lastRequestTime = 0;
  private minIntervalMs = 350; // Rate limit protection: max ~3 requests/sec

  constructor() {
    this.connection = new Connection(RPC_ENDPOINTS[0], {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 30000,
    });
  }

  private switchEndpoint() {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % RPC_ENDPOINTS.length;
    const nextUrl = RPC_ENDPOINTS[this.currentEndpointIndex];
    console.warn(`[Solana RPC] Switching to fallback endpoint: ${nextUrl}`);
    this.connection = new Connection(nextUrl, 'confirmed');
  }

  private async rateLimitThrottle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  // Execute RPC call with retry and exponential backoff
  public async executeWithRetry<T>(
    operation: (conn: Connection) => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 600
  ): Promise<T> {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.rateLimitThrottle();
        return await operation(this.connection);
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        if (errorMsg.includes('Transaction version')) {
          throw error;
        }
        const isRateLimit =
          errorMsg.includes('429') ||
          errorMsg.includes('Too Many Requests') ||
          errorMsg.includes('rate limit');

        console.warn(
          `[Solana RPC] Attempt ${attempt}/${maxRetries} failed: ${errorMsg}. Retrying in ${delay}ms...`
        );

        if (attempt === maxRetries) {
          throw error;
        }

        if (isRateLimit || attempt >= 2) {
          this.switchEndpoint();
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 1.5;
      }
    }
    throw new Error('[Solana RPC] All retries exhausted');
  }

  public validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  public async getSignaturesForAddress(
    address: string,
    options?: { limit?: number; before?: string; until?: string }
  ): Promise<ConfirmedSignatureInfo[]> {
    const pubkey = new PublicKey(address);
    return this.executeWithRetry((conn) =>
      conn.getSignaturesForAddress(pubkey, {
        limit: options?.limit || 25,
        before: options?.before,
        until: options?.until,
      })
    );
  }

  public async getParsedTransaction(
    signature: string
  ): Promise<ParsedTransactionWithMeta | null> {
    try {
      return await this.executeWithRetry((conn) =>
        conn.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        })
      );
    } catch (err: any) {
      if (err?.message?.includes('Transaction version')) {
        return null;
      }
      throw err;
    }
  }

  public async getBalance(address: string): Promise<number> {
    const pubkey = new PublicKey(address);
    const lamports = await this.executeWithRetry((conn) => conn.getBalance(pubkey));
    return lamports / 1e9;
  }
}

export const solanaRpc = new SolanaRpcClient();
