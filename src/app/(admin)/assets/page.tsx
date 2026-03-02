'use client';
import { Asset } from '@/types';
import { useEffect, useState, useCallback } from 'react';
import {
    Search, Plus, Pencil, Trash2, Eye, X, Save, Loader2,
    ChevronLeft, ChevronRight, Filter, Download, QrCode,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AssetModal } from '@/components/modals/AssetModal';
import { AssetDetailModal } from '@/components/modals/AssetDetailModal';
import { QRCodeModal } from '@/components/modals/QRCodeModal';
import { BulkQRCodeModal } from '@/components/modals/BulkQRCodeModal';
import { useSession } from 'next-auth/react';

const STATUS_OPTIONS = [
    'Đang sử dụng', 'Cần sửa', 'Đang sửa chữa', 'Hỏng', 'Mất / Thất lạc', 'Thanh lý',
];

export default function AssetsPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const isEditor = role && !['guest', 'user_basic'].includes(role);

    const [assets, setAssets] = useState<Asset[]>([]);
    const [filtered, setFiltered] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [sortOption, setSortOption] = useState<'none' | 'price-desc' | 'price-asc' | 'year-desc' | 'year-asc'>('none');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [depts, setDepts] = useState<string[]>([]);

    const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [qrAsset, setQrAsset] = useState<Asset | null>(null);
    const [bulkQrModalOpen, setBulkQrModalOpen] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch('/api/assets?t=' + Date.now());
            const data = await r.json();
            const list: Asset[] = Array.isArray(data) ? data : [];
            setAssets(list);

            // Detect duplicates
            const idCount: Record<string, number> = {};
            const dupes = new Set<string>();
            list.forEach(a => {
                const id = a.id.trim();
                idCount[id] = (idCount[id] || 0) + 1;
                if (idCount[id] > 1) dupes.add(id);
            });
            setDuplicateIds(dupes);

            const uniqueDepts = [...new Set<string>(list.map((a: Asset) => a.location).filter(Boolean))].sort();
            setDepts(uniqueDepts);
        } catch (e) {
            setAssets([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    useEffect(() => {
        let result = assets;
        if (search.trim()) {
            // Normalize spaces and split by one or more sequences of whitespace.
            const terms = search.toLowerCase().replace(/\s+/g, ' ').trim().split(' ');
            result = result.filter(a => {
                const id = a.id.toLowerCase();
                const name = a.name.toLowerCase();
                const loc = (a.location || '').toLowerCase();
                return terms.every(term => id.includes(term) || name.includes(term) || loc.includes(term));
            });
        }
        if (filterDept) result = result.filter(a => a.location === filterDept);
        if (filterStatus) result = result.filter(a => a.status === filterStatus);

        if (sortOption !== 'none') {
            result = [...result].sort((a, b) => {
                if (sortOption === 'price-desc' || sortOption === 'price-asc') {
                    const priceA = a.originalPrice || 0;
                    const priceB = b.originalPrice || 0;
                    return sortOption === 'price-desc' ? priceB - priceA : priceA - priceB;
                }
                if (sortOption === 'year-desc' || sortOption === 'year-asc') {
                    const yearA = Number(a.year) || 0;
                    const yearB = Number(b.year) || 0;
                    return sortOption === 'year-desc' ? yearB - yearA : yearA - yearB;
                }
                return 0;
            });
        }

        setFiltered(result);
        setPage(1);
    }, [assets, search, filterDept, filterStatus, sortOption]);

    const totalPages = Math.ceil(filtered.length / pageSize);
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    async function handleDelete(id: string) {
        if (!confirm(`Xóa tài sản "${id}"?`)) return;
        setDeleting(id);
        try {
            await fetch(`/api/assets/${id}`, { method: 'DELETE' });
            load();
        } finally {
            setDeleting(null);
        }
    }

    async function handleFixDuplicates() {
        if (!confirm('Hệ thống sẽ tự động thêm (1), (2)... vào các mã tài sản bị trùng. Tiếp tục?')) return;
        setLoading(true);
        try {
            const r = await fetch('/api/assets/fix-duplicates', { method: 'POST' });
            const res = await r.json();
            if (res.success) {
                alert(`Đã xử lý xong ${res.fixes} mã trùng lặp!`);
                load();
            } else {
                alert(`Lỗi: ${res.error}`);
            }
        } finally {
            setLoading(false);
        }
    }

    function clearFilters() {
        setSearch('');
        setFilterDept('');
        setFilterStatus('');
        setSortOption('none');
    }

    const hasFilters = search || filterDept || filterStatus || sortOption !== 'none';

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Quản lý Tài Sản</h1>
                    <p className="section-subtitle">{loading ? '...' : `${filtered.length} tài sản`}</p>
                </div>
                <div className="flex gap-2">
                    {isEditor && (
                        <>
                            {duplicateIds.size > 0 && role === 'admin_full' && (
                                <button onClick={handleFixDuplicates} className="btn-secondary btn-sm gap-1.5 text-amber-600 border-amber-200 bg-amber-50">
                                    <QrCode className="w-3.5 h-3.5" /> Sửa trùng lặp ({duplicateIds.size.toLocaleString()})
                                </button>
                            )}
                            <button onClick={() => setBulkQrModalOpen(true)} className="btn-secondary btn-sm gap-1.5 hidden sm:flex">
                                <QrCode className="w-3.5 h-3.5" /> In QR hàng loạt
                            </button>
                            <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary btn-sm gap-1.5">
                                <Plus className="w-3.5 h-3.5" /> Thêm tài sản
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="p-6 space-y-4">
                {/* Filters */}
                <div className="card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                className="input pl-9"
                                placeholder="Tìm theo mã, tên, vị trí..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>

                        {/* Dept filter */}
                        <select
                            className="select w-40"
                            value={filterDept}
                            onChange={e => setFilterDept(e.target.value)}
                        >
                            <option value="">Tất cả phòng ban</option>
                            {depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        {/* Status filter */}
                        <select
                            className="select w-40"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">Tất cả trạng thái</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {/* Sort filter */}
                        <select
                            className="select w-48"
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value as any)}
                        >
                            <option value="none">Sắp xếp mặc định</option>
                            <option value="price-desc">Giá trị: Lớn → Nhỏ</option>
                            <option value="price-asc">Giá trị: Nhỏ → Lớn</option>
                            <option value="year-desc">Năm mua: Mới → Cũ</option>
                            <option value="year-asc">Năm mua: Cũ → Mới</option>
                        </select>

                        {hasFilters && (
                            <button onClick={clearFilters} className="btn-ghost btn-sm text-rose-500">
                                <X className="w-3.5 h-3.5" /> Xóa lọc
                            </button>
                        )}

                        <span className="ml-auto text-xs text-slate-400">
                            {filtered.length}/{assets.length} kết quả
                        </span>
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Mã tài sản</th>
                                <th>Tên tài sản</th>
                                <th>Phòng / Kho</th>
                                <th>Người giữ</th>
                                <th>Năm</th>
                                <th>Nguyên giá</th>
                                <th>Còn lại</th>
                                <th>Trạng thái</th>
                                <th className="text-right">{isEditor ? 'Thao tác' : ''}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j}><div className="skeleton h-4 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : paged.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        Không tìm thấy tài sản nào
                                    </td>
                                </tr>
                            ) : (
                                paged.map((a, i) => (
                                    <tr key={a.row || `${a.id}-${i}`}>
                                        <td>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`font-mono text-xs px-2 py-0.5 rounded-lg ${duplicateIds.has(a.id.trim()) ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-700'}`}>
                                                    {a.id}
                                                </span>
                                                {duplicateIds.has(a.id.trim()) && (
                                                    <span title="Mã trùng lặp - Cần xử lý" className="text-amber-500 cursor-help">
                                                        <QrCode className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="max-w-[180px]">
                                            <p className="font-medium text-slate-800 truncate">{a.name}</p>
                                        </td>
                                        <td className="text-slate-500">{a.location}</td>
                                        <td className="text-slate-500 max-w-[120px] truncate" title={a.person}>{a.person || '—'}</td>
                                        <td className="text-slate-500">{a.year}</td>
                                        <td className="text-slate-700 font-medium">
                                            {a.originalPrice ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(a.originalPrice) : '—'}
                                        </td>
                                        <td className="text-indigo-600 font-medium">
                                            {a.originalPrice && a.year ? (() => {
                                                const currentYear = new Date().getFullYear();
                                                const yearsUsed = currentYear - Number(a.year);
                                                const remainingPercent = Math.max(0, 1 - 0.2 * yearsUsed);
                                                const remainingValue = a.originalPrice * remainingPercent;
                                                return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(remainingValue);
                                            })() : '—'}
                                        </td>
                                        <td><StatusBadge status={a.status} /></td>
                                        <td>
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => { setSelected(a); setModal('detail'); }}
                                                    className="btn-icon btn-ghost text-slate-400 hover:text-indigo-500"
                                                    title="Chi tiết"
                                                >
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                {isEditor && (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelected(a); setModal('edit'); }}
                                                            className="btn-icon btn-ghost text-slate-400 hover:text-indigo-500"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(a.id)}
                                                            disabled={deleting === a.id}
                                                            className="btn-icon btn-ghost text-slate-400 hover:text-rose-500"
                                                            title="Xóa"
                                                        >
                                                            {deleting === a.id
                                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                : <Trash2 className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filtered.length > 0 && (
                    <div className="flex items-center justify-between card px-4 py-3">
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>Trang {page}/{totalPages} · {filtered.length} kết quả</span>
                            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                                <span>Hiển thị:</span>
                                <select
                                    className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                                    value={pageSize}
                                    onChange={(e) => {
                                        setPageSize(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value={10}>10</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={1000}>1000</option>
                                </select>
                            </div>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="btn-icon btn-secondary btn-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = page <= 3 ? i + 1 : page - 2 + i;
                                    if (p < 1 || p > totalPages) return null;
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`btn btn-sm w-8 h-8 p-0 rounded-lg text-xs
                      ${p === page ? 'btn-primary' : 'btn-secondary'}`}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="btn-icon btn-secondary btn-sm"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modals */}
            {(modal === 'add' || modal === 'edit') && (
                <AssetModal
                    asset={selected}
                    isEdit={modal === 'edit'}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
            {modal === 'detail' && selected && (
                <AssetDetailModal
                    asset={selected}
                    onClose={() => setModal(null)}
                    onEdit={() => setModal('edit')}
                />
            )}
            {qrAsset && (
                <QRCodeModal
                    assetId={qrAsset.id}
                    assetName={qrAsset.name}
                    location={qrAsset.location}
                    person={qrAsset.person}
                    year={qrAsset.year}
                    onClose={() => setQrAsset(null)}
                />
            )}
            {bulkQrModalOpen && (
                <BulkQRCodeModal
                    departments={depts}
                    assets={assets}
                    onClose={() => setBulkQrModalOpen(false)}
                />
            )}
        </div>
    );
}
