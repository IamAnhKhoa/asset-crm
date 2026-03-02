const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const SPREADSHEET_ID = env.GOOGLE_SPREADSHEET_ID;
const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const key = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!email || !key || !SPREADSHEET_ID) {
    console.error('Missing env variables');
    process.exit(1);
}

const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function fix() {
    const sheets = google.sheets({ version: 'v4', auth });

    // Get all users
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'NguoiDung',
    });

    const rows = res.data.values;
    if (!rows) return;

    // First user is usually the admin
    const adminEmails = [
        'sockladien@gmail.com',
        'trananhkhoa181199@gmail.com'
    ];

    for (let i = 1; i < rows.length; i++) {
        const userEmail = rows[i][0];
        if (adminEmails.includes(userEmail)) {
            console.log(`Fixing admin: ${userEmail}`);
            // Update Role (E) to admin_full and Status (H) to approved
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `NguoiDung!E${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['admin_full']] },
            });
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `NguoiDung!H${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['approved']] },
            });
        } else if (rows[i][2] && rows[i][3]) {
            // If they have profile info, just approve them to clear the pending state
            console.log(`Approving legacy user: ${userEmail}`);
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `NguoiDung!H${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: [['approved']] },
            });
        }
    }
    console.log('Done');
}

fix().catch(console.error);
