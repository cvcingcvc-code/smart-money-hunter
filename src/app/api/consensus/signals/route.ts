import { NextRequest, NextResponse } from 'next/server';
import { consensusEngine } from '@/lib/intelligence/consensus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const windowHours = parseInt(searchParams.get('hours') || '4', 10);
    const minWallets = parseInt(searchParams.get('minWallets') || '2', 10);

    const signals = await consensusEngine.detectConsensusSignals(windowHours, minWallets);

    return NextResponse.json({
      success: true,
      data: signals,
      count: signals.length,
    });
  } catch (error: any) {
    console.error('[API Consensus Signals GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取共识信号失败' },
      { status: 500 }
    );
  }
}
