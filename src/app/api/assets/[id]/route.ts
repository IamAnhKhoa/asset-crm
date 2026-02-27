import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/assets';

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
        const id = decodeURIComponent(params.id);
        const body = await req.json();
        const { name, location, year, status, person, specificLocation, originalPrice } = body;
        const result = await updateAsset(id, { name, location, year, status, person, specificLocation, originalPrice });
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 404 });
        }
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = decodeURIComponent(params.id);
        const result = await deleteAsset(id);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
