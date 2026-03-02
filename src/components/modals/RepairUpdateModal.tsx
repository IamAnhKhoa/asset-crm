'use client';
import { RepairTicket } from '@/types';
import { useState, useEffect } from 'react';
import { X, Save, Loader2, Receipt, Plus, Minus, ChevronDown } from 'lucide-react';

interface Props {
    ticket: RepairTicket;
    mode: 'update' | 'approve';
    onClose: () => void;
    onSaved: () => void;
}

interface ServiceItem {
    row: number;
    loai: string;
    noiDung: string;
    donViTinh: string;
    donGia: number;
}

interface SelectedService extends ServiceItem {
    soLuong: number;
}

const REPAIR_STATUS_OPTIONS = [
    'Chưa xử lý', 'Đang xử lý', 'Đã giao đơn vị ngoài xử lý', 'Đã sửa xong',
];
const RESULT_OPTIONS = ['Chưa hoàn thành', 'Đã hoàn thành', 'Không sửa được', 'Chờ linh kiện'];

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

export function RepairUpdateModal({ ticket, mode, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        repairStatus: ticket.repairStatus || 'Chưa xử lý',
        result: ticket.result || 'Chưa hoàn thành',
        handlerNote: ticket.handlerNote || '',
    });
    const [saving, setSaving] = useState(false);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
    const [showPricePicker, setShowPricePicker] = useState(false);
    const [filterLoai, setFilterLoai] = useState('');

    const isDone = form.repairStatus === 'Đã sửa xong';

    // Load service prices when modal opens
    useEffect(() => {
        fetch('/api/gia-sua-chua')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setServices(d); })
            .catch(() => { });
    }, []);

    function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

    function addService(svc: ServiceItem) {
        setSelectedServices(prev => {
            const existing = prev.find(s => s.row === svc.row);
            if (existing) {
                return prev.map(s => s.row === svc.row ? { ...s, soLuong: s.soLuong + 1 } : s);
            }
            return [...prev, { ...svc, soLuong: 1 }];
        });
    }

    function changeQty(row: number, delta: number) {
        setSelectedServices(prev =>
            prev.map(s => s.row === row ? { ...s, soLuong: Math.max(1, s.soLuong + delta) } : s)
        );
    }

    function removeService(row: number) {
        setSelectedServices(prev => prev.filter(s => s.row !== row));
    }

    const totalCost = selectedServices.reduce((sum, s) => sum + s.donGia * s.soLuong, 0);

    const loaiOptions = [...new Set(services.map(s => s.loai))];
    const filteredServices = filterLoai ? services.filter(s => s.loai === filterLoai) : services;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ticket.row) return;
        setSaving(true);
        try {
            // Build chi phi text to append to handlerNote
            let chiPhiText = form.handlerNote;
            if (isDone && selectedServices.length > 0) {
                const lines = selectedServices.map(
                    s => `  • ${s.noiDung} (${s.donViTinh}) x${s.soLuong} = ${formatVND(s.donGia * s.soLuong)}`
                );
                chiPhiText = (chiPhiText ? chiPhiText + '\n' : '') +
                    `CHI PHÍ SỬA CHỮA:\n${lines.join('\n')}\n  → TỔNG: ${formatVND(totalCost)}`;
            }
            const payload = { ...form, handlerNote: chiPhiText };

            if (mode === 'update') {
                await fetch('/api/history/repairs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row: ticket.row, ...payload }),
                });
            } else if (mode === 'approve') {
                await fetch('/api/repairs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve', row: ticket.row, ...payload }),
                });
            }
            onSaved();
        } finally { setSaving(false); }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel" style={{ maxWidth: isDone && showPricePicker ? '780px' : '480px', width: '95vw' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            {mode === 'approve' ? 'Duyệt phiếu sửa chữa' : 'Cập nhật trạng thái sửa chữa'}
                        </h2>
                        <p className="text-xs text-slate-400">{ticket.assetId} – {ticket.issue}</p>
                    </div>
                    <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                </div>

                <div className={`flex ${isDone && showPricePicker ? 'flex-row divide-x divide-slate-100' : 'flex-col'}`}>

                    {/* Left: form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
                        <div>
                            <label className="label">Trạng thái sửa chữa</label>
                            <div className="relative">
                                <select className="select" value={form.repairStatus} onChange={e => set('repairStatus', e.target.value)}>
                                    {REPAIR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="label">Kết quả</label>
                            <select className="select" value={form.result} onChange={e => set('result', e.target.value)}>
                                {RESULT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Ghi chú xử lý</label>
                            <textarea
                                className="input min-h-[80px] resize-none"
                                value={form.handlerNote}
                                onChange={e => set('handlerNote', e.target.value)}
                                placeholder="Mô tả công việc đã thực hiện..."
                            />
                        </div>

                        {/* Chi phí toggle button */}
                        {isDone && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPricePicker(!showPricePicker)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors
                                        ${showPricePicker
                                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                            : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Receipt className="w-4 h-4" />
                                        Thêm chi phí từ bảng giá dịch vụ
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showPricePicker ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Selected items summary */}
                                {selectedServices.length > 0 && (
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5">
                                        {selectedServices.map(s => (
                                            <div key={s.row} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <button type="button" onClick={() => removeService(s.row)}
                                                        className="text-rose-400 hover:text-rose-600 flex-shrink-0">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                    <span className="text-slate-700 truncate">{s.noiDung}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <button type="button" onClick={() => changeQty(s.row, -1)}
                                                        className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-100">
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-5 text-center font-medium text-xs">{s.soLuong}</span>
                                                    <button type="button" onClick={() => changeQty(s.row, 1)}
                                                        className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-indigo-100">
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                    <span className="text-indigo-700 font-semibold w-28 text-right text-xs">
                                                        {formatVND(s.donGia * s.soLuong)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex justify-between pt-1.5 border-t border-indigo-200 font-semibold text-indigo-800 text-sm">
                                            <span>Tổng chi phí</span>
                                            <span>{formatVND(totalCost)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
                            <button type="submit" disabled={saving} className="btn-primary">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {mode === 'approve' ? 'Duyệt & Lưu' : 'Lưu'}
                            </button>
                        </div>
                    </form>

                    {/* Right: Price picker panel */}
                    {isDone && showPricePicker && (
                        <div className="w-80 flex-shrink-0 p-4 flex flex-col gap-3 bg-slate-50">
                            <div>
                                <p className="text-xs font-semibold text-slate-700 mb-2">Chọn dịch vụ / vật tư</p>
                                <div className="relative">
                                    <select
                                        value={filterLoai}
                                        onChange={e => setFilterLoai(e.target.value)}
                                        className="select text-xs py-1.5"
                                    >
                                        <option value="">Tất cả loại</option>
                                        {loaiOptions.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-[400px] space-y-1 pr-1">
                                {filteredServices.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-8">Chưa có dữ liệu</p>
                                ) : filteredServices.map(svc => {
                                    const isSelected = selectedServices.some(s => s.row === svc.row);
                                    return (
                                        <button
                                            key={svc.row}
                                            type="button"
                                            onClick={() => addService(svc)}
                                            className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors border
                                                ${isSelected
                                                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                                    : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-700'}`}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="font-medium truncate">{svc.noiDung}</span>
                                                {isSelected && <Plus className="w-3 h-3 text-indigo-500 flex-shrink-0" />}
                                            </div>
                                            <div className="flex justify-between mt-0.5">
                                                <span className="text-slate-400">{svc.donViTinh} · {svc.loai.split(' ').pop()}</span>
                                                <span className="font-semibold text-indigo-600">{formatVND(svc.donGia)}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
