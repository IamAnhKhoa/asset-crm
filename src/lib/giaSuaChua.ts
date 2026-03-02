import {
    getSheetValues,
    appendSheetRow,
    updateSheetRow,
    deleteSheetRow,
    getSheetsClient,
    SPREADSHEET_ID,
    SHEET_NAMES,
    formatDateTime,
} from './sheets';

export interface ServiceItem {
    row: number;       // row index in sheet (1-based, header = 1)
    stt: string;
    loai: string;      // Bơm Mực | Sửa Chữa Máy In | Thiết Bị Mạng | Linh Kiện Vi Tính
    noiDung: string;
    donViTinh: string;
    donGia: number;
    ghiChu: string;
    ngayCapNhat: string;
}

// ── Sample data seeded when the sheet is empty ──────────────────────────────
const SAMPLE_DATA: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>[] = [
    // Mực Máy In
    { loai: 'Bơm Mực Máy In', noiDung: 'Mực Bơm Laser', donViTinh: 'Hộp', donGia: 120000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Drum', donViTinh: 'Cây', donGia: 150000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Gạt', donViTinh: 'Cây', donGia: 100000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Trục Từ Sắt', donViTinh: 'Cây', donGia: 160000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Trục Từ Mủ', donViTinh: 'Cây', donGia: 100000, ghiChu: '' },
    // Sửa Chữa Máy In
    { loai: 'Sửa Chữa Máy In', noiDung: 'Bộ Sấy', donViTinh: 'Bộ', donGia: 650000, ghiChu: '' },
    { loai: 'Sửa Chữa Máy In', noiDung: 'Bao Lụa', donViTinh: 'Bộ', donGia: 550000, ghiChu: '' },
    { loai: 'Sửa Chữa Máy In', noiDung: 'Rulo Ép', donViTinh: 'Cái', donGia: 500000, ghiChu: '' },
    // Thiết Bị Mạng
    { loai: 'Thiết Bị Mạng', noiDung: 'Đầu Mạng (RJ45)', donViTinh: 'Cái', donGia: 10000, ghiChu: '' },
    { loai: 'Thiết Bị Mạng', noiDung: 'Dây Mạng', donViTinh: 'Cái', donGia: 20000, ghiChu: '' },
    // Linh Kiện Vi Tính
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Ổ Cứng SSD', donViTinh: 'Cái', donGia: 1700000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Nguồn Máy Tính', donViTinh: 'Cái', donGia: 700000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Bàn Phím Có Dây (USB)', donViTinh: 'Cái', donGia: 280000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Chuột Có Dây (USB)', donViTinh: 'Con', donGia: 250000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Fan CPU (Quạt Tản Nhiệt)', donViTinh: 'Cái', donGia: 180000, ghiChu: '' },
];

// ── Ensure sheet + header exist, seed sample data if empty ──────────────────
export async function ensureSheetExists() {
    const sheets = await getSheetsClient();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const existing = meta.data.sheets?.find(
        (s) => s.properties?.title === SHEET_NAMES.GIA_SUA_CHUA
    );

    if (!existing) {
        // Create the sheet
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            requestBody: {
                requests: [{ addSheet: { properties: { title: SHEET_NAMES.GIA_SUA_CHUA } } }],
            },
        });
    }

    // Check if header row exists
    const values = await getSheetValues(SHEET_NAMES.GIA_SUA_CHUA);
    const now = formatDateTime(new Date());

    if (values.length === 0) {
        // Write header
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAMES.GIA_SUA_CHUA}!A1:G1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
                values: [['STT', 'Loại Dịch Vụ', 'Nội Dung', 'Đơn Vị Tính', 'Đơn Giá', 'Ghi Chú', 'Ngày Cập Nhật']],
            },
        });

        // Seed sample data
        let stt = 1;
        let currentLoai = '';
        for (const item of SAMPLE_DATA) {
            if (item.loai !== currentLoai) {
                stt = 1;
                currentLoai = item.loai;
            }
            await appendSheetRow(SHEET_NAMES.GIA_SUA_CHUA, [
                String(stt).padStart(2, '0'),
                item.loai,
                item.noiDung,
                item.donViTinh,
                item.donGia,
                item.ghiChu,
                now,
            ]);
            stt++;
        }
    }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
export async function getAllServices(): Promise<ServiceItem[]> {
    await ensureSheetExists();
    const rows = await getSheetValues(SHEET_NAMES.GIA_SUA_CHUA);
    if (rows.length <= 1) return [];

    return rows.slice(1).map((r, idx) => ({
        row: idx + 2, // 1-based, header is row 1
        stt: r[0] || '',
        loai: r[1] || '',
        noiDung: r[2] || '',
        donViTinh: r[3] || '',
        donGia: parseFloat(r[4]) || 0,
        ghiChu: r[5] || '',
        ngayCapNhat: r[6] || '',
    }));
}

export async function addService(data: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>) {
    await ensureSheetExists();
    const rows = await getSheetValues(SHEET_NAMES.GIA_SUA_CHUA);
    // Find next STT for this loai
    const sameLoai = rows.slice(1).filter((r) => r[1] === data.loai);
    const stt = String(sameLoai.length + 1).padStart(2, '0');

    await appendSheetRow(SHEET_NAMES.GIA_SUA_CHUA, [
        stt,
        data.loai,
        data.noiDung,
        data.donViTinh,
        data.donGia,
        data.ghiChu,
        formatDateTime(new Date()),
    ]);
    return { success: true };
}

export async function updateService(
    rowIndex: number,
    data: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>
) {
    await updateSheetRow(SHEET_NAMES.GIA_SUA_CHUA, rowIndex, 2, [
        data.loai,
        data.noiDung,
        data.donViTinh,
        data.donGia,
        data.ghiChu,
        formatDateTime(new Date()),
    ]);
    return { success: true };
}

export async function deleteService(rowIndex: number) {
    await deleteSheetRow(SHEET_NAMES.GIA_SUA_CHUA, rowIndex);
    return { success: true };
}
