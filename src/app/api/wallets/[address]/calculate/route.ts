import { NextRequest, NextResponse } from 'next/server';
import { walletAnalyzer } from '@/lib/intelligence/analyzer';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const result = await walletAnalyzer.analyzeWallet(address);

    return NextResponse.json({
      success: true,
      data: result,
      message: '指标与规则标签重新计算成功',
    });
  } catch (error: any) {
    console.error('[API Calculate POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '计算指标失败' },
      { status: 500 }
    );
  }
}
