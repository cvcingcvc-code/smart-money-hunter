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

    const parsedMinWallets = minWallets ? Math.max(1, Math.min(10, parseInt(minWallets, 10) || 2)) : 2;
    const parsedBuySol = buyAmountSol ? Math.max(0.01, Math.min(100, parseFloat(buyAmountSol) || 2.0)) : 2.0;
    const parsedStopLoss = stopLossPct ? Math.min(-0.01, Math.max(-0.90, parseFloat(stopLossPct) || -0.20)) : -0.20;
    const parsedTakeProfit = takeProfitPct ? Math.max(0.05, Math.min(10.0, parseFloat(takeProfitPct) || 0.50)) : 0.50;
    const parsedMaxHoldHours = maxHoldHours ? Math.max(0.1, Math.min(72.0, parseFloat(maxHoldHours) || 2.0)) : 2.0;

    const result = await consensusTrader.runTradingCycle({
      minWallets: parsedMinWallets,
      buyAmountSol: parsedBuySol,
      stopLossPct: parsedStopLoss,
      takeProfitPct: parsedTakeProfit,
      maxHoldHours: parsedMaxHoldHours,
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
