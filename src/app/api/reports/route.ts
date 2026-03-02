import { NextResponse } from 'next/server';
import { getAllAssets } from '@/lib/assets';
import { getCheckHistory, getRepairHistory } from '@/lib/history';
import { getWithSWR } from '@/lib/kv-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getWithSWR('reports', async () => {
            const [assets, checkHistory, repairHistory] = await Promise.all([
                getAllAssets(),
                getCheckHistory(),
                getRepairHistory(),
            ]);

            // Aggregate statistics for each asset
            const reportData = assets.map(asset => {
                const assetChecks = checkHistory.filter(c => c.assetId === asset.id);
                const assetRepairs = repairHistory.filter(r => r.assetId === asset.id);

                let lastRepairTime = '';
                if (assetRepairs.length > 0) {
                    lastRepairTime = assetRepairs[0].time;
                }

                return {
                    id: asset.id,
                    name: asset.name,
                    location: asset.location,
                    status: asset.status,
                    person: asset.person || '',
                    specificLocation: asset.specificLocation || '',
                    checkCount: assetChecks.length,
                    repairCount: assetRepairs.length,
                    lastRepairTime: lastRepairTime || '—',
                    year: asset.year || '',
                    originalPrice: asset.originalPrice || 0,
                    remainingValue: (() => {
                        const oy = Number(asset.year);
                        if (!asset.originalPrice || isNaN(oy)) return 0;
                        const p = Math.max(0, 1 - 0.2 * (new Date().getFullYear() - oy));
                        return asset.originalPrice * p;
                    })(),
                    repairs: assetRepairs,
                };
            });

            // Tóm tắt theo phòng ban
            const deptSummary: Record<string, { total: number; active: number; repair: number; totalOriginal: number; totalRemaining: number }> = {};

            reportData.forEach(asset => {
                const dept = asset.location || 'Khác';
                if (!deptSummary[dept]) {
                    deptSummary[dept] = { total: 0, active: 0, repair: 0, totalOriginal: 0, totalRemaining: 0 };
                }
                deptSummary[dept].total += 1;
                deptSummary[dept].totalOriginal += asset.originalPrice || 0;
                deptSummary[dept].totalRemaining += asset.remainingValue || 0;

                if (asset.status === 'Đang sử dụng' || asset.status === 'Tốt') {
                    deptSummary[dept].active += 1;
                } else if (asset.status === 'Cần sửa' || asset.status === 'Đang sửa chữa' || asset.status === 'Hỏng') {
                    deptSummary[dept].repair += 1;
                }
            });

            const deptData = Object.keys(deptSummary).map(dept => ({
                department: dept,
                totalAssets: deptSummary[dept].total,
                activeAssets: deptSummary[dept].active,
                repairAssets: deptSummary[dept].repair,
                totalOriginal: deptSummary[dept].totalOriginal,
                totalRemaining: deptSummary[dept].totalRemaining,
            }));

            return {
                assets: reportData,
                departments: deptData,
            };
        }, 10, 2);

        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API Reports] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch reports data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
