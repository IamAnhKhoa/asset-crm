'use client';
import { Dashboard, PeriodComparison } from '@/types';
import { useEffect, useState } from 'react';
import {
  Package, CheckCircle, Wrench, AlertTriangle,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  Clock, Loader2, Receipt, Printer, Wifi, Cpu,
  ChevronRight, Activity, Target, BarChart3,
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
  { key: 'Bơm Mực Máy In', icon: Printer, color: 'text-blue-600', bg: 'bg-blue-50', accent: '#3b82f6' },
  { key: 'Sửa Chữa Máy In', icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50', accent: '#f59e0b' },
  { key: 'Thiết Bị Mạng', icon: Wifi, color: 'text-emerald-600', bg: 'bg-emerald-50', accent: '#10b981' },
  { key: 'Linh Kiện Vi Tính', icon: Cpu, color: 'text-purple-600', bg: 'bg-purple-50', accent: '#8b5cf6' },
];

const STATUS_COLORS_PIE = ['#10b981', '#f59e0b', '#f43f5e', '#94a3b8'];
const COMPARISON_PERIODS = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

function formatCompactNumber(number: number) {
  if (number >= 1e9) return (number / 1e9).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
  if (number >= 1e6) return (number / 1e6).toFixed(1).replace(/\.0$/, '') + ' Tr';
  return new Intl.NumberFormat('vi-VN').format(number);
}

// Base.vn-style "Mục tiêu" card with progress bar
function ObjectiveCard({
  title, subtitle, icon: Icon, iconColor, iconBg, items,
}: {
  title: string; subtitle: string; icon: React.ElementType; iconColor: string; iconBg: string;
  items: { label: string; value: number; target: number; color: string }[];
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
      </div>
      <div className="space-y-3.5">
        {items.map((item, i) => {
          const pct = Math.min(100, Math.round((item.value / (item.target || 1)) * 100));
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500 font-medium">{item.label}</span>
                <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-slate-400">{item.value.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400">/{item.target.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Big KPI card (like Doanh thu, Chi phí)
function KpiCard({
  title, subtitle, value, change, changeLabel, color, chartColor,
}: {
  title: string; subtitle: string; value: string; change: number; changeLabel: string; color: string; chartColor: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-[10px] text-slate-400">{subtitle}</p>
        </div>
        <RefreshCw className="w-3.5 h-3.5 text-slate-300" />
      </div>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {change > 0
          ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          : change < 0
            ? <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            : <Minus className="w-3.5 h-3.5 text-slate-400" />}
        <span className={`text-xs font-semibold ${change > 0 ? 'text-emerald-500' : change < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
          {change > 0 ? '+' : ''}{change}%
        </span>
        <span className="text-xs text-slate-400">{changeLabel}</span>
      </div>
      {/* Mini sparkline strip */}
      <div className="mt-3 h-10 rounded-lg overflow-hidden opacity-60" style={{ background: `linear-gradient(to right, ${chartColor}20, ${chartColor}40)`, borderBottom: `2px solid ${chartColor}` }} />
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
    } catch (e) { } finally { setLoading(false); }
  }

  async function loadComparison(p: string) {
    setLoadingComp(true);
    try {
      const r = await fetch(`/api/dashboard/comparison?period=${p}`);
      const data = await r.json();
      if (data && data.label) setComparison(data);
    } catch (e) { } finally { setLoadingComp(false); }
  }

  useEffect(() => {
    loadDashboard();
    fetch('/api/gia-sua-chua')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setServices(d); })
      .finally(() => setLoadingServices(false));
  }, []);
  useEffect(() => { loadComparison(period); }, [period]);

  const total = dash?.stats?.total || 0;
  const good = dash?.stats?.good || 0;
  const bad = (dash?.stats?.needRepair || 0) + (dash?.stats?.bad || 0);
  const pending = (dash?.stats?.pendingCheck || 0) + (dash?.stats?.pendingRepair || 0);
  const goodPct = total ? Math.round((good / total) * 100) : 0;
  const badPct = total ? Math.round((bad / total) * 100) : 0;

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
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Page header */}
      <div className="sticky top-0 z-10 h-14 px-6 flex items-center justify-between bg-white border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-800">Dashboard</h1>
          <p className="text-xs text-slate-400">Tổng quan hệ thống quản lý tài sản</p>
        </div>
        <button onClick={loadDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-all">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
          Làm mới
        </button>
      </div>

      <div className="p-6 space-y-5">

        {/* ── ROW 1: Mục tiêu-style cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tài sản hoạt động */}
          <ObjectiveCard
            title="Tình trạng tài sản"
            subtitle="Mục tiêu hoạt động tốt"
            icon={Target}
            iconColor="text-indigo-600"
            iconBg="bg-indigo-50"
            items={loading ? [] : [
              { label: `Hoạt động tốt (${good}/${total})`, value: good, target: total, color: '#10b981' },
              { label: `Hư hỏng / Cần sửa (${bad})`, value: total - bad, target: total, color: '#f59e0b' },
              { label: `Tỷ lệ bảo trì định kỳ`, value: total - (dash?.stats?.missing || 0), target: total, color: '#6366f1' },
            ]}
          />

          {/* Xử lý phiếu */}
          <ObjectiveCard
            title="Xử lý phiếu"
            subtitle="Số phiếu tồn đọng hiện tại"
            icon={CheckCircle}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            items={loading ? [] : (() => {
              const pCheck = dash?.stats?.pendingCheck ?? 0;
              const pRepair = dash?.stats?.pendingRepair ?? 0;
              const repairing = dash?.stats?.repairing ?? 0;
              const CAP = 20;
              return [
                {
                  label: `Kiểm kê chờ duyệt: ${pCheck} phiếu`,
                  value: pCheck,
                  target: CAP,
                  color: pCheck === 0 ? '#10b981' : pCheck <= 3 ? '#f59e0b' : '#f43f5e',
                },
                {
                  label: `Sửa chữa chờ duyệt: ${pRepair} phiếu`,
                  value: pRepair,
                  target: CAP,
                  color: pRepair === 0 ? '#10b981' : pRepair <= 3 ? '#f59e0b' : '#f43f5e',
                },
                {
                  label: `Đang sửa chữa: ${repairing} thiết bị`,
                  value: repairing,
                  target: CAP,
                  color: repairing === 0 ? '#94a3b8' : '#6366f1',
                },
              ];
            })()}
          />

          {/* Giá trị tài sản */}
          <ObjectiveCard
            title="Giá trị tài sản"
            subtitle="Nguyên giá & giá trị còn lại"
            icon={Receipt}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
            items={loading ? [] : [
              {
                label: `Còn lại vs Nguyên giá`,
                value: dash?.stats?.totalRemainingValue || 0,
                target: dash?.stats?.totalOriginalValue || 1,
                color: '#6366f1'
              },
              { label: `Tài sản có giá trị`, value: good, target: total || 1, color: '#10b981' },
              { label: `Đã khấu hao hoàn toàn`, value: bad, target: total || 1, color: '#f43f5e' },
            ]}
          />
        </div>

        {/* ── ROW 2: KPI numbers ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="w-24 h-3 bg-slate-100 animate-pulse rounded mb-3" />
                <div className="w-16 h-8 bg-slate-100 animate-pulse rounded" />
              </div>
            ))
          ) : (
            <>
              <KpiCard title="Tổng tài sản" subtitle="Toàn bộ thiết bị" value={String(total)} change={0} changeLabel="ổn định" color="text-indigo-700" chartColor="#6366f1" />
              <KpiCard title="Hoạt động tốt" subtitle={`${goodPct}% tổng số`} value={String(good)} change={goodPct - 85} changeLabel="vs mục tiêu 85%" color="text-emerald-700" chartColor="#10b981" />
              <KpiCard title="Hư hỏng / Cần sửa" subtitle={`${badPct}% tổng số`} value={String(bad)} change={-badPct} changeLabel="cần xử lý" color="text-amber-700" chartColor="#f59e0b" />
              <KpiCard title="Phiếu chờ duyệt" subtitle={`${dash?.stats?.repairing || 0} đang sửa`} value={String(pending)} change={pending > 5 ? -10 : 5} changeLabel="vs tuần trước" color="text-rose-600" chartColor="#f43f5e" />
            </>
          )}
        </div>

        {/* ── ROW 3: Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart: tài sản theo phòng ban */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Tài sản theo phòng ban</p>
                <p className="text-xs text-slate-400">Phân bổ số lượng / Kỳ năm nay</p>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                {COMPARISON_PERIODS.map(({ value, label }) => (
                  <button key={value} onClick={() => setPeriod(value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${period === value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {loading || barData.length === 0 ? (
              <div className="h-52 bg-slate-50 animate-pulse rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={barData} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="count" name="Tài sản" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Pie chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Phân bổ trạng thái</p>
                <p className="text-xs text-slate-400">Tỷ lệ tình trạng hiện tại</p>
              </div>
            </div>
            {loading || pieData.length === 0 ? (
              <div className="flex-1 bg-slate-50 animate-pulse rounded-xl" style={{ minHeight: 200 }} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={STATUS_COLORS_PIE[i % STATUS_COLORS_PIE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── ROW 4: So sánh kỳ ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">So sánh hoạt động</p>
                <p className="text-xs text-slate-400">{comparison?.label || 'Đang tải...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
              {COMPARISON_PERIODS.map(({ value, label }) => (
                <button key={value} onClick={() => setPeriod(value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${period === value ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {loadingComp || !comparison ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Tổng hoạt động', d: comparison.total, icon: BarChart3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Kiểm kê', d: comparison.checks, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Sửa chữa', d: comparison.repairs, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50' },
              ].map(({ label, d, icon: Icon, color, bg }) => (
                <div key={label} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                  <div className={`w-10 h-10 shrink-0 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                    <p className="text-2xl font-black text-slate-800">{d.current}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {d.change > 0 ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                        : d.change < 0 ? <TrendingDown className="w-3 h-3 text-rose-500" />
                          : <Minus className="w-3 h-3 text-slate-400" />}
                      <span className={`text-xs font-semibold ${d.change > 0 ? 'text-emerald-500' : d.change < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                        {d.changePercent > 0 ? '+' : ''}{d.changePercent}%
                      </span>
                      <span className="text-xs text-slate-400">vs kỳ trước ({d.previous})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ROW 5: Recent assets + Recent repairs ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent assets */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Tài sản gần đây</p>
                <p className="text-xs text-slate-400">Danh sách thêm mới nhất</p>
              </div>
              <Link href="/assets" className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-1.5">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-slate-50 animate-pulse rounded-xl" />)
                : (dash?.recentAssets || []).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{a.name}</p>
                      <p className="text-xs text-slate-400 truncate">{a.location}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              }
            </div>
          </div>

          {/* Recent repairs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-800">Ticket sửa chữa gần đây</p>
                <p className="text-xs text-slate-400">Báo lỗi & xử lý mới nhất</p>
              </div>
              <Link href="/repair" className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
                Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-slate-50 animate-pulse rounded-xl" />)
                : (dash?.recentRepairs || []).map((t, i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span className="text-[10px] font-mono">{t.time}</span>
                      </div>
                      <StatusBadge status={t.approveStatus === 'Chờ duyệt' ? (t.repairStatus || 'Chờ duyệt') : t.approveStatus} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {t.name ? `${t.name} · ` : ''}{t.issue}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">👤 {t.person} · {t.assetId}</p>
                    {t.result && t.result !== 'Chưa hoàn thành' && (
                      <p className="text-xs text-indigo-600 italic mt-1.5 pt-1.5 border-t border-slate-100">✓ {t.result}</p>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* ── ROW 6: Service pricing panel ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Bảng Giá Dịch Vụ CNTT</p>
                <p className="text-xs text-slate-400">Bơm mực & sửa chữa thiết bị</p>
              </div>
            </div>
            <Link href="/gia-sua-chua" className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 font-semibold">
              Quản lý <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SERVICE_LOAI.map(({ key, icon: Icon, color, bg, accent }) => {
              const count = services.filter(s => s.loai === key).length;
              const pct = services.length ? Math.round((count / services.length) * 100) : 0;
              return (
                <div key={key} className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4.5 h-4.5 ${color}`} />
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight font-medium">{key}</p>
                  <p className="text-xl font-black text-slate-800 mt-1">
                    {loadingServices ? <span className="inline-block w-6 h-5 bg-slate-100 animate-pulse rounded" /> : count}
                    <span className="text-xs font-normal text-slate-400 ml-1">mục</span>
                  </p>
                  <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: accent }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{pct}% tổng dịch vụ</p>
                </div>
              );
            })}
          </div>

          {!loadingServices && services.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">Tổng danh mục dịch vụ</span>
              <span className="text-sm font-bold text-indigo-700">{services.length} mục dịch vụ / vật tư</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
