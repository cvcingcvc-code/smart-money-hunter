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
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求体必须为合法 JSON' },
        { status: 400 }
      );
    }

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

    // 1. Validate required fields
    if (!tokenAddress || typeof tokenAddress !== 'string' || !tokenAddress.trim()) {
      return NextResponse.json(
        { success: false, error: '缺少有效的代币合约地址 (tokenAddress)' },
        { status: 400 }
      );
    }

    if (side !== 'BUY' && side !== 'SELL') {
      return NextResponse.json(
        { success: false, error: '买卖方向必须为 BUY 或 SELL' },
        { status: 400 }
      );
    }

    const parsedPrice = Number(priceSol);
    if (isNaN(parsedPrice) || !isFinite(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { success: false, error: '代币单价必须为大于 0 的有效数值' },
        { status: 400 }
      );
    }

    // 2. Validate side-specific numeric fields
    let parsedSolAmount: number | undefined;
    if (side === 'BUY') {
      parsedSolAmount = solAmount !== undefined ? Number(solAmount) : 1.0;
      if (isNaN(parsedSolAmount) || !isFinite(parsedSolAmount) || parsedSolAmount <= 0) {
        return NextResponse.json(
          { success: false, error: '买入金额 (solAmount) 必须为大于 0 的有效数值' },
          { status: 400 }
        );
      }
    }

    let parsedSellRatio: number | undefined;
    if (side === 'SELL') {
      parsedSellRatio = sellRatio !== undefined ? Number(sellRatio) : 1.0;
      if (isNaN(parsedSellRatio) || !isFinite(parsedSellRatio) || parsedSellRatio <= 0 || parsedSellRatio > 1.0) {
        return NextResponse.json(
          { success: false, error: '卖出比例 (sellRatio) 必须在 0.01 到 1.0 之间' },
          { status: 400 }
        );
      }
    }

    let parsedSlippage: number | undefined;
    if (slippage !== undefined) {
      parsedSlippage = Number(slippage);
      if (isNaN(parsedSlippage) || parsedSlippage < 0 || parsedSlippage > 0.5) {
        return NextResponse.json(
          { success: false, error: '滑点参数必须在 0 到 0.5 (50%) 之间' },
          { status: 400 }
        );
      }
    }

    const trade = await paperEngine.executeTrade({
      walletAddress: typeof walletAddress === 'string' ? walletAddress.trim() : undefined,
      tokenAddress: tokenAddress.trim(),
      tokenSymbol: typeof tokenSymbol === 'string' ? tokenSymbol.trim() : undefined,
      side,
      solAmount: parsedSolAmount,
      sellRatio: parsedSellRatio,
      priceSol: parsedPrice,
      slippage: parsedSlippage,
      feeSol: feeSol !== undefined ? Math.max(0, Number(feeSol)) : undefined,
      latencyMs: latencyMs !== undefined ? Math.max(0, Number(latencyMs)) : undefined,
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
