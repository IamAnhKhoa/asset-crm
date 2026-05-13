import { UserRole, NguoiDung } from '@/types';
import { supabase } from './supabase';
import { formatDateTime } from './date-utils';
import { kv } from '@vercel/kv';

// ── Ensure NguoiDung table exists (no-op for Supabase, schema already created) ──
export async function ensureNguoiDungSheet() {
    // No-op: tables are created via schema.sql
}

// ── CRUD ──
export async function getUserByEmail(email: string): Promise<NguoiDung | null> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('[Auth] getUserByEmail error:', error.message);
        return null;
    }
    if (!data) return null;
    return dbToUser(data);
}

export async function createUser(email: string, tenGoogle: string, avatar?: string): Promise<NguoiDung> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('users')
        .insert({
            email,
            ten_google: tenGoogle,
            phong_ban: '',
            ten_chon: '',
            role: 'user_basic',
            ngay_tao: now,
            avatar: avatar || '',
            status: 'pending',
            last_active: now,
        })
        .select()
        .single();

    if (error) {
        console.error('[Auth] createUser error:', error.message);
        // Try to get existing user
        const existing = await getUserByEmail(email);
        if (existing) return existing;
        throw error;
    }

    return dbToUser(data);
}

export async function updateUserProfile(
    email: string,
    phongBan: string,
    tenChon: string,
    roleOverride?: UserRole
): Promise<{ success: boolean }> {
    const updateData: Record<string, any> = {
        phong_ban: phongBan,
        ten_chon: tenChon,
        status: 'approved',
    };

    if (roleOverride) {
        updateData.role = roleOverride;
    }

    // Check if user exists
    const existing = await getUserByEmail(email);
    if (!existing) {
        return { success: false };
    }

    // If user is the first admin or has a specific role, preserve it
    if (existing.role === 'admin_full' && !roleOverride) {
        // Don't override admin_full unless explicitly specified
    } else if (roleOverride) {
        updateData.role = roleOverride;
    }

    const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', email);

    if (error) {
        console.error('[Auth] updateUserProfile error:', error.message);
        return { success: false };
    }
    return { success: true };
}

export async function updateUserRole(email: string, role: UserRole): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('email', email);

    if (error) {
        console.error('[Auth] updateUserRole error:', error.message);
        return { success: false };
    }
    return { success: true };
}

export async function updateUserStatus(email: string, status: string): Promise<{ success: boolean }> {
    const { error } = await supabase
        .from('users')
        .update({ status })
        .eq('email', email);

    if (error) {
        console.error('[Auth] updateUserStatus error:', error.message);
        return { success: false };
    }

    // Set KV status to invoke real-time ban via Middleware
    try {
        await kv.set(`status:${email}`, status);
    } catch (e) { console.error('Redis set status error', e); }

    return { success: true };
}

const onlineUsersCache = new Map<string, number>();

export async function trackUserActivity(email: string, ip?: string): Promise<void> {
    onlineUsersCache.set(email, Date.now());

    // Fire and forget but tracked in promises array
    const pUpdate = (async () => {
        await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('email', email);
    })();

    const promises: Promise<any>[] = [pUpdate];

    if (ip) {
        promises.push(
            (async () => {
                try {
                    const key = `ips:${email}`;
                    const currentIps = await kv.lrange(key, 0, 0);
                    // Only push if the current latest IP is different to avoid spamming the same IP
                    if (currentIps[0] !== ip) {
                        await kv.lpush(key, ip);
                        await kv.ltrim(key, 0, 2); // Keep last 3 IPs
                    }
                } catch (e) { console.error('Redis IP tracking error', e); }
            })()
        );
    }

    await Promise.allSettled(promises);
}

export async function getOnlineUsers(): Promise<number> {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    let count = 0;
    for (const [, ts] of onlineUsersCache) {
        if (ts > fiveMinutesAgo) count++;
    }
    if (count > 0) return count;

    // Fallback: check DB
    const cutoff = new Date(fiveMinutesAgo).toISOString();
    const { count: dbCount, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('last_active', cutoff);

    if (error) return 0;
    return dbCount || 0;
}

export async function getAllUsers(): Promise<NguoiDung[]> {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('ngay_tao', { ascending: false });

    if (error) {
        console.error('[Auth] getAllUsers error:', error.message);
        return [];
    }

    const users = (data || []).map(dbToUser);

    try {
        const pIps = users.map(u => kv.lrange(`ips:${u.email}`, 0, 2));
        const ipsList = await Promise.all(pIps);
        users.forEach((u, i) => {
            u.recentIps = ipsList[i] || [];
        });
    } catch (e) {
        console.error('Redis fetch IPs error', e);
    }

    return users;
}

// ── Permission helpers ──
export function canEditAll(role: UserRole) {
    return role === 'admin_full';
}

export function canEditDept(role: UserRole) {
    return role === 'admin_full' || role === 'admin_dept';
}

export function isAdmin(role: UserRole) {
    return role === 'admin_full' || role === 'admin_dept' || role === 'admin_holder';
}

export function isFullAdmin(role: UserRole) {
    return role === 'admin_full';
}

import { UserContext, Asset } from '@/types';
import { DEPARTMENT_NAMES } from '@/lib/employees';

export function canViewAsset(userCtx: UserContext, asset: Asset): boolean {
    if (!userCtx) return true;
    const role = userCtx.role as UserRole;

    if (role === 'admin_full' || role === 'admin_holder') return true;
    if (role === 'guest') return true;

    if (role === 'admin_dept') {
        const userDeptName = DEPARTMENT_NAMES[userCtx.phongBan || ''] || userCtx.phongBan;
        return asset.location === userDeptName;
    }

    if (role === 'user_basic') {
        const userName = userCtx.tenChon || '';
        return asset.person === userName;
    }

    return false;
}

export function canEditAsset(userCtx: UserContext, asset: Asset): boolean {
    if (!userCtx) return false;
    const role = userCtx.role as UserRole;

    if (role === 'admin_full') return true;
    if (role === 'admin_holder') return true;

    if (role === 'admin_dept') {
        const userDeptName = DEPARTMENT_NAMES[userCtx.phongBan || ''] || userCtx.phongBan;
        return asset.location === userDeptName;
    }

    return false;
}

// ── Helper: DB row → NguoiDung ──
function dbToUser(row: any): NguoiDung {
    return {
        rowIndex: row.id,
        email: row.email || '',
        tenGoogle: row.ten_google || '',
        phongBan: row.phong_ban || '',
        tenChon: row.ten_chon || '',
        role: (row.role || 'user_basic') as UserRole,
        ngayTao: row.ngay_tao ? formatDateTime(new Date(row.ngay_tao)) : '',
        avatar: row.avatar || '',
        status: (row.status || 'pending') as 'pending' | 'approved' | 'rejected',
        lastActive: row.last_active ? formatDateTime(new Date(row.last_active)) : '',
    };
}
