import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';

export const SHEET_NAMES = {
    ASSETS: 'TaiSan',
    HISTORY_CHECK: 'LichSu',
    HISTORY_REPAIR: 'LichSuSuaChua',
    PENDING_CHECK: 'ChoXacNhanKiemKe',
    PENDING_REPAIR: 'ChoXacNhanSuaChua',
    NOTIFICATIONS: 'ThongBao',
    GIA_SUA_CHUA: 'GiaSuaChua',
    NGUOI_DUNG: 'NguoiDung',
} as const;

import { formatDateTime, formatDate, parseViDate } from './date-utils';
export { formatDateTime, formatDate, parseViDate };

function getAuth() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    // Handle both literal \n and escaped \\n, and remove any accidental quotes
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    key = key.replace(/\\n/g, '\n');

    if (!email || !key) {
        throw new Error(
            'Missing Google credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local'
        );
    }

    return new google.auth.JWT({
        email,
        key,
        scopes: SCOPES,
    });
}

export async function getSheetsClient() {
    const auth = getAuth();
    await auth.authorize();
    return google.sheets({ version: 'v4', auth });
}

export async function getSheetValues(sheetName: string): Promise<string[][]> {
    try {
        const sheets = await getSheetsClient();
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
        });
        return (res.data.values as string[][]) || [];
    } catch (e: any) {
        // If sheet not found or range error, return empty instead of crashing the app
        console.error(`Error reading sheet ${sheetName}:`, e?.message);
        if (e?.code === 400 || e?.message?.includes('not found')) {
            return [];
        }
        throw e;
    }
}

export async function appendSheetRow(sheetName: string, values: (string | number | Date | null)[]): Promise<number> {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values.map((v) => (v instanceof Date ? formatDateTime(v) : v ?? ''))] },
    });

    // Extract row index from response.data.updates.updatedRange (e.g., 'SheetName!A15:G15')
    const range = response.data.updates?.updatedRange || '';
    const match = range.match(/[A-Z]+(\d+)/);
    return match ? parseInt(match[1], 10) : -1;
}

export async function updateSheetCell(
    sheetName: string,
    row: number,
    col: number,
    value: string | number
) {
    const sheets = await getSheetsClient();
    const colLetter = String.fromCharCode(64 + col);
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${colLetter}${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[value]] },
    });
}

export async function updateSheetRow(
    sheetName: string,
    row: number,
    startCol: number,
    values: (string | number | null)[]
) {
    const sheets = await getSheetsClient();
    const startLetter = String.fromCharCode(64 + startCol);
    const endLetter = String.fromCharCode(64 + startCol + values.length - 1);
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetName}!${startLetter}${row}:${endLetter}${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values.map((v) => v ?? '')] },
    });
}

export async function deleteSheetRow(sheetName: string, rowIndex: number) {
    const sheets = await getSheetsClient();

    // Get sheet ID first
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheet = meta.data.sheets?.find((s) => s.properties?.title === sheetName);
    if (sheet?.properties?.sheetId === undefined) throw new Error(`Sheet "${sheetName}" not found`);

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId: sheet.properties.sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex - 1, // 0-based
                            endIndex: rowIndex,
                        },
                    },
                },
            ],
        },
    });
}

// =========================
//  FORMAT HELPERS
// =========================
