import { NextRequest, NextResponse } from 'next/server';
import { getAssetById } from '@/lib/assets';
import { getCheckHistory, getRepairHistory, getPendingChecks, getPendingRepairs } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = decodeURIComponent(params.id);
        const [asset, checkHistory, repairHistory, pendingChecks, pendingRepairs] = await Promise.all([
            getAssetById(id),
            getCheckHistory(id),
            getRepairHistory(id),
            getPendingChecks(),
            getPendingRepairs(),
        ]);

        if (!asset) {
            return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
        }

        const myPendingChecks = pendingChecks.filter((c: any) => c.assetId === id);
        const myPendingRepairs = pendingRepairs.filter((r: any) => r.assetId === id);

        // Last approved check
        const approvedChecks = checkHistory.filter((c: any) => c.approveStatus?.toLowerCase().includes('duyệt') || c.status);
        const lastCheck = approvedChecks.length > 0 ? approvedChecks[0] : null;

        // Last approved repair
        const approvedRepairs = repairHistory.filter((r: any) => r.approveStatus?.toLowerCase().includes('duyệt'));
        const lastRepair = approvedRepairs.length > 0 ? approvedRepairs[0] : null;

        return NextResponse.json({
            asset,
            recentChecks: checkHistory.slice(0, 5),
            recentRepairs: repairHistory.slice(0, 5),
            pendingChecks: myPendingChecks,
            pendingRepairs: myPendingRepairs,
            lastApprovedCheck: lastCheck,
            lastApprovedRepair: lastRepair,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
