'use client';
import { useEffect, useState } from 'react';
import { Download, LayoutDashboard, Building2, Package, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

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
}

export default function ReportsPage() {
    const [assetData, setAssetData] = useState<AssetReport[]>([]);
    const [deptData, setDeptData] = useState<DeptReport[]>([]);
    const [loading, setLoading] = useState(true);

    const [period, setPeriod] = useState<'all' | 'week' | 'month' | 'year'>('month');

    useEffect(() => {
        fetch('/api/reports')
            .then(r => r.json())
            .then(data => {
                setAssetData(data.assets || []);
                setDeptData(data.departments || []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    function isDateInPeriod(dateStr: string, p: string) {
        if (!dateStr || p === 'all') return true;

        // dateStr format expected to be similar to dd/MM/yyyy HH:mm
        const parts = dateStr.split(/[\s/:]+/);
        if (parts.length < 3) return false;
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));

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

    function handleExportExcel() {
        const wb = XLSX.utils.book_new();

        // 1. Sheet Tổng hợp & Báo Cáo Tài Chính (Phòng Ban)
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

        // 2. Sheet Chi tiết Tài Sản
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

        // Prepare Repair Data within period
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

        // 3. Sheet Lịch sử Sửa chữa
        const wsRepairs = XLSX.utils.json_to_sheet(allRepairsInPeriod);
        XLSX.utils.book_append_sheet(wb, wsRepairs, "Lịch sử Sửa chữa");

        // 4. Sheet Lịch sử Bơm mực
        const wsInk = XLSX.utils.json_to_sheet(inkRepairsInPeriod);
        XLSX.utils.book_append_sheet(wb, wsInk, "Lịch sử Bơm mực");

        // 5. Cảnh báo Sửa chữa (Tô màu)
        // Máy sửa trên 2 lần 1 tuần, 2 lần 1 tháng, 3 lần 1 năm
        const threshold = period === 'week' ? 2 : period === 'month' ? 2 : 3;
        const warningAssets = assetData
            .filter(a => (repairCountByAsset[a.id] || 0) >= threshold)
            .sort((a, b) => (repairCountByAsset[b.id] || 0) - (repairCountByAsset[a.id] || 0)) // Xếp sát nhau, nhiều nhất lên trước
            .map(a => ({
                'Mã TS': a.id,
                'Tên TS': a.name,
                'Phòng / Kho': a.location,
                'Số lần sửa trong kỳ': repairCountByAsset[a.id],
                'Ghi chú': `Quá giới hạn (${threshold} lần / ${period})`
            }));

        const wsWarning = XLSX.utils.json_to_sheet(warningAssets);

        // (XLSX basic version doesn't support built-in cell styling easily without pro version, 
        // but we can put it in a separate sheet called "CẢNH BÁO" to make it highly visible)
        XLSX.utils.book_append_sheet(wb, wsWarning, "⚠️ CẢNH BÁO SỬA CHỮA");

        // 6. Sheet Máy Hỏng & Thời gian hỏng
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

        // Set column widths
        wsDept['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
        wsAsset['!cols'] = [
            { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 },
            { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 20 }
        ];
        wsRepairs['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
        wsInk['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 30 }];
        wsWarning['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
        wsBroken['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];

        // Download
        XLSX.writeFile(wb, `Bao_Cao_Tai_San_${period}.xlsx`);
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Báo Cáo & Thống Kê</h1>
                    <p className="section-subtitle">Tổng hợp dữ liệu tài sản toàn trạm</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="select select-sm text-sm py-1.5"
                        value={period}
                        onChange={e => setPeriod(e.target.value as any)}
                    >
                        <option value="all">Tất cả thời gian</option>
                        <option value="week">Tuần này</option>
                        <option value="month">Tháng này</option>
                        <option value="year">Năm nay</option>
                    </select>
                    <button
                        onClick={handleExportExcel}
                        disabled={loading || assetData.length === 0}
                        className="btn-primary btn-sm gap-2"
                    >
                        <Download className="w-4 h-4" /> Xuất Excel
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="card p-5 group flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-500 group-hover:text-white transition-colors duration-300">
                            <Building2 className="w-6 h-6 text-indigo-500 group-hover:text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Số Phòng Ban</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-slate-800 tracking-tight">
                                    {loading ? '-' : deptData.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5 group flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                            <Package className="w-6 h-6 text-emerald-500 group-hover:text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tổng Tài Sản</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-slate-800 tracking-tight">
                                    {loading ? '-' : assetData.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="card p-5 group flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                            <LayoutDashboard className="w-6 h-6 text-amber-500 group-hover:text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">TS Cần Sửa</p>
                            <div className="mt-1 flex items-baseline gap-2">
                                <span className="text-2xl font-bold font-mono text-slate-800 tracking-tight">
                                    {loading ? '-' : deptData.reduce((acc, d) => acc + d.repairAssets, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card p-5 group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0 group-hover:bg-cyan-500 group-hover:text-white transition-colors duration-300">
                        <Package className="w-6 h-6 text-cyan-500 group-hover:text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tổng Nguyên Giá</p>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold font-mono text-slate-800 tracking-tight">
                                {loading ? '-' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(assetData.reduce((acc, a) => acc + (a.originalPrice || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="card p-5 group flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300">
                        <LayoutDashboard className="w-6 h-6 text-violet-500 group-hover:text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Tổng Giá Còn Lại</p>
                        <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-xl font-bold font-mono text-slate-800 tracking-tight">
                                {loading ? '-' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(assetData.reduce((acc, a) => acc + (a.remainingValue || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table: Department Summary */}
            <div className="card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <h2 className="font-semibold text-slate-800 text-sm">Tổng hợp theo Phòng Ban / Kho</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Phòng / Kho</th>
                                <th className="text-center">Tổng Tài Sản</th>
                                <th className="text-center text-emerald-600">Đang Sử Dụng</th>
                                <th className="text-center text-amber-600">Đang / Cần Sửa</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" /></td></tr>
                            ) : deptData.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-8 text-slate-400">Không có dữ liệu</td></tr>
                            ) : (
                                deptData.map((d, i) => (
                                    <tr key={i}>
                                        <td className="font-medium text-slate-800">{d.department}</td>
                                        <td className="text-center font-mono font-medium">{d.totalAssets}</td>
                                        <td className="text-center font-mono text-emerald-600">{d.activeAssets}</td>
                                        <td className="text-center font-mono text-amber-600">{d.repairAssets}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Table: Asset Details */}
            <div className="card overflow-hidden mt-6">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-500" />
                    <h2 className="font-semibold text-slate-800 text-sm">Hiệu suất & Lịch sử Tài Sản</h2>
                </div>
                <div className="table-wrapper max-h-[500px] overflow-y-auto">
                    <table className="table">
                        <thead className="sticky top-0 bg-white shadow-sm">
                            <tr>
                                <th>Mã TS</th>
                                <th>Tên Tài Sản</th>
                                <th>Phòng ban</th>
                                <th className="text-center">Số lượt sửa / thay mực</th>
                                <th className="text-center">Số lượt kiểm kê</th>
                                <th>Lần sửa/bảo dưỡng gần nhất</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" /></td></tr>
                            ) : assetData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-slate-400">Không có dữ liệu</td></tr>
                            ) : (
                                assetData.map((a, i) => (
                                    <tr key={i}>
                                        <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">{a.id}</span></td>
                                        <td className="font-medium text-slate-800 max-w-[200px] truncate" title={a.name}>{a.name}</td>
                                        <td className="text-slate-500">{a.location}</td>
                                        <td className="text-center font-mono text-amber-600 font-medium">
                                            {a.repairCount > 0 ? a.repairCount : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="text-center font-mono text-indigo-600 font-medium">
                                            {a.checkCount > 0 ? a.checkCount : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="text-xs text-slate-500 font-mono">
                                            {a.lastRepairTime}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
