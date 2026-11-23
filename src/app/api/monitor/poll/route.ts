import { NextRequest, NextResponse } from 'next/server';
import { monitorService } from '@/lib/monitor/scheduler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = await monitorService.pollActiveWallets(limit);

    return NextResponse.json({
      success: true,
      data: result,
      message: `监控轮询完成：巡检 ${result.walletsChecked} 个活跃钱包，新增 ${result.newAlertsCount} 条报警`,
    });
  } catch (error: any) {
    console.error('[API Monitor Poll POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '监控轮询失败' },
      { status: 500 }
    );
  }
}
