'use client';
import { RepairTicket } from '@/types';
import { useEffect, useState } from 'react';
import {
    Search, X, ChevronDown, ChevronUp, RefreshCw,
    CheckCircle, XCircle, Trash2, Loader2, Plus, Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RepairUpdateModal } from '@/components/modals/RepairUpdateModal';

const TABS = [
    { key: 'pending', label: 'Chờ duyệt' },
    { key: 'processing', label: 'Đang xử lý' },
    { key: 'done', label: 'Hoàn thành' },
    { key: 'rejected', label: 'Từ chối' },
    { key: 'all', label: 'Tất cả' },
];

const REPAIR_STATUS_OPTIONS = [
    'Chưa xử lý', 'Đang xử lý', 'Đã giao đơn vị ngoài xử lý', 'Đã sửa xong',
];

const DATE_PRESETS = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '90 ngày', days: 90 },
];

function parseDate(str: string): Date | null {
    if (!str) return null;
    const parts = str.split(' ')[0].split('/');
    if (parts.length !== 3) return null;
    return new Date(+parts[2], +parts[1] - 1, +parts[0]);
}

export default function RepairPage() {
    const [tickets, setTickets] = useState<RepairTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('pending');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [datePreset, setDatePreset] = useState<number | null>(null);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [modal, setModal] = useState<{ ticket: RepairTicket; mode: 'update' | 'approve' } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        try {
            const r = await fetch('/api/repairs');
            const data = await r.json();
            setTickets(Array.isArray(data) ? data : []);
        } catch (e) {
            setTickets([]);
        } finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (datePreset !== null) {
            const now = new Date();
            const from = new Date(now);
            from.setDate(from.getDate() - datePreset);
            setDateFrom(from.toISOString().split('T')[0]);
            setDateTo(now.toISOString().split('T')[0]);
        }
    }, [datePreset]);

    const filtered = tickets.filter(t => {
        const as = (t.approveStatus || '').toLowerCase();
        const rs = (t.repairStatus || '').toLowerCase();
        if (tab === 'pending') { if (as !== 'chờ duyệt') return false; }
        else if (tab === 'processing') { if (!rs.includes('đang') && !rs.includes('giao')) return false; }
        else if (tab === 'done') { if (!rs.includes('xong') && !rs.includes('hoàn thành') && (t.result || '').toLowerCase() !== 'không sửa được') return false; }
        else if (tab === 'rejected') { if (!as.includes('từ chối')) return false; }

        if (search.trim()) {
            const kw = search.toLowerCase();
            if (!t.assetId.toLowerCase().includes(kw) && !(t.name || '').toLowerCase().includes(kw) && !t.issue.toLowerCase().includes(kw)) return false;
        }
        if (filterStatus && t.repairStatus !== filterStatus) return false;

        if (dateFrom || dateTo) {
            const d = parseDate(t.time);
            if (!d) return false;
            if (dateFrom && d < new Date(dateFrom)) return false;
            if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
        }
        return true;
    });

    const tabCounts = {
        pending: tickets.filter(t => t.approveStatus?.toLowerCase() === 'chờ duyệt').length,
        processing: tickets.filter(t => { const rs = (t.repairStatus || '').toLowerCase(); return rs.includes('đang') || rs.includes('giao'); }).length,
        done: tickets.filter(t => { const rs = (t.repairStatus || '').toLowerCase(); return rs.includes('xong') || rs.includes('hoàn thành') || (t.result || '').toLowerCase() === 'không sửa được'; }).length,
        rejected: tickets.filter(t => t.approveStatus?.toLowerCase().includes('từ chối')).length,
        all: tickets.length,
    };

    // approve function removed because we now use the modal

    async function reject(ticket: RepairTicket) {
        const reason = prompt('Lý do từ chối:');
        if (!reason) return;
        if (!ticket.row) return;
        setBusy(`${ticket.row}`);
        await fetch('/api/repairs', { method: 'PATCH', body: JSON.stringify({ action: 'reject', row: ticket.row, reason }), headers: { 'Content-Type': 'application/json' } });
        await load();
        setBusy(null);
    }

    async function deleteTicket(ticket: RepairTicket) {
        if (!ticket.row || !confirm('Xóa phiếu này?')) return;
        setBusy(`${ticket.row}`);
        await fetch(`/api/pending/repairs/${ticket.row}`, { method: 'DELETE' });
        await load();
        setBusy(null);
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Phiếu Sửa Chữa</h1>
                    <p className="section-subtitle">{loading ? '...' : `${filtered.length} phiếu`}</p>
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
                            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150
                ${tab === key ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                            {tabCounts[key as keyof typeof tabCounts] > 0 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full font-semibold
                  ${tab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                    {tabCounts[key as keyof typeof tabCounts]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input className="input pl-9" placeholder="Tìm mã TS, tên, nội dung..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        <select className="select w-44" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái sửa</option>
                            {REPAIR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        <div className="flex items-center gap-2 flex-wrap">
                            {DATE_PRESETS.map(({ label, days }) => (
                                <button
                                    key={days}
                                    onClick={() => setDatePreset(datePreset === days ? null : days)}
                                    className={`btn btn-sm rounded-lg ${datePreset === days ? 'btn-primary' : 'btn-secondary'}`}
                                >
                                    {label}
                                </button>
                            ))}
                            <input type="date" className="input w-36 text-xs" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePreset(null); }} />
                            <span className="text-slate-400 text-xs">–</span>
                            <input type="date" className="input w-36 text-xs" value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePreset(null); }} />
                        </div>

                        {(search || filterStatus || dateFrom || dateTo) && (
                            <button onClick={() => { setSearch(''); setFilterStatus(''); setDateFrom(''); setDateTo(''); setDatePreset(null); }} className="btn-ghost btn-sm text-rose-500">
                                <X className="w-3.5 h-3.5" /> Xóa lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Mã TS / Tên</th>
                                <th>Vị trí</th>
                                <th>Nội dung lỗi</th>
                                <th>Người báo</th>
                                <th>Duyệt</th>
                                <th>Trạng thái sửa</th>
                                <th className="text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading
                                ? Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>{Array.from({ length: 8 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>
                                ))
                                : filtered.length === 0
                                    ? <tr><td colSpan={8} className="text-center py-12 text-slate-400">Không có phiếu nào</td></tr>
                                    : filtered.map((t, idx) => {
                                        const key = `${t.source}-${t.row}-${idx}`;
                                        const isExpanded = expanded === key;
                                        const isBusy = busy === `${t.row}`;
                                        return (
                                            <>
                                                <tr key={key} className="cursor-pointer" onClick={() => setExpanded(isExpanded ? null : key)}>
                                                    <td className="text-xs text-slate-500 w-28">{t.time}</td>
                                                    <td>
                                                        <p className="font-medium text-slate-800">{t.assetId}</p>
                                                        <p className="text-xs text-slate-400 truncate max-w-[120px]">{t.name}</p>
                                                    </td>
                                                    <td className="text-slate-500 text-xs">{t.location}</td>
                                                    <td className="max-w-[140px]">
                                                        <p className="truncate text-slate-700">{t.issue}</p>
                                                    </td>
                                                    <td className="text-slate-500 text-xs">{t.person}</td>
                                                    <td><StatusBadge status={t.approveStatus} /></td>
                                                    <td><StatusBadge status={t.repairStatus} /></td>
                                                    <td>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {t.source === 'pending' && (
                                                                <>
                                                                    <button onClick={e => { e.stopPropagation(); setModal({ ticket: t, mode: 'approve' }); }} disabled={isBusy} className="btn-icon btn-ghost text-emerald-500" title="Duyệt">
                                                                        {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); reject(t); }} disabled={isBusy} className="btn-icon btn-ghost text-rose-400" title="Từ chối">
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); deleteTicket(t); }} disabled={isBusy} className="btn-icon btn-ghost text-slate-400" title="Xóa">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {t.source === 'history' && (
                                                                <button onClick={e => { e.stopPropagation(); setModal({ ticket: t, mode: 'update' }); }} className="btn btn-sm btn-secondary text-xs">
                                                                    Cập nhật
                                                                </button>
                                                            )}
                                                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${key}-expand`} className="bg-indigo-50/30">
                                                        <td colSpan={8} className="px-4 py-3">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                                                <div><span className="label">Ghi chú</span><p className="text-slate-700">{t.note || '—'}</p></div>
                                                                <div><span className="label">Kết quả</span><p className="text-slate-700">{t.result || '—'}</p></div>
                                                                <div><span className="label">Ghi chú xử lý</span><p className="text-slate-700">{t.handlerNote || '—'}</p></div>
                                                                {t.updatedTime && <div><span className="label">Cập nhật lúc</span><p className="text-slate-700">{t.updatedTime}</p></div>}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })
                            }
                        </tbody>
                    </table>
                </div>
            </div>

            {modal && (
                <RepairUpdateModal
                    ticket={modal.ticket}
                    mode={modal.mode}
                    onClose={() => setModal(null)}
                    onSaved={() => { setModal(null); load(); }}
                />
            )}
        </div>
    );
}
