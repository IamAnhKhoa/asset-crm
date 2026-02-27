import React from 'react';

type StatusType = string;

const statusMap: Record<string, string> = {
    'đang sử dụng': 'badge-success',
    'tốt': 'badge-success',
    'đã duyệt': 'badge-success',
    'hoàn thành': 'badge-success',
    'đã sửa xong': 'badge-success',

    'cần sửa': 'badge-warning',
    'đang xử lý': 'badge-warning',
    'giao đơn vị ngoài': 'badge-warning',
    'đã giao đơn vị ngoài xử lý': 'badge-warning',

    'chờ duyệt': 'badge-info',
    'đang chờ': 'badge-info',

    'hỏng': 'badge-danger',
    'hư': 'badge-danger',
    'mất': 'badge-danger',
    'thất lạc': 'badge-danger',
    'thanh lý': 'badge-danger',

    'chưa xử lý': 'badge-slate',
    'chưa hoàn thành': 'badge-slate',
    '': 'badge-slate',
};

function getBadgeClass(status: string): string {
    const key = status.toLowerCase().trim();
    // exact match
    if (statusMap[key]) return statusMap[key];
    // partial match
    if (key.includes('tốt') || key.includes('sử dụng') || key.includes('duyệt')) return 'badge-success';
    if (key.includes('hư') || key.includes('hỏng') || key.includes('mất') || key.includes('thanh lý')) return 'badge-danger';
    if (key.includes('sửa') || key.includes('đang') || key.includes('giao')) return 'badge-warning';
    if (key.includes('chờ')) return 'badge-info';
    return 'badge-slate';
}

export function StatusBadge({ status }: { status: StatusType }) {
    const cls = getBadgeClass(status || '');
    return (
        <span className={cls}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
            {status || '—'}
        </span>
    );
}
