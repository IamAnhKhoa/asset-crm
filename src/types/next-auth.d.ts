// Extend NextAuth session types
import 'next-auth';
import { UserRole } from '@/types';

declare module 'next-auth' {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: UserRole;
            phongBan: string;
            tenChon: string;
            profileComplete: boolean;
            status: string;
        };
    }
}
