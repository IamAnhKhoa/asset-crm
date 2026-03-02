'use client';
import { Sidebar } from '@/components/layout/Sidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 relative w-full">
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <main className="flex-1 flex flex-col overflow-hidden w-full relative">
                {/* Mobile Top Nav (Hamburger) */}
                <div className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 sticky top-0 z-20">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="btn-icon btn-ghost -ml-2 text-slate-500 hover:text-slate-800"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-slate-800 ml-2">App Quản Lý</span>
                </div>

                {children}
            </main>
        </div>
    );
}
