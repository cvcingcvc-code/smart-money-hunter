import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { solanaRpc } from '@/lib/solana/rpc';
import { syncService } from '@/lib/solana/sync';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = new Set([
  'MEME_TRADER',
  'SMART_MONEY',
  'SNIPER',
  'KOL',
  'UNKNOWN',
  'GENERAL',
]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const isActive = searchParams.get('active');

    // Clamp pagination parameters to prevent DoS / negative values
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);

    const rawLimit = parseInt(searchParams.get('limit') || '25', 10);
    const limit = Math.max(1, Math.min(100, isNaN(rawLimit) ? 25 : rawLimit));

    const where: any = {};

    if (search) {
      // Limit search length to avoid excessive SQL wildcard matching
      const safeSearch = search.slice(0, 100);
      where.OR = [
        { address: { contains: safeSearch } },
        { label: { contains: safeSearch } },
        { notes: { contains: safeSearch } },
      ];
    }

    if (category && category !== 'ALL') {
      if (VALID_CATEGORIES.has(category)) {
        where.category = category;
      }
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (tag) {
      where.tags = {
        some: { tag: tag.slice(0, 50) },
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
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: '请求体必须为合法 JSON 格式' },
        { status: 400 }
      );
    }

    const { address, label, category, notes, autoSync } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: '请提供有效的 Solana 钱包地址' },
        { status: 400 }
      );
    }

    const trimmedAddress = address.trim();

    // 1. Validate Solana public key format
    const isValid = solanaRpc.validateAddress(trimmedAddress);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: '无效的 Solana 钱包地址格式（需为合法的 Base58 字符串）' },
        { status: 400 }
      );
    }

    // 2. Validate category enum
    const safeCategory = category && VALID_CATEGORIES.has(category) ? category : 'MEME_TRADER';

    // 3. Check if already exists
    const existing = await prisma.wallet.findUnique({
      where: { address: trimmedAddress },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: '该钱包地址已在监控列表中' },
        { status: 409 }
      );
    }

    // 4. Create wallet
    const wallet = await prisma.wallet.create({
      data: {
        address: trimmedAddress,
        label: typeof label === 'string' ? label.trim().slice(0, 50) : null,
        category: safeCategory,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
        isActive: true,
      },
    });

    // 5. Optionally trigger initial background sync
    if (autoSync) {
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
