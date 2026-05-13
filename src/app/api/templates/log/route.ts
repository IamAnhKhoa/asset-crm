import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { templateId, templateName } = await req.json();

    const now = new Date();
    const timeStr = now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    // Create template_downloads table if needed (first run)
    await supabase.from('template_downloads').insert({
        time: timeStr,
        user_name: (session.user as any)?.tenChon || session.user?.name || '',
        dept: (session.user as any)?.phongBan || '',
        role: (session.user as any)?.role || '',
        template_id: templateId,
        template_name: templateName,
    });

    return NextResponse.json({ success: true });
}

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin_full') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { data } = await supabase
            .from('template_downloads')
            .select('*')
            .order('id', { ascending: false });

        const logs = (data || []).map((r: any) => ({
            time: r.time || '',
            user: r.user_name || '',
            dept: r.dept || '',
            role: r.role || '',
            templateId: r.template_id || '',
            templateName: r.template_name || '',
        }));
        return NextResponse.json({ logs });
    } catch {
        return NextResponse.json({ logs: [] });
    }
}
