import { NextRequest, NextResponse } from 'next/server';
import { walletScanner } from '@/lib/scanner/wallet-scanner';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get('count') || '100', 10);

    // Launch background scan without blocking the HTTP request
    walletScanner.runFullScan(count).catch((err) => {
      console.error('[API Scanner Run] Background scan error:', err);
    });

    return NextResponse.json({
      success: true,
      message: `已启动 ${count} 个钱包的链上自动检测与批量分析引擎`,
      progress: walletScanner.getProgress(),
    });
  } catch (error: any) {
    console.error('[API Scanner Run] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '启动雷达扫描失败' },
      { status: 500 }
    );
  }
}
