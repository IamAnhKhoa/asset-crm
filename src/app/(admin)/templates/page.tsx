'use client';
import { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle, FileSignature, PackageCheck, Wrench, History } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Template {
    id: string;
    label: string;
    description: string;
    icon: any;
    color: string;
    category: string;
}

const TEMPLATES: Template[] = [
    {
        id: 'de-xuat-sua-chua',
        label: 'Đề xuất sửa chữa tài sản',
        description: 'Mẫu văn bản đề nghị cấp có thẩm quyền xem xét, phê duyệt việc sửa chữa tài sản công.',
        icon: Wrench,
        color: 'amber',
        category: 'Sửa chữa',
    },
    {
        id: 'ban-giao-chieu-di',
        label: 'Biên bản bàn giao tài sản (Bên giao)',
        description: 'Mẫu biên bản ghi nhận quá trình bàn giao tài sản từ đơn vị/cá nhân chủ quản sang bên tiếp nhận.',
        icon: FileSignature,
        color: 'rose',
        category: 'Bàn giao',
    },
    {
        id: 'ban-giao-chieu-nhan',
        label: 'Biên bản tiếp nhận tài sản (Bên nhận)',
        description: 'Mẫu biên bản xác nhận tiếp nhận tài sản từ đơn vị bàn giao, ghi rõ hiện trạng khi nhận.',
        icon: PackageCheck,
        color: 'emerald',
        category: 'Bàn giao',
    },
    {
        id: 'phieu-nhan-tai-san',
        label: 'Phiếu nhận tài sản cá nhân',
        description: 'Mẫu phiếu xác nhận cá nhân đã nhận giữ và chịu trách nhiệm sử dụng tài sản được phân công.',
        icon: CheckCircle,
        color: 'indigo',
        category: 'Quản lý',
    },
];

const COLOR_MAP: Record<string, { bg: string; icon: string; badge: string; btn: string }> = {
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600 bg-amber-100', badge: 'bg-amber-100 text-amber-700', btn: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' },
    rose: { bg: 'bg-rose-50', icon: 'text-rose-600 bg-rose-100', badge: 'bg-rose-100 text-rose-700', btn: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' },
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600 bg-emerald-100', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600 bg-indigo-100', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' },
};

export default function TemplatesPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState<string | null>(null);
    const [done, setDone] = useState<string | null>(null);

    async function handleDownload(template: Template) {
        setLoading(template.id);
        setDone(null);

        // Log the download
        await fetch('/api/templates/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateId: template.id, templateName: template.label }),
        }).catch(() => { });

        // Generate and download the DOCX file
        try {
            const res = await fetch(`/api/templates/generate?id=${template.id}`);
            if (!res.ok) throw new Error('Generation failed');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${template.id}.docx`;
            link.click();
            setDone(template.id);
            setTimeout(() => setDone(null), 3000);
        } catch {
            alert('Không thể tạo mẫu. Vui lòng thử lại sau.');
        } finally {
            setLoading(null);
        }
    }

    const categories = [...new Set(TEMPLATES.map(t => t.category))];

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 min-h-0">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900">Mẫu Gửi & Biểu Mẫu</h1>
                            <p className="text-xs text-slate-500">Theo Mẫu số 01-05/TSNN ban hành theo Thông tư 45/2018/TT-BTC</p>
                        </div>
                    </div>
                    <div className="mt-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 leading-relaxed">
                        <strong>Lưu ý:</strong> Các mẫu biểu dưới đây được tạo tự động theo định dạng văn bản hành chính Việt Nam hiện hành. Sau khi tải về, anh/chị vui lòng điền thêm thông tin cụ thể vào các ô trống và ký xác nhận trước khi lưu hành.
                    </div>
                </div>

                {/* Templates by category */}
                {categories.map(cat => (
                    <div key={cat} className="mb-8">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="w-1 h-4 bg-slate-300 rounded-full"></div>
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{cat}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {TEMPLATES.filter(t => t.category === cat).map(template => {
                                const c = COLOR_MAP[template.color];
                                const Icon = template.icon;
                                const isLoading = loading === template.id;
                                const isDone = done === template.id;
                                return (
                                    <div
                                        key={template.id}
                                        className="bg-white rounded-[1.5rem] border border-slate-200/70 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider ${c.badge}`}>{template.category}</span>
                                                </div>
                                                <p className="text-sm font-bold text-slate-900 leading-snug">{template.label}</p>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-500 leading-relaxed">{template.description}</p>

                                        <button
                                            onClick={() => handleDownload(template)}
                                            disabled={isLoading}
                                            className={`w-full h-11 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] disabled:opacity-60 ${c.btn}`}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : isDone ? (
                                                <><CheckCircle className="w-4 h-4" /> Đã tải về!</>
                                            ) : (
                                                <><Download className="w-4 h-4" /> Tải mẫu (.docx)</>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Download History for admin */}
                {session?.user?.role === 'admin_full' && (
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-4 px-1">
                            <div className="w-1 h-4 bg-indigo-300 rounded-full"></div>
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">Lịch sử tải mẫu (Admin)</h2>
                        </div>
                        <DownloadHistory />
                    </div>
                )}
            </div>
        </div>
    );
}

function DownloadHistory() {
    const [logs, setLogs] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    async function load() {
        setLoading(true);
        const res = await fetch('/api/templates/log');
        const data = await res.json();
        setLogs(data.logs || []);
        setLoaded(true);
        setLoading(false);
    }

    if (!loaded) return (
        <button onClick={load} disabled={loading} className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 text-xs font-bold rounded-2xl hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
            Xem lịch sử tải mẫu
        </button>
    );

    return (
        <div className="bg-white rounded-[1.5rem] border border-slate-200/70 shadow-sm overflow-hidden">
            {!logs || logs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Chưa có lịch sử tải mẫu nào.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase">Thời gian</th>
                                <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase">Người dùng</th>
                                <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase">Phòng ban</th>
                                <th className="text-left px-4 py-2.5 text-slate-400 font-bold uppercase">Mẫu tải</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {logs.slice().reverse().map((log, i) => (
                                <tr key={i} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-slate-500 font-mono">{log.time}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700">{log.user}</td>
                                    <td className="px-4 py-3 text-slate-500">{log.dept}</td>
                                    <td className="px-4 py-3 text-indigo-600 font-medium">{log.templateName}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
