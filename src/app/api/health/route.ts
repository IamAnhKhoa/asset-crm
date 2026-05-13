import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status: any = {
        database: 'unknown',
        version: '2.0.0-supabase-realtime',
        timestamp: new Date().toISOString()
    };

    // Check Supabase
    try {
        const { count, error } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true });
        if (error) throw error;
        status.database = `ok (${count} assets)`;
    } catch (e: any) {
        status.database = `error: ${e.message}`;
    }

    return NextResponse.json(status);
}
