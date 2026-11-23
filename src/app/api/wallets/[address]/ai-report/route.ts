import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { aiReporter } from '@/lib/ai/reporter';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const reportData = await aiReporter.generateReport(address);

    // Save report to database
    const saved = await prisma.aiReport.create({
      data: {
        walletAddress: address,
        tradingHabits: reportData.tradingHabits,
        potentialAdvantages: reportData.potentialAdvantages,
        majorRisks: reportData.majorRisks,
        dataReliability: reportData.dataReliability,
        watchRecommendation: reportData.watchRecommendation,
        rawReport: reportData.rawReport,
        modelName: reportData.modelName,
      },
    });

    return NextResponse.json({
      success: true,
      data: saved,
      message: 'AI 投研分析报告生成完成',
    });
  } catch (error: any) {
    console.error('[API AiReport POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '生成 AI 报告失败' },
      { status: 500 }
    );
  }
}
