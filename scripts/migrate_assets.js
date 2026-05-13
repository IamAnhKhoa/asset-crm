const { google } = require('googleapis');
// No dotenv needed if we run from shell with vars or hardcode for local fix


const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let key = process.env.GOOGLE_PRIVATE_KEY || '';
if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
key = key.replace(/\\n/g, '\n');

const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function migrate() {
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Reading assets...');
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TaiSan',
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
        console.log('No data found.');
        return;
    }

    const header = rows[0];
    console.log('Current header:', header);

    // New Schema: ID(0), Name(1), Location(2), Year(3), Qty(4), Status(5), Person(6), SpecificLocation(7), Price(8), CreatedAt(9)
    // Old Schema: ID(0), Name(1), Location(2), Year(3), Status(4), Person(5), SpecificLocation(6), Price(7)

    const newRows = rows.map((row, i) => {
        if (i === 0) {
            return ['Mã tài sản', 'Tên tài sản', 'Phòng/Kho', 'Năm sử dụng', 'Số lượng', 'Trạng thái', 'Người giữ', 'Vị trí cụ thể', 'Nguyên giá', 'Ngày tạo'];
        }

        const id = row[0] || '';
        const name = row[1] || '';
        const loc = row[2] || '';
        const year = row[3] || '';
        const status = row[4] || '';
        const person = row[5] || '';
        const specLoc = row[6] || '';
        const price = row[7] || '';

        return [
            id,
            name,
            loc,
            year,
            '1', // Default quantity
            status,
            person,
            specLoc,
            price,
            new Date().toISOString() // Default createdAt
        ];
    });

    console.log('Writing updated rows...');
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'TaiSan!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newRows },
    });

    console.log('Migration complete!');
}

migrate().catch(console.error);
