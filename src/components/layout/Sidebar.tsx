'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import {
    LayoutDashboard, Package, ClipboardCheck, CheckCircle,
    Wrench, History, Settings, ChevronRight, Receipt, Users, LogOut, Download, Menu, X, FileText
} from 'lucide-react';

type NavItem = { icon: any; label: string; href: string; badgeKey?: string; roles: string[]; isDownload?: boolean };

const NAV_ITEMS: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', roles: ['admin_full', 'guest'] },
    { icon: Package, label: 'Tài Sản', href: '/assets', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full'] },
    { icon: CheckCircle, label: 'Kiểm Kê', href: '/inventory', badgeKey: 'kiemke', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full'] },
    { icon: Wrench, label: 'Sửa Chữa', href: '/repair', badgeKey: 'suachua', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full'] },
    { icon: Receipt, label: 'Bảng Giá Dịch Vụ', href: '/gia-sua-chua', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full', 'guest'] },
    { icon: ClipboardCheck, label: 'Báo Cáo', href: '/reports', roles: ['admin_full'] },
    { icon: History, label: 'Lịch Sử', href: '/history', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full'] },
    { icon: FileText, label: 'Mẫu Gửi', href: '/templates', roles: ['user_basic', 'admin_dept', 'admin_holder', 'admin_full'] },
    { icon: Users, label: 'Quản Lý Người Dùng', href: '/users', roles: ['admin_full'] },
    { icon: Download, label: 'Backup Database', href: '/api/admin/backup', roles: ['admin_full'], isDownload: true },
    { icon: Settings, label: 'Cài Đặt', href: '/settings', roles: ['admin_full'] },
];

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (open: boolean) => void }) {
    const path = usePathname();
    const { data: session } = useSession();
    const userRole = session?.user?.role || 'user_basic';

    const [counts, setCounts] = useState<{ kiemke: number; suachua: number }>({ kiemke: 0, suachua: 0 });
    const [onlineCount, setOnlineCount] = useState(0);
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        const fetchCounts = () => {
            fetch('/api/pending/counts')
                .then((r) => r.json())
                .then(setCounts)
                .catch(() => { });
        };
        const fetchOnline = () => {
            fetch('/api/stats/online')
                .then(r => r.json())
                .then(data => setOnlineCount(data.count))
                .catch(() => { });
        };

        fetchCounts();
        fetchOnline();
        const t1 = setInterval(fetchCounts, 60000);
        const t2 = setInterval(fetchOnline, 60000); // Check more frequently now that it's fast
        return () => {
            clearInterval(t1);
            clearInterval(t2);
        };
    }, []);

    // Lọc menu theo role
    const visibleNavItems = NAV_ITEMS.filter(item => item.roles.includes(userRole));

    return (
        <>
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside
                className={`flex flex-col h-full bg-white ring-1 ring-slate-200 transition-all duration-300
                    fixed md:relative z-50
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${collapsed ? 'w-[64px]' : 'w-[260px] md:w-[220px]'} shrink-0`}
            >
                {/* Logo */}
                <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-100 relative">
                    <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4 text-white" />
                    </div>
                    {!collapsed && (
                        <span className="font-semibold text-slate-900 text-sm leading-tight hidden md:block">
                            Quản lý Tài Sản
                        </span>
                    )}
                    {!collapsed && (
                        <span className="font-semibold text-slate-900 text-base leading-tight md:hidden">
                            Menu
                        </span>
                    )}

                    {/* Desktop Collapse Btn */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="ml-auto btn-icon btn-ghost w-6 h-6 hidden md:flex"
                        aria-label="Toggle sidebar"
                    >
                        <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
                    </button>


                </div>

                {/* Nav */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    {visibleNavItems.map(({ href, label, icon: Icon, badgeKey, isDownload }) => {
                        const count = badgeKey ? counts[badgeKey as 'kiemke' | 'suachua'] : 0;
                        const active = !isDownload && (path === href || (href !== '/' && path.startsWith(href)));

                        if (isDownload) {
                            return (
                                <a
                                    key={href}
                                    href={href}
                                    download
                                    className="nav-item relative"
                                    title={collapsed ? label : undefined}
                                >
                                    <Icon className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
                                    {!collapsed && <span className="truncate text-[15px] md:text-sm">{label}</span>}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileOpen(false)}
                                className={`nav-item relative ${active ? 'active' : ''}`}
                                title={collapsed ? label : undefined}
                            >
                                <Icon className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
                                {!collapsed && <span className="truncate text-[15px] md:text-sm">{label}</span>}
                                {count > 0 && (
                                    <span className={`
                                        ${collapsed ? 'absolute top-1 right-1' : 'ml-auto'}
                                        min-w-[20px] h-[20px] md:min-w-[18px] md:h-[18px] rounded-full bg-rose-500 text-white
                                        text-[11px] md:text-[10px] font-semibold flex items-center justify-center px-1
                                    `}>
                                        {count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom - User Profile */}
                <div className="p-3 border-t border-slate-100">
                    <div className={`flex items-center gap-3 px-2 py-2 ${collapsed ? 'justify-center' : 'justify-between'}`}>
                        {session?.user?.image ? (
                            <img src={session.user.image} alt="Avatar" className="w-10 h-10 md:w-8 md:h-8 rounded-full ring-2 ring-indigo-50 shrink-0" />
                        ) : (
                            <div className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm md:text-xs font-semibold text-indigo-600 shrink-0">
                                {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                        )}

                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <p className="text-[15px] md:text-sm font-medium text-slate-900 truncate" title={session?.user?.tenChon || session?.user?.name || ''}>
                                    {session?.user?.tenChon || session?.user?.name || 'User'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[11px] md:text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                        {onlineCount} đang online
                                    </span>
                                </div>
                            </div>
                        )}

                        {collapsed && (
                            <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white"></span>
                            </div>
                        )}

                        {!collapsed && (
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                className="btn-icon btn-ghost text-slate-400 hover:text-rose-500 hover:bg-rose-50 w-9 h-9 md:w-8 md:h-8 shrink-0"
                                title="Đăng xuất"
                            >
                                <LogOut className="w-5 h-5 md:w-4 md:h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
}
