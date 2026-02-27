'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    LayoutDashboard, Package, ClipboardCheck, CheckCircle,
    Wrench, History, Settings, ChevronRight,
} from 'lucide-react';

const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Package, label: 'Tài Sản', href: '/assets' },
    { icon: CheckCircle, label: 'Kiểm Kê', href: '/inventory', badgeKey: 'kiemke' },
    { icon: Wrench, label: 'Sửa Chữa', href: '/repair', badgeKey: 'suachua' },
    { icon: ClipboardCheck, label: 'Báo Cáo', href: '/reports' },
    { icon: History, label: 'Lịch Sử', href: '/history' },
];

export function Sidebar() {
    const path = usePathname();
    const [counts, setCounts] = useState<{ kiemke: number; suachua: number }>({ kiemke: 0, suachua: 0 });
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        fetch('/api/pending/counts')
            .then((r) => r.json())
            .then(setCounts)
            .catch(() => { });
        const t = setInterval(() => {
            fetch('/api/pending/counts').then(r => r.json()).then(setCounts).catch(() => { });
        }, 60000);
        return () => clearInterval(t);
    }, []);

    return (
        <aside
            className={`flex flex-col h-full bg-white ring-1 ring-slate-200 transition-all duration-200
                  ${collapsed ? 'w-[64px]' : 'w-[220px]'} shrink-0`}
        >
            {/* Logo */}
            <div className="h-14 flex items-center gap-2.5 px-4 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-white" />
                </div>
                {!collapsed && (
                    <span className="font-semibold text-slate-900 text-sm leading-tight">
                        Quản lý Tài Sản
                    </span>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="ml-auto btn-icon btn-ghost w-6 h-6"
                    aria-label="Toggle sidebar"
                >
                    <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                {NAV_ITEMS.map(({ href, label, icon: Icon, badgeKey }) => {
                    const count = badgeKey ? counts[badgeKey as 'kiemke' | 'suachua'] : 0;
                    const active = path === href || (href !== '/' && path.startsWith(href));
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-item relative ${active ? 'active' : ''}`}
                            title={collapsed ? label : undefined}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {!collapsed && <span className="truncate">{label}</span>}
                            {count > 0 && (
                                <span className={`
                  ${collapsed ? 'absolute top-1 right-1' : 'ml-auto'}
                  min-w-[18px] h-[18px] rounded-full bg-rose-500 text-white
                  text-[10px] font-semibold flex items-center justify-center px-1
                `}>
                                    {count}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            {!collapsed && (
                <div className="p-3 border-t border-slate-100">
                    <div className="flex items-center gap-2.5 px-2 py-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-600 shrink-0">
                            A
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 truncate">Admin</p>
                            <p className="text-[11px] text-slate-400 truncate">Quản trị viên</p>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
