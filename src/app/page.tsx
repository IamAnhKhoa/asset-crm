'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
    Package, Search, Loader2, Camera, X, Printer, Wrench, Wifi, Cpu,
    Receipt, ShieldCheck, Zap, Shield, ChevronRight,
    CheckCircle, AlertTriangle, Clock, TrendingUp, ArrowRight,
    BarChart3, ClipboardCheck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/types';
import Link from 'next/link';
import QRScanner from '@/components/QRScanner';
import SmoothScrollProvider from '@/components/SmoothScrollProvider';

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
interface ServiceItem {
    loai: string; noiDung: string; donViTinh: string; donGia: number; ghiChu: string;
}

const SERVICE_GROUPS = [
    { key: 'Bơm Mực Máy In', icon: Printer, accent: '#3b82f6' },
    { key: 'Sửa Chữa Máy In', icon: Wrench, accent: '#f59e0b' },
    { key: 'Thiết Bị Mạng', icon: Wifi, accent: '#10b981' },
    { key: 'Linh Kiện Vi Tính', icon: Cpu, accent: '#8b5cf6' },
];

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

/* ─────────────────────────────────────────────────────────
   Scroll Progress Bar
───────────────────────────────────────────────────────── */
function ScrollProgressBar() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const update = () => {
            const scrollTop = window.scrollY;
            const docH = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(docH > 0 ? (scrollTop / docH) * 100 : 0);
        };
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return (
        <div
            className="fixed top-0 left-0 z-[100] h-[2px] transition-all duration-75"
            style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #6366f1, #a855f7, #f59e0b)',
                boxShadow: '0 0 8px rgba(99,102,241,0.8)',
            }}
        />
    );
}

/* ─────────────────────────────────────────────────────────
   Section Reveal Hook (IntersectionObserver)
───────────────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, visible };
}

/* ─────────────────────────────────────────────────────────
   Reveal Wrapper
───────────────────────────────────────────────────────── */
function Reveal({
    children,
    delay = 0,
    className = '',
    from = 'bottom',
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
    from?: 'bottom' | 'left' | 'right' | 'none';
}) {
    const { ref, visible } = useReveal();
    const translateMap = { bottom: 'translateY(36px)', left: 'translateX(-36px)', right: 'translateX(36px)', none: 'none' };
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translate(0,0)' : translateMap[from],
                transition: `opacity 0.65s ease ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
                willChange: 'opacity, transform',
            }}
        >
            {children}
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Parallax Hero BG
───────────────────────────────────────────────────────── */
function ParallaxHeroBg() {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) return; // Skip parallax on mobile for performance
        const el = ref.current;
        if (!el) return;
        const update = () => {
            const y = window.scrollY;
            el.style.transform = `translateY(${y * 0.35}px) scale(1.08)`;
        };
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    }, []);
    return (
        <div className="absolute inset-0 overflow-hidden">
            <div ref={ref} className="absolute inset-0" style={{ willChange: 'transform' }}>
                <img src="/hero-bg.png" alt="" className="w-full h-full object-cover object-center opacity-40" />
            </div>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(9,9,15,0.3) 0%, rgba(9,9,15,0.5) 50%, rgba(9,9,15,1) 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Horizontal Scroll Section (Apple-style) — Desktop only
   On mobile: vertical grid layout
───────────────────────────────────────────────────────── */
function HorizontalScrollFeatures({ features }: {
    features: { icon: string; title: string; desc: string; accent: string }[]
}) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check, { passive: true });
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (isMobile) return;
        const section = sectionRef.current;
        const track = trackRef.current;
        if (!section || !track) return;

        // Total horizontal scroll distance
        const getMaxX = () => track.scrollWidth - window.innerWidth;

        const onScroll = () => {
            const rect = section.getBoundingClientRect();
            const sectionH = section.offsetHeight;
            const windowH = window.innerHeight;
            const progress = Math.max(0, Math.min(1, -rect.top / (sectionH - windowH)));
            const maxX = getMaxX();
            track.style.transform = `translateX(${-progress * maxX}px)`;
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener('scroll', onScroll);
    }, [isMobile]);

    if (isMobile) {
        // Mobile: simple reveal grid
        return (
            <div className="grid grid-cols-1 gap-4">
                {features.map((f, i) => (
                    <Reveal key={i} delay={i * 0.08} from="bottom">
                        <div className="group p-6 rounded-2xl relative overflow-hidden"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `radial-gradient(circle at 30% 50%, ${f.accent}18, transparent 60%)` }} />
                            <div className="text-3xl mb-4">{f.icon}</div>
                            <h3 className="font-bold text-base mb-2">{f.title}</h3>
                            <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                        </div>
                    </Reveal>
                ))}
            </div>
        );
    }

    // Desktop: Apple-style sticky horizontal scroll
    // Section height = 100vh (pin) + extra for each card
    const stickyHeight = `${100 + features.length * 60}vh`;

    return (
        <div ref={sectionRef} style={{ height: stickyHeight, position: 'relative' }}>
            <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
                {/* Section header */}
                <div className="pt-20 pb-12 px-12">
                    <Reveal from="bottom">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Tính năng</p>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                            Mọi thứ bạn cần<br /><span style={{ color: '#818cf8' }}>trong một nền tảng</span>
                        </h2>
                    </Reveal>
                </div>

                {/* Horizontal track */}
                <div
                    ref={trackRef}
                    className="flex gap-5 px-12 pb-20"
                    style={{ width: 'max-content', willChange: 'transform', transition: 'transform 0.05s linear' }}
                >
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="group relative flex-shrink-0 p-8 rounded-3xl overflow-hidden cursor-default"
                            style={{
                                width: 320,
                                height: 280,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.07)',
                            }}
                        >
                            {/* Glow hover */}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `radial-gradient(circle at 30% 60%, ${f.accent}20, transparent 65%)` }} />
                            {/* Top accent line */}
                            <div className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }} />
                            <div className="relative z-10">
                                <div className="text-4xl mb-6">{f.icon}</div>
                                <h3 className="font-bold text-lg mb-3 text-white">{f.title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                            </div>
                            {/* Index number */}
                            <div className="absolute bottom-6 right-6 text-[40px] font-black tabular-nums"
                                style={{ color: `${f.accent}18`, lineHeight: 1 }}>
                                {String(i + 1).padStart(2, '0')}
                            </div>
                        </div>
                    ))}
                    {/* End card - CTA */}
                    <div className="flex-shrink-0 flex items-center justify-center p-8 rounded-3xl"
                        style={{ width: 240, height: 280, border: '1px dashed rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.04)' }}>
                        <div className="text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                                <ArrowRight className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-sm text-white/50 font-medium">Và còn nhiều<br />hơn nữa...</p>
                        </div>
                    </div>
                </div>

                {/* Scroll hint indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/20 text-xs font-medium">
                    <span>Cuộn để xem thêm</span>
                    <ArrowRight className="w-3 h-3" />
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────── */
export default function PublicDashboard() {
    const [dash, setDash] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [assetId, setAssetId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showBankQR, setShowBankQR] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/dashboard').then(r => r.json()).then(d => { if (d?.stats) setDash(d); }).finally(() => setLoading(false));
        fetch('/api/gia-sua-chua').then(r => r.json()).then(d => { if (Array.isArray(d)) setServices(d); });
    }, []);

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        if (assetId.trim()) { setIsSearching(true); router.push(`/lookup/${encodeURIComponent(assetId.trim())}`); }
    }

    const stats = [
        { label: 'TỔNG TÀI SẢN', val: dash?.stats?.total, accent: '#6366f1', icon: Package },
        { label: 'HOẠT ĐỘNG TỐT', val: dash?.stats?.good, accent: '#10b981', icon: CheckCircle },
        { label: 'CẦN SỬA CHỮA', val: dash ? dash.stats.needRepair + dash.stats.bad : undefined, accent: '#f59e0b', icon: AlertTriangle },
        { label: 'CHỜ PHÊ DUYỆT', val: dash ? dash.stats.pendingCheck + dash.stats.pendingRepair : undefined, accent: '#f43f5e', icon: Clock },
    ];

    const features = [
        { icon: '🔍', title: 'Tra cứu tức thì', desc: 'Nhập mã hoặc quét QR để xem toàn bộ lịch sử tài sản, trạng thái và vị trí.', accent: '#6366f1' },
        { icon: '📱', title: 'Thông báo Telegram', desc: 'Mọi báo hỏng, phiếu kiểm kê đều được gửi tức thì qua Telegram để phê duyệt.', accent: '#10b981' },
        { icon: '📊', title: 'Báo cáo Excel', desc: 'Xuất báo cáo chi tiết chi phí sửa chữa, lịch sử thiết bị ra file Excel.', accent: '#f59e0b' },
        { icon: '🔐', title: 'Phân quyền Google', desc: 'Đăng nhập bằng tài khoản Google, kiểm soát quyền truy cập theo phòng ban.', accent: '#f43f5e' },
    ];

    return (
        <div className="min-h-screen bg-[#09090f] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
            {/* ── Smooth scroll (Lenis) ── */}
            <SmoothScrollProvider />

            {/* ── Scroll Progress Bar ── */}
            <ScrollProgressBar />

            {/* ── NAV ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-6 md:px-12"
                style={{ background: 'rgba(9,9,15,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                        <Package className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">QLTS <span className="text-white/30 font-normal">·</span> <span className="text-white/50 text-xs font-medium">Tân An Hội</span></span>
                </div>

                <div className="hidden md:flex items-center gap-6">
                    <a href="#tinh-nang" className="text-xs font-medium text-white/50 hover:text-white transition-colors uppercase tracking-widest">Tính năng</a>
                    <a href="#bang-gia" className="text-xs font-medium text-white/50 hover:text-white transition-colors uppercase tracking-widest">Bảng giá</a>
                </div>

                <Link href="/dashboard" prefetch={false}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Đăng nhập
                </Link>
            </nav>

            {/* ── HERO (Parallax BG) ── */}
            <section className="relative min-h-[88vh] flex items-center overflow-hidden pt-14">
                {/* Parallax background */}
                <ParallaxHeroBg />

                {/* Noise grain */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

                {/* Orbit CSS */}
                <style>{`
                    @keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    @keyframes orbit-counter { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                    .orbit-ring { animation: orbit-spin 18s linear infinite; }
                    .orbit-icon { animation: orbit-counter 18s linear infinite; }
                    @keyframes pulse-ring { 0%,100%{opacity:0.15} 50%{opacity:0.35} }
                `}</style>

                <div className="relative max-w-6xl mx-auto px-6 md:px-12 py-20 flex flex-col lg:flex-row items-center gap-12">
                    {/* ── LEFT: text content ── */}
                    <div className="flex-1 min-w-0">
                        {/* Badge */}
                        <Reveal from="bottom" delay={0.05}>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
                                style={{ border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                                <Zap className="w-3 h-3" style={{ color: '#fbbf24' }} />
                                HỆ THỐNG QUẢN LÝ TÀI SẢN Y TẾ
                            </div>
                        </Reveal>

                        <Reveal from="bottom" delay={0.12}>
                            <h1 className="text-5xl md:text-6xl font-black leading-[0.95] tracking-tighter mb-6">
                                <span className="text-white">TRA CỨU</span>{' '}
                                <span style={{ color: '#818cf8' }}>TÀI SẢN</span>
                                <br />
                                <span style={{ background: 'linear-gradient(90deg, #fbbf24, #fb923c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NHANH CHÓNG</span>
                                <br />
                                <span className="text-white/20">& CHÍNH XÁC</span>
                            </h1>
                        </Reveal>

                        <Reveal from="bottom" delay={0.18}>
                            <p className="text-white/50 text-base max-w-lg mb-10 leading-relaxed">
                                Nhập mã tài sản hoặc quét QR để xem lịch sử, trạng thái và gửi báo cáo kiểm kê — mọi lúc, mọi nơi.
                            </p>
                        </Reveal>

                        {/* Search + QR */}
                        <Reveal from="bottom" delay={0.24}>
                            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                                <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 px-5 py-3.5 rounded-2xl transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.12)',
                                        border: '1.5px solid rgba(139,92,246,0.6)',
                                        backdropFilter: 'blur(20px)',
                                        boxShadow: '0 0 24px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    }}>
                                    <Search className="w-5 h-5 shrink-0" style={{ color: '#a5b4fc' }} />
                                    <input
                                        type="text"
                                        autoFocus
                                        className="flex-1 bg-transparent text-white placeholder-white/40 font-mono text-sm uppercase focus:outline-none tracking-widest"
                                        placeholder="NHẬP MÃ TÀI SẢN..."
                                        value={assetId}
                                        onChange={e => setAssetId(e.target.value.toUpperCase())}
                                    />
                                    <button type="submit" disabled={!assetId.trim() || isSearching}
                                        className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 0 16px rgba(99,102,241,0.5)' }}>
                                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-3.5 h-3.5" />Tìm kiếm</>}
                                    </button>
                                </form>
                                <button onClick={() => setIsScanning(true)}
                                    className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-semibold transition-all"
                                    style={{ border: '1.5px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)' }}>
                                    <Camera className="w-4 h-4" /> Quét QR
                                </button>
                            </div>
                        </Reveal>

                        {/* CLI hint */}
                        <Reveal from="bottom" delay={0.28}>
                            <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono"
                                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                                <span style={{ color: '#4ade80' }}>$</span>
                                <span>lookup --asset MAYIN-001 --details</span>
                                <span className="animate-pulse" style={{ color: '#6366f1' }}>|</span>
                            </div>
                        </Reveal>
                    </div>

                    {/* ── RIGHT: Orbit widget ── */}
                    <Reveal from="right" delay={0.2}>
                        <div className="flex shrink-0 items-center justify-center w-full lg:w-auto mt-8 lg:mt-0 scale-[0.85] sm:scale-100" style={{ height: 360 }}>
                            <div className="relative" style={{ width: 360, height: 360 }}>
                                <div className="absolute inset-0 rounded-full" style={{ animation: 'pulse-ring 3s ease-in-out infinite', border: '1px solid rgba(99,102,241,0.3)' }} />
                                <div className="absolute" style={{ inset: 30, borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.08)' }} />
                                <div className="absolute inset-0 orbit-ring">
                                    {[
                                        { icon: Package, label: 'TÀI SẢN', bg: '#6366f1', deg: 0 },
                                        { icon: Wrench, label: 'SỬA CHỮA', bg: '#f59e0b', deg: 72 },
                                        { icon: ClipboardCheck, label: 'KIỂM KÊ', bg: '#10b981', deg: 144 },
                                        { icon: BarChart3, label: 'BÁO CÁO', bg: '#3b82f6', deg: 216 },
                                        { icon: ShieldCheck, label: 'BẢO MẬT', bg: '#f43f5e', deg: 288 },
                                    ].map(({ icon: Icon, label, bg, deg }) => (
                                        <div key={label} className="absolute top-1/2 left-1/2"
                                            style={{ width: 0, height: 0, transform: `rotate(${deg}deg) translateX(150px)` }}>
                                            <div className="absolute top-0 left-0 orbit-icon">
                                                <div className="flex flex-col items-center justify-center w-16"
                                                    style={{ transform: `translate(-50%, -50%) rotate(-${deg}deg)` }}>
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg z-10"
                                                        style={{ background: bg, border: '1px solid rgba(255,255,255,0.2)', boxShadow: `0 0 20px ${bg}60` }}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <span className="text-[9px] font-black text-white/90 mt-1.5 tracking-wider whitespace-nowrap z-10 px-1.5 py-0.5 rounded-sm"
                                                        style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>{label}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-20"
                                    style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,#000,#0a0a0f)', boxShadow: '0 0 40px rgba(99,102,241,0.6)', border: '2px solid rgba(99,102,241,0.8)' }}>
                                    <Package className="w-8 h-8 text-indigo-400" />
                                    <span className="text-[8px] font-black text-indigo-300 mt-1 tracking-widest">QLTS</span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </section>

            {/* ── STATS ── */}
            <section className="relative py-16 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((s, i) => (
                        <Reveal key={i} delay={i * 0.08} from="bottom">
                            <div className="group p-6 rounded-2xl transition-all duration-300 cursor-default hover:-translate-y-1"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />
                                <div className="text-4xl font-black mb-2 tabular-nums" style={{ color: s.val !== undefined ? s.accent : 'rgba(255,255,255,0.1)' }}>
                                    {s.val === undefined
                                        ? <span className="inline-block w-12 h-9 bg-white/5 animate-pulse rounded-lg" />
                                        : s.val}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{s.label}</p>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ── FEATURES: Vertical reveal grid ── */}
            <section id="tinh-nang" className="py-16 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto">
                    <Reveal from="bottom">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Tính năng</p>
                        <h2 className="text-3xl md:text-4xl font-black mb-10 tracking-tighter">
                            Mọi thứ bạn cần<br /><span style={{ color: '#818cf8' }}>trong một nền tảng</span>
                        </h2>
                    </Reveal>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features.map((f, i) => (
                            <Reveal key={i} delay={i * 0.09} from="bottom">
                                <div className="group p-7 rounded-2xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{ background: `radial-gradient(circle at 30% 50%, ${f.accent}18, transparent 60%)` }} />
                                    <div className="absolute top-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ background: `linear-gradient(90deg, transparent, ${f.accent}, transparent)` }} />
                                    <div className="text-4xl mb-4">{f.icon}</div>
                                    <h3 className="font-bold text-base mb-2 text-white">{f.title}</h3>
                                    <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
                                    <div className="absolute bottom-5 right-5 text-[40px] font-black tabular-nums"
                                        style={{ color: `${f.accent}15`, lineHeight: 1 }}>
                                        {String(i + 1).padStart(2, '0')}
                                    </div>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SERVICE PRICING ── */}
            <section id="bang-gia" className="py-16 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto">
                    <Reveal from="bottom">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Dịch vụ CNTT</p>
                        <h2 className="text-3xl md:text-4xl font-black mb-12 tracking-tighter">
                            Bảng giá<br /><span style={{ color: '#fbbf24' }}>sửa chữa & bơm mực</span>
                        </h2>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SERVICE_GROUPS.map(({ key, icon: Icon, accent }, gi) => {
                            const rows = services.filter(s => s.loai === key);
                            return (
                                <Reveal key={key} delay={gi * 0.1} from="bottom">
                                    <div className="rounded-2xl overflow-hidden"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}>
                                                <Icon className="w-4 h-4" style={{ color: accent }} />
                                            </div>
                                            <span className="font-bold text-sm">{key}</span>
                                            <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded" style={{ background: `${accent}15`, color: accent }}>
                                                {rows.length} mục
                                            </span>
                                        </div>
                                        {rows.length === 0 ? (
                                            <p className="px-5 py-4 text-xs text-white/20">Chưa có dữ liệu</p>
                                        ) : (
                                            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                                                {rows.map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                                                        <div className="min-w-0 flex-1 mr-4">
                                                            <p className="text-sm text-white/70 truncate">{item.noiDung}</p>
                                                            <p className="text-[10px] text-white/25 mt-0.5">{item.donViTinh}</p>
                                                        </div>
                                                        <span className="text-sm font-bold shrink-0 tabular-nums" style={{ color: accent }}>
                                                            {formatVND(item.donGia)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-20 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Reveal from="bottom">
                    <div className="max-w-3xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs font-semibold"
                            style={{ border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                            <ShieldCheck className="w-3 h-3" /> Dành cho quản trị viên
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                            Quản lý toàn bộ<br /><span style={{ color: '#818cf8' }}>từ một nơi duy nhất</span>
                        </h2>
                        <p className="text-white/40 text-base mb-8 max-w-lg mx-auto">
                            Duyệt phiếu sửa chữa, kiểm kê tài sản, xuất báo cáo Excel, và quản lý bảng giá — tất cả trong dashboard admin.
                        </p>
                        <Link href="/dashboard" prefetch={false}
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-sm transition-all hover:-translate-y-px active:scale-95"
                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 40px rgba(99,102,241,0.35)' }}>
                            Vào Dashboard Admin <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </Reveal>
            </section>

            {/* ── FOOTER ── */}
            <footer className="py-8 px-6 md:px-12" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                            <Package className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs text-white/30" suppressHydrationWarning>
                            © {new Date().getFullYear()} QLTS · Trạm Y tế Tân An Hội
                        </span>
                    </div>
                    <p className="text-xs text-white/20">
                        Phát triển bởi{' '}
                        <button onClick={() => setShowProfile(true)} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                            Trần Anh Khoa
                        </button>
                    </p>
                </div>
            </footer>

            {/* ── QR SCANNER ── */}
            {isScanning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
                    <div className="w-full max-w-sm rounded-2xl p-6 relative" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-base font-bold mb-1">Quét mã tài sản</h3>
                        <p className="text-xs text-white/30 mb-4">Đưa mã QR hoặc Barcode vào khung hình</p>
                        <QRScanner
                            onScanSuccess={(decodedText) => {
                                setIsScanning(false);
                                let finalId = decodedText.trim();
                                if (finalId.startsWith('http://') || finalId.startsWith('https://')) {
                                    try {
                                        const url = new URL(finalId);
                                        const pathParts = url.pathname.split('/').filter(Boolean);
                                        if (pathParts.length > 0) finalId = decodeURIComponent(pathParts[pathParts.length - 1]);
                                    } catch (e) { }
                                }
                                setAssetId(finalId);
                                setTimeout(() => router.push(`/lookup/${encodeURIComponent(finalId)}`), 300);
                            }}
                            onScanError={() => { }}
                        />
                    </div>
                </div>
            )}

            {/* ── PROFILE MODAL ── */}
            {showProfile && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setShowProfile(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <div className="pointer-events-auto w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="relative p-6 pb-0" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))' }}>
                                <button onClick={() => setShowProfile(false)} className="absolute top-4 right-4 p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="flex items-end gap-4 pb-6">
                                    <img src="https://raw.githubusercontent.com/lqthai97/lqthai97.github.io/refs/heads/main/anhkhoa.jpg"
                                        alt="Avatar" className="w-20 h-20 rounded-2xl object-cover ring-2 ring-indigo-500/50" />
                                    <div>
                                        <p className="font-black text-xl tracking-tight" style={{ color: '#4285F4', textShadow: '0 0 18px rgba(66,133,244,0.5)' }}>Trần Anh Khoa</p>
                                        <p className="text-xs text-indigo-400 font-semibold mt-0.5">IT Admin & Developer</p>
                                        <p className="text-xs text-white/30 mt-1">Trung tâm Y tế Củ Chi</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-white/50 leading-relaxed">
                                    Chuyên phát triển giải pháp <strong className="text-white/80">tự động hóa quy trình Y tế</strong>, giúp tối ưu thời gian và giảm thiểu sai sót trong quản lý.
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { emoji: '🛡️', label: 'Giám sát BHYT', href: 'https://tak.id.vn/DoiChieu' },
                                        { emoji: '📊', label: 'Dashboard NCT', href: null },
                                        { emoji: '⚡', label: 'Auto Utilities', href: null },
                                        { emoji: '📂', label: 'File Manager', href: null },
                                    ].map(p => (
                                        p.href ? (
                                            <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-2.5 p-3 rounded-xl transition-all hover:bg-white/[0.07] group"
                                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none' }}>
                                                <span className="text-base">{p.emoji}</span>
                                                <span className="text-xs font-semibold text-white/70 group-hover:text-[#4285F4] transition-colors">{p.label}</span>
                                                <ChevronRight className="w-3 h-3 ml-auto text-white/20 group-hover:text-[#4285F4] transition-colors" />
                                            </a>
                                        ) : (
                                            <div key={p.label} className="flex items-center gap-2.5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                <span className="text-base">{p.emoji}</span>
                                                <span className="text-xs font-semibold text-white/70">{p.label}</span>
                                            </div>
                                        )
                                    ))}
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <a href="https://zalo.me/0332185388" target="_blank"
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-white transition-all"
                                        style={{ background: 'linear-gradient(135deg,#0068ff,#0052cc)' }}>Zalo</a>
                                    <a href="tel:0332185388"
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-center text-white/70 hover:text-white transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>Gọi điện</a>
                                </div>
                                {/* Ủng hộ — compact strip */}
                                <button onClick={() => setShowBankQR(true)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.06] active:scale-[0.98]"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <span className="text-base">☕</span>
                                    <span className="text-xs font-semibold text-white/60">Ủng hộ server</span>
                                    <span className="ml-auto text-[10px] text-white/25 font-mono">Xem QR</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-white/25 shrink-0" />
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ── BANK QR POPUP (z-60, above profile modal) ── */}
            {showBankQR && (
                <>
                    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setShowBankQR(false)} />
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                        <div className="pointer-events-auto w-full max-w-xs rounded-2xl overflow-hidden shadow-2xl"
                            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                <div>
                                    <p className="text-sm font-bold">☕ Ủng hộ tác giả</p>
                                    <p className="text-[11px] text-white/35 mt-0.5">Duy trì server & phát triển tính năng</p>
                                </div>
                                <button onClick={() => setShowBankQR(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-5">
                                <img src="https://i.ibb.co/Gv1p5BQj/bank.png" className="w-full rounded-xl object-cover" alt="Bank QR" />
                                <p className="text-[11px] text-white/30 mt-3 text-center leading-relaxed">
                                    Quét mã để chuyển khoản — cảm ơn bạn đã ủng hộ! 🙏
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
