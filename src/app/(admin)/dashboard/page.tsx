'use client';
import { Dashboard, PeriodComparison } from '@/types';
import { useEffect, useState } from 'react';
import {
  Package, CheckCircle, Wrench, AlertTriangle,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  ClipboardCheck, Clock, Loader2, Receipt, Printer, Wifi, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface ServiceItem {
  row: number; loai: string; noiDung: string; donViTinh: string;
  donGia: number; ghiChu: string; ngayCapNhat: string;
}

const SERVICE_LOAI = [
  { key: 'Bơm Mực Máy In', icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'Sửa Chữa Máy In', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'Thiết Bị Mạng', icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'Linh Kiện Vi Tính', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50' },
];

const SERVICE_BAR_COLORS: Record<string, string> = {
  'Bơm Mực Máy In': '#3b82f6',
  'Sửa Chữa Máy In': '#f59e0b',
  'Thiết Bị Mạng': '#10b981',
  'Linh Kiện Vi Tính': '#8b5cf6',
};

const STATUS_COLORS_PIE = ['#10b981', '#f59e0b', '#f43f5e', '#94a3b8'];
const COMPARISON_PERIODS = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

function formatCompactNumber(number: number) {
  if (number >= 1e9) {
    return (number / 1e9).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
  }
  if (number >= 1e6) {
    return (number / 1e6).toFixed(1).replace(/\.0$/, '') + ' Tr';
  }
  return new Intl.NumberFormat('vi-VN').format(number);
}

function SkeletonCard() {
  return (
    <div className="stat-card">
      <div className="skeleton h-3 w-24 mb-2" />
      <div className="skeleton h-8 w-16" />
      <div className="skeleton h-3 w-20 mt-1" />
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className={`text-2xl font-bold mt-1 truncate ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-50').replace('-500', '-50')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function ComparisonWidget({ data, period }: { data: PeriodComparison | null; period: string }) {
  if (!data) return <div className="skeleton h-24 rounded-2xl" />;

  function Arrow({ val }: { val: number }) {
    if (val > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (val < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  }

  const items = [
    { label: 'Tổng hoạt động', d: data.total },
    { label: 'Kiểm kê', d: data.checks },
    { label: 'Sửa chữa', d: data.repairs },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {items.map(({ label, d }) => (
        <div key={label} className="card p-4">
          <p className="text-xs text-slate-500 mb-2">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{d.current}</p>
          <div className="flex items-center gap-1 mt-1">
            <Arrow val={d.change} />
            <span className={`text-xs font-medium ${d.change > 0 ? 'text-emerald-600' : d.change < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {d.changePercent > 0 ? '+' : ''}{d.changePercent}%
            </span>
            <span className="text-xs text-slate-400">vs kỳ trước ({d.previous})</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [loadingComp, setLoadingComp] = useState(false);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  async function loadDashboard() {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard');
      const data = await r.json();
      if (data && data.stats) setDash(data);
    } catch (e) {
      // Google Sheets not connected yet
    } finally {
      setLoading(false);
    }
  }

  async function loadComparison(p: string) {
    setLoadingComp(true);
    try {
      const r = await fetch(`/api/dashboard/comparison?period=${p}`);
      const data = await r.json();
      if (data && data.label) setComparison(data);
    } catch (e) { } finally {
      setLoadingComp(false);
    }
  }

  async function loadServices() {
    setLoadingServices(true);
    try {
      const r = await fetch('/api/gia-sua-chua');
      const data = await r.json();
      if (Array.isArray(data)) setServices(data);
    } catch (e) { } finally { setLoadingServices(false); }
  }

  useEffect(() => { loadDashboard(); loadServices(); }, []);
  useEffect(() => { loadComparison(period); }, [period]);

  const serviceBarData = SERVICE_LOAI.map(({ key }) => ({
    name: key.split(' ').slice(-2).join(' '),
    fullName: key,
    count: services.filter(s => s.loai === key).length,
    avgGia: services.filter(s => s.loai === key).length
      ? Math.round(services.filter(s => s.loai === key).reduce((a, s) => a + s.donGia, 0) /
        services.filter(s => s.loai === key).length)
      : 0,
  }));

  const pieData = dash ? [
    { name: 'Tốt', value: dash.stats.good },
    { name: 'Cần sửa', value: dash.stats.needRepair },
    { name: 'Hỏng', value: dash.stats.bad },
    { name: 'Mất', value: dash.stats.missing },
  ].filter(d => d.value > 0) : [];

  const barData = dash
    ? Object.entries(dash.deptCounts).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white/80 backdrop-blur-sm border-b border-slate-100">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Tổng quan hệ thống quản lý tài sản</p>
        </div>
        <button onClick={loadDashboard} className="btn-icon btn-ghost" title="Làm mới">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`} />
        </button>
      </div>

      <div className="p-6 space-y-6">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : dash ? (
            <>
              <StatCard label="Tổng tài sản" value={dash.stats.total} icon={Package} color="text-indigo-600" sub={`${Object.keys(dash.deptCounts).length} phòng ban`} />
              <StatCard label="Đang tốt" value={dash.stats.good} icon={CheckCircle} color="text-emerald-600" sub={`${Math.round((dash.stats.good / (dash.stats.total || 1)) * 100)}% tổng số`} />
              <StatCard label="Cần sửa / Hỏng" value={dash.stats.needRepair + dash.stats.bad} icon={AlertTriangle} color="text-amber-600" sub={`${dash.stats.missing} mất / thất lạc`} />
              <StatCard label="Chờ xác nhận" value={dash.stats.pendingCheck + dash.stats.pendingRepair} icon={Clock} color="text-rose-500" sub={`${dash.stats.repairing} đang sửa`} />
              <StatCard label="Tổng nguyên giá" value={formatCompactNumber(dash.stats.totalOriginalValue || 0)} icon={TrendingUp} color="text-emerald-600" sub="VNĐ" />
              <StatCard label="Tổng còn lại" value={formatCompactNumber(dash.stats.totalRemainingValue || 0)} icon={TrendingDown} color="text-indigo-600" sub="VNĐ" />
            </>
          ) : null}
        </div>

        {/* Period Comparison */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">So sánh cùng kỳ</p>
              <p className="section-subtitle">{comparison?.label || '...'}</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {COMPARISON_PERIODS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150
                    ${period === value ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {loadingComp
            ? <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
            : <ComparisonWidget data={comparison} period={period} />
          }
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="lg:col-span-2 card p-5">
            <p className="section-title mb-4">Tài sản theo phòng ban</p>
            {loading || barData.length === 0 ? (
              <div className="skeleton h-48 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="count" name="Tài sản" fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="card p-5">
            <p className="section-title mb-4">Phân bổ trạng thái</p>
            {loading || pieData.length === 0 ? (
              <div className="skeleton h-48 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={STATUS_COLORS_PIE[index % STATUS_COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent assets */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="section-title">Tài sản gần đây</p>
              <Link href="/assets" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Xem tất cả →</Link>
            </div>
            <div className="space-y-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)
                : (dash?.recentAssets || []).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate">{a.location}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              }
            </div>
          </div>

          {/* Recent repairs */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="section-title">Ticket sửa chữa gần đây</p>
                <p className="section-subtitle">Hiển thị các báo lỗi & xử lý mới nhất</p>
              </div>
              <Link href="/repair" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Xem tất cả →</Link>
            </div>
            <div className="space-y-4">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)
                : (dash?.recentRepairs || []).map((t, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:border-indigo-100 transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs font-mono">{t.time}</span>
                      </div>
                      <StatusBadge status={t.approveStatus === 'Chờ duyệt' ? (t.repairStatus || 'Chờ duyệt') : t.approveStatus} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase shrink-0 w-24">Lỗi / yêu cầu:</span>
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {t.name ? `${t.name} (${t.assetId})` : t.assetId}: {t.issue}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase shrink-0 w-24">Người báo:</span>
                        <p className="text-sm text-slate-600 font-medium">{t.person}</p>
                      </div>

                      {t.result && t.result !== 'Chưa hoàn thành' && (
                        <div className="flex gap-2 pt-1 border-t border-slate-100 mt-2">
                          <span className="text-xs font-bold text-indigo-400 uppercase shrink-0 w-24">Xử lý:</span>
                          <p className="text-sm text-indigo-600 font-medium italic">{t.result}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Service Pricing Panel */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="section-title">Bảng Giá Dịch Vụ</p>
              <p className="section-subtitle">Bơm mực & sửa chữa thiết bị tin học</p>
            </div>
            <Link href="/gia-sua-chua" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Quản lý →</Link>
          </div>

          {loadingServices ? (
            <div className="skeleton h-32 rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-3">
                {SERVICE_LOAI.map(({ key, icon: Icon, color, bg }) => (
                  <div key={key} className="p-3 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <p className="text-xs text-slate-500 leading-tight mb-0.5">{key}</p>
                    <p className="text-lg font-bold text-slate-800">
                      {services.filter(s => s.loai === key).length}
                      <span className="text-xs font-normal text-slate-400 ml-1">mục</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">Số mục theo nhóm</p>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={serviceBarData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }}
                    />
                    <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                      {serviceBarData.map((entry) => (
                        <Cell key={entry.fullName} fill={SERVICE_BAR_COLORS[entry.fullName] || '#818cf8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Total */}
          {!loadingServices && services.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Tổng số mục dịch vụ</span>
              <span className="text-sm font-bold text-indigo-700">{services.length} dịch vụ / vật tư</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
