import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserByEmail, createUser, trackUserActivity } from '@/lib/auth';

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;
            try {
                const existing = await getUserByEmail(user.email);
                if (!existing) {
                    await createUser(user.email, user.name || '', user.image || '');
                }
                return true;
            } catch (e) {
                console.error('signIn callback error:', e);
                return true; // Allow sign in even if sheet is temporarily unavailable
            }
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.name = (token.name as string) || session.user.name;
                session.user.image = (token.picture as string) || session.user.image;
                (session.user as any).role = token.role || 'user_basic';
                (session.user as any).phongBan = token.phongBan || '';
                (session.user as any).tenChon = token.tenChon || '';
                (session.user as any).profileComplete = token.profileComplete || false;
                (session.user as any).status = token.status || 'pending';
            }
            return session;
        },
        async jwt({ token, account, trigger }) {
            const shouldRefresh = !!account || trigger === 'update' || token.role === undefined;
            if (shouldRefresh && token.email) {
                try {
                    const dbUser = await getUserByEmail(token.email);
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.phongBan = dbUser.phongBan;
                        token.tenChon = dbUser.tenChon;
                        token.status = dbUser.status;

                        // Guest is always complete. Staff needs dept and name.
                        token.profileComplete = dbUser.role === 'guest' || !!(dbUser.phongBan && dbUser.tenChon);

                        // Sync name and picture from DB to ensure they are available in session
                        token.name = dbUser.tenChon || dbUser.tenGoogle || token.name;
                        token.picture = dbUser.avatar || token.picture;

                        // Async track activity
                        trackUserActivity(token.email).catch(() => { });
                    } else {
                        token.role = 'user_basic';
                        token.status = 'pending';
                        token.profileComplete = false;
                    }
                } catch (err) {
                    console.error('JWT callback error:', err);
                    token.role = token.role || 'user_basic';
                    token.status = token.status || 'pending';
                    token.profileComplete = token.profileComplete || false;
                }
            }
            return token;
        },
    },
};
