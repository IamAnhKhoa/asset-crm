import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID || '';

export const SHEET_NAMES = {
    ASSETS: 'TaiSan',
    HISTORY_CHECK: 'LichSu',
    HISTORY_REPAIR: 'LichSuSuaChua',
    PENDING_CHECK: 'ChoXacNhanKiemKe',
    PENDING_REPAIR: 'ChoXacNhanSuaChua',
} as const;

function getAuth() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

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
    const sheets = await getSheetsClient();
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
    });
    return (res.data.values as string[][]) || [];
}

export async function appendSheetRow(sheetName: string, values: (string | number | Date | null)[]) {
    const sheets = await getSheetsClient();
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: sheetName,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [values.map((v) => (v instanceof Date ? formatDateTime(v) : v ?? ''))] },
    });
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
export function formatDateTime(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export function formatDate(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function parseViDate(str: string): Date | null {
    if (!str) return null;
    // dd/mm/yyyy hh:mm or dd/mm/yyyy
    const parts = str.split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return null;
    const [dd, mm, yyyy] = dateParts;
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];
    return new Date(
        parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
        parseInt(timeParts[0]), parseInt(timeParts[1])
    );
}
