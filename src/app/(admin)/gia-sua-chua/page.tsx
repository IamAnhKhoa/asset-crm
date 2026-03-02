'use client';
import { useEffect, useState, useCallback } from 'react';
import {
    Receipt, Plus, Pencil, Trash2, RefreshCw, X, Save, Loader2,
    Printer, Wrench, Wifi, Cpu, ChevronDown,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

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

const LOAI_OPTIONS = [
    'Bơm Mực Máy In',
    'Sửa Chữa Máy In',
    'Thiết Bị Mạng',
    'Linh Kiện Vi Tính',
];

const LOAI_ICONS: Record<string, React.ElementType> = {
    'Bơm Mực Máy In': Printer,
    'Sửa Chữa Máy In': Wrench,
    'Thiết Bị Mạng': Wifi,
    'Linh Kiện Vi Tính': Cpu,
};

const LOAI_COLORS: Record<string, string> = {
    'Bơm Mực Máy In': 'bg-blue-50 text-blue-700 ring-blue-200',
    'Sửa Chữa Máy In': 'bg-amber-50 text-amber-700 ring-amber-200',
    'Thiết Bị Mạng': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    'Linh Kiện Vi Tính': 'bg-purple-50 text-purple-700 ring-purple-200',
};

const LOAI_HEADER_COLORS: Record<string, string> = {
    'Bơm Mực Máy In': 'bg-blue-500',
    'Sửa Chữa Máy In': 'bg-amber-500',
    'Thiết Bị Mạng': 'bg-emerald-500',
    'Linh Kiện Vi Tính': 'bg-purple-500',
};

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

const EMPTY_FORM = { loai: LOAI_OPTIONS[0], noiDung: '', donViTinh: 'Cái', donGia: 0, ghiChu: '' };

export default function GiaSuaChuaPage() {
    const [items, setItems] = useState<ServiceItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<ServiceItem | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);
    const [deletingRow, setDeletingRow] = useState<number | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const isEditor = role === 'admin_full'; // Only admin_full can edit price list based on API logic

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/gia-sua-chua');
            const data = await r.json();
            if (Array.isArray(data)) setItems(data);
        } catch { } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    function openAdd() {
        setEditItem(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    }

    function openEdit(item: ServiceItem) {
        setEditItem(item);
        setForm({ loai: item.loai, noiDung: item.noiDung, donViTinh: item.donViTinh, donGia: item.donGia, ghiChu: item.ghiChu });
        setShowModal(true);
    }

    async function handleSave() {
        if (!form.noiDung.trim()) return;
        setSaving(true);
        try {
            if (editItem) {
                await fetch('/api/gia-sua-chua', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row: editItem.row, ...form }),
                });
                showToast('Đã cập nhật dịch vụ');
            } else {
                await fetch('/api/gia-sua-chua', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form),
                });
                showToast('Đã thêm dịch vụ mới');
            }
            setShowModal(false);
            load();
        } catch {
            showToast('Có lỗi xảy ra', 'err');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(item: ServiceItem) {
        if (!confirm(`Xóa "${item.noiDung}"?`)) return;
        setDeletingRow(item.row);
        try {
            await fetch('/api/gia-sua-chua', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ row: item.row }),
            });
            showToast('Đã xóa dịch vụ');
            load();
        } catch {
            showToast('Có lỗi xảy ra', 'err');
        } finally {
            setDeletingRow(null);
        }
    }

    const tabs = [
        { key: 'all', label: 'Tất Cả' },
        ...LOAI_OPTIONS.map((l) => ({ key: l, label: l })),
    ];

    const filtered = activeTab === 'all' ? items : items.filter((i) => i.loai === activeTab);

    const grouped: Record<string, ServiceItem[]> = {};
    filtered.forEach((i) => {
        if (!grouped[i.loai]) grouped[i.loai] = [];
        grouped[i.loai].push(i);
    });

    const totalAll = items.reduce((s, i) => s + i.donGia, 0);

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Bảng Giá Dịch Vụ</h1>
                    <p className="section-subtitle">Bơm mực máy in & sửa chữa thiết bị tin học</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={load} className="btn-icon btn-ghost" title="Làm mới">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} />
                    </button>
                    {isEditor && (
                        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors">
                            <Plus className="w-4 h-4" /> Thêm Dịch Vụ
                        </button>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* Summary cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {LOAI_OPTIONS.map((loai) => {
                        const Icon = LOAI_ICONS[loai];
                        const count = items.filter((i) => i.loai === loai).length;
                        const colorClass = LOAI_COLORS[loai];
                        return (
                            <div key={loai} className="card p-4 card-hover cursor-pointer" onClick={() => setActiveTab(loai)}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${colorClass}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-500 leading-tight">{loai}</p>
                                        <p className="text-xl font-bold text-slate-800">{count} <span className="text-xs font-normal text-slate-400">mục</span></p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit flex-wrap">
                    {tabs.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150
                ${activeTab === key ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Tables by group */}
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
                    </div>
                ) : Object.entries(grouped).map(([loai, rows]) => {
                    const Icon = LOAI_ICONS[loai] || Receipt;
                    const headerColor = LOAI_HEADER_COLORS[loai] || 'bg-indigo-500';
                    const groupTotal = rows.reduce((s, r) => s + r.donGia, 0);

                    return (
                        <div key={loai} className="card overflow-hidden">
                            {/* Group header */}
                            <div className={`${headerColor} px-5 py-3 flex items-center justify-between`}>
                                <div className="flex items-center gap-2 text-white">
                                    <Icon className="w-4 h-4" />
                                    <span className="font-semibold text-sm">{loai}</span>
                                    <span className="text-white/70 text-xs">({rows.length} mục)</span>
                                </div>
                                <span className="text-white/90 text-sm font-medium">
                                    Tổng: {formatVND(groupTotal)}
                                </span>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50">
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-10">STT</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Nội Dung</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-28">Đơn Vị</th>
                                            <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 w-36">Đơn Giá</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Ghi Chú</th>
                                            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 w-36">Cập Nhật</th>
                                            {isEditor && <th className="px-4 py-2.5 w-20"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {rows.map((item) => (
                                            <tr key={item.row} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-slate-400 text-xs font-mono">{item.stt}</td>
                                                <td className="px-4 py-3 font-medium text-slate-800">{item.noiDung}</td>
                                                <td className="px-4 py-3 text-slate-600">{item.donViTinh}</td>
                                                <td className="px-4 py-3 text-right font-semibold text-indigo-700">{formatVND(item.donGia)}</td>
                                                <td className="px-4 py-3 text-slate-500 text-xs">{item.ghiChu || '—'}</td>
                                                <td className="px-4 py-3 text-slate-400 text-xs">{item.ngayCapNhat}</td>
                                                {isEditor && (
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            <button onClick={() => openEdit(item)} className="btn-icon btn-ghost w-7 h-7" title="Sửa">
                                                                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                disabled={deletingRow === item.row}
                                                                className="btn-icon btn-ghost w-7 h-7"
                                                                title="Xóa"
                                                            >
                                                                {deletingRow === item.row
                                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                                                                    : <Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}

                {!loading && filtered.length === 0 && (
                    <div className="card p-12 text-center text-slate-400">
                        <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Chưa có dữ liệu</p>
                        <p className="text-sm mt-1">Nhấn "Thêm Dịch Vụ" để bắt đầu</p>
                    </div>
                )}

                {/* Grand total */}
                {!loading && items.length > 0 && (
                    <div className="card p-4 flex items-center justify-between bg-indigo-50 ring-1 ring-indigo-200">
                        <span className="font-semibold text-indigo-800">Tổng cộng tất cả dịch vụ</span>
                        <span className="text-xl font-bold text-indigo-700">{formatVND(totalAll)}</span>
                    </div>
                )}
            </div>

            {/* Modal Add/Edit */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-slate-800">{editItem ? 'Sửa Dịch Vụ' : 'Thêm Dịch Vụ Mới'}</h2>
                            <button onClick={() => setShowModal(false)} className="btn-icon btn-ghost">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Loại */}
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Loại Dịch Vụ</label>
                                <div className="relative">
                                    <select
                                        value={form.loai}
                                        onChange={(e) => setForm((f) => ({ ...f, loai: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none bg-white"
                                    >
                                        {LOAI_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Nội dung */}
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Nội Dung <span className="text-rose-500">*</span></label>
                                <input
                                    value={form.noiDung}
                                    onChange={(e) => setForm((f) => ({ ...f, noiDung: e.target.value }))}
                                    placeholder="Tên dịch vụ / vật tư..."
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>

                            {/* Đơn vị + Đơn giá */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Đơn Vị Tính</label>
                                    <input
                                        value={form.donViTinh}
                                        onChange={(e) => setForm((f) => ({ ...f, donViTinh: e.target.value }))}
                                        placeholder="Cái / Hộp / Bộ..."
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">Đơn Giá (VNĐ)</label>
                                    <input
                                        type="number"
                                        value={form.donGia || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, donGia: parseInt(e.target.value) || 0 }))}
                                        placeholder="0"
                                        min={0}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                    />
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Ghi Chú</label>
                                <input
                                    value={form.ghiChu}
                                    onChange={(e) => setForm((f) => ({ ...f, ghiChu: e.target.value }))}
                                    placeholder="Ghi chú (không bắt buộc)"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !form.noiDung.trim()}
                                className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editItem ? 'Cập Nhật' : 'Thêm Mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white transition-all
          ${toast.type === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
