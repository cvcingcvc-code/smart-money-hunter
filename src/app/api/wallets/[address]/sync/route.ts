import { NextRequest, NextResponse } from 'next/server';
import { syncService } from '@/lib/solana/sync';
import { solanaRpc } from '@/lib/solana/rpc';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address?.trim();
    if (!address || !solanaRpc.validateAddress(address)) {
      return NextResponse.json(
        { success: false, error: '无效的 Solana 钱包地址' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    // Hard limit: 1 to 50 transactions to prevent RPC exhaustion & rate limits
    const limit = Math.max(1, Math.min(50, isNaN(rawLimit) ? 20 : rawLimit));

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
