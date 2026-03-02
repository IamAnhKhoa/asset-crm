import { NextRequest, NextResponse } from 'next/server';
import { getAllServices, addService, updateService, deleteService } from '@/lib/giaSuaChua';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getWithSWR, purgeCache } from '@/lib/kv-cache';

export const dynamic = 'force-dynamic';

async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return false;
    const role = (session.user as any).role;
    return role === 'admin_full';
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const data = await getWithSWR('gia-sua-chua', getAllServices, 10, 2);
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API Pricing] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch pricing data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const body = await req.json();
        const result = await addService(body);

        // Invalidate cache
        await Promise.all([
            purgeCache('gia-sua-chua'),
            purgeCache('dashboard')
        ]).catch(e => console.warn('[API Pricing] Cache purge failed:', e));

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Pricing] POST error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const body = await req.json();
        const { row, ...data } = body;
        if (!row) return NextResponse.json({ error: 'Missing row' }, { status: 400 });
        const result = await updateService(row, data);

        // Invalidate cache
        await Promise.all([
            purgeCache('gia-sua-chua'),
            purgeCache('dashboard')
        ]).catch(e => console.warn('[API Pricing] Cache purge failed:', e));

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Pricing] PUT error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        if (!(await checkAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        const body = await req.json();
        const { row } = body;
        if (!row) return NextResponse.json({ error: 'Missing row' }, { status: 400 });
        const result = await deleteService(row);

        // Invalidate cache
        await Promise.all([
            purgeCache('gia-sua-chua'),
            purgeCache('dashboard')
        ]).catch(e => console.warn('[API Pricing] Cache purge failed:', e));

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Pricing] DELETE error:', e);
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
