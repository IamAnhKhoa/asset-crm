import { google } from 'googleapis';
import path from 'path';

async function test() {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "asset-crm-admin@asset-taisan.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDJ5D/8X1I/kG+t\nm20t5s8oEltlS9S9I/xV7f0Xb8WvY/yUoVZQ80yVvS/oXy1R2NlX9jX6vIu9U8Z+\nrM0tL+8h3/xV7f0Xb8WvY/yUoVZQ80yVvS/oXy1R2NlX9jX6vIu9U8Z+L+8h3/xV\n7f0Xb8WvY/yUoVZQ80yVvS/oXy1R2NlX9jX6vIu9U8Z+L+8h3/xV7f0Xb8WvY/yU\noVZQ80yVvS/oXy1R2NlX9jX6vIu9U8Z+L+8h3/xV7f0Xb8WvY/yUoVZQ80yVvS/o\nXy1R2NlX9jX6vIu9U8Z+L+8h3/xV7f0Xb8WvY/yUoVZQ80yVvS/oXy1R2NlX9jX6\nvIu9U8Z+AgMBAAECgYEAqL0xR/mH/1X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9\nX9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9\nX9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9\nX9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9X9\n-----END PRIVATE KEY-----\n`;
    process.env.GOOGLE_SPREADSHEET_ID = "1gM1Hq5dJj5qQ0E8D7Q3O8Z9X6c2B1A4V9N7M5X3Z1A";

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
            range: 'NhanVien!A:D',
        });
        console.log(res.data.values?.slice(0, 10));
    } catch (e) {
        console.error(e);
    }
}
test();
