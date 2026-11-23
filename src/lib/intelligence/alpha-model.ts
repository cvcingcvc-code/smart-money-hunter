/**
 * Smart Money Hunter Alpha Model Suite
 * 包含：
 * 1. 聪明钱动态阿尔法权重算法 (Smart Money Alpha Weighting)
 * 2. 跟单获胜概率推演模型 (Win Probability Prediction Model)
 * 3. 庄家协同与老鼠仓风险指数模型 (Cabal & Wash Trade Detector)
 * 4. 凯利准则最优动态仓位配置模型 (Kelly Criterion Sizing Model)
 */

export interface WalletAlphaMetrics {
  winRate: number | null; // 0 - 100
  sampleSize: number;
  realizedPnlSol: number | null;
  avgHoldDurationHours: number | null;
  confidence?: number;
}

export interface AlphaConsensusEvaluation {
  predictedWinRate: number; // 0 - 100%
  winRateConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  cabalRiskScore: number; // 0 - 100
  cabalRiskLevel: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS';
  cabalReason?: string;
  kellySuggestedSol: number; // 建议分配的 SOL 数量
  alphaGrade: 'TIER_S' | 'TIER_A' | 'TIER_B' | 'TIER_D';
  weightedScore: number; // 综合阿尔法得分 0 - 100
  participatingAlphaWeights: Array<{
    address: string;
    alphaWeight: number; // 0.1 - 1.0
    winRate: number;
  }>;
}

export class SmartMoneyAlphaModel {
  /**
   * 1. 计算单个聪明钱的动态阿尔法权重 (0.1 ~ 1.0)
   * 权重综合考量：历史胜率、样本量置信度对数衰减、累积净盈亏
   */
  public calculateWalletAlphaWeight(metrics: WalletAlphaMetrics): number {
    const winRate = metrics.winRate ?? 50;
    const sampleSize = metrics.sampleSize || 1;
    const pnl = metrics.realizedPnlSol ?? 0;

    // 胜率基数因子 (以 50% 为中枢，大于 50% 呈正激励)
    const winRateFactor = Math.max(0.1, winRate / 100);

    // 样本量置信度因子 (对数增长，避免小样本偶然高胜率)
    // sampleSize = 5 -> log10(6) = 0.77; sampleSize = 30 -> log10(31) = 1.49
    const sampleFactor = Math.min(1.5, Math.max(0.4, Math.log10(sampleSize + 1)));

    // 盈利实盘因子 (根据净盈利 SOL 加分，封顶 1.5)
    const pnlFactor = pnl > 0 ? 1 + Math.min(0.5, pnl / 50) : Math.max(0.5, 1 + pnl / 20);

    // 综合加权
    const rawScore = winRateFactor * sampleFactor * pnlFactor;

    // 归一化到 0.15 ~ 1.0
    const normalized = Math.min(1.0, Math.max(0.15, rawScore * 0.75));
    return parseFloat(normalized.toFixed(3));
  }

  /**
   * 2. 庄家协同与老鼠仓风险检测 (Cabal / Wash Trade Detector)
   * 若多个聪明钱在极短时间（<10秒，同一或相邻区块）同向买入且金额高度对称，大概率为同一庄家老鼠仓
   */
  public detectCabalRisk(
    transactions: Array<{
      walletAddress: string;
      blockTime: Date;
      solAmount: number;
    }>
  ): { riskScore: number; level: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS'; reason?: string } {
    if (transactions.length < 2) {
      return { riskScore: 10, level: 'SAFE' };
    }

    let riskScore = 15; // 基础风险
    const reasons: string[] = [];

    // A. 时间间隔分析
    const timestamps = transactions.map((t) => t.blockTime.getTime()).sort((a, b) => a - b);
    const minDiffSec = (timestamps[1] - timestamps[0]) / 1000;
    const totalSpanSec = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000;

    if (minDiffSec <= 5) {
      // 5 秒内同买，大概率脚本或同庄多钱包联动
      riskScore += 45;
      reasons.push(`买入时间差极短 (仅 ${minDiffSec.toFixed(1)} 秒，疑似同一区块脚本协同)`);
    } else if (minDiffSec <= 20) {
      riskScore += 25;
      reasons.push(`买入间隔较近 (${minDiffSec.toFixed(1)} 秒内先后建仓)`);
    }

    // B. 金额对称性分析 (例如每个钱包都买 2.0 SOL)
    const amounts = transactions.map((t) => t.solAmount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((acc, v) => acc + Math.pow(v - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    if (avgAmount > 0 && stdDev / avgAmount < 0.08 && amounts.length >= 2) {
      // 方差极小，金额高度一致
      riskScore += 30;
      reasons.push(`各钱包买入金额高度对称 (均值 ${avgAmount.toFixed(2)} SOL，极低方差)`);
    }

    riskScore = Math.min(95, Math.max(5, riskScore));

    let level: 'SAFE' | 'SUSPICIOUS' | 'DANGEROUS' = 'SAFE';
    if (riskScore >= 70) level = 'DANGEROUS';
    else if (riskScore >= 45) level = 'SUSPICIOUS';

    return {
      riskScore,
      level,
      reason: reasons.length > 0 ? reasons.join('；') : '多钱包买入时间分布自然，未见明显庄家协同特征',
    };
  }

  /**
   * 3. 凯利准则最优仓位建议 (Kelly Criterion Sizing)
   * f* = (p * (b + 1) - 1) / b
   * 采用 Half-Kelly (半凯利) 降低回撤
   */
  public calculateKellySizing(
    predictedWinRate: number, // 0 - 100
    oddsB = 2.2, // Meme 币预期盈亏比，默认 2.2
    capitalBaseSol = 100.0,
    maxAllocPercent = 0.05 // 单笔标的最大下注不超过总本金的 5%
  ): number {
    const p = Math.max(0.01, Math.min(0.99, predictedWinRate / 100));
    const b = Math.max(1.0, oddsB);

    // 标准凯利公式: f* = (p * (b + 1) - 1) / b
    const fullKelly = (p * (b + 1) - 1) / b;

    if (fullKelly <= 0) {
      return 0.5; // 负期望值时不建议大额，最低防守仓位 0.5 SOL
    }

    // 采用 1/2 Half-Kelly 获得更平滑的资金曲线
    const halfKelly = fullKelly / 2;

    // 约束在 [0.5 SOL, 最大单笔限制]
    const maxSol = capitalBaseSol * maxAllocPercent;
    const calculatedSol = capitalBaseSol * halfKelly;

    const recommended = Math.max(0.5, Math.min(maxSol, calculatedSol));
    return parseFloat(recommended.toFixed(2));
  }

  /**
   * 4. 综合阿尔法评估模型 (Evaluate Full Consensus Alpha)
   */
  public evaluateConsensusAlpha(params: {
    participatingWallets: Array<{
      address: string;
      metrics?: WalletAlphaMetrics | null;
      buyAmountSol: number;
      buyTime: Date;
    }>;
    timeSpanMinutes: number;
  }): AlphaConsensusEvaluation {
    const { participatingWallets, timeSpanMinutes } = params;

    // A. 计算各聪明钱阿尔法权重与加权胜率
    let weightedWinRateSum = 0;
    let totalWeight = 0;
    const weightsOutput: AlphaConsensusEvaluation['participatingAlphaWeights'] = [];

    for (const w of participatingWallets) {
      const weight = this.calculateWalletAlphaWeight(w.metrics || { winRate: 60, sampleSize: 10, realizedPnlSol: 5, avgHoldDurationHours: 2 });
      const winRate = w.metrics?.winRate ?? 60;

      weightedWinRateSum += winRate * weight;
      totalWeight += weight;

      weightsOutput.push({
        address: w.address,
        alphaWeight: weight,
        winRate,
      });
    }

    const baseWinRate = totalWeight > 0 ? weightedWinRateSum / totalWeight : 55;

    // B. 时效衰减模型 (信息半衰期：间隔越久，后买入者越可能沦为接盘方)
    // 衰减因子: 每跨越 30 分钟衰减 2.5%
    const decayPenalty = Math.min(15, (timeSpanMinutes / 30) * 2.5);

    // C. 庄家与老鼠仓风险检测
    const cabalEval = this.detectCabalRisk(
      participatingWallets.map((w) => ({
        walletAddress: w.address,
        blockTime: w.buyTime,
        solAmount: w.buyAmountSol,
      }))
    );

    // D. 综合修正后预测跟单胜率
    let predictedWinRate = baseWinRate - decayPenalty;
    if (cabalEval.level === 'DANGEROUS') {
      predictedWinRate -= 20; // 极高老鼠仓风险大幅折价
    } else if (cabalEval.level === 'SUSPICIOUS') {
      predictedWinRate -= 8;
    }
    predictedWinRate = parseFloat(Math.max(25, Math.min(88, predictedWinRate)).toFixed(1));

    // E. 胜率置信度
    let winRateConfidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (participatingWallets.length >= 3 && totalWeight >= 2.0) {
      winRateConfidence = 'HIGH';
    } else if (participatingWallets.length < 2 || totalWeight < 1.0) {
      winRateConfidence = 'LOW';
    }

    // F. 凯利仓位配置
    const kellySuggestedSol = this.calculateKellySizing(predictedWinRate, 2.2, 100.0, 0.05);

    // G. 综合阿尔法评级
    let alphaGrade: AlphaConsensusEvaluation['alphaGrade'] = 'TIER_B';
    const weightedScore = Math.round(
      predictedWinRate * 0.7 + (100 - cabalEval.riskScore) * 0.3
    );

    if (cabalEval.level === 'DANGEROUS') {
      alphaGrade = 'TIER_D';
    } else if (predictedWinRate >= 70 && cabalEval.riskScore < 30) {
      alphaGrade = 'TIER_S';
    } else if (predictedWinRate >= 60 && cabalEval.riskScore < 50) {
      alphaGrade = 'TIER_A';
    }

    return {
      predictedWinRate,
      winRateConfidence,
      cabalRiskScore: cabalEval.riskScore,
      cabalRiskLevel: cabalEval.level,
      cabalReason: cabalEval.reason,
      kellySuggestedSol,
      alphaGrade,
      weightedScore,
      participatingAlphaWeights: weightsOutput,
    };
  }
}

export const smartMoneyAlphaModel = new SmartMoneyAlphaModel();
