import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getAssetById, createAsset, updateAsset } from '@/lib/assets';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role === 'guest' || (session.user as any).role === 'user_basic') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assetId } = await req.json();
        const asset = await getAssetById(assetId);

        if (!asset) {
            return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
        }

        const qty = asset.quantity || 1;
        if (qty <= 1) {
            return NextResponse.json({ error: 'Số lượng không đủ để tách' }, { status: 400 });
        }

        // 1. Update original asset quantity to 1
        await updateAsset(assetId, { quantity: 1 });

        // 2. Create N-1 new assets
        for (let i = 1; i < qty; i++) {
            const { row, ...rest } = asset;
            await createAsset({
                ...rest,
                quantity: 1,
                createdAt: asset.createdAt || new Date().toISOString()
            });
        }

        return NextResponse.json({ success: true, message: `Đã tách tài sản thành ${qty} bản ghi.` });
    } catch (e: any) {
        console.error('[API Assets Split] Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
