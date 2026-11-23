import { NextRequest, NextResponse } from 'next/server';
import { consensusTrader } from '@/lib/paper/consensus-trader';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty
    }

    const { minWallets, buyAmountSol, stopLossPct, takeProfitPct, maxHoldHours } = body;

    const result = await consensusTrader.runTradingCycle({
      minWallets: minWallets ? parseInt(minWallets, 10) : 2,
      buyAmountSol: buyAmountSol ? parseFloat(buyAmountSol) : 2.0,
      stopLossPct: stopLossPct ? parseFloat(stopLossPct) : -0.20,
      takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : 0.50,
      maxHoldHours: maxHoldHours ? parseFloat(maxHoldHours) : 2.0,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `共识交易巡检完成：捕获 ${result.detectedSignals.length} 个共识标的，执行 ${result.autoBuysExecuted.length} 笔买入，出场风控巡检 ${result.exitsEvaluated.length} 个在仓头寸`,
    });
  } catch (error: any) {
    console.error('[API Consensus Auto-Trade POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '执行共识交易巡检失败' },
      { status: 500 }
    );
  }
}
