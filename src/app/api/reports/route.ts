import { NextResponse } from 'next/server';
import { getAllAssets } from '@/lib/assets';
import { getCheckHistory, getRepairHistory } from '@/lib/history';
import { getAllServices } from '@/lib/giaSuaChua';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [assets, checkHistory, repairHistory, services] = await Promise.all([
            getAllAssets(),
            getCheckHistory(),
            getRepairHistory(),
            getAllServices(),
        ]);

        // 1. Convert Arrays to Hash Maps (O(N) instead of O(N^2))
        const checksByAsset: Record<string, typeof checkHistory> = {};
        for (const c of checkHistory) {
            if (!checksByAsset[c.assetId]) checksByAsset[c.assetId] = [];
            checksByAsset[c.assetId].push(c);
        }

        const repairsByAsset: Record<string, typeof repairHistory> = {};
        for (const r of repairHistory) {
            if (!repairsByAsset[r.assetId]) repairsByAsset[r.assetId] = [];
            repairsByAsset[r.assetId].push(r);
        }

        // 2. Compute Report Data O(N)
        const reportData = assets.map(asset => {
            const assetChecks = checksByAsset[asset.id] || [];
            const assetRepairs = repairsByAsset[asset.id] || [];

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

        const deptSummary: Record<string, { total: number; active: number; repair: number; totalOriginal: number; totalRemaining: number }> = {};

        // 3. Compute Dept Summary in linear time mapping
        for (const asset of reportData) {
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
        }

        const deptData = Object.keys(deptSummary).map(dept => ({
            department: dept,
            totalAssets: deptSummary[dept].total,
            activeAssets: deptSummary[dept].active,
            repairAssets: deptSummary[dept].repair,
            totalOriginal: deptSummary[dept].totalOriginal,
            totalRemaining: deptSummary[dept].totalRemaining,
        }));

        const response = NextResponse.json({
            assets: reportData,
            departments: deptData,
            services: services,
        });

        // Caching optimization: Clients can reuse responses for up to 60 seconds
        response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

        return response;
    } catch (e: any) {
        console.error('[API Reports] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch reports data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
