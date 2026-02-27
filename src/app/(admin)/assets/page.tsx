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

const STATUS_OPTIONS = [
    'Đang sử dụng', 'Cần sửa', 'Đang sửa chữa', 'Hỏng', 'Mất / Thất lạc', 'Thanh lý',
];

const PAGE_SIZE = 15;

export default function AssetsPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [filtered, setFiltered] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(1);
    const [depts, setDepts] = useState<string[]>([]);

    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selected, setSelected] = useState<Asset | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [qrAsset, setQrAsset] = useState<Asset | null>(null);
    const [bulkQrModalOpen, setBulkQrModalOpen] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch('/api/assets');
            const data = await r.json();
            const list: Asset[] = Array.isArray(data) ? data : [];
            setAssets(list);
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
            const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
            result = result.filter(a => {
                const id = a.id.toLowerCase();
                const name = a.name.toLowerCase();
                const loc = (a.location || '').toLowerCase();
                return terms.every(term => id.includes(term) || name.includes(term) || loc.includes(term));
            });
        }
        if (filterDept) result = result.filter(a => a.location === filterDept);
        if (filterStatus) result = result.filter(a => a.status === filterStatus);
        setFiltered(result);
        setPage(1);
    }, [assets, search, filterDept, filterStatus]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

    function clearFilters() {
        setSearch('');
        setFilterDept('');
        setFilterStatus('');
    }

    const hasFilters = search || filterDept || filterStatus;

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Quản lý Tài Sản</h1>
                    <p className="section-subtitle">{loading ? '...' : `${filtered.length} tài sản`}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setBulkQrModalOpen(true)} className="btn-secondary btn-sm gap-1.5 hidden sm:flex">
                        <QrCode className="w-3.5 h-3.5" /> In QR hàng loạt
                    </button>
                    <button onClick={() => { setSelected(null); setModal('add'); }} className="btn-primary btn-sm gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Thêm tài sản
                    </button>
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
                                <th>Trạng thái</th>
                                <th className="text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 6 }).map((_, j) => (
                                            <td key={j}><div className="skeleton h-4 rounded" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : paged.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        Không tìm thấy tài sản nào
                                    </td>
                                </tr>
                            ) : (
                                paged.map((a) => (
                                    <tr key={a.id}>
                                        <td>
                                            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">{a.id}</span>
                                        </td>
                                        <td className="max-w-[180px]">
                                            <p className="font-medium text-slate-800 truncate">{a.name}</p>
                                        </td>
                                        <td className="text-slate-500">{a.location}</td>
                                        <td className="text-slate-500 max-w-[120px] truncate" title={a.person}>{a.person || '—'}</td>
                                        <td className="text-slate-500">{a.year}</td>
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
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between card px-4 py-3">
                        <span className="text-xs text-slate-500">
                            Trang {page}/{totalPages} · {filtered.length} kết quả
                        </span>
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
