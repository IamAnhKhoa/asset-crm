'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, Plus, Trash2, Edit2, Play, Square, Loader2 } from 'lucide-react';

interface NotificationMsg {
    id: string;
    content: string;
    startDate: string;
    endDate: string;
    isBold: boolean;
    highlightColor: string;
    textColor: string;
    isActive: boolean;
}

export default function SettingsPage() {
    const [notifications, setNotifications] = useState<NotificationMsg[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<NotificationMsg>>({
        content: '',
        startDate: '',
        endDate: '',
        isBold: false,
        highlightColor: '',
        textColor: '#ffffff',
        isActive: true,
    });
    const [timeQuickSelect, setTimeQuickSelect] = useState('custom'); // custom, day, week, month

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            if (Array.isArray(data)) setNotifications(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickTimeSelect = (val: string) => {
        setTimeQuickSelect(val);
        const now = new Date();
        const startStr = formatViDate(now);
        let endStr = '';

        if (val === 'day') {
            const end = new Date(now);
            end.setDate(end.getDate() + 1);
            endStr = formatViDate(end);
        } else if (val === 'week') {
            const end = new Date(now);
            end.setDate(end.getDate() + 7);
            endStr = formatViDate(end);
        } else if (val === 'month') {
            const end = new Date(now);
            end.setMonth(end.getMonth() + 1);
            endStr = formatViDate(end);
        }

        setFormData(prev => ({
            ...prev,
            startDate: startStr,
            endDate: endStr
        }));
    };

    const formatViDate = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingId) {
                await fetch('/api/notifications', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData, id: editingId })
                });
            } else {
                await fetch('/api/notifications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...formData })
                });
            }

            // Reset form & reload
            setEditingId(null);
            setFormData({
                content: '',
                startDate: '',
                endDate: '',
                isBold: false,
                highlightColor: '',
                textColor: '#ffffff',
                isActive: true,
            });
            setTimeQuickSelect('custom');
            await fetchData();
            window.location.reload(); // Hard reload to update layout marquee
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (n: NotificationMsg) => {
        setEditingId(n.id);
        setFormData({
            content: n.content,
            startDate: n.startDate,
            endDate: n.endDate,
            isBold: n.isBold,
            highlightColor: n.highlightColor,
            textColor: n.textColor,
            isActive: n.isActive,
        });
        setTimeQuickSelect('custom');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
        setLoading(true);
        try {
            await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
            await fetchData();
            window.location.reload();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const toggleActive = async (n: NotificationMsg) => {
        setLoading(true);
        try {
            await fetch('/api/notifications', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...n, isActive: !n.isActive })
            });
            await fetchData();
            window.location.reload();
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50/50">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Settings className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold text-slate-900">Cài đặt Hệ thống</h1>
                        <p className="text-xs text-slate-500">Quản lý banner thông báo chữ chạy</p>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-5xl mx-auto space-y-6">

                {/* Form Add/Edit */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        {editingId ? <Edit2 className="w-5 h-5 text-indigo-500" /> : <Plus className="w-5 h-5 text-indigo-500" />}
                        {editingId ? 'Chỉnh sửa Thông báo' : 'Thêm Thông báo mới'}
                    </h2>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung hiển thị *</label>
                                <textarea
                                    required
                                    rows={2}
                                    className="input w-full"
                                    placeholder="Nhập thông báo quan trọng..."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Thời hạn nhanh</label>
                                <select
                                    className="select w-full"
                                    value={timeQuickSelect}
                                    onChange={e => handleQuickTimeSelect(e.target.value)}
                                >
                                    <option value="custom">Tùy chỉnh tay</option>
                                    <option value="day">Trong 1 Ngày tử bây giờ</option>
                                    <option value="week">Trong 1 Tuần từ bây giờ</option>
                                    <option value="month">Trong 1 Tháng từ bây giờ</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giờ bắt đầu</label>
                                    <input
                                        type="text"
                                        className="input w-full text-sm font-mono"
                                        placeholder="dd/MM/yyyy HH:mm"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giờ kết thúc</label>
                                    <input
                                        type="text"
                                        className="input w-full text-sm font-mono"
                                        placeholder="dd/MM/yyyy HH:mm"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-4 pt-2 border border-slate-200 p-4 rounded-xl bg-slate-50">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                            checked={formData.isBold}
                                            onChange={e => setFormData({ ...formData, isBold: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-slate-700">In Đậm (Bold)</span>
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                                            checked={formData.isActive}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium text-slate-700">Đang bật (Active)</span>
                                    </label>
                                </div>

                                <div className="space-y-4 pt-2 border border-slate-200 p-4 rounded-xl bg-slate-50">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-slate-700">Màu chữ</label>
                                        <input
                                            type="color"
                                            className="w-8 h-8 rounded cursor-pointer"
                                            value={formData.textColor || '#ffffff'}
                                            onChange={e => setFormData({ ...formData, textColor: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between shrink-0 gap-2">
                                        <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Màu nền Highlight</label>
                                        <input
                                            type="color"
                                            className="w-8 h-8 rounded cursor-pointer shrink-0"
                                            value={formData.highlightColor || '#000000'}
                                            onChange={e => setFormData({ ...formData, highlightColor: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="mt-4 p-4 rounded-lg bg-slate-900 overflow-hidden flex items-center">
                            <span className="text-slate-400 text-xs mr-4 shrink-0 uppercase tracking-wider">Preview</span>
                            <div
                                className="inline-flex items-center gap-2 text-sm"
                                style={{
                                    fontWeight: formData.isBold ? 'bold' : 'normal',
                                    color: formData.textColor || '#ffffff',
                                    backgroundColor: formData.highlightColor || 'transparent',
                                    padding: formData.highlightColor ? '0 8px' : '0',
                                    borderRadius: formData.highlightColor ? '4px' : '0',
                                }}
                            >
                                • {formData.content || 'Nội dung thông báo sẽ hiển thị như thế này...'}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(null);
                                        setFormData({ content: '', startDate: '', endDate: '', isBold: false, highlightColor: '', textColor: '#ffffff', isActive: true });
                                    }}
                                    className="btn-ghost px-4 py-2"
                                >
                                    Hủy
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading || !formData.content}
                                className="btn-primary gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {editingId ? 'Cập nhật' : 'Lưu Thông báo'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="card overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <h2 className="font-semibold text-slate-800 text-sm">Danh sách Thông báo</h2>
                        <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md">
                            Tổng {notifications.length}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Trạng thái</th>
                                    <th>Nội dung</th>
                                    <th>Hiệu lực</th>
                                    <th>Thiết kế</th>
                                    <th className="text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && notifications.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" /></td></tr>
                                ) : notifications.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-8 text-slate-400">Chưa có thông báo nào</td></tr>
                                ) : (
                                    notifications.map(n => (
                                        <tr key={n.id}>
                                            <td>
                                                <button
                                                    onClick={() => toggleActive(n)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${n.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {n.isActive ? <Play className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                                                    {n.isActive ? 'Đang bật' : 'Tạm dừng'}
                                                </button>
                                            </td>
                                            <td className="max-w-[200px]">
                                                <p className="truncate font-medium text-slate-800" title={n.content}>{n.content}</p>
                                            </td>
                                            <td>
                                                <div className="text-xs font-mono text-slate-500">
                                                    Từ: {n.startDate || '—'}<br />
                                                    Đến: {n.endDate || '—'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    {n.isBold && <span className="badge badge-indigo">Bold</span>}
                                                    {n.highlightColor && (
                                                        <span className="w-4 h-4 rounded shadow-sm border border-slate-200" style={{ backgroundColor: n.highlightColor }} title="Highlight Color"></span>
                                                    )}
                                                    {n.textColor && (
                                                        <span className="w-4 h-4 rounded shadow-sm border border-slate-200" style={{ backgroundColor: n.textColor }} title="Text Color"></span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleEdit(n)} className="btn-icon btn-ghost w-8 h-8 text-indigo-600">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(n.id)} className="btn-icon btn-ghost w-8 h-8 text-rose-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
