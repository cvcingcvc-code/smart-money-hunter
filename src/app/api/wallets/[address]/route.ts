import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { solanaRpc } from '@/lib/solana/rpc';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = new Set([
  'MEME_TRADER',
  'SMART_MONEY',
  'SNIPER',
  'KOL',
  'UNKNOWN',
  'GENERAL',
]);

export async function GET(
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
    const address = params.address?.trim();
    if (!address || !solanaRpc.validateAddress(address)) {
      return NextResponse.json(
        { success: false, error: '无效的 Solana 钱包地址' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求体必须为合法 JSON 格式' },
        { status: 400 }
      );
    }

    const { label, category, notes, isActive } = body;

    const dataToUpdate: any = {};
    if (label !== undefined) dataToUpdate.label = typeof label === 'string' ? label.trim().slice(0, 50) || null : null;
    if (category !== undefined && VALID_CATEGORIES.has(category)) dataToUpdate.category = category;
    if (notes !== undefined) dataToUpdate.notes = typeof notes === 'string' ? notes.trim().slice(0, 500) || null : null;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.wallet.update({
      where: { address },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: '钱包信息更新成功',
    });
  } catch (error: any) {
    // Prisma P2025: Record to update not found
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '目标钱包不存在' },
        { status: 404 }
      );
    }
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
    const address = params.address?.trim();
    if (!address || !solanaRpc.validateAddress(address)) {
      return NextResponse.json(
        { success: false, error: '无效的 Solana 钱包地址' },
        { status: 400 }
      );
    }

    await prisma.wallet.delete({
      where: { address },
    });

    return NextResponse.json({
      success: true,
      message: '钱包删除成功',
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: '要删除的钱包不存在' },
        { status: 404 }
      );
    }
    console.error('[API Wallet DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '删除钱包失败' },
      { status: 500 }
    );
  }
}
