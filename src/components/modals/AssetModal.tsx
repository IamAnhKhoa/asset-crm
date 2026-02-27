'use client';
import { Asset } from '@/types';
import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
    'Đang sử dụng', 'Cần sửa', 'Đang sửa chữa', 'Hỏng', 'Mất / Thất lạc', 'Thanh lý',
];

interface Props {
    asset: Asset | null;
    isEdit: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export function AssetModal({ asset, isEdit, onClose, onSaved }: Props) {
    const isCustomDeptsInitially = asset?.location && ![''].includes(asset.location);
    const isCustomPersonInitially = asset?.person && ![''].includes(asset.person);

    const [form, setForm] = useState({
        id: asset?.id || '',
        location: asset?.location || '',
        name: asset?.name || '',
        year: String(asset?.year || new Date().getFullYear()),
        status: asset?.status || 'Đang sử dụng',
        person: asset?.person || '',
        specificLocation: asset?.specificLocation || '',
        originalPrice: asset?.originalPrice ? String(asset?.originalPrice) : '',
    });

    const [customLocation, setCustomLocation] = useState('');
    const [customPerson, setCustomPerson] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // NhanVien Data
    const [departments, setDepartments] = useState<Record<string, string>>({});
    const [employees, setEmployees] = useState<Record<string, any[]>>({});
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        fetch('/api/employees')
            .then(r => r.json())
            .then(data => {
                if (!data.error) {
                    setDepartments(data.departments);
                    setEmployees(data.employees);

                    // Check if initially loaded location/person is custom
                    const deptNames = Object.values(data.departments as Record<string, string>);
                    if (asset?.location && !deptNames.includes(asset.location)) {
                        setForm(f => ({ ...f, location: 'Khác' }));
                        setCustomLocation(asset.location);
                    }
                    const allEmployees = Object.values(data.employees as Record<string, any[]>).flat().map(e => e.ho_ten);
                    if (asset?.person && !allEmployees.includes(asset.person)) {
                        setForm(f => ({ ...f, person: 'Khác' }));
                        setCustomPerson(asset.person);
                    }
                }
            })
            .catch(console.error)
            .finally(() => setLoadingData(false));
    }, [asset]);

    function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!form.id.trim() || !form.name.trim()) { setError('Mã và tên tài sản là bắt buộc.'); return; }

        const finalLocation = form.location === 'Khác' ? customLocation.trim() : form.location;
        const finalPerson = form.person === 'Khác' ? customPerson.trim() : form.person;

        if (form.location === 'Khác' && !finalLocation) { setError('Vui lòng nhập phòng ban (Khác).'); return; }
        if (form.person === 'Khác' && !finalPerson) { setError('Vui lòng nhập người giữ (Khác).'); return; }

        setSaving(true); setError('');
        try {
            const url = isEdit ? `/api/assets/${asset!.id}` : '/api/assets';
            const method = isEdit ? 'PUT' : 'POST';
            const r = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, location: finalLocation, person: finalPerson, isEdit }),
            });
            const data = await r.json();
            if (!data.success) { setError(data.message || 'Có lỗi xảy ra'); return; }
            onSaved();
        } finally { setSaving(false); }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Chỉnh sửa' : 'Thêm'} tài sản</h2>
                    <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Mã tài sản *</label>
                        <input className="input" value={form.id} onChange={e => set('id', e.target.value)} disabled={isEdit} placeholder="VD: TS-001" />
                    </div>
                    <div>
                        <label className="label">Tên tài sản *</label>
                        <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VD: Máy tính Dell Inspiron" />
                    </div>
                    <div>
                        <label className="label">Phòng ban</label>
                        {loadingData ? (
                            <div className="skeleton h-10 w-full rounded-xl"></div>
                        ) : (
                            <div className="space-y-2">
                                <select className="select" value={form.location} onChange={e => {
                                    set('location', e.target.value);
                                    if (e.target.value !== 'Khác') set('person', ''); // reset person if changing
                                }}>
                                    <option value="">-- Chọn phòng ban --</option>
                                    {Object.values(departments).map((deptName) => (
                                        <option key={deptName} value={deptName}>{deptName}</option>
                                    ))}
                                    <option value="Khác">Khác (Nhập tay)...</option>
                                </select>
                                {form.location === 'Khác' && (
                                    <input
                                        className="input mt-2"
                                        placeholder="Nhập tên phòng ban / kho..."
                                        value={customLocation}
                                        onChange={e => setCustomLocation(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Người giữ TS</label>
                            {loadingData ? (
                                <div className="skeleton h-10 w-full rounded-xl"></div>
                            ) : (
                                <div className="space-y-2">
                                    <select className="select" value={form.person} onChange={e => set('person', e.target.value)} disabled={!form.location}>
                                        <option value="">-- Chọn nhân viên --</option>
                                        {form.location !== 'Khác' && form.location && (() => {
                                            const deptKey = Object.keys(departments).find(k => departments[k] === form.location);
                                            const deptEmployees = deptKey ? employees[deptKey] : [];
                                            return deptEmployees?.map(emp => (
                                                <option key={emp.ho_ten} value={emp.ho_ten}>
                                                    {emp.ho_ten} {emp.chuc_danh ? `(${emp.chuc_danh})` : ''}
                                                </option>
                                            ));
                                        })()}
                                        <option value="Khác">Khác (Nhập tay)...</option>
                                    </select>
                                    {form.person === 'Khác' && (
                                        <input
                                            className="input mt-2 text-sm"
                                            placeholder="Nhập tên người giữ..."
                                            value={customPerson}
                                            onChange={e => setCustomPerson(e.target.value)}
                                            autoFocus
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="label">Vị trí cụ thể</label>
                            <input className="input" value={form.specificLocation} onChange={e => set('specificLocation', e.target.value)} placeholder="VD: Góc trái kho" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label">Năm mua</label>
                            <input type="number" className="input" value={form.year} onChange={e => set('year', e.target.value)} min={2000} max={2050} />
                        </div>
                        <div>
                            <label className="label">Nguyên giá (VNĐ)</label>
                            <input type="number" className="input" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} min={0} placeholder="VD: 15000000" />
                        </div>
                        <div>
                            <label className="label">Trạng thái</label>
                            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {error && <p className="text-xs text-rose-500 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}

                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary">Hủy</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isEdit ? 'Lưu thay đổi' : 'Thêm tài sản'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
