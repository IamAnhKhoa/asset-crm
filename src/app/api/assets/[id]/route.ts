import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/assets';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { canEditAsset } from '@/lib/auth';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const asset = await getAssetById(params.id);
        if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
        return NextResponse.json(asset);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCtx: UserContext = {
            role: (session.user as any).role,
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const id = decodeURIComponent(params.id);
        const asset = await getAssetById(id);
        if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });

        if (!canEditAsset(userCtx, asset)) {
            return NextResponse.json({ error: 'Bạn không có quyền chỉnh sửa tài sản này' }, { status: 403 });
        }

        const body = await req.json();
        const { name, location, year, quantity, status, person, specificLocation, oldLocation, originalPrice } = body;
        const result = await updateAsset(id, { name, location, year, quantity: Number(quantity), status, person, specificLocation, oldLocation, originalPrice });
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCtx: UserContext = {
            role: (session.user as any).role,
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const id = decodeURIComponent(params.id);
        const asset = await getAssetById(id);
        if (!asset) return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });

        if (!canEditAsset(userCtx, asset)) {
            return NextResponse.json({ error: 'Bạn không có quyền xóa tài sản này' }, { status: 403 });
        }

        const result = await deleteAsset(id);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
