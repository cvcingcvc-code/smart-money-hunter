import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const wallet = await prisma.wallet.findUnique({
      where: { address },
      include: {
        metrics: true,
        tags: true,
        transactions: {
          orderBy: { blockTime: 'desc' },
          take: 50,
        },
        aiReports: {
          orderBy: { generatedAt: 'desc' },
          take: 1,
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: '钱包不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet,
    });
  } catch (error: any) {
    console.error('[API Wallet GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取钱包详情失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    const body = await req.json();
    const { label, category, notes, isActive } = body;

    const updated = await prisma.wallet.update({
      where: { address },
      data: {
        ...(label !== undefined ? { label: label?.trim() || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: '钱包信息更新成功',
    });
  } catch (error: any) {
    console.error('[API Wallet PATCH] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '更新钱包失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    await prisma.wallet.delete({
      where: { address },
    });

    return NextResponse.json({
      success: true,
      message: '钱包删除成功',
    });
  } catch (error: any) {
    console.error('[API Wallet DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '删除钱包失败' },
      { status: 500 }
    );
  }
}
