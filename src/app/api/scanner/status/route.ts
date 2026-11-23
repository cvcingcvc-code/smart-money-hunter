import { NextResponse } from 'next/server';
import { walletScanner } from '@/lib/scanner/wallet-scanner';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const progress = walletScanner.getProgress();

    // Query current database stats for the scanner dashboard
    const [totalWallets, profitableCount, candidateSmartMoney, topProfitable] =
      await Promise.all([
        prisma.wallet.count(),
        prisma.wallet.count({
          where: { metrics: { realizedPnlSol: { gt: 0 } } },
        }),
        prisma.wallet.count({
          where: { tags: { some: { tag: 'CANDIDATE_SMART_MONEY' } } },
        }),
        walletScanner.getTopProfitableWallets(15),
      ]);

    return NextResponse.json({
      success: true,
      progress,
      stats: {
        totalWallets,
        profitableCount,
        candidateSmartMoney,
      },
      topProfitable,
    });
  } catch (error: any) {
    console.error('[API Scanner Status] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取扫描状态失败' },
      { status: 500 }
    );
  }
}
