import { NextRequest, NextResponse } from 'next/server';
import { paperEngine } from '@/lib/paper/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await paperEngine.getPortfolioSummary();
    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error('[API Paper GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取模拟盘数据失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      walletAddress,
      tokenAddress,
      tokenSymbol,
      side,
      solAmount,
      sellRatio,
      priceSol,
      slippage,
      feeSol,
      latencyMs,
    } = body;

    if (!tokenAddress || !side || !priceSol) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数（代币地址、买卖方向或单价）' },
        { status: 400 }
      );
    }

    const trade = await paperEngine.executeTrade({
      walletAddress,
      tokenAddress,
      tokenSymbol,
      side,
      solAmount: solAmount ? parseFloat(solAmount) : undefined,
      sellRatio: sellRatio ? parseFloat(sellRatio) : 1.0,
      priceSol: parseFloat(priceSol),
      slippage: slippage ? parseFloat(slippage) : undefined,
      feeSol: feeSol ? parseFloat(feeSol) : undefined,
      latencyMs: latencyMs ? parseInt(latencyMs, 10) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: trade,
      message: `模拟 ${side === 'BUY' ? '买入' : '卖出'} 撮合成功`,
    });
  } catch (error: any) {
    console.error('[API Paper POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '模拟交易执行失败' },
      { status: 400 }
    );
  }
}
