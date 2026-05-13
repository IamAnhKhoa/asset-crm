import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return new NextResponse('Backup placeholder', { status: 200 });
}
