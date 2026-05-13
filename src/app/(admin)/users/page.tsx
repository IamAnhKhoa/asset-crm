'use client';

import { useEffect, useState } from 'react';
import { Users, Shield, Loader2, Save, Trash2, ShieldCheck, Mail, Calendar, User, Search, Pencil, X } from 'lucide-react';
import { NguoiDung, ROLE_LABELS, UserRole } from '@/types';

export default function UsersPage() {
    const [users, setUsers] = useState<NguoiDung[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [savingRole, setSavingRole] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

    const ROLES = Object.keys(ROLE_LABELS) as UserRole[];

    const [editUser, setEditUser] = useState<NguoiDung | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [departments, setDepartments] = useState<Record<string, string>>({});
    const [employees, setEmployees] = useState<Record<string, any[]>>({});

    useEffect(() => {
        loadUsers();
        fetch('/api/employees').then(r => r.json()).then(data => {
            if (!data.error) {
                setDepartments(data.departments);
                setEmployees(data.employees);
            }
        });
    }, []);

    async function loadUsers() {
        setLoading(true);
        try {
            const r = await fetch('/api/auth/users');
            if (r.ok) {
                const data = await r.json();
                setUsers(data);
            }
        } catch (e) {
            console.error('Failed to load users:', e);
        } finally {
            setLoading(false);
        }
    }

    function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function changeRole(email: string, newRole: UserRole) {
        setSavingRole(email);
        try {
            const r = await fetch('/api/auth/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, role: newRole }),
            });
            if (r.ok) {
                setUsers(users.map(u => u.email === email ? { ...u, role: newRole } : u));
                showToast(`Đã cập nhật quyền cho ${email}`);
            } else {
                showToast('Không thể cập nhật quyền', 'err');
            }
        } catch (e) {
            showToast('Lỗi khi cập nhật quyền', 'err');
        } finally {
            setSavingRole(null);
        }
    }

    async function updateStatus(email: string, status: string) {
        try {
            const r = await fetch('/api/auth/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, status }),
            });
            if (r.ok) {
                setUsers(users.map(u => u.email === email ? { ...u, status: status as any } : u));
                showToast(`Đã cập nhật trạng thái cho ${email}`);
            } else {
                showToast('Không thể cập nhật trạng thái', 'err');
            }
        } catch (e) {
            showToast('Lỗi khi cập nhật trạng thái', 'err');
        }
    }

    async function saveUserProfile(e: React.FormEvent) {
        e.preventDefault();
        if (!editUser) return;
        setSavingProfile(true);
        try {
            const r = await fetch('/api/auth/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: editUser.email, phongBan: editUser.phongBan, tenChon: editUser.tenChon }),
            });
            if (r.ok) {
                setUsers(users.map(u => u.email === editUser.email ? { ...u, phongBan: editUser.phongBan, tenChon: editUser.tenChon } : u));
                showToast(`Đã cập nhật thông tin cho ${editUser.email}`);
                setEditUser(null);
            } else {
                showToast('Không thể cập nhật thông tin', 'err');
            }
        } catch (e) {
            showToast('Lỗi khi cập nhật thông tin', 'err');
        } finally {
            setSavingProfile(false);
        }
    }

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.tenChon || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.tenGoogle || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
                <div>
                    <h1 className="section-title flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" /> Quản Lý Người Dùng
                    </h1>
                    <p className="section-subtitle">Phân quyền và quản lý tài khoản nhân viên</p>
                </div>
            </div>

            <div className="p-6 space-y-6 max-w-7xl mx-auto">
                {/* Tools */}
                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1 max-w-md bg-white rounded-xl shadow-sm ring-1 ring-inset ring-slate-200 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-slate-400" aria-hidden="true" />
                        </div>
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo email, tên..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full rounded-xl border-0 py-2.5 pl-10 text-slate-900 placeholder:text-slate-400 focus:ring-0 sm:text-sm sm:leading-6 bg-transparent"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/50">
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">STT</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">
                                        <div className="flex items-center gap-1.5"><User className="w-4 h-4 text-slate-400" /> Tên & Email</div>
                                    </th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Phòng Ban / Tên Đã Chọn</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">
                                        <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> Phân Quyền</div>
                                    </th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600">Trạng Thái</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 w-36">
                                        <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-slate-400" /> Hoạt Động</div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                                            Đang tải dữ liệu người dùng...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                                            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <span className="font-medium text-slate-500">Không tìm thấy người dùng nào</span>
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user, idx) => {
                                    const isOnline = user.lastActive ? (new Date().getTime() - new Date(user.lastActive.split(' ').reverse().join(' ')).getTime() < 5 * 60 * 1000) : false;
                                    return (
                                        <tr key={user.email} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-5 py-4 font-mono text-slate-400 text-xs">{idx + 1}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        {user.avatar ? (
                                                            <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full ring-2 ring-indigo-50" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-600">
                                                                {user.tenGoogle?.[0]?.toUpperCase() || 'U'}
                                                            </div>
                                                        )}
                                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-slate-900">{user.tenGoogle}</p>
                                                        <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-xs text-nowrap">
                                                            <Mail className="w-3 h-3" />
                                                            {user.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {user.phongBan ? (
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-slate-800">{user.tenChon}</p>
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 mt-1">
                                                                {departments[user.phongBan] || user.phongBan}
                                                            </span>
                                                        </div>
                                                        <button onClick={() => setEditUser(user)} className="btn-icon btn-ghost w-7 h-7" title="Sửa thông tin">
                                                            <Pencil className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200/50">
                                                            Chưa cập nhật HS
                                                        </span>
                                                        <button onClick={() => setEditUser(user)} className="btn-icon btn-ghost w-7 h-7" title="Sửa thông tin">
                                                            <Pencil className="w-3 h-3 text-slate-400" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={user.role}
                                                        disabled={savingRole === user.email}
                                                        onChange={(e) => changeRole(user.email, e.target.value as UserRole)}
                                                        className={`
                                                        text-xs rounded-lg border-slate-200 py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500 font-medium
                                                        ${user.role === 'admin_full' ? 'bg-indigo-50 text-indigo-700' : ''}
                                                        ${user.role === 'user_basic' ? 'bg-slate-50 text-slate-600' : ''}
                                                        ${['admin_dept', 'admin_holder'].includes(user.role) ? 'bg-emerald-50 text-emerald-700' : ''}
                                                        ${user.role === 'guest' ? 'bg-slate-100 text-slate-500' : ''}
                                                    `}
                                                    >
                                                        {ROLES.map(r => (
                                                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                {user.status === 'pending' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-600">Chờ duyệt</span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={() => updateStatus(user.email, 'approved')}
                                                                className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors" title="Duyệt">
                                                                <ShieldCheck className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => updateStatus(user.email, 'rejected')}
                                                                className="p-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors" title="Từ chối">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : user.status === 'approved' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-600">Đã duyệt</span>
                                                        <button onClick={() => updateStatus(user.email, 'pending')} className="text-[10px] text-slate-400 hover:text-slate-600 underline">Thu hồi</button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-600">Từ chối</span>
                                                        <button onClick={() => updateStatus(user.email, 'pending')} className="text-[10px] text-slate-400 hover:text-slate-600 underline">Xét lại</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                <div className="font-medium" title="Lần hoạt động cuối">{user.lastActive || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400 mt-1" title="Ngày tham gia">Tạo: {user.ngayTao}</div>
                                                {user.recentIps && user.recentIps.length > 0 && (
                                                    <div className="mt-2 pt-1.5 border-t border-slate-100">
                                                        <div className="text-[10px] font-semibold text-slate-600 mb-0.5">IP truy cập gần nhất:</div>
                                                        <div className="flex flex-col gap-0.5">
                                                            {user.recentIps.map((ip, i) => (
                                                                <div key={i} className="font-mono text-[9px] text-slate-400 bg-slate-50 px-1 py-0.5 rounded">{ip}</div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Legend/Info */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-sm text-blue-800 mt-6">
                    <Shield className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                    <div className="space-y-1 text-[13px] leading-relaxed">
                        <p className="font-semibold text-blue-900">Giải thích Quyền hạn:</p>
                        <p><strong>Admin Toàn quyền:</strong> Xem, sửa, xóa tất cả dữ liệu, thêm mới tài khoản, phân quyền, cấu hình hệ thống.</p>
                        <p><strong>Quản lý Người giữ:</strong> Xem và sửa đổi thông tin của tất cả tài sản, chuyển đổi người giữ.</p>
                        <p><strong>Quản lý Phòng:</strong> Xem và chỉnh sửa tài sản thuộc phòng ban của mình quản lý.</p>
                        <p><strong>Nhân viên:</strong> Chỉ có thể xem thông tin tài sản mình đang đứng tên giữ và báo hỏng/kiểm kê cho máy đó.</p>
                    </div>
                </div>
            </div>

            {/* Edit User Modal */}
            {editUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="font-bold text-slate-800">Sửa thông tin nhân viên</h2>
                            <button onClick={() => setEditUser(null)} className="btn-icon btn-ghost">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={saveUserProfile} className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
                                <input className="input bg-slate-50 text-slate-500" value={editUser.email} disabled />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Tên Google</label>
                                <input className="input bg-slate-50 text-slate-500" value={editUser.tenGoogle} disabled />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Thuộc Khoa / Phòng Ban <span className="text-rose-500">*</span></label>
                                <select className="select" value={editUser.phongBan} onChange={e => setEditUser({ ...editUser, phongBan: e.target.value, tenChon: '' })}>
                                    <option value="">-- Chọn phòng ban --</option>
                                    {Object.entries(departments).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">Nhân viên đứng tên <span className="text-rose-500">*</span></label>
                                <select className="select" value={editUser.tenChon} disabled={!editUser.phongBan} onChange={e => setEditUser({ ...editUser, tenChon: e.target.value })}>
                                    <option value="">-- Chọn nhân viên --</option>
                                    {(employees[editUser.phongBan] || []).map(emp => (
                                        <option key={emp.ho_ten} value={emp.ho_ten}>{emp.ho_ten} {emp.chuc_danh && `(${emp.chuc_danh})`}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">Hủy</button>
                                <button type="submit" disabled={savingProfile || !editUser.phongBan || !editUser.tenChon} className="btn-primary flex-1 flex justify-center py-2">
                                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lưu Thay Đổi'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white transition-all
                ${toast.type === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
