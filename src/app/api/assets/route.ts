import { NextRequest, NextResponse } from 'next/server';
import { getAllAssets, searchAssets, createAsset } from '@/lib/assets';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');
        const assets = q ? await searchAssets(q) : await getAllAssets();
        return NextResponse.json(assets);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, location, year, status, person, specificLocation } = body;
        if (!id || !name) {
            return NextResponse.json({ error: 'Mã và Tên tài sản là bắt buộc' }, { status: 400 });
        }
        const result = await createAsset({ id, name, location, year, status, person, specificLocation });
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
