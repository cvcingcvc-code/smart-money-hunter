import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/solana/sync';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await syncService.syncWalletTransactions(address, limit);

    return NextResponse.json({
      success: true,
      data: result,
      message: `同步完成：抓取 ${result.totalFound} 条，新增解析 ${result.newParsed} 条交易`,
    });
  } catch (error: any) {
    console.error('[API Wallet Sync POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '同步链上交易失败' },
      { status: 500 }
    );
  }
}
