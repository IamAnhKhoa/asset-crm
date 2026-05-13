import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl) return NextResponse.json({ error: 'Missing NEXT_PUBLIC_SUPABASE_URL' });

        const { count, error } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return NextResponse.json({
            ok: true,
            database: 'supabase',
            supabaseUrl,
            assetCount: count,
        });
    } catch (e: any) {
        return NextResponse.json({
            ok: false,
            error: e?.message || String(e),
        }, { status: 500 });
    }
}
