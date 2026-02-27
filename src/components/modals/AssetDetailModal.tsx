'use client';
import { Asset, CheckReport, RepairTicket } from '@/types';
import { useEffect, useState } from 'react';
import { X, Pencil, Package, Clock, Wrench } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface Props {
    asset: Asset;
    onClose: () => void;
    onEdit: () => void;
}

export function AssetDetailModal({ asset, onClose, onEdit }: Props) {
    const [checks, setChecks] = useState<CheckReport[]>([]);
    const [repairs, setRepairs] = useState<RepairTicket[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`/api/history/checks?assetId=${asset.id}`).then(r => r.json()),
            fetch(`/api/history/repairs?assetId=${asset.id}`).then(r => r.json()),
        ]).then(([c, r]) => { setChecks(c); setRepairs(r); }).finally(() => setLoading(false));
    }, [asset.id]);

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel max-w-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Package className="w-4.5 h-4.5 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{asset.name}</h2>
                            <p className="text-xs text-slate-400">{asset.id}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="btn-secondary btn-sm gap-1.5"><Pencil className="w-3.5 h-3.5" />Chỉnh sửa</button>
                        <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Vị trí', value: asset.location },
                            { label: 'Năm mua', value: String(asset.year) },
                            { label: 'Mã tài sản', value: asset.id },
                            { label: 'Trạng thái', value: undefined, badge: asset.status },
                        ].map(({ label, value, badge }) => (
                            <div key={label} className="bg-slate-50 rounded-xl p-3">
                                <p className="text-xs text-slate-500 mb-1">{label}</p>
                                {badge ? <StatusBadge status={badge} /> : <p className="text-sm font-medium text-slate-800">{value || '—'}</p>}
                            </div>
                        ))}
                    </div>

                    {/* Latest Statuses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Kiểm kê gần nhất</p>
                            {(() => {
                                const approvedChecks = checks.filter(c => c.approveStatus?.toLowerCase().includes('duyệt') || c.status);
                                const latest = approvedChecks.length > 0 ? approvedChecks[0] : null;
                                return latest ? (
                                    <div>
                                        <p className="text-sm font-medium text-emerald-600 mb-1">✓ {latest.time}</p>
                                        <div className="text-xs text-slate-600 flex items-center gap-1.5"><span className="truncate">{latest.reporter}</span> <StatusBadge status={latest.status} /></div>
                                    </div>
                                ) : <p className="text-xs text-slate-400">Chưa có dữ liệu kiểm kê</p>;
                            })()}
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Sửa chữa gần nhất</p>
                            {(() => {
                                const approvedRepairs = repairs.filter(r => r.approveStatus?.toLowerCase().includes('duyệt'));
                                const latest = approvedRepairs.length > 0 ? approvedRepairs[0] : null;
                                return latest ? (
                                    <div>
                                        <p className="text-sm font-medium text-indigo-600 mb-1">✓ {latest.repairStatus || 'Đã duyệt'}</p>
                                        <p className="text-xs text-slate-600 truncate">{latest.time} - {latest.issue}</p>
                                    </div>
                                ) : <p className="text-xs text-slate-400">Chưa có dữ liệu sửa chữa</p>;
                            })()}
                        </div>
                    </div>

                    {/* Check history */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4 text-indigo-400" />
                            <p className="section-title text-sm">Lịch sử kiểm kê</p>
                            <span className="badge-info">{checks.length}</span>
                        </div>
                        {loading ? <div className="skeleton h-20 rounded-xl" />
                            : checks.length === 0
                                ? <p className="text-sm text-slate-400 text-center py-4">Chưa có lịch sử kiểm kê</p>
                                : (
                                    <div className="space-y-2">
                                        {checks.slice(0, 5).map((c, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-slate-700 font-medium">{c.reporter}</p>
                                                    <p className="text-xs text-slate-400">{c.time} · {c.note}</p>
                                                </div>
                                                <StatusBadge status={c.status} />
                                            </div>
                                        ))}
                                    </div>
                                )
                        }
                    </div>

                    {/* Repair history */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Wrench className="w-4 h-4 text-amber-400" />
                            <p className="section-title text-sm">Lịch sử sửa chữa</p>
                            <span className="badge-warning">{repairs.length}</span>
                        </div>
                        {loading ? <div className="skeleton h-20 rounded-xl" />
                            : repairs.length === 0
                                ? <p className="text-sm text-slate-400 text-center py-4">Chưa có lịch sử sửa chữa</p>
                                : (
                                    <div className="space-y-2">
                                        {repairs.slice(0, 5).map((r, i) => (
                                            <div key={i} className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-medium text-slate-700">{r.issue}</p>
                                                    <StatusBadge status={r.repairStatus} />
                                                </div>
                                                <p className="text-xs text-slate-400">{r.person} · {r.time}</p>
                                                {r.handlerNote && <p className="text-xs text-slate-500 mt-1">→ {r.handlerNote}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}
