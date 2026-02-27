import { NextResponse } from 'next/server';
import { getAllAssets } from '@/lib/assets';
import { getCheckHistory, getRepairHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const [assets, checkHistory, repairHistory] = await Promise.all([
            getAllAssets(),
            getCheckHistory(),
            getRepairHistory(),
        ]);

        // Aggregate statistics for each asset
        const reportData = assets.map(asset => {
            const assetChecks = checkHistory.filter(c => c.assetId === asset.id);
            const assetRepairs = repairHistory.filter(r => r.assetId === asset.id);

            // Lần sửa gần nhất
            // Cấu trúc ngày giờ trong Google Sheet: "dd/MM/yyyy HH:mm" hoặc chuỗi do người nhập
            let lastRepairTime = '';
            if (assetRepairs.length > 0) {
                // Sắp xếp đơn giản theo thứ tự đảo ngược vì dòng mới nhất ở trên
                // Hàm getRepairHistory đã đảo ngược (từ dưới lên trên dòng spreadsheet), 
                // nên dòng đầu tiên trong mảng assetRepairs chính là lần sửa gần nhất.
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
        const deptSummary: Record<string, { total: number; active: number; repair: number }> = {};

        assets.forEach(asset => {
            const dept = asset.location || 'Khác';
            if (!deptSummary[dept]) {
                deptSummary[dept] = { total: 0, active: 0, repair: 0 };
            }
            deptSummary[dept].total += 1;

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
        }));

        return NextResponse.json({
            assets: reportData,
            departments: deptData,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
