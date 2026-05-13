import { Dashboard, DashboardStats, PeriodComparison, ComparisonData } from '@/types';
import { getAllAssets } from './assets';
import { getAllRepairTickets, getPendingCounts, getCheckHistory } from './history';
import { parseViDate } from './date-utils';
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
        totalOriginalValue: 0,
        totalRemainingValue: 0,
    };

    for (const a of assets) {
        const loc = a.location || '';
        if (loc) { depts[loc] = (depts[loc] || 0) + 1; }
        stats.total += (a.quantity || 1);
        if (a.originalPrice) {
            const qty = a.quantity || 1;
            stats.totalOriginalValue! += a.originalPrice * qty;
            const currentYear = new Date().getFullYear();
            const yearNum = Number(a.year);
            if (!isNaN(yearNum)) {
                const yearsUsed = currentYear - yearNum;
                const remainingPercent = Math.max(0, 1 - 0.2 * yearsUsed);
                stats.totalRemainingValue! += a.originalPrice * qty * remainingPercent;
            }
        }
        const st = (a.status || '').trim();

        if (st === 'Hỏng' || st === 'Thanh lý' || st === 'Mất / Thất lạc') {
            if (st === 'Hỏng' || st === 'Thanh lý') stats.bad++;
            if (st === 'Mất / Thất lạc') stats.missing++;
        }
        else if (st === 'Cần sửa' || st === 'Đang sửa chữa') {
            stats.needRepair++;
        }
        else {
            stats.good++;
        }
    }

    for (const t of tickets) {
        const rs = (t.repairStatus || '').trim();
        const as = (t.approveStatus || '').trim();

        if (rs === 'Đang xử lý' || rs === 'Đã giao đơn vị ngoài xử lý') {
            stats.repairing++;
        }
        // Count anything not handled yet as waitingFix
        if (rs === 'Chưa xử lý' || as === 'Chờ duyệt') {
            stats.waitingFix++;
        }
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
