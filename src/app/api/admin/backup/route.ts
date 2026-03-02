import { NextResponse } from 'next/server';

export async function GET() {
    return new NextResponse('Backup placeholder', { status: 200 });
}
