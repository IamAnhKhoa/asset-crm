'use client';
import { useEffect, useState, useCallback, memo } from 'react';
import { CheckCircle, Wrench, Clock, AlertTriangle, Loader2, ChevronDown, Send, Package, Search, UserCircle, Truck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

interface AssetInfo {
    id: string; name: string; location: string; year: number; status: string; quantity?: number; person?: string; specificLocation?: string; originalPrice?: number;
}
interface CheckReport {
    time: string; reporter: string; status: string; note: string;
}
interface RepairTicket {
    source?: string;
    time: string; person: string; issue: string; approveStatus: string; repairStatus: string; handlerNote?: string; note?: string; updatedTime?: string; result?: string; location?: string;
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
    'Đang sử dụng': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Cần sửa': 'bg-amber-50 text-amber-700 border-amber-100',
    'Đang sửa chữa': 'bg-blue-50 text-blue-700 border-blue-100',
    'Hỏng': 'bg-rose-50 text-rose-700 border-rose-100',
    'Tốt': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Từ chối': 'bg-slate-100 text-slate-600 border-slate-200',
    'Chờ duyệt': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Đã duyệt': 'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Đã giao đơn vị ngoài xử lý': 'bg-purple-50 text-purple-700 border-purple-200',
};

function Chip({ label }: { label: string }) {
    const cls = STATUS_COLORS[label] || 'bg-slate-50 text-slate-600 border-slate-200';
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border uppercase tracking-wider ${cls}`}>{label}</span>;
}

function formatCurrency(v?: number) {
    if (!v || isNaN(v)) return '—';
    return new Intl.NumberFormat('vi-VN').format(v) + ' ₫';
}

function calculateRemainingValue(originalPrice?: number, year?: number | string) {
    if (!originalPrice || !year) return undefined;
    const currentYear = new Date().getFullYear();
    const yearNum = Number(year);
    if (isNaN(yearNum)) return undefined;
    const yearsUsed = Math.max(0, currentYear - yearNum);
    const remainingPercent = Math.max(0, 1 - 0.2 * yearsUsed); // 20% depreciation per year
    return Math.round(originalPrice * remainingPercent);
}

type ReportTab = 'check' | 'repair';

export default function LookupPage({ params }: { params: { id: string } }) {
    const assetId = decodeURIComponent(params.id);
    const [data, setData] = useState<LookupData | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const [reportTab, setReportTab] = useState<ReportTab>('repair');
    const [showForm, setShowForm] = useState(true); // Default to true to encourage reporting
    const [person, setPerson] = useState('');
    const [issue, setIssue] = useState('');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState<'check' | 'repair' | null>(null);
    const [formError, setFormError] = useState('');
    const [selectedCheck, setSelectedCheck] = useState<CheckReport | null>(null);
    const [selectedRepair, setSelectedRepair] = useState<RepairTicket | null>(null);

    useEffect(() => {
        fetch(`/api/lookup/${encodeURIComponent(assetId)}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else {
                    setData(d);
                    if (d.asset && d.asset.person) {
                        setPerson(d.asset.person);
                    }
                }
            })
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
                // Refresh data to show pending status
                fetch(`/api/lookup/${encodeURIComponent(assetId)}`)
                    .then(r => r.json())
                    .then(setData);
            } else {
                setFormError(result.message || result.error || 'Có lỗi xảy ra');
            }
        } finally { setSubmitting(false); }
    }

    if (loading) return (
        /* min-h-screen + reserved card height prevents CLS when content loads */
        <div className="min-h-screen bg-[#F8FAFC] p-4 pb-20 space-y-4">
            {/* Sticky header placeholder — same height as real header */}
            <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200/60 -mx-4 px-4 py-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 shrink-0" style={{ contain: 'strict' }}></div>
                    <div className="space-y-2 flex-1">
                        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/4 mt-1"></div>
                    </div>
                </div>
            </div>
            {/* Main card — fixed height so page doesn't jump */}
            <div className="bg-white rounded-[2rem] border border-slate-200/60 p-6 space-y-6" style={{ minHeight: 380 }}>
                <div className="flex justify-between items-center">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-6 bg-slate-200 rounded-lg w-1/5"></div>
                </div>
                <div className="space-y-3">
                    <div className="h-3 bg-slate-200 rounded w-16"></div>
                    <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="space-y-2">
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center rotate-3">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center">
                <p className="text-lg font-bold text-slate-800">Không tìm thấy tài sản</p>
                <p className="text-sm text-slate-500 mt-1">{error || 'Mã tài sản không tồn tại trong hệ thống'}</p>
            </div>
            <p className="text-xs text-slate-400 font-mono bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">{assetId}</p>
            <Link href="/" className="mt-4 btn-primary px-8">Quay lại tìm kiếm</Link>
        </div>
    );

    const { asset, recentChecks, recentRepairs, pendingChecks, pendingRepairs, lastApprovedCheck, lastApprovedRepair } = data;
    const hasPendingCheck = pendingChecks && pendingChecks.length > 0;
    const hasPendingRepair = pendingRepairs && pendingRepairs.length > 0;

    let externalDays = 0;
    if (asset.status === 'Đã giao đơn vị ngoài xử lý' && recentRepairs && recentRepairs.length > 0) {
        const latestRepair = recentRepairs[0];
        const dateStr = latestRepair.updatedTime || latestRepair.time;
        if (dateStr) {
            const parts = dateStr.split(/[\s/:]+/);
            if (parts.length >= 3) {
                const [day, month, year] = parts;
                const d = new Date(Number(year), Number(month) - 1, Number(day));
                if (!isNaN(d.getTime())) {
                    // Caculate diff from 0:00 of the day it was updated to now. If today, it's 0 days.
                    // If we want "1 ngày" on the first day, add +1, or keep it strict. 
                    // Let's use strict day difference
                    externalDays = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
                }
            }
        }
    }

    let dotColor = 'bg-blue-500';
    let textColor = 'text-indigo-600';
    let statusText = 'Trạng thái ổn định';

    if (hasPendingRepair) {
        dotColor = 'bg-rose-500';
        textColor = 'text-rose-600';
        statusText = 'Đang báo hỏng';
    } else if (asset.status === 'Mất / Thất lạc') {
        dotColor = 'bg-rose-500';
        textColor = 'text-rose-600';
        statusText = 'Đã thất lạc';
    } else if (asset.status === 'Thanh lý') {
        dotColor = 'bg-slate-500';
        textColor = 'text-slate-600';
        statusText = 'Đã thanh lý';
    } else if (asset.status === 'Hỏng') {
        dotColor = 'bg-rose-500';
        textColor = 'text-rose-600';
        statusText = 'Đã hỏng';
    } else if (asset.status === 'Cần sửa') {
        dotColor = 'bg-amber-500';
        textColor = 'text-amber-600';
        statusText = 'Cần sửa chữa';
    } else if (asset.status === 'Đang sửa chữa') {
        dotColor = 'bg-blue-500';
        textColor = 'text-blue-600';
        statusText = 'Đang sửa chữa';
    } else if (asset.status === 'Đã giao đơn vị ngoài xử lý') {
        dotColor = 'bg-purple-500';
        textColor = 'text-purple-600';
        statusText = 'Đang xử lý ngoài';
    }

    // DetailModal is defined outside (below) to prevent re-creation on each render

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* Sticky header with hardware-accelerated transform for smooth scroll */}
            <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-slate-200/60 px-4 py-3 sm:py-4" style={{ transform: 'translateZ(0)', contain: 'layout' }}>
                <div className="max-w-xl mx-auto flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                        <Search className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-black text-slate-800 leading-none truncate">{asset.name || 'Tra cứu tài sản'}</h2>
                        <p className="text-[11px] text-indigo-600 mt-1 uppercase tracking-widest font-black truncate">ID: {asset.id}</p>
                    </div>
                </div>
            </div>

            {/* Status Banner - High Visibility */}
            {(hasPendingRepair || asset.status === 'Đang sửa chữa' || asset.status === 'Cần sửa' || asset.status === 'Đã giao đơn vị ngoài xử lý' || asset.status === 'Hỏng' || asset.status === 'Mất / Thất lạc' || asset.status === 'Thanh lý') && (
                <div className={`px-4 py-4 text-white animate-in slide-in-from-top duration-500 ${asset.status === 'Đã giao đơn vị ngoài xử lý' ? 'bg-purple-600' : (asset.status === 'Hỏng' || asset.status === 'Mất / Thất lạc' || asset.status === 'Thanh lý' || hasPendingRepair) ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                    <div className="max-w-lg mx-auto flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                            {asset.status === 'Đã giao đơn vị ngoài xử lý' ? <Truck className="w-6 h-6" /> : asset.status === 'Đang sửa chữa' ? <Loader2 className="w-6 h-6 animate-spin" /> : (asset.status === 'Hỏng' || asset.status === 'Mất / Thất lạc' || asset.status === 'Thanh lý') ? <AlertTriangle className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-0.5">Trạng thái hiện tại</p>
                            <h3 className="text-lg font-black leading-tight tracking-tight">
                                {asset.status === 'Đã giao đơn vị ngoài xử lý' ? 'ĐANG GIAO ĐƠN VỊ NGOÀI XỬ LÝ' :
                                    asset.status === 'Đang sửa chữa' ? 'ĐANG TIẾN HÀNH SỬA CHỮA' :
                                        asset.status === 'Cần sửa' ? 'TÀI SẢN ĐANG ĐỢI SỬA CHỮA' :
                                            asset.status === 'Hỏng' ? 'TÀI SẢN BỊ HỎNG' :
                                                asset.status === 'Mất / Thất lạc' ? 'TÀI SẢN ĐÃ THẤT LẠC' :
                                                    asset.status === 'Thanh lý' ? 'TÀI SẢN ĐÃ THANH LÝ' :
                                                        'ĐÃ GỬI PHIẾU BÁO HỎNG'}
                            </h3>
                            <p className="text-xs font-medium opacity-80 mt-1">
                                {asset.status === 'Đã giao đơn vị ngoài xử lý'
                                    ? (externalDays > 0 ? `Đã bàn giao đi ${externalDays} ngày. Vui lòng chờ đối tác xử lý.` : 'Đang bàn giao cho đối tác ngoài xử lý. Cập nhật mới nhất sẽ hiện ở dưới.')
                                    : (asset.status === 'Hỏng' || asset.status === 'Mất / Thất lạc' || asset.status === 'Thanh lý')
                                        ? 'Tài sản không còn khả năng sử dụng hoặc đã không còn ở vị trí lưu giữ.'
                                        : 'Vui lòng chờ kỹ thuật viên xử lý. Cập nhật mới nhất sẽ hiện ở dưới.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Visual Identity Card */}
                <div className="relative mt-8 mb-4">
                    {/* Outer gentle highlight glow */}
                    <div className="absolute -inset-[4px] rounded-[2.2rem] bg-gradient-to-br from-blue-200 via-indigo-200 to-blue-300 opacity-40 blur-[8px] animate-[pulse_4s_ease-in-out_infinite]" style={{ zIndex: 0 }} />
                    {/* Inner subtle ring */}
                    <div className="absolute -inset-[1.5px] rounded-[2.1rem] bg-gradient-to-br from-blue-300 to-indigo-300 opacity-50" style={{ zIndex: 1 }} />

                    <div className="absolute inset-0 bg-blue-600 rounded-[2.5rem] blur-2xl opacity-[0.05] -z-10"></div>
                    <div className="relative z-10 bg-white rounded-[2rem] border border-white shadow-xl shadow-blue-900/5 overflow-hidden">
                        {/* Status bar */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-[ping_3s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}></span>
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${textColor}`}>
                                    {statusText}
                                </span>
                            </div>
                            <Chip label={asset.status} />
                        </div>

                        <div className="px-6 py-4 flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-mono text-indigo-400/80 tracking-tighter mb-1">ID: {asset.id}</p>
                                <h1 className="text-2xl font-black text-indigo-950 leading-tight tracking-tight break-words pr-2">
                                    {asset.name}
                                </h1>
                            </div>
                            {/* Fixed 64×64 wrapper prevents CLS from QR code rendering */}
                            <div className="shrink-0 bg-slate-50 p-2 rounded-2xl border border-slate-100" style={{ width: 68, height: 68 }}>
                                <QRCodeSVG
                                    value={`https://qlts-tah.vercel.app/lookup/${encodeURIComponent(asset.id)}`}
                                    size={60}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                        </div>

                        {/* Visual Divider */}
                        <div className="mx-6 h-px bg-blue-50/80"></div>

                        {/* Detailed Specs */}
                        <div className="px-6 py-6 grid grid-cols-2 gap-y-6 gap-x-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                    <UserCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Người quản lý</span>
                                </div>
                                <p className="text-sm font-semibold text-indigo-900">{asset.person || 'Chưa bàn giao'}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Năm sử dụng</span>
                                </div>
                                <p className="text-sm font-semibold text-indigo-900">{asset.year || '—'}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                    <Package className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Số lượng</span>
                                </div>
                                <p className="text-sm font-bold text-indigo-900">{asset.quantity || 1}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-400/80">
                                    <Send className="w-3.5 h-3.5 scale-75" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Đơn giá</span>
                                </div>
                                <p className="text-sm font-semibold text-indigo-900">{formatCurrency(asset.originalPrice)}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-indigo-400">
                                    <Package className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Tổng nguyên giá</span>
                                </div>
                                <p className="text-sm font-bold text-indigo-700">
                                    {formatCurrency((asset.originalPrice || 0) * (asset.quantity || 1))}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-blue-500">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Tổng GT còn lại</span>
                                </div>
                                <p className="text-sm font-black text-blue-700">
                                    {(() => {
                                        const unitRem = calculateRemainingValue(asset.originalPrice, asset.year);
                                        return unitRem ? formatCurrency(unitRem * (asset.quantity || 1)) : '—';
                                    })()}
                                </p>
                            </div>
                            <div className="col-span-2 mt-2 -mx-2 relative">
                                {/* Outer glow */}
                                <div className="absolute -inset-[3px] rounded-2xl bg-gradient-to-r from-blue-300 via-indigo-300 to-blue-300 opacity-50 blur-[5px] animate-[pulse_3s_ease-in-out_infinite]" style={{ zIndex: 0 }} />

                                <div className="relative z-10 rounded-2xl p-4 flex items-center gap-3.5"
                                    style={{ background: 'linear-gradient(135deg, #f5f7ff 0%, #ecf0ff 100%)', border: '1px solid #dce4ff' }}>
                                    <div className="relative shrink-0">
                                        <div className="absolute inset-0 bg-indigo-400 rounded-xl animate-[ping_3s_ease-in-out_infinite] opacity-20"></div>
                                        <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shadow-md border border-indigo-100"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                                            <MapPin className="w-5 h-5 text-white" />
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-indigo-500">Vị trí lưu giữ</p>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                            </span>
                                        </div>
                                        <p className="text-[17px] font-black text-indigo-950 leading-tight">{asset.location}</p>
                                        {asset.specificLocation && (
                                            <p className="text-[11px] text-indigo-600 font-bold mt-1">{asset.specificLocation}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compact History Summary Line */}
                        <div className="bg-blue-50/30 border-t border-blue-50 px-6 py-4 flex items-center justify-between gap-4">
                            <button
                                onClick={() => lastApprovedCheck && setSelectedCheck(lastApprovedCheck)}
                                className="flex-1 flex flex-col text-left active:scale-95 transition-transform"
                            >
                                <span className="text-[9px] font-bold text-blue-400/80 uppercase">Lần cuối kiểm kê</span>
                                <span className="text-[11px] font-semibold text-indigo-800">{lastApprovedCheck?.time || 'Chưa kiểm kê'}</span>
                            </button>
                            <div className="w-px h-6 bg-blue-100"></div>
                            <button
                                onClick={() => lastApprovedRepair && setSelectedRepair(lastApprovedRepair)}
                                className="flex-1 flex flex-col text-right active:scale-95 transition-transform"
                            >
                                <span className="text-[9px] font-bold text-blue-400/80 uppercase">Sửa chữa gần nhất</span>
                                <span className="text-[11px] font-semibold text-indigo-600">{lastApprovedRepair?.time || 'Chưa có'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Action Alerts */}
                {(hasPendingCheck || hasPendingRepair) && (
                    <div className="space-y-3">
                        {hasPendingCheck && (
                            <div className="px-5 py-4 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-amber-900">Kiểm kê đang chờ duyệt</p>
                                    <p className="text-xs text-amber-600 mt-0.5">Chúng tôi đã nhận được phiếu của bạn và đang xử lý.</p>
                                </div>
                            </div>
                        )}
                        {hasPendingRepair && (
                            <div className="px-5 py-4 bg-rose-50 border border-rose-100 rounded-[1.5rem] flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                                    <Wrench className="w-5 h-5 text-rose-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-rose-900">Số phiếu báo hỏng: {pendingRepairs.length}</p>
                                    <p className="text-xs text-rose-600 mt-0.5">Tài sản đang được theo dõi xử lý sửa chữa.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Reporting Section - Collapsible Form */}
                {/* ── Highlight frame: glowing border + pulsing ring ── */}
                <div className="relative">
                    {/* Outer glow */}
                    <div className="absolute -inset-[3px] rounded-[2.2rem] bg-gradient-to-br from-rose-300 via-orange-300 to-rose-400 opacity-40 blur-[8px] animate-[pulse_4s_ease-in-out_infinite]" style={{ zIndex: 0 }} />
                    {/* Inner solid ring */}
                    <div className="absolute -inset-[1.5px] rounded-[2.1rem] bg-gradient-to-br from-rose-400 to-orange-300" style={{ zIndex: 1 }} />

                    {/* CTA Banner */}
                    <div className="relative z-10 bg-gradient-to-r from-rose-500 to-orange-400 rounded-t-[2rem] px-5 py-3.5 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-white text-[11px] font-black uppercase tracking-widest leading-none">Có sự cố? Báo ngay!</p>
                            <p className="text-white/80 text-[10px] font-medium mt-0.5">Gửi phiếu yêu cầu sửa chữa nhanh tại đây</p>
                        </div>
                        <div className="relative flex h-2 w-2">
                            <span className="animate-[ping_2s_ease-in-out_infinite] absolute inline-flex h-full w-full rounded-full bg-white opacity-50"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </div>
                    </div>

                    <div className="relative z-10 bg-white rounded-b-[2rem] overflow-hidden" style={{ contain: 'layout' }}>
                        <button
                            onClick={() => {
                                setShowForm(f => {
                                    const next = !f;
                                    if (next) {
                                        // Deferred scroll to avoid INP blocking
                                        requestAnimationFrame(() =>
                                            setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80)
                                        );
                                    }
                                    return next;
                                });
                            }}
                            className="w-full px-6 py-5 flex items-center justify-between group active:scale-[0.98] transition-transform"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Send className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-slate-800">Báo cáo & Phản hồi</h3>
                                    <p className="text-xs text-slate-400">Kiểm kê hoặc báo hỏng tài sản này</p>
                                </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full border border-slate-100 flex items-center justify-center transition-all duration-300 ${showForm ? 'rotate-180 bg-slate-50' : ''}`}>
                                <ChevronDown className={`w-4 h-4 transition-colors ${showForm ? 'text-indigo-600' : 'text-slate-400'}`} />
                            </div>
                        </button>

                        {showForm && (
                            <div className="px-6 pb-6 pt-2 border-t border-slate-50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex p-1 bg-slate-100 rounded-2xl mb-6">
                                    <button
                                        onClick={() => setReportTab('check')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${reportTab === 'check' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                                    >
                                        <CheckCircle className="w-3.5 h-3.5" /> Kiểm kê
                                    </button>
                                    <button
                                        onClick={() => setReportTab('repair')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-xl transition-all ${reportTab === 'repair' ? 'bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-200' : 'text-slate-500'}`}
                                    >
                                        <Wrench className="w-3.5 h-3.5" /> Báo sửa chữa
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tên người báo cáo *</label>
                                        <input
                                            className="w-full h-12 bg-slate-50 border-slate-100 rounded-2xl px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                            placeholder="Tên của bạn..."
                                            value={person}
                                            onChange={e => setPerson(e.target.value)}
                                            required
                                        />
                                    </div>

                                    {reportTab === 'repair' && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Nội dung lỗi / Sự cố *</label>
                                            <textarea
                                                className="w-full min-h-[100px] bg-slate-50 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                                placeholder="Mô tả chi tiết tình trạng máy..."
                                                value={issue}
                                                onChange={e => setIssue(e.target.value)}
                                                required
                                            />
                                            <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-slate-100">
                                                {(() => {
                                                    const assetName = (asset.name || '').toLowerCase();
                                                    const isPrinter = assetName.includes('máy in');
                                                    const isComputer = assetName.includes('máy tính') || assetName.includes('pc') || assetName.includes('laptop');

                                                    const suggestions = isPrinter
                                                        ? ['Không in được', 'Kẹt giấy', 'Bản in mờ/đốm đen', 'Hết mực', 'Không kết nối máy tính', 'Kêu to khi in']
                                                        : isComputer
                                                            ? ['Không lên nguồn', 'Màn hình xanh/đen', 'Đơ/Lag', 'Không vào được mạng', 'Lỗi phần mềm', 'Phím/Chuột hỏng']
                                                            : ['Không hoạt động', 'Hư hỏng vật lý', 'Rơi vỡ / Vo nước', 'Mất linh kiện'];

                                                    return suggestions.map(s => (
                                                        <button key={s} type="button" onClick={() => setIssue(prev => prev ? `${prev}, ${s}` : s)}
                                                            className="px-3 py-2 text-[11px] font-bold bg-white text-slate-600 rounded-xl shadow-sm hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-200/60 active:scale-95"
                                                        >+ {s}</button>
                                                    ));
                                                })()}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Ghi chú thêm</label>
                                        <textarea
                                            className="w-full min-h-[60px] bg-slate-50 border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                            placeholder="Thông tin bổ sung..."
                                            value={note}
                                            onChange={e => setNote(e.target.value)}
                                        />
                                    </div>

                                    {formError && (
                                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600">
                                            <AlertTriangle className="w-4 h-4" />
                                            <p className="text-xs font-bold">{formError}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className={`w-full h-14 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-50
                                        ${reportTab === 'check' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                                            reportTab === 'check' ? 'XÁC NHẬN KIỂM KÊ' : 'GỬI YÊU CẦU SỬA CHỮA'
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div> {/* end highlight frame */}

                {/* Repair Ticket Section - Premium UI */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-4 bg-amber-400 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Lịch sử Ticket xử lý</h3>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">{recentRepairs.length} bản ghi</span>
                    </div>

                    <div className="space-y-4">
                        {recentRepairs.length === 0 ? (
                            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center space-y-3 shadow-sm">
                                <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mx-auto">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 italic">Chưa có lịch sử sửa chữa nào được ghi nhận</p>
                            </div>
                        ) : (
                            recentRepairs.map((r, i) => (
                                <div key={i} className="group relative">
                                    {/* Vertical Timeline Link */}
                                    {i !== recentRepairs.length - 1 && (
                                        <div className="absolute left-[24px] top-12 bottom-[-16px] w-px bg-slate-100 z-0"></div>
                                    )}

                                    <div
                                        onClick={() => setSelectedRepair(r)}
                                        className={`relative z-10 bg-white rounded-[1.75rem] border shadow-sm group-hover:shadow-md transition-all p-5 cursor-pointer active:scale-[0.98] 
                                            ${r.source === 'pending' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200/60 group-hover:border-indigo-100'}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border shrink-0 
                                                    ${r.source === 'pending' ? 'bg-amber-100/50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                                    <span className="text-[10px] font-black text-slate-400 leading-none mb-1">{r.time.split('/')[0]}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase leading-none">TH {r.time.split('/')[1]}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[10px] font-bold font-mono text-slate-400">{r.time}</span>
                                                        {r.source === 'pending' && <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full animate-pulse">PHIẾU MỚI</span>}
                                                    </div>
                                                    <Chip label={r.approveStatus === 'Chờ duyệt' ? (r.repairStatus || 'Chờ duyệt') : r.approveStatus} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 bg-white/50 p-4 rounded-2xl border border-slate-100/50">
                                            <div className="flex gap-3">
                                                <span className="text-[9px] font-black text-slate-400 uppercase w-16 shrink-0 pt-1">Sự cố</span>
                                                <p className="text-sm font-bold text-slate-700 leading-snug">{r.issue}</p>
                                            </div>

                                            {/* Progress Steps for Active Tickets */}
                                            {r.approveStatus !== 'Từ chối' && (
                                                <div className="pt-2 flex items-center gap-1.5">
                                                    <div className={`h-1 flex-1 rounded-full ${r.source === 'pending' ? 'bg-amber-400' : 'bg-emerald-500'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${r.approveStatus === 'Đã duyệt' ? (r.source === 'pending' ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-slate-100'}`}></div>
                                                    <div className={`h-1 flex-1 rounded-full ${r.repairStatus === 'Đã sửa xong' ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                                                </div>
                                            )}

                                            <div className="flex gap-3">
                                                <span className="text-[9px] font-black text-slate-400 uppercase w-16 shrink-0">Người báo</span>
                                                <p className="text-xs font-medium text-slate-600">{r.person}</p>
                                            </div>

                                            {r.repairStatus && (
                                                <div className="pt-2 mt-1 border-t border-slate-200/60 flex gap-3">
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase w-16 shrink-0">Kết quả</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-indigo-600">{r.repairStatus}</p>
                                                        {r.handlerNote && (
                                                            <p className="text-[11px] text-slate-500 mt-1 italic leading-relaxed">→ {r.handlerNote}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* History Section for Checks */}
                {recentChecks.length > 0 && (
                    <div className="space-y-4 pt-6">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-4 bg-emerald-400 rounded-full"></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Nhật ký kiểm kê tài sản</h3>
                        </div>
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="divide-y divide-slate-50">
                                {recentChecks.slice(0, 3).map((c, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedCheck(c)}
                                        className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer active:bg-slate-100"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-xs font-black text-slate-800 tracking-tight">{c.reporter}</p>
                                                <span className="text-[10px] font-bold font-mono text-slate-400">{c.time.split(' ')[0]}</span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-1.5">
                                                <p className="text-[11px] text-slate-500 truncate italic">{c.note || 'Không có ghi chú'}</p>
                                                <Chip label={c.status} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Links */}
                <div className="pt-4 pb-8 flex flex-col gap-3">
                    <Link href="/" className="h-14 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm">
                        <Search className="w-4 h-4" /> Tra cứu tài sản khác
                    </Link>
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        Trạm Y tế Tân An Hội · {asset.id}
                    </p>
                </div>
            </div>

            {/* Popups — DetailModal is a stable component defined outside render fn */}
            <DetailModal
                title="Chi tiết kiểm kê"
                show={!!selectedCheck}
                onClose={() => setSelectedCheck(null)}
            >
                {selectedCheck && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1">Thời gian</p>
                                <p className="text-base font-black text-emerald-700">{selectedCheck.time}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Người kiểm</p>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-slate-800">{selectedCheck.reporter}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Trạng thái</p>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-slate-800">{selectedCheck.status}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Ghi chú</p>
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[80px]">
                                <p className="text-sm text-slate-600 leading-relaxed italic">{selectedCheck.note || 'Không có ghi chú'}</p>
                            </div>
                        </div>
                    </div>
                )}
            </DetailModal>

            <DetailModal
                title="Chi tiết sửa chữa"
                show={!!selectedRepair}
                onClose={() => setSelectedRepair(null)}
            >
                {selectedRepair && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100/50">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                <Wrench className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest leading-none mb-1">Thời gian báo</p>
                                <p className="text-base font-black text-indigo-700">{selectedRepair.time}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Tình trạng lỗi</p>
                            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100/50">
                                <p className="text-sm font-bold text-rose-700 leading-snug">{selectedRepair.issue}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Người báo</p>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-slate-800">{selectedRepair.person}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Vị trí khi báo</p>
                                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <p className="text-sm font-bold text-slate-800 truncate">{selectedRepair.location || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {selectedRepair.note && (
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-1">Ghi chú người báo</p>
                                <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl italic">{selectedRepair.note}</p>
                            </div>
                        )}

                        {(selectedRepair.repairStatus || selectedRepair.handlerNote) && (
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                                    <h4 className="text-[10px] font-black text-slate-900 uppercase">Thông tin xử lý</h4>
                                </div>
                                <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-emerald-600/60 uppercase">Trạng thái</span>
                                        <Chip label={selectedRepair.repairStatus || selectedRepair.approveStatus} />
                                    </div>
                                    {selectedRepair.handlerNote && (
                                        <div className="pt-2 border-t border-emerald-100/30">
                                            <span className="text-[10px] font-bold text-emerald-600/60 uppercase block mb-1">Ghi chú kỹ thuật</span>
                                            <p className="text-sm text-slate-700 font-medium italic">{selectedRepair.handlerNote}</p>
                                        </div>
                                    )}
                                    {selectedRepair.updatedTime && (
                                        <p className="text-[9px] text-slate-400 text-right mt-2">Cập nhật lúc: {selectedRepair.updatedTime}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DetailModal>
        </div>
    );
}

/* ============================================================
   DetailModal — defined OUTSIDE LookupPage to be a stable
   reference. This prevents React from re-creating the component
   on every LookupPage render, which was causing INP delays.
   ============================================================ */
const DetailModal = memo(function DetailModal(
    { title, show, onClose, children }:
        { title: string; show: boolean; onClose: () => void; children: React.ReactNode }
) {
    if (!show) return null;
    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
            // Hardware-accelerated layer to avoid layout recalc on open
            style={{ willChange: 'opacity' }}
        >
            {/* Solid overlay instead of backdrop-blur (no GPU compositing cost on mobile) */}
            <div
                className="absolute inset-0"
                style={{ background: 'rgba(15,23,42,0.65)' }}
                onClick={onClose}
            />
            <div
                className="relative w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                style={{ transform: 'translateZ(0)' }}
            >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:bg-slate-100"
                        style={{ touchAction: 'manipulation' }}
                    >
                        <ChevronDown className="w-5 h-5 rotate-180" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                    {children}
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full h-12 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-2xl shadow-sm active:scale-[0.98] transition-transform"
                        style={{ touchAction: 'manipulation' }}
                    >Đóng</button>
                </div>
            </div>
        </div>
    );
});
