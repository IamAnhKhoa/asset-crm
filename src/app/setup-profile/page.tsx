'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DEPARTMENT_NAMES, EMPLOYEES_DATA } from '@/lib/employees';
import { useSession, signOut } from 'next-auth/react';
import { Loader2, ArrowRight, UserCircle, Clock, LogOut, XCircle } from 'lucide-react';

export default function SetupProfilePage() {
    const { data: session, update } = useSession();
    const router = useRouter();

    const [role, setRole] = useState<'user_basic' | 'guest'>('user_basic');
    const [phongBan, setPhongBan] = useState<string>('');
    const [tenChon, setTenChon] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [liveStatus, setLiveStatus] = useState<string | null>(null);

    const userStatus = liveStatus || (session?.user as any)?.status;
    const profileComplete = (session?.user as any)?.profileComplete;
    const isPendingApproval = userStatus === 'pending' && profileComplete;
    const isRejected = userStatus === 'rejected';

    useEffect(() => {
        if ((session?.user as any)?.phongBan) setPhongBan((session?.user as any).phongBan);
        if ((session?.user as any)?.tenChon) setTenChon((session?.user as any).tenChon);

        const checkStatus = async () => {
            try {
                const res = await fetch('/api/auth/status');
                const data = await res.json();
                if (data.status) {
                    setLiveStatus(data.status);
                    if (data.status === 'approved') {
                        await update();
                        window.location.href = '/dashboard';
                    }
                }
            } catch (err) { }
        };

        // Initial check
        checkStatus();

        let interval: NodeJS.Timeout;
        if (submitted || isPendingApproval || isRejected) {
            interval = setInterval(checkStatus, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [session, submitted, isPendingApproval, isRejected, update]);

    const employeesInDept = phongBan ? EMPLOYEES_DATA[phongBan] || [] : [];

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (role === 'user_basic' && (!phongBan || !tenChon)) return;
        setLoading(true);
        try {
            await fetch('/api/auth/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phongBan: role === 'guest' ? '' : phongBan, tenChon: role === 'guest' ? '' : tenChon, role }),
            });
            await update(); // trigger refresh

            if (role === 'guest') {
                window.location.href = '/dashboard';
            } else {
                setSubmitted(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    if (!session) return null;

    if (submitted || isPendingApproval || isRejected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100 text-center">
                    {isRejected ? (
                        <>
                            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Tài khoản bị cấm</h1>
                            <p className="text-slate-500 mb-8">
                                Tài khoản của bạn đã bị từ chối phê duyệt hoặc bị cấm truy cập hệ thống. Vui lòng liên hệ Quản trị viên nếu đây là sự nhầm lẫn.
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Đang chờ phê duyệt</h1>
                            <p className="text-slate-500 mb-8">
                                Yêu cầu của bạn đã được gửi. Vui lòng liên hệ Quản trị viên để được duyệt tài khoản trước khi sử dụng hệ thống.
                            </p>
                        </>
                    )}
                    <div className="space-y-3">
                        <button onClick={() => router.push('/')} className="btn-primary w-full py-3">Quay lại trang chủ</button>
                        <button
                            onClick={() => signOut({ callbackUrl: '/' })}
                            className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                            <LogOut className="w-4 h-4" /> Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        {session.user?.image ? (
                            <img src={session.user.image} alt="Avatar" className="w-12 h-12 rounded-full ring-2 ring-indigo-50" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <UserCircle className="w-6 h-6" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <h1 className="text-xl font-bold text-slate-900 leading-tight">Hoàn tất hồ sơ</h1>
                            <p className="text-sm text-slate-500 truncate">{session.user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex p-1 bg-slate-100 rounded-2xl mb-8">
                    <button
                        onClick={() => setRole('user_basic')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${role === 'user_basic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Nhân viên
                    </button>
                    <button
                        onClick={() => setRole('guest')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${role === 'guest' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Khách
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {role === 'user_basic' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phòng ban của bạn</label>
                                <select
                                    value={phongBan}
                                    onChange={(e) => {
                                        setPhongBan(e.target.value);
                                        setTenChon('');
                                    }}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm py-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                >
                                    <option value="">-- Chọn phòng ban --</option>
                                    {Object.entries(DEPARTMENT_NAMES).map(([key, name]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tên hiển thị</label>
                                <select
                                    value={tenChon}
                                    onChange={(e) => setTenChon(e.target.value)}
                                    disabled={!phongBan}
                                    className="w-full rounded-xl border-slate-200 bg-slate-50 text-sm py-2.5 shadow-sm focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                                    required
                                >
                                    <option value="">-- Chọn tên hiển thị --</option>
                                    {employeesInDept.map((emp) => (
                                        <option key={emp.ho_ten} value={emp.ho_ten}>
                                            {emp.ho_ten} {emp.chuc_danh ? `(${emp.chuc_danh})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    ) : (
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-4">
                            <p className="text-sm text-indigo-700 leading-relaxed font-medium">
                                Tài khoản Khách chỉ có quyền xem thông tin Dashboard tổng quát. Không thể thực hiện các thao tác quản lý khác.
                            </p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={(role === 'user_basic' && (!phongBan || !tenChon)) || loading}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 active:scale-95"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                role === 'guest' ? 'Vào hệ thống ngay' : 'Gửi yêu cầu phê duyệt'
                            )}
                            {!loading && <ArrowRight className="w-4 h-4" />}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
