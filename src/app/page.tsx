'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Package, CheckCircle, AlertTriangle, Clock, Search, Link as LinkIcon, Loader2, Camera, X, Printer, Wrench, Wifi, Cpu, Receipt, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Dashboard } from '@/types';
import Link from 'next/link';
import QRScanner from '@/components/QRScanner';

interface ServiceItem {
    loai: string; noiDung: string; donViTinh: string;
    donGia: number; ghiChu: string;
}

const SERVICE_GROUPS = [
    { key: 'Bơm Mực Máy In', icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', header: 'bg-blue-500' },
    { key: 'Sửa Chữa Máy In', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', header: 'bg-amber-500' },
    { key: 'Thiết Bị Mạng', icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', header: 'bg-emerald-500' },
    { key: 'Linh Kiện Vi Tính', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', header: 'bg-purple-500' },
];

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

export default function PublicDashboard() {
    const [dash, setDash] = useState<Dashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<ServiceItem[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);
    const [assetId, setAssetId] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/dashboard')
            .then(r => r.json())
            .then(d => { if (d && d.stats) setDash(d); })
            .finally(() => setLoading(false));
        fetch('/api/gia-sua-chua')
            .then(r => r.json())
            .then(d => { if (Array.isArray(d)) setServices(d); })
            .finally(() => setLoadingServices(false));
    }, []);

    function handleSearch(e: FormEvent) {
        e.preventDefault();
        if (assetId.trim()) {
            setIsSearching(true);
            router.push(`/lookup/${encodeURIComponent(assetId.trim())}`);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-indigo-600/20 shadow-lg">
                        <Package className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-slate-900 leading-tight tracking-tight">Quản lý Tài Sản</h1>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">Trạm Y tế Tân An Hội</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <a href="#bang-gia" className="text-sm font-medium text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors">
                        <Receipt className="w-3.5 h-3.5" /> Bảng Giá Dịch Vụ
                    </a>
                    <Link href="/dashboard" prefetch={false} className="group relative flex items-center gap-2 pl-1 pr-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white rounded-full transition-all duration-300 shadow-[0_4px_12px_rgba(79,70,229,0.3)] hover:shadow-[0_8px_20px_rgba(79,70,229,0.4)] hover:-translate-y-0.5 active:scale-95">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                            <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-bold tracking-tight">Đăng nhập</span>
                    </Link>
                </div>
            </header>

            {/* Hero / Search */}
            <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 text-white px-6 py-16 md:py-24 text-center">
                <div className="max-w-2xl mx-auto space-y-6">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Tra cứu Tài Sản Nhanh</h2>
                    <p className="text-indigo-200 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                        Nhập mã tài sản hoặc dùng điện thoại quét mã QR dán trên thiết bị để xem thông tin, lịch sử bảo trì &amp; gửi báo cáo kiểm kê.
                    </p>

                    <form onSubmit={handleSearch} className="mt-8 max-w-md mx-auto relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            autoFocus
                            className="w-full pl-12 pr-[150px] py-4 rounded-2xl bg-white text-slate-900 shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all font-mono text-lg uppercase"
                            placeholder="VD: MAYIN-001..."
                            value={assetId}
                            onChange={e => setAssetId(e.target.value.toUpperCase())}
                        />
                        <button
                            type="button"
                            onClick={() => setIsScanning(true)}
                            className="absolute right-[110px] top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-white rounded-lg hover:bg-indigo-50"
                            title="Quét mã QR / Barcode"
                        >
                            <Camera className="w-6 h-6" />
                        </button>
                        <button
                            type="submit"
                            disabled={!assetId.trim() || isSearching}
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center min-w-[94px]"
                        >
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tra cứu'}
                        </button>
                    </form>

                    {/* Scanner Modal */}
                    {isScanning && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
                            <div className="bg-white rounded-2xl p-4 w-full max-w-md relative">
                                <button
                                    onClick={() => setIsScanning(false)}
                                    className="absolute -top-12 right-0 p-2 text-white hover:text-red-400 transition-colors"
                                >
                                    <X className="w-8 h-8" />
                                </button>
                                <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Quét mã tài sản</h3>
                                <QRScanner
                                    onScanSuccess={(decodedText) => {
                                        setIsScanning(false);
                                        let finalId = decodedText.trim();

                                        // If the QR code is a full URL, extract the ID
                                        if (finalId.startsWith('http://') || finalId.startsWith('https://')) {
                                            try {
                                                const url = new URL(finalId);
                                                const pathParts = url.pathname.split('/').filter(Boolean);
                                                if (pathParts.length > 0) {
                                                    finalId = decodeURIComponent(pathParts[pathParts.length - 1]);
                                                }
                                            } catch (e) {
                                                console.error("Lỗi parse URL từ QR", e);
                                            }
                                        }

                                        setAssetId(finalId);
                                        // Automatically search after a brief delay
                                        setTimeout(() => {
                                            router.push(`/lookup/${encodeURIComponent(finalId)}`);
                                        }, 500);
                                    }}
                                    onScanError={(err) => { /* ignore constant scan errors */ }}
                                />
                                <p className="text-sm text-slate-500 text-center mt-4">
                                    Đưa mã QR hoặc Barcode vảo khung hình để quét tự động
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Stats Summary */}
            <section className="px-6 py-12 flex-1 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="section-title">Tổng quan hệ thống</h3>
                    {loading && <div className="skeleton w-24 h-4 rounded-md" />}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng tài sản', val: dash?.stats?.total, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Hoạt động tốt', val: dash?.stats?.good, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Hư hỏng / Cần sửa', val: dash ? (dash.stats.needRepair + dash.stats.bad) : undefined, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
                        { label: 'Phiếu chờ duyệt', val: dash ? (dash.stats.pendingCheck + dash.stats.pendingRepair) : undefined, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50' },
                    ].map((s, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`w-5 h-5 ${s.color}`} />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-slate-800 tracking-tight">
                                {s.val === undefined ? <span className="inline-block w-16 h-8 bg-slate-100 animate-pulse rounded-lg" /> : s.val}
                            </div>
                            <p className="text-13px text-slate-500 font-medium mt-1">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Service Pricing Section */}
            <section id="bang-gia" className="px-6 py-12 bg-white border-t border-slate-100">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="section-title">Bảng Giá Dịch Vụ CNTT</h3>
                            <p className="section-subtitle">Bơm mực máy in &amp; sửa chữa thiết bị</p>
                        </div>
                    </div>

                    {loadingServices ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {SERVICE_GROUPS.map(({ key, icon: Icon, color, bg, header }) => {
                                const rows = services.filter(s => s.loai === key);
                                if (rows.length === 0) return null;
                                return (
                                    <div key={key} className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className={`${header} px-4 py-2.5 flex items-center gap-2 text-white`}>
                                            <Icon className="w-4 h-4" />
                                            <span className="font-semibold text-sm">{key}</span>
                                        </div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Nội Dung</th>
                                                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 w-20">Đơn Vị</th>
                                                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 w-32">Đơn Giá</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {rows.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-slate-700">{item.noiDung}</td>
                                                        <td className="px-4 py-2.5 text-slate-500 text-xs">{item.donViTinh}</td>
                                                        <td className="px-4 py-2.5 text-right font-semibold text-indigo-700">{formatVND(item.donGia)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Footer */}
            <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
                <p suppressHydrationWarning>&copy; {new Date().getFullYear()} Hệ thống Quản lý Tài Sản Trạm Y tế Tân An Hội</p>
                <p className="mt-1">
                    Developed by <button onClick={() => setShowProfile(true)} className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors">Trần Anh Khoa</button>
                </p>
            </footer>

            {/* Author Profile Modal */}
            {showProfile && (
                <>
                    <div className="profile-overlay" onClick={() => setShowProfile(false)} />
                    <div className="profile-container">
                        <button className="close-overlay" id="close-profile" onClick={() => setShowProfile(false)}>✕</button>

                        <div className="profile-sidebar">
                            <img src="https://raw.githubusercontent.com/lqthai97/lqthai97.github.io/refs/heads/main/anhkhoa.jpg" alt="Avatar" className="profile-avatar" />
                            <h2 className="profile-name">Trần Anh Khoa</h2>
                            <p className="profile-role">IT Admin &amp; Developer</p>
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '20px' }}>Trung tâm Y tế Củ Chi</p>

                            <div className="social-links">
                                <a href="https://zalo.me/0332185388" target="_blank" className="social-btn btn-zalo">Zalo</a>
                                <a href="tel:0332185388" className="social-btn btn-call">Gọi điện</a>
                            </div>
                        </div>

                        <div className="profile-content">
                            <div className="section-title-profile">Giới thiệu</div>
                            <p className="profile-bio">
                                Chào bạn, tôi chuyên phát triển các giải pháp <strong>Tự động hóa quy trình Y tế</strong>, giúp tối ưu hóa thời gian và giảm thiểu sai sót. Mục tiêu của tôi là mang công nghệ dữ liệu áp dụng thực tiễn vào công việc quản lý KCB BHYT.
                            </p>

                            <div className="section-title-profile">Dự án nổi bật</div>
                            <div className="project-grid">
                                <div className="project-card">
                                    <h4>🛡️ Giám sát BHYT</h4>
                                    <p>Phát hiện lỗi XML, cảnh báo xuất toán trước khi gửi giám định.</p>
                                </div>
                                <div className="project-card">
                                    <h4>📊 Dashboard NCT</h4>
                                    <p>Hệ thống báo cáo, quản lý lịch khám sức khỏe người cao tuổi.</p>
                                </div>
                                <div className="project-card">
                                    <h4>⚡ Auto Utilities</h4>
                                    <p>Script xử lý dữ liệu, chuẩn hóa danh sách tự động.</p>
                                </div>
                                <div className="project-card">
                                    <h4>📂 File Manager 2.0</h4>
                                    <p>Số hóa văn bản, quản lý hồ sơ tập trung.</p>
                                </div>
                            </div>

                            <div className="donate-box">
                                <img src="https://i.ibb.co/Gv1p5BQj/bank.png" className="donate-qr-thumb" id="qr-thumb" title="Click để phóng to" />
                                <div>
                                    <strong style={{ color: '#d97706' }}>Ủng hộ tác giả</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f' }}>Mọi sự đóng góp là động lực để duy trì Server và phát triển tính năng mới.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
