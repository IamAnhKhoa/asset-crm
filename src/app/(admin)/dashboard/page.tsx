'use client';
import { Dashboard, PeriodComparison } from '@/types';
import { useEffect, useState } from 'react';
import {
  Package, CheckCircle, Wrench, AlertTriangle,
  TrendingUp, TrendingDown, Minus, RefreshCw,
  ClipboardCheck, Clock, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

const STATUS_COLORS_PIE = ['#10b981', '#f59e0b', '#f43f5e', '#94a3b8'];
const COMPARISON_PERIODS = [
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
];

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
}: { label: string; value: number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="stat-card card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-').replace('-600', '-50').replace('-500', '-50')}`}>
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
    <div className="grid grid-cols-3 gap-3">
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

  useEffect(() => { loadDashboard(); }, []);
  useEffect(() => { loadComparison(period); }, [period]);

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : dash ? (
            <>
              <StatCard label="Tổng tài sản" value={dash.stats.total} icon={Package} color="text-indigo-600" sub={`${Object.keys(dash.deptCounts).length} phòng ban`} />
              <StatCard label="Đang tốt" value={dash.stats.good} icon={CheckCircle} color="text-emerald-600" sub={`${Math.round((dash.stats.good / (dash.stats.total || 1)) * 100)}% tổng số`} />
              <StatCard label="Cần sửa / Hỏng" value={dash.stats.needRepair + dash.stats.bad} icon={AlertTriangle} color="text-amber-600" sub={`${dash.stats.missing} mất / thất lạc`} />
              <StatCard label="Chờ xác nhận" value={dash.stats.pendingCheck + dash.stats.pendingRepair} icon={Clock} color="text-rose-500" sub={`${dash.stats.repairing} đang sửa`} />
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
              <p className="section-title">Phiếu sửa chữa mới</p>
              <Link href="/repair" className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Xem tất cả →</Link>
            </div>
            <div className="space-y-2">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)
                : (dash?.recentRepairs || []).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.assetId} – {t.issue}</p>
                      <p className="text-xs text-slate-400">{t.person} · {t.time}</p>
                    </div>
                    <StatusBadge status={t.approveStatus} />
                  </div>
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
