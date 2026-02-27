import { NextResponse } from 'next/server';
import {
    getAllNotifications,
    addNotification,
    updateNotification,
    deleteNotification
} from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('active') === 'true';

        // Lấy tất cả, ở component Marquee thì sẽ lọc active trên frontend hoặc query riêng.
        const notifications = await getAllNotifications();

        if (activeOnly) {
            const now = new Date();
            const activeList = notifications.filter(n => {
                if (!n.isActive) return false;

                // Parse dates to absolute timestamps enforcing GMT+7 timezone
                const parseDate = (dStr: string) => {
                    if (!dStr || dStr === '—') return null;
                    const parts = dStr.split(' ');
                    const dates = parts[0].split('/');
                    if (dates.length !== 3) return null;
                    const times = parts[1] ? parts[1].split(':') : ['00', '00'];

                    // Construct an ISO 8601 string representing GMT+7 time
                    // Format: YYYY-MM-DDTHH:mm:00+07:00
                    const isoString = `${dates[2]}-${dates[1].padStart(2, '0')}-${dates[0].padStart(2, '0')}T${times[0].padStart(2, '0')}:${times[1].padStart(2, '0')}:00+07:00`;
                    return new Date(isoString);
                };

                const start = parseDate(n.startDate);
                const end = parseDate(n.endDate);

                if (start && now < start) return false;
                if (end && now > end) return false;

                return true;
            });
            return NextResponse.json(activeList);
        }

        return NextResponse.json(notifications);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const created = await addNotification({
            content: body.content,
            startDate: body.startDate || '',
            endDate: body.endDate || '',
            isBold: !!body.isBold,
            highlightColor: body.highlightColor || '',
            textColor: body.textColor || '',
            isActive: body.isActive !== false // mặc định true
        });
        return NextResponse.json(created);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        if (!body.id) throw new Error('Missing id');
        await updateNotification(body);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) throw new Error('Missing id');

        await deleteNotification(id);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
