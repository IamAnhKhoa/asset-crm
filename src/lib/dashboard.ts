import { Dashboard, DashboardStats, PeriodComparison, ComparisonData } from '@/types';
import { getAllAssets } from './assets';
import { getAllRepairTickets, getPendingCounts, getCheckHistory } from './history';
import { parseViDate } from './sheets';
import {
    startOfWeek, endOfWeek, startOfMonth, endOfMonth,
    startOfYear, endOfYear, subWeeks, subMonths, subYears,
    isWithinInterval,
} from 'date-fns';

export async function getDashboardStats(): Promise<Dashboard> {
    const [assets, tickets, pending] = await Promise.all([
        getAllAssets(),
        getAllRepairTickets(),
        getPendingCounts(),
    ]);

    const depts: Record<string, number> = {};
    const stats: DashboardStats = {
        total: 0, good: 0, bad: 0, needRepair: 0, missing: 0,
        pendingCheck: pending.kiemke,
        pendingRepair: pending.suachua,
        repairing: 0,
        waitingFix: 0,
    };

    for (const a of assets) {
        const loc = a.location || '';
        if (loc) { depts[loc] = (depts[loc] || 0) + 1; }
        stats.total++;
        const st = (a.status || '').toLowerCase();
        if (st.includes('hư') || st.includes('thanh lý') || st.includes('hong')) stats.bad++;
        else if (st.includes('sửa') || st.includes('cần')) stats.needRepair++;
        else if (st.includes('mất') || st.includes('thất lạc')) stats.missing++;
        else stats.good++;
    }

    for (const t of tickets) {
        const rs = (t.repairStatus || '').toLowerCase();
        const as = (t.approveStatus || '').toLowerCase();
        if (rs.includes('đang xử lý') || rs.includes('giao đơn vị ngoài')) stats.repairing++;
        if (rs.includes('chưa xử lý') || as.includes('chờ duyệt')) stats.waitingFix++;
    }

    const recentAssets = assets.slice(Math.max(0, assets.length - 5)).reverse();
    const recentRepairs = tickets.slice(0, 5);

    return {
        stats,
        departments: Object.keys(depts),
        deptCounts: depts,
        recentAssets,
        recentRepairs,
    };
}

export type ComparisonPeriod = 'week' | 'month' | 'year';

function getInterval(period: ComparisonPeriod, offset: 0 | -1) {
    const now = new Date();
    const ref = offset === -1
        ? period === 'week' ? subWeeks(now, 1) : period === 'month' ? subMonths(now, 1) : subYears(now, 1)
        : now;
    const start = period === 'week' ? startOfWeek(ref, { weekStartsOn: 1 })
        : period === 'month' ? startOfMonth(ref) : startOfYear(ref);
    const end = period === 'week' ? endOfWeek(ref, { weekStartsOn: 1 })
        : period === 'month' ? endOfMonth(ref) : endOfYear(ref);
    return { start, end };
}

function makeComparison(current: number, previous: number): ComparisonData {
    const change = current - previous;
    const changePercent = previous === 0 ? 0 : Math.round((change / previous) * 100);
    return { current, previous, change, changePercent };
}

export async function getPeriodComparison(period: ComparisonPeriod): Promise<PeriodComparison> {
    const [tickets, checks] = await Promise.all([
        getAllRepairTickets(),
        getCheckHistory(),
    ]);

    const cur = getInterval(period, 0);
    const prev = getInterval(period, -1);

    function countInRange(arr: { time?: string }[], range: { start: Date; end: Date }) {
        return arr.filter((item) => {
            if (!item.time) return false;
            const d = parseViDate(item.time);
            if (!d) return false;
            return isWithinInterval(d, { start: range.start, end: range.end });
        }).length;
    }

    const labels: Record<ComparisonPeriod, string> = {
        week: 'Tuần này vs tuần trước',
        month: 'Tháng này vs tháng trước',
        year: 'Năm nay vs năm trước',
    };

    const curChecks = countInRange(checks, cur);
    const prevChecks = countInRange(checks, prev);
    const curRepairs = countInRange(tickets, cur);
    const prevRepairs = countInRange(tickets, prev);

    return {
        label: labels[period],
        total: makeComparison(curChecks + curRepairs, prevChecks + prevRepairs),
        checks: makeComparison(curChecks, prevChecks),
        repairs: makeComparison(curRepairs, prevRepairs),
    };
}
