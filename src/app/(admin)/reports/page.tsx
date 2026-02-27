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

    function handleExportExcel() {
        const wb = XLSX.utils.book_new();

        // 1. Sheet Tổng hợp Phòng Ban
        const wsDeptData = deptData.map(d => ({
            'Phòng / Kho': d.department,
            'Tổng Tài Sản': d.totalAssets,
            'Đang Sử Dụng': d.activeAssets,
            'Đang / Cần Sửa': d.repairAssets,
        }));
        const wsDept = XLSX.utils.json_to_sheet(wsDeptData);
        XLSX.utils.book_append_sheet(wb, wsDept, "Tổng Hợp Theo Phòng");

        // 2. Sheet Chi tiết Tài Sản
        const wsAssetData = assetData.map(a => ({
            'Phòng / Kho': a.location,
            'Mã TS': a.id,
            'Tên Tài Sản': a.name,
            'Người Giữ': a.person,
            'Vị Trí Cụ Thể': a.specificLocation,
            'Năm SD': a.year,
            'Trạng Thái': a.status,
            'Số Lần Sửa Chữa (Thay mực)': a.repairCount,
            'Số Lần Kiểm Kê': a.checkCount,
            'Lần Sửa/Bảo Dưỡng Gần Nhất': a.lastRepairTime,
        }));
        const wsAsset = XLSX.utils.json_to_sheet(wsAssetData);
        XLSX.utils.book_append_sheet(wb, wsAsset, "Chi Tiết Tài Sản");

        // Set column widths for better readability
        wsDept['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        wsAsset['!cols'] = [
            { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 25 },
            { wch: 10 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }
        ];

        // Download
        XLSX.writeFile(wb, "Bao_Cao_Tai_San.xlsx");
    }

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Báo Cáo & Thống Kê</h1>
                    <p className="section-subtitle">Tổng hợp dữ liệu tài sản toàn trạm</p>
                </div>
                <button
                    onClick={handleExportExcel}
                    disabled={loading || assetData.length === 0}
                    className="btn-primary btn-sm gap-2"
                >
                    <Download className="w-4 h-4" /> Xuất Excel
                </button>
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
        </div>
    );
}
