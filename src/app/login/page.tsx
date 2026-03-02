'use client';
import { signIn } from 'next-auth/react';
import { Package, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
            {/* Ambient Background Elements - Mesh Gradients */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05)_0%,transparent_70%)]"></div>

            <div className="w-full max-w-sm relative z-10">
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative w-20 h-20 rounded-[1.75rem] bg-slate-900 border border-white/10 flex items-center justify-center mb-6 shadow-2xl transform group-hover:scale-105 transition-all duration-500">
                            <Package className="w-10 h-10 text-indigo-500 group-hover:text-indigo-400 transition-colors" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3 text-center">Hệ thống Quản lý</h1>
                    <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 backdrop-blur-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-300 font-black">Trạm Y tế Tân An Hội</span>
                    </div>
                </div>

                {/* Login Card - Glassmorphism */}
                <div className="bg-slate-900/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                    {/* Animated top border line */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

                    <div className="text-center mb-10">
                        <h2 className="text-xl font-bold text-white mb-2">Đăng nhập ngay</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Vui lòng sử dụng tài khoản Google công vụ để truy cập hệ thống quản lý.
                        </p>
                    </div>

                    <button
                        onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                        className="w-full flex items-center justify-center gap-4 bg-white hover:bg-slate-50 text-slate-900 font-bold py-4.5 px-6 rounded-2xl transition-all duration-300 shadow-[0_10px_20px_-5px_rgba(255,255,255,0.1)] hover:shadow-[0_20px_30px_-10px_rgba(99,102,241,0.2)] hover:translate-y-[-2px] active:scale-95 group/btn overflow-hidden relative"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            <div className="bg-white p-1 rounded-lg">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                            </div>
                            <span className="text-base tracking-tight">Tiếp tục với Google</span>
                            <ArrowRight className="w-4 h-4 ml-auto opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                        </div>
                    </button>

                    <div className="mt-10 pt-10 border-t border-white/5 text-center">
                        <div className="flex items-center justify-center gap-4">
                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase whitespace-nowrap">
                                Secure Access
                            </p>
                            <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                        </div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="mt-12 text-center">
                    <p className="text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase opacity-50">
                        © 2026 ASSET MANAGEMENT SYSTEM
                    </p>
                </div>
            </div>

            {/* Subtle floating particles (decorative) */}
            <div className="absolute top-[20%] right-[15%] w-1 h-1 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute bottom-[25%] left-[10%] w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping opacity-20" style={{ animationDelay: '1.5s' }}></div>
        </div>
    );
}
