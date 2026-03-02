import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { appendSheetRow, getSheetValues } from '@/lib/sheets';

const SHEET_NAME = 'TemplateDownloads';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { templateId, templateName } = await req.json();

    const now = new Date();
    const timeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    await appendSheetRow(SHEET_NAME, [
        timeStr,
        session.user?.tenChon || session.user?.name || '',
        session.user?.phongBan || '',
        session.user?.role || '',
        templateId,
        templateName,
    ]);

    return NextResponse.json({ success: true });
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin_full') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const all = await getSheetValues(SHEET_NAME);
        const rows = (all || []).slice(1); // skip header row
        const logs = rows.map((r: string[]) => ({
            time: r[0] || '',
            user: r[1] || '',
            dept: r[2] || '',
            role: r[3] || '',
            templateId: r[4] || '',
            templateName: r[5] || '',
        }));
        return NextResponse.json({ logs });
    } catch {
        return NextResponse.json({ logs: [] });
    }
}
