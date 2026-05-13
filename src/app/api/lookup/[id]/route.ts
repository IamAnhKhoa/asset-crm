import { NextRequest, NextResponse } from 'next/server';
import { getAssetById } from '@/lib/assets';
import { getCheckHistory, getRepairHistory, getPendingChecks, getPendingRepairs } from '@/lib/history';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = decodeURIComponent(params.id);
        const data = await fetchLookupData(id);

        if (data.error) {
            return NextResponse.json(data, { status: data.status || 404 });
        }

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API Lookup] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch lookup data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}

async function fetchLookupData(id: string) {
    const asset = await getAssetById(id);

    if (!asset) {
        return { error: 'Không tìm thấy tài sản hoặc không có quyền truy cập', status: 404 };
    }

    const userCtx: UserContext = {
        role: 'guest',
        phongBan: 'All',
        tenChon: 'Guest',
    };

    const [checkHistory, repairHistory, pendingChecks, pendingRepairs] = await Promise.all([
        getCheckHistory(id, userCtx),
        getRepairHistory(id, userCtx),
        getPendingChecks(userCtx),
        getPendingRepairs(userCtx),
    ]);

    const myPendingChecks = pendingChecks.filter((c: any) => c.assetId === id);
    const myPendingRepairs = pendingRepairs.filter((r: any) => r.assetId === id);

    const approvedChecks = checkHistory.filter((c: any) => c.approveStatus?.toLowerCase().includes('duyệt') || c.status);
    const lastCheck = approvedChecks.length > 0 ? approvedChecks[0] : null;

    const approvedRepairs = repairHistory.filter((r: any) => r.approveStatus?.toLowerCase().includes('duyệt'));
    const lastRepair = approvedRepairs.length > 0 ? approvedRepairs[0] : null;

    const combinedRepairs = [
        ...myPendingRepairs.map((r: any) => ({ ...r, source: 'pending' })),
        ...repairHistory.map((r: any) => ({ ...r, source: 'history' }))
    ].sort((a, b) => {
        return b.time.localeCompare(a.time);
    });

    // Retroactive fix for tickets that were updated to external before the DB sync logic was patched
    if (combinedRepairs.length > 0) {
        const latestRepair = combinedRepairs[0];
        if (asset.status === 'Đang sửa chữa' || asset.status === 'Cần sửa') {
            if (latestRepair.repairStatus === 'Đã giao đơn vị ngoài xử lý') {
                asset.status = 'Đã giao đơn vị ngoài xử lý';
            }
        }
    }

    return {
        asset,
        recentChecks: checkHistory.slice(0, 5),
        recentRepairs: combinedRepairs.slice(0, 10),
        pendingChecks: myPendingChecks,
        pendingRepairs: myPendingRepairs,
        lastApprovedCheck: lastCheck,
        lastApprovedRepair: lastRepair,
    };
}
