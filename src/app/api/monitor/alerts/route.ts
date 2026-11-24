import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { solanaRpc } from '@/lib/solana/rpc';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const alertType = searchParams.get('type');
    const walletAddress = searchParams.get('wallet')?.trim();
    const unreadOnly = searchParams.get('unread') === 'true';

    const rawLimit = parseInt(searchParams.get('limit') || '50', 10);
    // Hard limit: 1 to 100 alerts per page
    const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 50 : rawLimit));

    const where: any = {};
    if (alertType && alertType !== 'ALL') where.alertType = alertType;
    if (walletAddress && solanaRpc.validateAddress(walletAddress)) {
      where.walletAddress = walletAddress;
    }
    if (unreadOnly) where.isRead = false;

    const [alerts, unreadCount] = await Promise.all([
      prisma.monitorAlert.findMany({
        where,
        include: {
          wallet: {
            select: {
              address: true,
              label: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.monitorAlert.count({
        where: { isRead: false },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: alerts,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[API Alerts GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取告警列表失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求体必须为合法 JSON 格式' },
        { status: 400 }
      );
    }

    const { alertIds, markAllAsRead } = body;

    if (markAllAsRead) {
      await prisma.monitorAlert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: '已全部标记为已读',
      });
    }

    if (Array.isArray(alertIds) && alertIds.length > 0) {
      // Limit to 200 IDs per batch update
      const safeIds = alertIds.slice(0, 200).filter((id) => typeof id === 'string');
      await prisma.monitorAlert.updateMany({
        where: { id: { in: safeIds } },
        data: { isRead: true },
      });
      return NextResponse.json({
        success: true,
        message: `已标记 ${safeIds.length} 条告警为已读`,
      });
    }

    return NextResponse.json(
      { success: false, error: '未提供有效的告警 ID 列表' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API Alerts PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '更新告警状态失败' },
      { status: 500 }
    );
  }
}
