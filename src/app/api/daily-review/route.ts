import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { paperEngine } from '@/lib/paper/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reviews = await prisma.dailyReview.findMany({
      orderBy: { reviewDate: 'desc' },
      take: 15,
    });
    return NextResponse.json({ success: true, data: reviews });
  } catch (error: any) {
    console.error('[API DailyReview GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取每日复盘失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Aggregate metrics
    const [totalWallets, activeCount, candidateWallets, alertsCount, paperSummary] =
      await Promise.all([
        prisma.wallet.count(),
        prisma.wallet.count({ where: { isActive: true } }),
        prisma.wallet.findMany({
          where: { tags: { some: { tag: 'CANDIDATE_SMART_MONEY' } } },
          include: { metrics: true },
          take: 5,
        }),
        prisma.monitorAlert.count(),
        paperEngine.getPortfolioSummary(),
      ]);

    const summary = `【投研日报】截至今日，情报工作台共收录 ${totalWallets} 个研究钱包，其中 ${activeCount} 个处于实时轮询监控中。通过 7 大量化规则引擎过滤，共锁定 ${
      candidateWallets.length
    } 个候选聪明钱地址。累计捕获 ${alertsCount} 笔链上买卖预警事件。`;

    const topPerformersText =
      candidateWallets.length > 0
        ? candidateWallets
            .map(
              (w, i) =>
                `#${i + 1} [${w.label || w.address.slice(0, 6)}] 胜率: ${
                  w.metrics?.winRate?.toFixed(1) || 'N/A'
                }% | 累计盈利: ${w.metrics?.realizedPnlSol?.toFixed(2) || '0.00'} SOL`
            )
            .join('\n')
        : '暂无符合候选聪明钱硬性标准的钱包';

    const marketInsight = `今日 Solana 链上 Meme 板块活跃度保持稳定，交易主要集中在 Raydium 与 Pump.fun 路由。高频狙击地址在开盘前 30 秒介入的胜率呈现分化，跟单时需重点关注代币池子深度与防夹优先费成本。`;

    const paperTradeStats = `模拟复盘账户：初始本金 ${paperSummary.initialCapital} SOL，累计完成 ${
      paperSummary.totalTrades
    } 笔模拟交易，已平仓 ${paperSummary.closedTrades} 笔。模拟策略胜率 ${
      paperSummary.winRate !== null ? paperSummary.winRate + '%' : '暂无平仓'
    }，已实现盈亏 ${paperSummary.realizedPnlSol >= 0 ? '+' : ''}${
      paperSummary.realizedPnlSol
    } SOL，历史最大回撤为 ${paperSummary.maxDrawdownPercent}%。`;

    const review = await prisma.dailyReview.upsert({
      where: { reviewDate: today },
      update: {
        summary,
        topPerformers: topPerformersText,
        marketInsight,
        paperTradeStats,
      },
      create: {
        reviewDate: today,
        summary,
        topPerformers: topPerformersText,
        marketInsight,
        paperTradeStats,
      },
    });

    return NextResponse.json({
      success: true,
      data: review,
      message: '今日复盘简报已生成',
    });
  } catch (error: any) {
    console.error('[API DailyReview POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '生成每日复盘失败' },
      { status: 500 }
    );
  }
}
