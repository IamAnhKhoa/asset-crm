'use client';
import { CheckReport, RepairTicket } from '@/types';
import { useEffect, useState } from 'react';
import { Search, X, RefreshCw, Filter } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

const TABS = [
    { key: 'checks', label: 'Lịch sử kiểm kê' },
    { key: 'repairs', label: 'Lịch sử sửa chữa' },
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

export default function HistoryPage() {
    const [tab, setTab] = useState('checks');
    const [checks, setChecks] = useState<CheckReport[]>([]);
    const [repairs, setRepairs] = useState<RepairTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [datePreset, setDatePreset] = useState<number | null>(null);
    const [filterPerson, setFilterPerson] = useState('');

    async function load() {
        setLoading(true);
        try {
            const [c, r] = await Promise.all([
                fetch('/api/history/checks').then(x => x.json()),
                fetch('/api/history/repairs').then(x => x.json()),
            ]);
            setChecks(Array.isArray(c) ? c : []);
            setRepairs(Array.isArray(r) ? r : []);
        } catch (e) {
            setChecks([]); setRepairs([]);
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

    function filterList<T extends { time?: string; assetId?: string; reporter?: string; person?: string }>(arr: T[]): T[] {
        return arr.filter(item => {
            const kw = search.toLowerCase();
            if (kw && !((item.assetId || '').toLowerCase().includes(kw) || (item.reporter || item.person || '').toLowerCase().includes(kw))) return false;
            if (filterPerson) {
                const p = (item.reporter || item.person || '').toLowerCase();
                if (!p.includes(filterPerson.toLowerCase())) return false;
            }
            if (dateFrom || dateTo) {
                const d = parseDate(item.time || '');
                if (!d) return false;
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
            }
            return true;
        });
    }

    const filteredChecks = filterList(checks);
    const filteredRepairs = filterList(repairs);
    const currentList = tab === 'checks' ? filteredChecks : filteredRepairs;

    const allPersons = [...new Set([
        ...checks.map(c => c.reporter),
        ...repairs.map(r => r.person),
    ].filter(Boolean))].sort();

    function clearFilters() { setSearch(''); setDateFrom(''); setDateTo(''); setDatePreset(null); setFilterPerson(''); }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title">Lịch Sử Hoạt Động</h1>
                    <p className="section-subtitle">{loading ? '...' : `${currentList.length} bản ghi`}</p>
                </div>
                <button onClick={load} className="btn-icon btn-ghost">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {/* Tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                    {TABS.map(({ key, label }) => (
                        <button key={key} onClick={() => setTab(key)}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${tab === key ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>
                            {label}
                            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-200 text-slate-500 font-semibold">
                                {key === 'checks' ? filteredChecks.length : filteredRepairs.length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Stats summary */}
                {!loading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Tổng kiểm kê', value: filteredChecks.length, color: 'text-indigo-600' },
                            { label: 'Tổng sửa chữa', value: filteredRepairs.length, color: 'text-amber-600' },
                            { label: 'Đã hoàn thành', value: filteredRepairs.filter(r => r.repairStatus?.includes('xong')).length, color: 'text-emerald-600' },
                            { label: 'Đang xử lý', value: filteredRepairs.filter(r => r.repairStatus?.includes('đang')).length, color: 'text-rose-500' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="card p-4">
                                <p className="text-xs text-slate-500">{label}</p>
                                <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filters */}
                <div className="card p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[180px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input className="input pl-9" placeholder="Tìm mã tài sản, người thực hiện..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        <select className="select w-40" value={filterPerson} onChange={e => setFilterPerson(e.target.value)}>
                            <option value="">Tất cả người thực hiện</option>
                            {allPersons.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>

                        <div className="flex items-center gap-2 flex-wrap">
                            {DATE_PRESETS.map(({ label, days }) => (
                                <button key={days} onClick={() => setDatePreset(datePreset === days ? null : days)}
                                    className={`btn btn-sm rounded-lg ${datePreset === days ? 'btn-primary' : 'btn-secondary'}`}>
                                    {label}
                                </button>
                            ))}
                            <input type="date" className="input w-36 text-xs" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setDatePreset(null); }} />
                            <span className="text-slate-400 text-xs">–</span>
                            <input type="date" className="input w-36 text-xs" value={dateTo} onChange={e => { setDateTo(e.target.value); setDatePreset(null); }} />
                        </div>

                        {(search || filterPerson || dateFrom || dateTo) && (
                            <button onClick={clearFilters} className="btn-ghost btn-sm text-rose-500">
                                <X className="w-3.5 h-3.5" /> Xóa lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="table-wrapper">
                    {tab === 'checks' ? (
                        <table className="table">
                            <thead><tr>
                                <th>Thời gian</th><th>Mã TS</th><th>Người kiểm</th>
                                <th>Trạng thái kiểm</th><th>Ghi chú</th>
                            </tr></thead>
                            <tbody>
                                {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>)
                                    : filteredChecks.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-slate-400">Không có bản ghi</td></tr>
                                        : filteredChecks.map((c, i) => (
                                            <tr key={i}>
                                                <td className="text-xs text-slate-500">{c.time}</td>
                                                <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{c.assetId}</span></td>
                                                <td className="text-slate-700">{c.reporter}</td>
                                                <td><StatusBadge status={c.status} /></td>
                                                <td className="text-slate-500 text-xs max-w-[180px] truncate">{c.note || '—'}</td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    ) : (
                        <table className="table">
                            <thead><tr>
                                <th>Thời gian</th><th>Mã TS</th><th>Người báo</th>
                                <th>Nội dung lỗi</th><th>Duyệt</th><th>Trạng thái sửa</th><th>Cập nhật</th>
                            </tr></thead>
                            <tbody>
                                {loading ? Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j}><div className="skeleton h-4 rounded" /></td>)}</tr>)
                                    : filteredRepairs.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">Không có bản ghi</td></tr>
                                        : filteredRepairs.map((r, i) => (
                                            <tr key={i}>
                                                <td className="text-xs text-slate-500">{r.time}</td>
                                                <td><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{r.assetId}</span></td>
                                                <td className="text-slate-700">{r.person}</td>
                                                <td className="max-w-[140px] truncate text-slate-700">{r.issue}</td>
                                                <td><StatusBadge status={r.approveStatus} /></td>
                                                <td><StatusBadge status={r.repairStatus} /></td>
                                                <td className="text-xs text-slate-400">{r.updatedTime || '—'}</td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
