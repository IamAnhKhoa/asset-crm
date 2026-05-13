'use client';
import { useEffect, useState } from 'react';
import { Download, LayoutDashboard, Building2, Package, Loader2, TrendingUp, ChevronRight, Clock, Brain, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseViDate } from '@/lib/date-utils';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface AssetReport {
    id: string;
    name: string;
    location: string;
    status: string;
    person: string;
    specificLocation: string;
    checkCount: number;
    repairCount: number;
    lastRepairTime: string;
    year: string;
    originalPrice?: number;
    remainingValue?: number;
    repairs?: any[];
}

interface DeptReport {
    department: string;
    totalAssets: number;
    activeAssets: number;
    repairAssets: number;
    totalOriginal: number;
    totalRemaining: number;
}

interface ServiceItem {
    row: number;
    stt: string;
    loai: string;
    noiDung: string;
    donViTinh: string;
    donGia: number;
    ghiChu: string;
    ngayCapNhat: string;
}

const REPORT_TYPES = [
    { id: 'summary', label: '📊 Tổng hợp tài sản', color: 'indigo' },
    { id: 'finance', label: '💰 Tài chính & Giá trị', color: 'emerald' },
    { id: 'trend', label: '📈 Biểu đồ & Xu hướng', color: 'violet' },
    { id: 'insights', label: '🧠 Phân tích & Cảnh báo', color: 'rose' },
    { id: 'services', label: '🛠 Bảng giá dịch vụ', color: 'sky' },
];

export default function ReportsPage() {
    const [assetData, setAssetData] = useState<AssetReport[]>([]);
    const [deptData, setDeptData] = useState<DeptReport[]>([]);
    const [serviceData, setServiceData] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'year'>('month');
    const [reportType, setReportType] = useState<string>('summary');

    useEffect(() => {
        fetch('/api/reports')
            .then(r => r.json())
            .then(data => {
                setAssetData(data.assets || []);
                setDeptData(data.departments || []);
                setServiceData(data.services || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    function isDateInPeriod(dateStr: string, p: string) {
        if (!dateStr || p === 'all') return true;
        const d = parseViDate(dateStr);
        if (!d) return false;

        const now = new Date();
        if (p === 'week') {
            const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return d >= lastWeek && d <= now;
        }
        if (p === 'month') {
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }
        if (p === 'year') {
            return d.getFullYear() === now.getFullYear();
        }
        return true;
    }

    function generateTrendData(assets: AssetReport[]) {
        const yearMap = new Map<string, { newAssets: number, repairs: number }>();
        const currentYear = new Date().getFullYear();

        // Populate standard 5-year span to ensure chart looks good even if data is missing
        for (let y = currentYear - 4; y <= currentYear; y++) {
            yearMap.set(y.toString(), { newAssets: 0, repairs: 0 });
        }

        assets.forEach(a => {
            // Count new assets
            if (a.year) {
                const y = a.year.toString().trim();
                // some years might be '2021', '2023', '2023-2024' -> take first 4 digits
                const parsedYear = y.match(/\d{4}/)?.[0] || y;
                if (parsedYear && parsedYear.length === 4) {
                    if (!yearMap.has(parsedYear)) yearMap.set(parsedYear, { newAssets: 0, repairs: 0 });
                    yearMap.get(parsedYear)!.newAssets += 1;
                }
            }

            // Count repairs per year
            if (a.repairs && Array.isArray(a.repairs)) {
                a.repairs.forEach(r => {
                    const d = parseViDate(r.time);
                    if (d) {
                        const repairYear = d.getFullYear().toString();
                        if (!yearMap.has(repairYear)) yearMap.set(repairYear, { newAssets: 0, repairs: 0 });
                        yearMap.get(repairYear)!.repairs += 1;
                    }
                });
            } else if (a.lastRepairTime && a.lastRepairTime !== '—') {
                // Fallback to lastRepairTime if full history not loaded
                const d = parseViDate(a.lastRepairTime);
                if (d) {
                    const repairYear = d.getFullYear().toString();
                    if (!yearMap.has(repairYear)) yearMap.set(repairYear, { newAssets: 0, repairs: 0 });
                    yearMap.get(repairYear)!.repairs += a.repairCount || 1;
                }
            }
        });

        return Array.from(yearMap.entries())
            .sort(([y1], [y2]) => y1.localeCompare(y2))
            .map(([year, data]) => ({
                year,
                newAssets: data.newAssets,
                repairs: data.repairs
            }));
    }

    function handleExportExcel() {
        const wb = XLSX.utils.book_new();

        const wsDeptData = deptData.map(d => {
            const deptAssets = assetData.filter(a => (a.location || 'Khác') === d.department);
            const totalOrig = deptAssets.reduce((sum, a) => sum + (a.originalPrice || 0), 0);
            const totalRem = deptAssets.reduce((sum, a) => sum + (a.remainingValue || 0), 0);

            return {
                'Phòng / Kho': d.department,
                'Tổng Tài Sản': d.totalAssets,
                'Đang Sử Dụng': d.activeAssets,
                'Đang / Cần Sửa': d.repairAssets,
                'Tổng Nguyên Giá (VNĐ)': totalOrig,
                'Tổng Còn Lại (VNĐ)': totalRem
            }
        });
        const wsDept = XLSX.utils.json_to_sheet(wsDeptData);
        XLSX.utils.book_append_sheet(wb, wsDept, "Tổng Hợp & Tài Chính");

        const wsAssetData = assetData.map(a => ({
            'Phòng / Kho': a.location,
            'Mã TS': a.id,
            'Tên Tài Sản': a.name,
            'Người Giữ': a.person,
            'Vị Trí Cụ Thể': a.specificLocation,
            'Năm SD': a.year,
            'Nguyên Giá (VNĐ)': a.originalPrice || 0,
            'Còn Lại (VNĐ)': a.remainingValue || 0,
            'Trạng Thái': a.status,
            'Số Lần Sửa': a.repairCount,
            'Lần Sửa/Bảo Dưỡng Gần Nhất': a.lastRepairTime,
        }));
        const wsAsset = XLSX.utils.json_to_sheet(wsAssetData);
        XLSX.utils.book_append_sheet(wb, wsAsset, "Chi Tiết Tài Sản");

        const allRepairsInPeriod: any[] = [];
        const inkRepairsInPeriod: any[] = [];
        const repairCountByAsset: Record<string, number> = {};

        assetData.forEach(a => {
            if (a.repairs) {
                const validRepairs = a.repairs.filter(r => isDateInPeriod(r.time, period));
                validRepairs.forEach(r => {
                    const row = {
                        'Ngày/Giờ': r.time,
                        'Mã TS': a.id,
                        'Tên TS': a.name,
                        'Phòng / Kho': a.location,
                        'Người báo': r.person,
                        'Lỗi / Vấn đề': r.issue,
                        'Cách xử lý': r.result || '',
                        'Trạng thái': r.repairStatus
                    };
                    allRepairsInPeriod.push(row);
                    const issueLower = (r.issue || '').toLowerCase();
                    if (issueLower.includes('mực') || issueLower.includes('ink')) {
                        inkRepairsInPeriod.push(row);
                    }
                    repairCountByAsset[a.id] = (repairCountByAsset[a.id] || 0) + 1;
                });
            }
        });

        const wsRepairs = XLSX.utils.json_to_sheet(allRepairsInPeriod);
        XLSX.utils.book_append_sheet(wb, wsRepairs, "Lịch sử Sửa chữa");

        const wsInk = XLSX.utils.json_to_sheet(inkRepairsInPeriod);
        XLSX.utils.book_append_sheet(wb, wsInk, "Lịch sử Bơm mực");

        const threshold = period === 'week' ? 2 : period === 'month' ? 2 : 3;
        const warningAssets = assetData
            .filter(a => (repairCountByAsset[a.id] || 0) >= threshold)
            .sort((a, b) => (repairCountByAsset[b.id] || 0) - (repairCountByAsset[a.id] || 0))
            .map(a => ({
                'Mã TS': a.id,
                'Tên TS': a.name,
                'Phòng / Kho': a.location,
                'Số lần sửa trong kỳ': repairCountByAsset[a.id],
                'Ghi chú': `Quá giới hạn (${threshold} lần / ${period})`
            }));
        const wsWarning = XLSX.utils.json_to_sheet(warningAssets);
        XLSX.utils.book_append_sheet(wb, wsWarning, "⚠️ CẢNH BÁO SỬA CHỮA");

        const brokenAssets = assetData
            .filter(a => ['Cần sửa', 'Đang sửa chữa', 'Hỏng'].includes(a.status))
            .map(a => {
                let daysBroken = 'Chưa xác định';
                if (a.lastRepairTime && a.lastRepairTime !== '—') {
                    const parts = a.lastRepairTime.split(/[\s/:]+/);
                    if (parts.length >= 3) {
                        const repairDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
                        const diffTime = Math.abs(new Date().getTime() - repairDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        daysBroken = `${diffDays} ngày`;
                    }
                }
                return {
                    'Mã TS': a.id,
                    'Tên TS': a.name,
                    'Phòng / Kho': a.location,
                    'Trạng thái': a.status,
                    'Ghi nhận hỏng lúc': a.lastRepairTime,
                    'Thời gian đã hỏng': daysBroken
                };
            });
        const wsBroken = XLSX.utils.json_to_sheet(brokenAssets);
        XLSX.utils.book_append_sheet(wb, wsBroken, "Danh sách Máy hỏng");

        wsDept['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
        wsAsset['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }];
        wsRepairs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
        wsInk['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
        wsWarning['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
        wsBroken['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

        // Service pricing sheet
        if (serviceData.length > 0) {
            const wsServiceData = serviceData.map(s => ({
                'Loại': s.loai,
                'Nội dung': s.noiDung,
                'Đơn vị tính': s.donViTinh,
                'Đơn giá (VNĐ)': s.donGia,
                'Ghi chú': s.ghiChu,
                'Cập nhật': s.ngayCapNhat,
            }));
            const wsService = XLSX.utils.json_to_sheet(wsServiceData);
            wsService['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, wsService, 'Bảng giá dịch vụ');
        }

        // Costed Repairs sheet
        const parseCost = (note: string): number => {
            if (!note) return 0;
            const m = note.match(/TỔNG:\s*([\d.,]+)\s*đ/i);
            if (!m) return 0;
            return Number(m[1].replace(/\./g, '').replace(/,/g, '')) || 0;
        };

        const costedRepairsData = assetData.flatMap(a =>
            (a.repairs || [])
                .filter((r: any) => r.handlerNote && parseCost(r.handlerNote) > 0)
                .map((r: any) => ({
                    'Ngày/Giờ': r.time?.split(' ')[0] || r.time,
                    'Mã TS': a.id,
                    'Tên TS': a.name,
                    'Phòng / Kho': a.location,
                    'Người báo': r.person,
                    'Nội dung lỗi': r.issue,
                    'Kết quả': r.result || r.repairStatus,
                    'Chi phí (VNĐ)': parseCost(r.handlerNote),
                }))
        ).filter(r => isDateInPeriod(r['Ngày/Giờ'], period))
            .sort((a, b) => {
                const da = parseViDate(a['Ngày/Giờ']);
                const db = parseViDate(b['Ngày/Giờ']);
                return (db?.getTime() || 0) - (da?.getTime() || 0);
            });

        if (costedRepairsData.length > 0) {
            const wsCosts = XLSX.utils.json_to_sheet(costedRepairsData);
            wsCosts['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }];
            XLSX.utils.book_append_sheet(wb, wsCosts, 'Chi Phí Sửa Chữa');
        }

        XLSX.writeFile(wb, `Bao_Cao_Tai_San_${period}.xlsx`);
    }

    function renderServicesCostReport() {
        // Parse cost from handlerNote: pattern "TỔNG: 120.000 đ" or "TỔNG: 120,000 đ"
        const parseCost = (note: string): number => {
            if (!note) return 0;
            const m = note.match(/TỔNG:\s*([\d.,]+)\s*đ/i);
            if (!m) return 0;
            return Number(m[1].replace(/\./g, '').replace(/,/g, '')) || 0;
        };

        // Build costed repairs from all asset repair data
        const costedRepairs = assetData.flatMap(a =>
            (a.repairs || [])
                .filter((r: any) => r.handlerNote && parseCost(r.handlerNote) > 0)
                .map((r: any) => ({
                    time: r.time,
                    assetId: a.id,
                    assetName: a.name,
                    location: a.location,
                    issue: r.issue,
                    person: r.person,
                    repairStatus: r.repairStatus,
                    result: r.result,
                    handlerNote: r.handlerNote,
                    cost: parseCost(r.handlerNote),
                }))
        ).filter(r => isDateInPeriod(r.time, period))
            .sort((a, b) => {
                const da = parseViDate(a.time);
                const db = parseViDate(b.time);
                return (db?.getTime() || 0) - (da?.getTime() || 0);
            });

        const totalCost = costedRepairs.reduce((sum, r) => sum + r.cost, 0);
        const avgCost = costedRepairs.length > 0 ? totalCost / costedRepairs.length : 0;

        // Group by department
        const costByDept: Record<string, number> = {};
        costedRepairs.forEach(r => {
            costByDept[r.location || 'Khác'] = (costByDept[r.location || 'Khác'] || 0) + r.cost;
        });

        const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Cost Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng chi phí sửa chữa</p>
                        <h3 className="text-2xl font-black text-sky-600 tracking-tight">{fmt(totalCost)} đ</h3>
                        <p className="text-[10px] text-slate-400 mt-1">{costedRepairs.length} phiếu có chi phí</p>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chi phí trung bình / phiếu</p>
                        <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{fmt(Math.round(avgCost))} đ</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Trung bình mỗi lần sửa</p>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phòng ban chi nhiều nhất</p>
                        <h3 className="text-xl font-black text-indigo-600 tracking-tight truncate">
                            {Object.entries(costByDept).sort(([, a], [, b]) => b - a)[0]?.[0] || '—'}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-1">
                            {Object.entries(costByDept).sort(([, a], [, b]) => b - a)[0]
                                ? fmt(Object.entries(costByDept).sort(([, a], [, b]) => b - a)[0][1]) + ' đ'
                                : 'Chưa có dữ liệu'}
                        </p>
                    </div>
                </div>

                {/* Cost by Department */}
                {Object.keys(costByDept).length > 0 && (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
                            <div className="w-2 h-6 bg-sky-500 rounded-full"></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chi phí theo Phòng Ban</h2>
                        </div>
                        <div className="p-6 space-y-3">
                            {Object.entries(costByDept)
                                .sort(([, a], [, b]) => b - a)
                                .map(([dept, cost]) => (
                                    <div key={dept} className="flex items-center gap-4">
                                        <span className="text-sm font-bold text-slate-700 w-48 truncate">{dept}</span>
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sky-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (cost / (totalCost || 1)) * 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-black text-sky-600 font-mono whitespace-nowrap">{fmt(cost)} đ</span>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                {/* Detailed Costed Repairs Table */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chi tiết phiếu sửa chữa có chi phí</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{costedRepairs.length} phiếu</span>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-500" /></div>
                    ) : costedRepairs.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 italic text-sm">Chưa có phiếu sửa chữa nào có chi phí trong kỳ</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[900px]">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã TS / Tên</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng ban</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung lỗi</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kết quả</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-sky-500 uppercase tracking-widest text-right">Chi phí</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {costedRepairs.map((r, i) => (
                                        <tr key={i} className="hover:bg-sky-50/30 transition-colors">
                                            <td className="px-6 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{r.time?.split(' ')[0] || '—'}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{r.assetName}</span>
                                                    <span className="text-[10px] font-mono text-slate-400">{r.assetId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-slate-500">{r.location}</td>
                                            <td className="px-6 py-3 text-xs text-slate-600 max-w-[200px] truncate" title={r.issue}>{r.issue}</td>
                                            <td className="px-6 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${r.result === 'Đã hoàn thành' || r.result === 'Sửa chữa thành công'
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-amber-50 text-amber-600'
                                                    }`}>{r.result || r.repairStatus}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className="text-sm font-black text-sky-600 font-mono">{fmt(r.cost)} đ</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-sky-50/50 border-t-2 border-sky-100">
                                        <td colSpan={5} className="px-6 py-4 text-sm font-black text-sky-800 uppercase">Tổng cộng</td>
                                        <td className="px-6 py-4 text-right text-lg font-black text-sky-600 font-mono">{fmt(totalCost)} đ</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Reference Price List (collapsible) */}
                <details className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden group">
                    <summary className="px-8 py-6 cursor-pointer flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <Wrench className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Bảng giá tham khảo ({serviceData.length} dịch vụ)</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 ml-auto transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-6 pb-6 space-y-4">
                        {Array.from(new Set(serviceData.map(s => s.loai))).map(loai => (
                            <div key={loai} className="border border-slate-100 rounded-2xl overflow-hidden">
                                <div className="bg-slate-50 px-6 py-2 border-b border-slate-100">
                                    <h3 className="text-xs font-black text-slate-600 uppercase">{loai}</h3>
                                </div>
                                <table className="w-full text-left">
                                    <tbody className="divide-y divide-slate-50">
                                        {serviceData.filter(s => s.loai === loai).map((s, i) => (
                                            <tr key={s.row} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-2 text-xs text-slate-400 w-8">{i + 1}</td>
                                                <td className="px-6 py-2 text-sm font-medium text-slate-700">{s.noiDung}</td>
                                                <td className="px-6 py-2 text-xs text-slate-400 text-center w-16">{s.donViTinh}</td>
                                                <td className="px-6 py-2 text-sm font-bold text-sky-600 text-right font-mono w-32">{fmt(s.donGia)} đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </details>
            </div>
        );
    }

    const totalOriginal = assetData.reduce((acc, a) => acc + (a.originalPrice || 0), 0);
    const totalRemaining = assetData.reduce((acc, a) => acc + (a.remainingValue || 0), 0);

    return (
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] flex flex-col">
            {/* Ultra-Modern Glass Header */}
            <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 transition-all duration-300">
                <div className="h-16 px-6 flex items-center justify-between max-w-[1600px] mx-auto w-full">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-indigo-500 tracking-[0.2em] leading-none mb-1">Analytics</span>
                            <h1 className="text-lg font-black text-slate-800 tracking-tight leading-none">Báo Cáo Thống Kê</h1>
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

                        <div className="hidden md:flex gap-1 group">
                            {REPORT_TYPES.map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => setReportType(type.id)}
                                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 relative
                                        ${reportType === type.id
                                            ? 'text-indigo-600 bg-indigo-50 shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {type.label}
                                    {reportType === type.id && (
                                        <div className="absolute -bottom-1 left-4 right-4 h-0.5 bg-indigo-500 rounded-full animate-in fade-in slide-in-from-bottom-1" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <select
                                className="appearance-none bg-slate-50 border-slate-200 rounded-2xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer outline-none"
                                value={period}
                                onChange={e => setPeriod(e.target.value as any)}
                            >
                                <option value="all">Thời gian: Tất cả</option>
                                <option value="week">Thời gian: Tuần này</option>
                                <option value="month">Thời gian: Tháng này</option>
                                <option value="year">Thời gian: Năm nay</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-500 transition-colors">
                                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                            </div>
                        </div>

                        <button
                            onClick={handleExportExcel}
                            disabled={loading || assetData.length === 0}
                            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-2xl text-xs font-black tracking-tight flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                        >
                            <Download className="w-3.5 h-3.5" /> XUẤT EXCEL
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-8 max-w-[1600px] mx-auto w-full flex-1">
                {/* Visual Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Cơ cấu phòng ban', val: deptData.length, icon: Building2, color: 'indigo', detail: 'Hội đồng & Khoa phòng' },
                        { label: 'Tổng số tài sản', val: assetData.length, icon: Package, color: 'emerald', detail: 'Đang quản lý tập trung' },
                        { label: 'Nguyên giá đầu tư', val: new Intl.NumberFormat('vi-VN').format(totalOriginal), icon: TrendingUp, color: 'sky', detail: 'Tổng giá trị nhập kho' },
                        { label: 'Giá trị còn lại', val: new Intl.NumberFormat('vi-VN').format(totalRemaining), icon: LayoutDashboard, color: 'violet', detail: 'Khấu hao ước tính' },
                    ].map((card, i) => (
                        <div key={i} className="group relative bg-white rounded-[2rem] p-6 border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                            <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className={`w-12 h-12 rounded-[1.25rem] shrink-0 bg-${card.color}-50 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                    <card.icon className={`w-6 h-6 text-${card.color}-600`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 truncate">{card.label}</p>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none truncate">
                                        {loading ? <span className="animate-pulse">...</span> : card.val}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium truncate">{card.detail}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                {reportType === 'trend' ? (
                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm flex flex-col min-h-[400px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Xu Hướng & Tình Trạng Tài Sản</h2>
                                <p className="text-sm font-medium text-slate-500 mt-1">Phân tích tương quan giữa số lượng tài sản nhập mới và số lượng phát sinh sự cố sửa chữa theo từng năm.</p>
                            </div>
                        </div>

                        {loading || assetData.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                                <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu biểu đồ...</p>
                            </div>
                        ) : (
                            <div className="h-[400px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart
                                        data={generateTrendData(assetData)}
                                        margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <defs>
                                            <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="year"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            yAxisId="left"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <YAxis
                                            yAxisId="right"
                                            orientation="right"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                            cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        />
                                        <Legend
                                            wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: 500 }}
                                            iconType="circle"
                                        />
                                        <Area
                                            yAxisId="left"
                                            type="monotone"
                                            dataKey="newAssets"
                                            name="Tài sản nhập mới"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorAssets)"
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                        <Line
                                            yAxisId="right"
                                            type="monotone"
                                            dataKey="repairs"
                                            name="Sự cố / Sửa chữa"
                                            stroke="#f43f5e"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                ) : reportType === 'services' ? (
                    renderServicesCostReport()
                ) : reportType === 'insights' ? (
                    <div className="space-y-8 animate-in fade-in duration-500">

                        {/* 1. Alerts Section (Abnormal Activity) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                                    <h2 className="text-sm font-black text-rose-900 uppercase">Cảnh báo bơm mực bất thường</h2>
                                </div>
                                <div className="space-y-3">
                                    {assetData
                                        .filter(a => {
                                            const refilledInMonth = (a.repairs || []).filter(r => {
                                                const d = parseViDate(r.time);
                                                const issue = (r.issue || '').toLowerCase();
                                                const isInk = issue.includes('mực') || issue.includes('ink');
                                                const isThisMonth = d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                                                return isInk && isThisMonth;
                                            });
                                            return refilledInMonth.length >= 3;
                                        })
                                        .map((a, i) => (
                                            <div key={i} className="bg-white/60 backdrop-blur-sm border border-rose-200/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-white transition-all">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{a.name}</p>
                                                    <p className="text-[10px] font-medium text-rose-500 uppercase tracking-wider">{a.location} • {a.specificLocation}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-rose-600">{(a.repairs || []).filter(r => (r.issue || '').toLowerCase().includes('mực') && parseViDate(r.time)?.getMonth() === new Date().getMonth()).length} lần</p>
                                                    <p className="text-[10px] font-bold text-rose-400">Tháng này</p>
                                                </div>
                                            </div>
                                        ))}
                                    {!assetData.some(a => (a.repairs || []).filter(r => (r.issue || '').toLowerCase().includes('mực') && parseViDate(r.time)?.getMonth() === new Date().getMonth() && parseViDate(r.time)?.getFullYear() === new Date().getFullYear()).length >= 3) && (
                                        <p className="text-xs text-rose-400 font-medium italic">Không có máy in nào có tần suất bơm mực bất thường.</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                    <h2 className="text-sm font-black text-amber-900 uppercase">Máy sửa quá hạn (SLA {">"} 7 ngày)</h2>
                                </div>
                                <div className="space-y-3">
                                    {assetData
                                        .filter(a => {
                                            if (!['Cần sửa', 'Đang sửa chữa'].includes(a.status)) return false;
                                            if (!a.lastRepairTime || a.lastRepairTime === '—') return false;
                                            const d = parseViDate(a.lastRepairTime);
                                            if (!d) return false;
                                            const diff = (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
                                            return diff > 7;
                                        })
                                        .map((a, i) => (
                                            <div key={i} className="bg-white/60 backdrop-blur-sm border border-amber-200/50 p-4 rounded-2xl flex items-center justify-between group hover:bg-white transition-all">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{a.name}</p>
                                                    <p className="text-[10px] font-medium text-amber-600 uppercase tracking-wider">{a.status} • {a.lastRepairTime}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-amber-700">
                                                        {Math.floor((new Date().getTime() - (parseViDate(a.lastRepairTime)?.getTime() || 0)) / (1000 * 60 * 60 * 24))} ngày
                                                    </p>
                                                    <p className="text-[10px] font-bold text-amber-500">Đã quá hạn</p>
                                                </div>
                                            </div>
                                        ))}
                                    {!assetData.some(a => {
                                        if (!['Cần sửa', 'Đang sửa chữa'].includes(a.status)) return false;
                                        const d = parseViDate(a.lastRepairTime);
                                        return d && (new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24) > 7;
                                    }) && (
                                            <p className="text-xs text-amber-400 font-medium italic">Hiện không có máy nào sửa quá hạn.</p>
                                        )}
                                </div>
                            </div>
                        </div>

                        {/* 2. Top Insights Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Top Repaired Assets */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <AlertCircle className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Top 10 Máy sửa chữa nhiều nhất</h2>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Toàn thời gian</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {assetData
                                        .filter(a => (a.repairCount || 0) > 0)
                                        .sort((a, b) => (b.repairCount || 0) - (a.repairCount || 0))
                                        .slice(0, 10)
                                        .map((a, i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                                                    #{i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{a.name}</p>
                                                    <p className="text-[10px] font-medium text-slate-400">{a.location} • {a.person}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-black
                                                        ${a.repairCount > 5 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {a.repairCount} lần
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Printer Refill Frequency Analysis */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-200/60 p-8 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                        <Package className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">Thống kê bơm mực tiêu biểu</h2>
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Tất cả máy in</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {assetData
                                        .filter(a => (a.repairs || []).some(r => (r.issue || '').toLowerCase().includes('mực')))
                                        .sort((a, b) => {
                                            const aCount = (a.repairs || []).filter(r => (r.issue || '').toLowerCase().includes('mực')).length;
                                            const bCount = (b.repairs || []).filter(r => (r.issue || '').toLowerCase().includes('mực')).length;
                                            return bCount - aCount;
                                        })
                                        .slice(0, 8)
                                        .map((a, i) => {
                                            const inkRepairs = (a.repairs || []).filter(r => (r.issue || '').toLowerCase().includes('mực'));
                                            return (
                                                <div key={i}>
                                                    <div className="flex items-center justify-between mb-1.5 px-1">
                                                        <span className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{a.name}</span>
                                                        <span className="text-xs font-black text-emerald-600">{inkRepairs.length} lần</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                                            style={{ width: `${Math.min(100, (inkRepairs.length / 10) * 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between mt-1 px-1">
                                                        <span className="text-[9px] font-medium text-slate-400">{a.location}</span>
                                                        <span className="text-[9px] font-bold text-slate-500">Mới nhất: {inkRepairs[0]?.time.split(' ')[0] || '—'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {/* Interactive Data Grid - Department Summary */}
                        <div className="group bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Thống kê theo Phòng Ban / Kho</h2>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{deptData.length} Đơn vị</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng / Kho</th>
                                            <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Khối lượng TS</th>
                                            {reportType === 'summary' ? (
                                                <>
                                                    <th className="px-6 py-5 text-[10px] font-black text-emerald-500 uppercase tracking-widest text-center">Đang Sử Dụng</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-amber-500 uppercase tracking-widest text-center">Sửa Chữa / Bảo Trì</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-5 text-[10px] font-black text-indigo-500 uppercase tracking-widest text-right">Tổng Nguyên Giá</th>
                                                    <th className="px-6 py-5 text-[10px] font-black text-violet-500 uppercase tracking-widest text-right">Giá Trị Hiện Tại</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                                        ) : deptData.map((d, i) => (
                                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors group/row">
                                                <td className="px-8 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-slate-200 group-hover/row:bg-indigo-400 transition-colors"></div>
                                                        <span className="text-sm font-bold text-slate-700">{d.department}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-[11px] font-black text-slate-600">
                                                        {d.totalAssets}
                                                    </span>
                                                </td>
                                                {reportType === 'summary' ? (
                                                    <>
                                                        <td className="px-6 py-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-black text-emerald-600">{d.activeAssets}</span>
                                                                <div className="w-12 h-1 bg-emerald-100 rounded-full mt-1 overflow-hidden">
                                                                    <div className="h-full bg-emerald-500" style={{ width: `${(d.activeAssets / d.totalAssets) * 100}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-sm font-black ${d.repairAssets > 0 ? 'text-amber-600 animate-pulse' : 'text-slate-300'}`}>
                                                                {d.repairAssets}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-600">
                                                            {new Intl.NumberFormat('vi-VN').format(d.totalOriginal)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-xs font-black text-indigo-600">
                                                            {new Intl.NumberFormat('vi-VN').format(d.totalRemaining)}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Detailed Asset Performance List */}
                        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden overflow-x-auto">
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between sticky left-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Chi tiết hiệu suất & hồ sơ tài sản</h2>
                                </div>
                                <div className="flex gap-2">
                                    <div className="px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase">
                                        Total Records: {assetData.length}
                                    </div>
                                </div>
                            </div>

                            <div className="min-w-[1000px]">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-12">Tên Tài Sản / Mã</th>
                                            <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Phòng Ban</th>
                                            {reportType === 'summary' ? (
                                                <>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Sửa / Bơm mực</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Kiểm kê</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lịch sử cuối</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Nguyên Giá</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Giá Hiện Tại</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Năm SD</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {loading ? (
                                            <tr><td colSpan={6} className="py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 opacity-30" /></td></tr>
                                        ) : assetData.map((a, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-all group/asset">
                                                <td className="px-8 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800 group-hover/asset:text-indigo-600 transition-colors truncate max-w-[280px]" title={a.name}>
                                                            {a.name}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-400 font-bold group-hover/asset:text-slate-500">#{a.id}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100/50 px-2 py-1 rounded-lg">
                                                        {a.location}
                                                    </span>
                                                </td>
                                                {reportType === 'summary' ? (
                                                    <>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[12px] font-black px-2.5 py-1 rounded-full ${a.repairCount > 0 ? 'bg-amber-50 text-amber-600 ring-1 ring-amber-100' : 'text-slate-200'}`}>
                                                                {a.repairCount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`text-[12px] font-black px-2.5 py-1 rounded-full ${a.checkCount > 0 ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-200'}`}>
                                                                {a.checkCount}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <Clock className="w-3 h-3 text-slate-300" />
                                                                <span className="text-[10px] font-bold font-mono text-slate-400">{a.lastRepairTime}</span>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-6 py-4 text-right font-mono text-[11px] text-slate-500">
                                                            {new Intl.NumberFormat('vi-VN').format(a.originalPrice || 0)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-[12px] font-black text-indigo-600">
                                                            {new Intl.NumberFormat('vi-VN').format(a.remainingValue || 0)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-[11px] font-black text-slate-400 italic">'{a.year?.toString().slice(-2)}</span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer decoration */}
            <div className="px-6 py-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                Asset Intelligence Platform · v2.0
            </div>
        </div>
    );
}

// Ensure these are correctly imported in your header
// import { ChevronRight, Clock, Building2, Package, TrendingUp, LayoutDashboard, Download, Loader2 } from 'lucide-react';
