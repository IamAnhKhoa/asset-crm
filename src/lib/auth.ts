import {
    getSheetValues,
    appendSheetRow,
    getSheetsClient,
    SPREADSHEET_ID,
    SHEET_NAMES,
    formatDateTime,
} from './sheets';

import { UserRole, NguoiDung } from '@/types';

// ── Ensure NguoiDung sheet exists ────────────────────────────────────────────
async function ensureNguoiDungSheet() {
    const sheets = await getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existing = meta.data.sheets?.find(
        (s) => s.properties?.title === SHEET_NAMES.NGUOI_DUNG
    );
    if (!existing) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{ addSheet: { properties: { title: SHEET_NAMES.NGUOI_DUNG } } }],
            },
        });
        // Write header
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAMES.NGUOI_DUNG}!A1:I1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['Email', 'Tên Google', 'Phòng Ban', 'Tên Chọn', 'Role', 'Ngày Tạo', 'Avatar', 'Trạng Thái', 'Last Active']],
            },
        });
    }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
export async function getUserByEmail(email: string): Promise<NguoiDung | null> {
    await ensureNguoiDungSheet();
    const rows = await getSheetValues(SHEET_NAMES.NGUOI_DUNG);
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if ((r[0] || '').toLowerCase() === email.toLowerCase()) {
            return {
                rowIndex: i + 1,
                email: r[0] || '',
                tenGoogle: r[1] || '',
                phongBan: r[2] || '',
                tenChon: r[3] || '',
                role: (r[4] as UserRole) || 'user_basic',
                ngayTao: r[5] || '',
                avatar: r[6] || '',
                status: (r[7] as any) || (r[2] && r[3] ? 'approved' : 'pending'), // Legacy users with dept/name are approved
                lastActive: r[8] || '',
            };
        }
    }
    return null;
}

export async function createUser(email: string, tenGoogle: string, avatar?: string): Promise<NguoiDung> {
    await ensureNguoiDungSheet();
    const now = formatDateTime(new Date());
    await appendSheetRow(SHEET_NAMES.NGUOI_DUNG, [
        email, tenGoogle, '', '', 'user_basic', now, avatar || '', 'pending', now
    ]);
    return {
        rowIndex: -1,
        email,
        tenGoogle,
        phongBan: '',
        tenChon: '',
        role: 'user_basic',
        ngayTao: now,
        avatar,
        status: 'pending',
        lastActive: now,
    };
}

export async function updateUserProfile(
    email: string,
    phongBan: string,
    tenChon: string,
    roleOverride?: UserRole
): Promise<{ success: boolean }> {
    await ensureNguoiDungSheet();
    const rows = await getSheetValues(SHEET_NAMES.NGUOI_DUNG);
    for (let i = 1; i < rows.length; i++) {
        if ((rows[i][0] || '').toLowerCase() === email.toLowerCase()) {
            const sheets = await getSheetsClient();
            // Update phongBan, tenChon
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAMES.NGUOI_DUNG}!C${i + 1}:D${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[phongBan, tenChon]] },
            });
            // If role specified (from setup profile)
            if (roleOverride) {
                const dbUser = await getUserByEmail(email);
                const currentRole = dbUser?.role || 'user_basic';

                // Allow upgrade from user_basic to anything, or setting anything from nothing
                if (currentRole === 'user_basic' || roleOverride !== 'user_basic') {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${SHEET_NAMES.NGUOI_DUNG}!E${i + 1}`,
                        valueInputOption: 'USER_ENTERED',
                        requestBody: { values: [[roleOverride]] },
                    });
                }
            }

            // Auto-approve guests only. Employees need manual approval.
            if (roleOverride === 'guest') {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAMES.NGUOI_DUNG}!H${i + 1}`,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: { values: [['approved']] },
                });
            }

            return { success: true };
        }
    }
    return { success: false };
}

export async function updateUserRole(email: string, role: UserRole): Promise<{ success: boolean }> {
    await ensureNguoiDungSheet();
    const rows = await getSheetValues(SHEET_NAMES.NGUOI_DUNG);
    for (let i = 1; i < rows.length; i++) {
        if ((rows[i][0] || '').toLowerCase() === email.toLowerCase()) {
            const sheets = await getSheetsClient();
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAMES.NGUOI_DUNG}!E${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[role]] },
            });
            return { success: true };
        }
    }
    return { success: false };
}

export async function updateUserStatus(email: string, status: string): Promise<{ success: boolean }> {
    await ensureNguoiDungSheet();
    const rows = await getSheetValues(SHEET_NAMES.NGUOI_DUNG);
    for (let i = 1; i < rows.length; i++) {
        if ((rows[i][0] || '').toLowerCase() === email.toLowerCase()) {
            const sheets = await getSheetsClient();
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAMES.NGUOI_DUNG}!H${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [[status]] },
            });
            return { success: true };
        }
    }
    return { success: false };
}

const onlineUsersCache = new Map<string, number>();

export async function trackUserActivity(email: string): Promise<void> {
    try {
        onlineUsersCache.set(email.toLowerCase(), Date.now());
        // We purposely STOP writing this to Google Sheets to save massive amounts of API Quota.
        // It's not necessary to permanently store the exact minute someone was last online.
    } catch (e) {
        console.error('Error tracking activity:', e);
    }
}

export async function getOnlineUsers(): Promise<number> {
    try {
        const now = Date.now();
        const fiveMins = 5 * 60 * 1000;
        let count = 0;

        // Clean up old entries while counting to prevent memory leaks over months of uptime
        for (const [email, lastSeen] of onlineUsersCache.entries()) {
            if (now - lastSeen < fiveMins) {
                count++;
            } else {
                onlineUsersCache.delete(email); // Cleanup
            }
        }

        return count;
    } catch (e) {
        return 0;
    }
}

export async function getAllUsers(): Promise<NguoiDung[]> {
    await ensureNguoiDungSheet();
    const rows = await getSheetValues(SHEET_NAMES.NGUOI_DUNG);
    return rows.slice(1).map((r, idx) => ({
        rowIndex: idx + 2,
        email: r[0] || '',
        tenGoogle: r[1] || '',
        phongBan: r[2] || '',
        tenChon: r[3] || '',
        role: (r[4] as UserRole) || 'user_basic',
        ngayTao: r[5] || '',
        avatar: r[6] || '',
        status: (r[7] as any) || (r[2] && r[3] ? 'approved' : 'pending'),
        lastActive: r[8] || '',
    }));
}

// ── Permission helpers ────────────────────────────────────────────────────────
export function canEditAll(role: UserRole) {
    return role === 'admin_full' || role === 'admin_holder';
}

export function canEditDept(role: UserRole) {
    return role === 'admin_full' || role === 'admin_holder' || role === 'admin_dept';
}

export function isAdmin(role: UserRole) {
    return role !== 'user_basic';
}

export function isFullAdmin(role: UserRole) {
    return role === 'admin_full';
}

import { UserContext, Asset } from '@/types';
import { DEPARTMENT_NAMES } from '@/lib/employees';

export function canViewAsset(userCtx: UserContext, asset: Asset): boolean {
    const role = userCtx.role as UserRole;
    if (role === 'admin_full' || role === 'admin_holder') return true;

    const userDeptName = userCtx.phongBan ? (DEPARTMENT_NAMES[userCtx.phongBan] || userCtx.phongBan) : '';

    // Admin Dept can see all assets in their department
    if (role === 'admin_dept') {
        return asset.location === userDeptName;
    }

    // User Basic can only see their own assets
    if (role === 'user_basic') {
        return asset.location === userDeptName && asset.person === userCtx.tenChon;
    }

    // Guest role (Public Lookup) can view the basic info/history
    if (role === 'guest') return true;

    return false;
}

export function canEditAsset(userCtx: UserContext, asset: Asset): boolean {
    const role = userCtx.role as UserRole;
    if (role === 'admin_full' || role === 'admin_holder') return true;

    const userDeptName = userCtx.phongBan ? (DEPARTMENT_NAMES[userCtx.phongBan] || userCtx.phongBan) : '';

    if (role === 'admin_dept') {
        return asset.location === userDeptName;
    }

    return false;
}
