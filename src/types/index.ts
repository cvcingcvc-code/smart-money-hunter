export type WalletCategory =
  | 'MEME_TRADER'
  | 'SMART_MONEY'
  | 'KOL'
  | 'SNIPER'
  | 'UNKNOWN';

export type TransactionType = 'BUY' | 'SELL' | 'TRANSFER' | 'UNKNOWN';

export type DexSource = 'RAYDIUM' | 'PUMPFUN' | 'JUPITER' | 'ORCA' | 'UNKNOWN';

export type TagType =
  | 'HIGH_FREQUENCY'
  | 'EARLY_BUYER'
  | 'CANDIDATE_SMART_MONEY'
  | 'SHORT_TERM_TRADER'
  | 'HIGH_CONCENTRATION'
  | 'HIGH_RISK'
  | 'INSUFFICIENT_DATA';

export type DataReliability = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';

export type AlertType = 'NEW_BUY' | 'NEW_SELL' | 'LARGE_SWAP' | 'SNIPE';

export type WatchRecommendation = 'RECOMMEND' | 'NEUTRAL' | 'AVOID';

export interface WalletRecord {
  id: string;
  address: string;
  label?: string | null;
  category: WalletCategory;
  notes?: string | null;
  isActive: boolean;
  lastSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransactionRecord {
  id: string;
  signature: string;
  walletAddress: string;
  blockTime: Date;
  slot: number;
  type: TransactionType;
  tokenAddress: string;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenAmount: number;
  solAmount: number;
  usdAmount?: number | null;
  feeSol: number;
  source: DexSource;
  rawData?: string | null;
  createdAt: Date;
}

export interface WalletMetricsRecord {
  id: string;
  walletAddress: string;
  totalTrades: number;
  buyTrades: number;
  sellTrades: number;
  winRate?: number | null;
  realizedPnlSol?: number | null;
  realizedPnlUsd?: number | null;
  avgHoldDurationHours?: number | null;
  topTokens?: string | null;
  tradeFrequencyPerDay: number;
  earlyEntryCount: number;
  concentrationScore: number;
  riskScore: number;
  sampleSize: number;
  calculatedAt: Date;
  dataReliability: DataReliability;
}

export interface TagRuleResult {
  tag: TagType;
  displayName: string;
  isTriggered: boolean;
  triggerCondition: string;
  metricValues: Record<string, any>;
  sampleSize: number;
  confidence: number;
  reason: string;
}

export interface PaperTradeRecord {
  id: string;
  walletAddress?: string | null;
  tokenAddress: string;
  tokenSymbol?: string | null;
  side: 'BUY' | 'SELL';
  solAmount: number;
  tokenAmount: number;
  priceSol: number;
  slippage: number;
  feeSol: number;
  latencyMs: number;
  status: 'FILLED' | 'CANCELLED';
  pnlSol?: number | null;
  pnlPercent?: number | null;
  executedAt: Date;
}

export interface PaperPositionRecord {
  id: string;
  tokenAddress: string;
  tokenSymbol?: string | null;
  remainingTokens: number;
  costSol: number;
  avgPriceSol: number;
  currentPriceSol?: number | null;
  unrealizedPnlSol?: number | null;
  realizedPnlSol: number;
  isClosed: boolean;
  openedAt: Date;
  updatedAt: Date;
}

export interface AiReportRecord {
  id: string;
  walletAddress: string;
  tradingHabits: string;
  potentialAdvantages: string;
  majorRisks: string;
  dataReliability: string;
  watchRecommendation: WatchRecommendation;
  rawReport: string;
  modelName: string;
  generatedAt: Date;
}
