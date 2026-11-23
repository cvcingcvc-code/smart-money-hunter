import { CalculatedWalletMetrics } from './metrics';
import { TagRuleResult, TagType } from '@/types';

export class WalletRuleEngine {
  /**
   * Evaluate all 7 objective rules against wallet metrics
   */
  public evaluateRules(metrics: CalculatedWalletMetrics): TagRuleResult[] {
    const results: TagRuleResult[] = [];

    // 1. 数据不足 (INSUFFICIENT_DATA)
    const isInsufficient =
      metrics.sampleSize < 5 || metrics.sellTrades === 0 || metrics.winRate === null;
    results.push({
      tag: 'INSUFFICIENT_DATA',
      displayName: '数据不足',
      isTriggered: isInsufficient,
      triggerCondition: '交易样本量 < 5 笔 或 缺乏平仓卖单记录',
      metricValues: {
        sampleSize: metrics.sampleSize,
        sellTrades: metrics.sellTrades,
        dataReliability: metrics.dataReliability,
      },
      sampleSize: metrics.sampleSize,
      confidence: 1.0,
      reason: isInsufficient
        ? `样本量仅 ${metrics.sampleSize} 笔（卖单 ${metrics.sellTrades} 笔），不足以构成统计学显著性`
        : `样本量 ${metrics.sampleSize} 笔充足`,
    });

    // 2. 高频交易 (HIGH_FREQUENCY)
    const isHighFrequency =
      metrics.tradeFrequencyPerDay >= 15.0 || metrics.totalTrades >= 30;
    results.push({
      tag: 'HIGH_FREQUENCY',
      displayName: '高频交易',
      isTriggered: isHighFrequency,
      triggerCondition: '日均交易频次 >= 15 笔/日 或 样本内总交易数 >= 30 笔',
      metricValues: {
        tradeFrequencyPerDay: metrics.tradeFrequencyPerDay,
        totalTrades: metrics.totalTrades,
      },
      sampleSize: metrics.sampleSize,
      confidence: 1.0,
      reason: `日均交易频次达到 ${metrics.tradeFrequencyPerDay} 笔/日，总流水 ${metrics.totalTrades} 笔`,
    });

    // 3. 早期买入 (EARLY_BUYER)
    const isEarlyBuyer = metrics.earlyEntryCount >= 2;
    results.push({
      tag: 'EARLY_BUYER',
      displayName: '早期买入',
      isTriggered: isEarlyBuyer,
      triggerCondition: '开盘极早期（Pump.fun/内盘开盘）买入次数 >= 2 次',
      metricValues: {
        earlyEntryCount: metrics.earlyEntryCount,
        totalBuys: metrics.buyTrades,
      },
      sampleSize: metrics.sampleSize,
      confidence: 0.95,
      reason: `记录到 ${metrics.earlyEntryCount} 次在开盘初期介入代币行为`,
    });

    // 4. 候选聪明钱 (CANDIDATE_SMART_MONEY)
    const isSmartMoney =
      metrics.winRate !== null &&
      metrics.winRate >= 65.0 &&
      metrics.realizedPnlSol !== null &&
      metrics.realizedPnlSol >= 10.0 &&
      metrics.sampleSize >= 8;
    results.push({
      tag: 'CANDIDATE_SMART_MONEY',
      displayName: '候选聪明钱',
      isTriggered: isSmartMoney,
      triggerCondition:
        '胜率 >= 65% 且 已实现盈亏 >= 10.0 SOL 且 交易样本量 >= 8 笔',
      metricValues: {
        winRate: metrics.winRate,
        realizedPnlSol: metrics.realizedPnlSol,
        sampleSize: metrics.sampleSize,
      },
      sampleSize: metrics.sampleSize,
      confidence: 0.95,
      reason: isSmartMoney
        ? `胜率 ${metrics.winRate}%，已获利 ${metrics.realizedPnlSol} SOL，样本量 ${metrics.sampleSize} 笔达标`
        : `未达到候选聪明钱硬性门槛（需胜率≥65%、盈利≥10 SOL且样本≥8）`,
    });

    // 5. 短线交易 (SHORT_TERM_TRADER)
    const isShortTerm =
      metrics.avgHoldDurationHours !== null &&
      metrics.avgHoldDurationHours <= 3.0 &&
      metrics.sellTrades >= 2;
    results.push({
      tag: 'SHORT_TERM_TRADER',
      displayName: '短线交易',
      isTriggered: isShortTerm,
      triggerCondition: '平均持仓时长 <= 3.0 小时 且 已平仓卖单 >= 2 笔',
      metricValues: {
        avgHoldDurationHours: metrics.avgHoldDurationHours,
        sellTrades: metrics.sellTrades,
      },
      sampleSize: metrics.sampleSize,
      confidence: 0.9,
      reason:
        metrics.avgHoldDurationHours !== null
          ? `平均持仓时长为 ${metrics.avgHoldDurationHours} 小时，呈现超短线快进快出特征`
          : '缺乏卖单匹配持仓时间',
    });

    // 6. 高集中度 (HIGH_CONCENTRATION)
    const isHighConcentration = metrics.concentrationScore >= 65;
    results.push({
      tag: 'HIGH_CONCENTRATION',
      displayName: '高集中度',
      isTriggered: isHighConcentration,
      triggerCondition: '前 2 大主要代币交易额占总流水比例 >= 65%',
      metricValues: {
        concentrationScore: metrics.concentrationScore,
      },
      sampleSize: metrics.sampleSize,
      confidence: 0.95,
      reason: `主要头寸集中于头部 2 个代币，集中度指数达 ${metrics.concentrationScore}%`,
    });

    // 7. 高风险 (HIGH_RISK)
    const isHighRisk =
      (metrics.winRate !== null && metrics.winRate < 35.0 && metrics.sampleSize >= 5) ||
      metrics.riskScore >= 60;
    results.push({
      tag: 'HIGH_RISK',
      displayName: '高风险',
      isTriggered: isHighRisk,
      triggerCondition: '胜率 < 35% (样本≥5) 或 综合风险指数 >= 60',
      metricValues: {
        winRate: metrics.winRate,
        riskScore: metrics.riskScore,
      },
      sampleSize: metrics.sampleSize,
      confidence: 0.9,
      reason: `综合风险评分达 ${metrics.riskScore}/100${
        metrics.winRate !== null ? `，历史胜率偏低 (${metrics.winRate}%)` : ''
      }`,
    });

    return results;
  }
}

export const ruleEngine = new WalletRuleEngine();
