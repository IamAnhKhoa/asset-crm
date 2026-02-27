import { NextRequest, NextResponse } from 'next/server';
import { createCheckReport } from '@/lib/history';
import { createRepairTicket } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, assetId, person, note, issue, location } = body;

        if (!assetId || !person) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        let result;
        if (type === 'check') {
            result = await createCheckReport({ assetId, reporter: person, status: 'Đang sử dụng', note: note || '', location: location || '' });
        } else if (type === 'repair') {
            if (!issue) return NextResponse.json({ error: 'Thiếu mô tả lỗi' }, { status: 400 });
            result = await createRepairTicket({ assetId, reporter: person, issue, note: note || '', location: location || '' });
        } else {
            return NextResponse.json({ error: 'Loại báo cáo không hợp lệ' }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
