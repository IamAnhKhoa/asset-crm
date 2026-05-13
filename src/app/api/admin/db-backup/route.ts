import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

const TABLE_NAMES = [
    'assets',
    'check_history',
    'pending_checks',
    'repair_history',
    'pending_repairs',
    'notifications',
    'service_prices',
    'users',
];

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if ((session?.user as any)?.role !== 'admin_full') {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const wb = XLSX.utils.book_new();

        for (const tableName of TABLE_NAMES) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .order('id', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    const ws = XLSX.utils.json_to_sheet(data);
                    XLSX.utils.book_append_sheet(wb, ws, tableName.substring(0, 31));
                }
            } catch (err) {
                console.error(`Failed to backup table ${tableName}:`, err);
            }
        }

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const fileName = `Backup_Database_${dateStr}.xlsx`;

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (e) {
        console.error('Backup error:', e);
        return new NextResponse(String(e), { status: 500 });
    }
}
