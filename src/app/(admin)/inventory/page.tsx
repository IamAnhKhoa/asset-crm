'use client';
import { CheckReport } from '@/types';
import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Search, X, Trash2, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

const TABS = [
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'done', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
];

const CHECK_STATUS_OPTIONS = ['Tốt', 'Cần sửa', 'Hỏng', 'Mất / Thất lạc'];

export default function InventoryPage() {
    const [pending, setPending] = useState<CheckReport[]>([]);
    const [history, setHistory] = useState<CheckReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [search, setSearch] = useState('');
    const [busy, setBusy] = useState<number | null>(null);

    async function load() {
        setLoading(true);
        try {
            const [p, h] = await Promise.all([
                fetch('/api/pending/checks').then(r => r.json()),
                fetch('/api/history/checks').then(r => r.json()),
            ]);
            setPending(Array.isArray(p) ? p : []);
            setHistory(Array.isArray(h) ? h : []);
        } catch (e) {
            setPending([]); setHistory([]);
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    async function approve(row: number, assetId: string, status: string) {
        setBusy(row);
        await fetch('/api/history/checks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', row, assetId, status }),
        });
        await load();
        setBusy(null);
    }

    async function reject(row: number) {
        const reason = prompt('Lý do từ chối:');
        if (!reason) return;
        setBusy(row);
        await fetch('/api/history/checks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', row, reason }),
        });
        await load();
        setBusy(null);
    }

    async function deleteCheck(check: CheckReport) {
        if (!check.row || !confirm('Bạn có chắc muốn xóa phiếu kiểm kê này?')) return;
        setBusy(check.row);
        try {
            if (tab === 'pending') {
                // pending_checks → DELETE /api/pending/checks/[row]
                await fetch(`/api/pending/checks/${check.row}`, { method: 'DELETE' });
            } else {
                // check_history → DELETE /api/history/checks with body
                await fetch('/api/history/checks', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row: check.row }),
                });
            }
        } catch (e) { console.error(e); }
        await load();
        setBusy(null);
    }

    const list = tab === 'pending'
        ? pending
        : tab === 'rejected'
            ? history.filter(c => c.status.toLowerCase().includes('từ chối'))
            : history.filter(c => !c.status.toLowerCase().includes('từ chối'));

    const filtered = list.filter(c =>
        !search ||
        c.assetId.toLowerCase().includes(search.toLowerCase()) ||
        c.reporter.toLowerCase().includes(search.toLowerCase())
    );

    const colCount = tab === 'pending' ? 7 : 7; // always 7 cols (added Thao tác for all tabs)

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Kiểm Kê Tài Sản</h1>
                    <p className="section-subtitle">{loading ? '...' : `${filtered.length} phiếu ${tab === 'pending' ? 'chờ duyệt' : tab === 'rejected' ? 'từ chối' : 'đã duyệt'}`}</p>
                </div>
                <button onClick={load} className="btn-icon btn-ghost">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
                ${tab === key ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                            {key === 'pending' && pending.length > 0 && (
                                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-rose-100 text-rose-600 font-semibold">{pending.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="card p-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input className="input pl-9" placeholder="Tìm mã tài sản, người kiểm..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        {search && <button onClick={() => setSearch('')} className="btn-ghost btn-sm text-rose-500"><X className="w-4 h-4" /></button>}
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Mã tài sản</th>
                                <th>Người kiểm</th>
                                <th>Vị trí</th>
                                <th>Trạng thái kiểm</th>
                                <th>Ghi chú</th>
                                <th className="text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>
                                ))
                                : filtered.length === 0
                                    ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Không có phiếu nào</td></tr>
                                    : filtered.map((c, i) => {
                                        const isBusy = busy === c.row;
                                        return (
                                            <tr key={i}>
                                                <td className="text-xs text-slate-500 w-28">{c.time}</td>
                                                <td>
                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">{c.assetId}</span>
                                                </td>
                                                <td className="text-slate-700">{c.reporter}</td>
                                                <td className="text-slate-500 text-xs">{c.location}</td>
                                                <td><StatusBadge status={c.status} /></td>
                                                <td className="text-slate-500 text-xs max-w-[160px] truncate">{c.note || '—'}</td>
                                                <td>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {tab === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => c.row && approve(c.row, c.assetId, c.status)}
                                                                    disabled={isBusy}
                                                                    className="btn btn-sm bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 hover:bg-emerald-100 gap-1"
                                                                >
                                                                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Duyệt
                                                                </button>
                                                                <button
                                                                    onClick={() => c.row && reject(c.row)}
                                                                    disabled={isBusy}
                                                                    className="btn-danger btn-sm gap-1"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" /> Từ chối
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => deleteCheck(c)}
                                                            disabled={isBusy}
                                                            className="btn-icon btn-ghost text-slate-400 hover:text-rose-500"
                                                            title="Xóa phiếu"
                                                        >
                                                            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
