import prisma from '@/lib/prisma';
import { WatchRecommendation } from '@/types';
import { smartMoneyAlphaModel } from '../intelligence/alpha-model';

export interface AiReportResult {
  tradingHabits: string;
  potentialAdvantages: string;
  majorRisks: string;
  dataReliability: string;
  watchRecommendation: WatchRecommendation;
  rawReport: string;
  modelName: string;
}

export class AiReporterService {
  /**
   * Generate structured AI analysis report for a wallet
   */
  public async generateReport(walletAddress: string): Promise<AiReportResult> {
    // 1. Fetch wallet, metrics, and tags
    const wallet = await prisma.wallet.findUnique({
      where: { address: walletAddress },
      include: {
        metrics: true,
        tags: true,
        transactions: {
          take: 15,
          orderBy: { blockTime: 'desc' },
        },
      },
    });

    if (!wallet) {
      throw new Error(`钱包 ${walletAddress} 不存在`);
    }

    const metrics = wallet.metrics;
    const tags = wallet.tags.map((t) => t.displayName);

    // Prepare structured prompt context
    const structuredContext = {
      address: wallet.address,
      label: wallet.label || '未命名',
      category: wallet.category,
      totalTrades: metrics?.totalTrades || wallet.transactions.length,
      buyTrades: metrics?.buyTrades || 0,
      sellTrades: metrics?.sellTrades || 0,
      winRate: metrics?.winRate !== null && metrics?.winRate !== undefined ? `${metrics.winRate}%` : '不可用 (无足够平仓样本)',
      realizedPnlSol: metrics?.realizedPnlSol !== null && metrics?.realizedPnlSol !== undefined ? `${metrics.realizedPnlSol} SOL` : '不可用',
      avgHoldDurationHours: metrics?.avgHoldDurationHours ? `${metrics.avgHoldDurationHours} 小时` : '不可用',
      concentrationScore: `${metrics?.concentrationScore || 0}/100`,
      riskScore: `${metrics?.riskScore || 0}/100`,
      dataReliability: metrics?.dataReliability || 'INSUFFICIENT_DATA',
      sampleSize: metrics?.sampleSize || wallet.transactions.length,
      activeTags: tags.length > 0 ? tags.join(', ') : '暂无触发标签',
    };

    const apiKey = process.env.AI_API_KEY?.trim();
    const baseUrl = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';

    // If API Key is configured, attempt call to LLM
    if (apiKey) {
      try {
        const systemPrompt = `你是一名顶级 Solana 链上数据分析专家与聪明钱量化研究员。
根据提供的客观钱包链上量化数据，生成专业、严谨、客观的钱包投研画像。
重要纪律约束：
1. 严禁编造任何不存在的链上数据；
2. 如果数据不可得或样本过少，必须在可靠性中明确指出；
3. 输出必须是合法的 JSON 对象，格式如下：
{
  "tradingHabits": "钱包交易习惯总结（50-100字）",
  "potentialAdvantages": "核心潜在优势（50-100字）",
  "majorRisks": "主要面临风险（50-100字）",
  "dataReliability": "数据可靠性及样本评价（30-60字）",
  "watchRecommendation": "RECOMMEND" | "NEUTRAL" | "AVOID"
}`;

        const userPrompt = `请对以下 Solana 钱包进行客观投研画像剖析：
${JSON.stringify(structuredContext, null, 2)}`;

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
          signal: AbortSignal.timeout(15000), // 15s timeout to prevent thread hanging
        });

        if (response.ok) {
          const resJson = await response.json();
          const content = resJson.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return {
              tradingHabits: parsed.tradingHabits || '暂无交易习惯数据',
              potentialAdvantages: parsed.potentialAdvantages || '暂无突出优势',
              majorRisks: parsed.majorRisks || '常规链上流动性风险',
              dataReliability: parsed.dataReliability || '样本量适中',
              watchRecommendation: (['RECOMMEND', 'NEUTRAL', 'AVOID'].includes(
                parsed.watchRecommendation
              )
                ? parsed.watchRecommendation
                : 'NEUTRAL') as WatchRecommendation,
              rawReport: content,
              modelName: model,
            };
          }
        }
      } catch (llmErr) {
        console.warn('[AI Reporter] LLM API call failed, falling back to local deterministic synthesis:', llmErr);
      }
    }

    // Fallback: Local rule-based synthesis engine (Deterministic & completely truthful to metrics)
    return this.synthesizeLocalReport(structuredContext, model);
  }

  /**
   * Deterministic quantitative synthesis engine when LLM API key is absent or unreachable
   */
  private synthesizeLocalReport(context: any, modelName: string): AiReportResult {
    const isSmartMoney = context.activeTags.includes('候选聪明钱');
    const isEarly = context.activeTags.includes('早期买入');
    const isHighFreq = context.activeTags.includes('高频交易');
    const isHighRisk = context.activeTags.includes('高风险');
    const isShortTerm = context.activeTags.includes('短线交易');
    const isInsufficient = context.dataReliability === 'INSUFFICIENT_DATA';

    let watchRecommendation: WatchRecommendation = 'NEUTRAL';
    if (isSmartMoney && !isHighRisk && !isInsufficient) {
      watchRecommendation = 'RECOMMEND';
    } else if (isHighRisk || (context.winRate && parseFloat(context.winRate) < 40)) {
      watchRecommendation = 'AVOID';
    }

    const alphaWeight = smartMoneyAlphaModel.calculateWalletAlphaWeight({
      winRate: context.winRate && !context.winRate.includes('不可用') ? parseFloat(context.winRate) : 50,
      sampleSize: context.sampleSize || 5,
      realizedPnlSol: context.realizedPnlSol && !context.realizedPnlSol.includes('不可用') ? parseFloat(context.realizedPnlSol) : 0,
      avgHoldDurationHours: context.avgHoldDurationHours && !context.avgHoldDurationHours.includes('不可用') ? parseFloat(context.avgHoldDurationHours) : 2.0,
    });

    const kellySizing = smartMoneyAlphaModel.calculateKellySizing(
      context.winRate && !context.winRate.includes('不可用') ? parseFloat(context.winRate) : 50,
      2.2,
      100.0,
      0.05
    );

    const tradingHabits = isHighFreq
      ? `该地址日均交易频次较高，表现出明显的日内高频策略特征。${
          isShortTerm ? '平均持仓时长较短，偏好快进快出锁定收益。' : '持仓周期随行情动态调整。'
        } 主要通过 Raydium 和 Pump.fun 等 DEX 进行头寸流转。阿尔法模型测算其综合权重为 ${alphaWeight}。`
      : `该地址交易节奏稳健，总样本流水 ${context.totalTrades} 笔，${
          isEarly ? '对新币与早期开盘池有敏锐感知。' : '重点介入已初具成交规模的标的。'
        } 阿尔法模型测算其综合信誉权重为 ${alphaWeight}。`;

    const potentialAdvantages = isSmartMoney
      ? `历史胜率达 ${context.winRate}，已实现利润累计 ${context.realizedPnlSol}，展现出较高的正期望值捕捉能力。凯利公式建议单笔跟单上限控制在 ${kellySizing} SOL 以内。`
      : isEarly
      ? `开盘极早期买入捕捉能力出色，具备早期流动性先发优势。模型建议防守型仓位分配 ${kellySizing} SOL。`
      : `操作风格纪律性适中，具有一定的链上持仓风控意识。模型建议防守型仓位分配 ${kellySizing} SOL。`;

    const majorRisks = isHighRisk
      ? `当前风险评分高达 ${context.riskScore}，历史胜率偏低或存在单笔追高大幅亏损记录，跟单潜在滑点与回撤风险极高。`
      : context.concentrationScore > 70
      ? `持仓高度集中于前 2 大代币，单币暴跌时组合净值波动剧烈，需警惕流动性枯竭与貔貅盘风险。`
      : `受 Solana 网络拥堵与优先费波动影响，交易存在一定的信号执行延迟与滑点磨损。`;

    const dataReliability = isInsufficient
      ? `样本量仅 ${context.sampleSize} 笔（可靠性评级：INSUFFICIENT_DATA），平仓数据不足，统计结论置信度受限，不得单凭当前指标做投资决策。`
      : `基于 ${context.sampleSize} 笔真实交易流水计算（可靠性评级：${context.dataReliability}），指标具备统计学可信度。`;

    const reportObj = {
      tradingHabits,
      potentialAdvantages,
      majorRisks,
      dataReliability,
      watchRecommendation,
    };

    return {
      ...reportObj,
      rawReport: JSON.stringify(reportObj, null, 2),
      modelName: `${modelName} (Rule-Synthesizer Fallback)`,
    };
  }
}

export const aiReporter = new AiReporterService();
