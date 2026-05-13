import { NextRequest, NextResponse } from 'next/server';
import { getCheckHistory, approveCheck, rejectCheck, deleteCheckHistory } from '@/lib/history';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userCtx: UserContext = {
            role: (session.user as any).role || 'user_basic',
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const { searchParams } = new URL(req.url);
        const assetId = searchParams.get('assetId') || 'all';

        const data = await getCheckHistory(assetId === 'all' ? undefined : assetId, userCtx);
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API History Checks] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch check history",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, row, assetId, status, reason } = body;
        let result;
        if (action === 'approve') result = await approveCheck(row, assetId, status);
        else return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Checks] Fatal error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { row } = await req.json();
        if (!row) return NextResponse.json({ error: 'Missing row' }, { status: 400 });
        const result = await deleteCheckHistory(row);
        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API History Checks DELETE] error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

