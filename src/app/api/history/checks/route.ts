import { NextRequest, NextResponse } from 'next/server';
import { getCheckHistory, approveCheck, rejectCheck } from '@/lib/history';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserContext } from '@/types';
import { getWithSWR, purgeCache, purgePattern } from '@/lib/kv-cache';

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

        const cacheKey = `history:checks:${userCtx.role}:${userCtx.phongBan || 'all'}:${assetId}`;

        const data = await getWithSWR(cacheKey, () => getCheckHistory(assetId === 'all' ? undefined : assetId, userCtx), 10, 2);

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

        // Invalidate cache
        await Promise.all([
            purgePattern('history:checks'),
            purgeCache('dashboard'),
            assetId ? purgeCache(`lookup:${assetId}`) : Promise.resolve()
        ]).catch(e => console.warn('[API Checks] Cache purge failed:', e));

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Checks] Fatal error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
