import { NextRequest, NextResponse } from 'next/server';
import { getRepairHistory, updateRepairHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const assetId = searchParams.get('assetId') || undefined;
        const data = await getRepairHistory(assetId);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { row, ...data } = body;
        const result = await updateRepairHistory(row, data);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
