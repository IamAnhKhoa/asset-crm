'use client';
import { useEffect, useState } from 'react';
import { CheckCircle, Wrench, Clock, MapPin, Calendar, AlertTriangle, Loader2, ChevronDown, ChevronUp, Send, Package } from 'lucide-react';

interface AssetInfo {
    id: string; name: string; location: string; year: number; status: string; person?: string; specificLocation?: string;
}
interface CheckReport {
    time: string; reporter: string; status: string; note: string;
}
interface RepairTicket {
    time: string; person: string; issue: string; approveStatus: string; repairStatus: string; handlerNote?: string;
}
interface LookupData {
    asset: AssetInfo;
    recentChecks: CheckReport[];
    recentRepairs: RepairTicket[];
    pendingChecks: any[];
    pendingRepairs: any[];
    lastApprovedCheck: CheckReport | null;
    lastApprovedRepair: RepairTicket | null;
}

const STATUS_COLORS: Record<string, string> = {
    'Đang sử dụng': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Cần sửa': 'bg-amber-100 text-amber-700 border-amber-200',
    'Đang sửa chữa': 'bg-blue-100 text-blue-700 border-blue-200',
    'Hỏng': 'bg-rose-100 text-rose-700 border-rose-200',
    'Tốt': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};
function Chip({ label }: { label: string }) {
    const cls = STATUS_COLORS[label] || 'bg-slate-100 text-slate-600 border-slate-200';
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{label}</span>;
}

type ReportTab = 'check' | 'repair';

export default function LookupPage({ params }: { params: { id: string } }) {
    const assetId = decodeURIComponent(params.id);
    const [data, setData] = useState<LookupData | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Report form
    const [reportTab, setReportTab] = useState<ReportTab>('repair');
    const [showForm, setShowForm] = useState(false);
    const [person, setPerson] = useState('');
    const [issue, setIssue] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<'check' | 'repair' | null>(null);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        fetch(`/api/lookup/${encodeURIComponent(assetId)}`)
            .then(r => r.json())
            .then(d => { if (d.error) setError(d.error); else setData(d); })
            .catch(() => setError('Không thể tải thông tin tài sản'))
            .finally(() => setLoading(false));
    }, [assetId]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!person.trim()) { setFormError('Vui lòng nhập tên người báo'); return; }
        if (reportTab === 'repair' && !issue.trim()) { setFormError('Vui lòng mô tả lỗi'); return; }
        setFormError('');
        setSubmitting(true);
        try {
            const r = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: reportTab,
                    assetId,
                    person: person.trim(),
                    issue: issue.trim(),
                    note: note.trim(),
                    location: data?.asset?.location || '',
                }),
            });
            const result = await r.json();
            if (result.success) {
                setSubmitted(reportTab);
                setPerson(''); setIssue(''); setNote('');
                setShowForm(false);
            } else {
                setFormError(result.message || 'Có lỗi xảy ra');
            }
        } finally { setSubmitting(false); }
    }

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-lg font-semibold text-slate-800">Không tìm thấy tài sản</p>
            <p className="text-sm text-slate-500 text-center">{error || 'Mã tài sản không tồn tại trong hệ thống'}</p>
            <p className="text-xs text-slate-400 font-mono bg-slate-100 px-3 py-1.5 rounded-lg">{assetId}</p>
        </div>
    );

    const { asset, recentChecks, recentRepairs, pendingChecks, pendingRepairs, lastApprovedCheck, lastApprovedRepair } = data;
    const hasPendingCheck = pendingChecks && pendingChecks.length > 0;
    const hasPendingRepair = pendingRepairs && pendingRepairs.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 leading-none">Tra cứu &amp; báo cáo tài sản</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">Quét QR để xem thông tin, kiểm kê và báo sửa chữa</p>
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

                {/* Asset card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Header strip */}
                    <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider">Thông tin tài sản &amp; kiểm kê</span>
                            <span className="text-[11px] bg-white/20 text-white px-2 py-0.5 rounded-full">
                                {hasPendingCheck ? '⏳ Đang kiểm kê' : '✅ Đã kiểm kê'}
                            </span>
                        </div>
                        <p className="text-[11px] text-indigo-200 font-mono">Mã: {asset.id}</p>
                        <h1 className="text-lg font-bold text-white mt-0.5 leading-snug">{asset.name}</h1>
                    </div>

                    {/* Info grid */}
                    <div className="px-5 py-4 grid grid-cols-2 gap-4">
                        <div className="col-span-2 flex items-start gap-2 border-b border-slate-100 pb-3">
                            <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">👤</span>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Người giữ TS</p>
                                <p className="text-sm font-medium text-slate-800">{asset.person || '—'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Phòng / Kho</p>
                                <p className="text-sm font-medium text-slate-800">{asset.location || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Vị trí cụ thể</p>
                                <p className="text-sm font-medium text-slate-800">{asset.specificLocation || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Năm sử dụng</p>
                                <p className="text-sm font-medium text-slate-800">{asset.year || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-50">
                            <CheckCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Trạng thái TS</p>
                                <div className="mt-0.5"><Chip label={asset.status} /></div>
                            </div>
                        </div>
                    </div>

                    {/* Pending / last check & repair */}
                    <div className="mx-5 mb-4 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 divide-y divide-slate-100">
                        {/* Check Status */}
                        {hasPendingCheck ? (
                            <div className="px-4 py-3 flex items-center gap-2 text-amber-700">
                                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                <p className="text-sm">Đang có phiếu kiểm kê chờ duyệt ({pendingChecks.length} phiếu)</p>
                            </div>
                        ) : (
                            <div className="px-4 py-3">
                                <p className="text-xs text-slate-400 leading-tight">Không có phiếu kiểm kê nào đang chờ duyệt.</p>
                                {lastApprovedCheck && (
                                    <p className="text-xs text-emerald-600 mt-1 font-medium flex items-center gap-1">
                                        ✓ Lần kiểm kê duyệt gần nhất: {lastApprovedCheck.time}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Repair Status */}
                        {hasPendingRepair ? (
                            <div className="px-4 py-3 flex items-center gap-2 text-rose-600 bg-rose-50/50">
                                <Wrench className="w-4 h-4 text-rose-500 shrink-0" />
                                <p className="text-sm">Đang có phiếu báo hỏng/sửa chữa chờ duyệt ({pendingRepairs.length} phiếu)</p>
                            </div>
                        ) : (
                            <div className="px-4 py-3">
                                <p className="text-xs text-slate-400 leading-tight">Không có phiếu sửa chữa nào đang chờ duyệt.</p>
                                {lastApprovedRepair && (
                                    <div className="mt-1 flex items-start gap-1">
                                        <span className="text-xs text-indigo-600 font-medium">✓ Sửa chữa gần nhất:</span>
                                        <div className="flex-1">
                                            <p className="text-xs text-slate-700 font-medium">{lastApprovedRepair.repairStatus || 'Đã duyệt'}</p>
                                            <p className="text-[11px] text-slate-500">{lastApprovedRepair.time} - {lastApprovedRepair.issue}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Success message */}
                {submitted && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-emerald-800">Đã gửi thành công!</p>
                            <p className="text-xs text-emerald-600">
                                {submitted === 'check' ? 'Phiếu kiểm kê đang chờ admin duyệt.' : 'Phiếu sửa chữa đang chờ admin duyệt.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* Report form */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <button
                        onClick={() => setShowForm(f => !f)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                        <div className="flex items-center gap-2">
                            <Send className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-slate-800 text-sm">Báo cáo kiểm kê / sửa chữa</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">{showForm ? 'Thu gọn' : 'Bấm để mở'}</span>
                            {showForm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>
                    </button>

                    {showForm && (
                        <div className="px-5 pb-5 border-t border-slate-100">
                            {/* Tabs */}
                            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mt-4 mb-4">
                                {([['check', '✔ Kiểm kê'], ['repair', '🔧 Báo sửa chữa']] as [ReportTab, string][]).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setReportTab(key)}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                      ${reportTab === key ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="label">Người báo lỗi *</label>
                                    <input
                                        className="input"
                                        placeholder="Nhập tên của bạn (VD: Nguyễn Văn A)"
                                        value={person}
                                        onChange={e => setPerson(e.target.value)}
                                    />
                                </div>

                                {reportTab === 'repair' && (
                                    <div>
                                        <label className="label">Mô tả lỗi / nhu cầu sửa chữa *</label>
                                        <textarea
                                            className="input min-h-[80px] resize-none"
                                            placeholder="Ví dụ: Máy không khởi động được, màn hình bị chớp, cần thay pin..."
                                            value={issue}
                                            onChange={e => setIssue(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="label">Ghi chú bổ sung (nếu có)</label>
                                    <textarea
                                        className="input min-h-[64px] resize-none"
                                        placeholder={reportTab === 'check'
                                            ? 'Tài sản đang trong tình trạng thế nào...'
                                            : 'Thông tin thêm: thời điểm phát hiện, ai đang sử dụng, số điện thoại liên hệ...'}
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                    />
                                </div>

                                {formError && (
                                    <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{formError}</p>
                                )}

                                <button type="submit" disabled={submitting} className="w-full btn-primary py-3 text-sm">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (
                                        reportTab === 'check' ? '✔ Gửi phiếu kiểm kê' : '🔧 Gửi báo cáo sửa chữa'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Check history */}
                {recentChecks.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-emerald-500" /> Lịch sử kiểm kê gần đây
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Tối đa 5 lần kiểm kê mới nhất</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {recentChecks.map((c, i) => (
                                <div key={i} className="px-5 py-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-slate-600">🕐 {c.time}</span>
                                        <Chip label={c.status || 'Đang sử dụng'} />
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium">{c.reporter}</p>
                                    {c.note && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.note}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Repair history */}
                {recentRepairs.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <p className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-amber-500" /> Ticket sửa chữa gần đây
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Hiển thị các báo lỗi &amp; xử lý mới nhất</p>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {recentRepairs.map((r, i) => (
                                <div key={i} className="px-5 py-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-500">🕐 {r.time}</span>
                                        <Chip label={r.approveStatus || 'Chờ duyệt'} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">Lỗi / yêu cầu: <span className="font-normal">{r.issue}</span></p>
                                    <p className="text-xs text-slate-500 mt-0.5">Người báo: {r.person}</p>
                                    {r.repairStatus && <p className="text-xs text-slate-500">Trạng thái sửa chữa: {r.repairStatus}</p>}
                                    {r.handlerNote && <p className="text-xs text-indigo-500 mt-0.5">→ {r.handlerNote}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-[11px] text-slate-400 pb-4">
                    Hệ thống Quản lý Tài Sản · {asset.id}
                </p>
            </div>
        </div>
    );
}
