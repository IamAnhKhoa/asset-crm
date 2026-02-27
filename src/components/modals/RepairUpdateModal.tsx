'use client';
import { RepairTicket } from '@/types';
import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface Props {
    ticket: RepairTicket;
    mode: 'update' | 'approve';
    onClose: () => void;
    onSaved: () => void;
}

const REPAIR_STATUS_OPTIONS = [
    'Chưa xử lý', 'Đang xử lý', 'Đã giao đơn vị ngoài xử lý', 'Đã sửa xong',
];
const RESULT_OPTIONS = ['Chưa hoàn thành', 'Đã hoàn thành', 'Không sửa được', 'Chờ linh kiện'];

export function RepairUpdateModal({ ticket, mode, onClose, onSaved }: Props) {
    const [form, setForm] = useState({
        repairStatus: ticket.repairStatus || 'Chưa xử lý',
        result: ticket.result || 'Chưa hoàn thành',
        handlerNote: ticket.handlerNote || '',
    });
    const [saving, setSaving] = useState(false);

    function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ticket.row) return;
        setSaving(true);
        try {
            if (mode === 'update') {
                await fetch('/api/history/repairs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ row: ticket.row, ...form }),
                });
            } else if (mode === 'approve') {
                await fetch('/api/repairs', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve', row: ticket.row, ...form }),
                });
            }
            onSaved();
        } finally { setSaving(false); }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            {mode === 'approve' ? 'Duyệt phiếu sửa chữa' : 'Cập nhật trạng thái sửa chữa'}
                        </h2>
                        <p className="text-xs text-slate-400">{ticket.assetId} – {ticket.issue}</p>
                    </div>
                    <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Trạng thái sửa chữa</label>
                        <select className="select" value={form.repairStatus} onChange={e => set('repairStatus', e.target.value)}>
                            {REPAIR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
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

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {mode === 'approve' ? 'Duyệt & Lưu' : 'Lưu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
