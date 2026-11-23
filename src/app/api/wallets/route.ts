import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { solanaRpc } from '@/lib/solana/rpc';
import { syncService } from '@/lib/solana/sync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const isActive = searchParams.get('active');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const where: any = {};

    if (search) {
      where.OR = [
        { address: { contains: search } },
        { label: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (tag) {
      where.tags = {
        some: { tag },
      };
    }

    const [total, wallets] = await Promise.all([
      prisma.wallet.count({ where }),
      prisma.wallet.findMany({
        where,
        include: {
          metrics: true,
          tags: true,
          _count: {
            select: {
              transactions: true,
              alerts: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[API Wallets GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '获取钱包列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, label, category, notes, autoSync } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供有效的 Solana 钱包地址' },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();

    // 1. Validate Solana public key
    const isValid = solanaRpc.validateAddress(trimmedAddress);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '无效的 Solana 钱包地址格式（需为 Base58 字符串）' },
        { status: 400 }
      );
    }

    // 2. Check if already exists
    const existing = await prisma.wallet.findUnique({
      where: { address: trimmedAddress },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该钱包地址已在监控列表中' },
        { status: 409 }
      );
    }

    // 3. Create wallet
    const wallet = await prisma.wallet.create({
      data: {
        address: trimmedAddress,
        label: label?.trim() || null,
        category: category || 'MEME_TRADER',
        notes: notes?.trim() || null,
        isActive: true,
      },
    });

    // 4. Optionally trigger initial background sync
    if (autoSync) {
      // Trigger non-blocking async sync
      syncService.syncWalletTransactions(trimmedAddress, 15).catch((err) => {
        console.warn(`[API Wallets POST] Auto sync failed for ${trimmedAddress}:`, err);
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: wallet,
        message: '钱包地址添加成功',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API Wallets POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || '添加钱包失败' },
      { status: 500 }
    );
  }
}
