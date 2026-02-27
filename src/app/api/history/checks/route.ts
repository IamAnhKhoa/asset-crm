import { NextRequest, NextResponse } from 'next/server';
import { getCheckHistory, approveCheck, rejectCheck } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const assetId = searchParams.get('assetId') || undefined;
        const data = await getCheckHistory(assetId);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, row, assetId, status, reason } = body;
        let result;
        if (action === 'approve') result = await approveCheck(row, assetId, status);
        else if (action === 'reject') result = await rejectCheck(row, reason);
        else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
