/**
 * Migration Script: Google Sheets → Supabase
 * 
 * Reads ALL data from Google Sheets and inserts into Supabase tables.
 * Run with: node scripts/migrate-to-supabase.js
 */

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ── Google Sheets Setup ──
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAMES = {
    ASSETS: 'TaiSan',
    HISTORY_CHECK: 'LichSu',
    HISTORY_REPAIR: 'LichSuSuaChua',
    PENDING_CHECK: 'ChoXacNhanKiemKe',
    PENDING_REPAIR: 'ChoXacNhanSuaChua',
    NOTIFICATIONS: 'ThongBao',
    GIA_SUA_CHUA: 'GiaSuaChua',
    NGUOI_DUNG: 'NguoiDung',
};

function getGoogleAuth() {
    let key = process.env.GOOGLE_PRIVATE_KEY || '';
    if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
    key = key.replace(/\\n/g, '\n');
    return new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}

async function getSheetData(sheetName) {
    const auth = getGoogleAuth();
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
        });
        return res.data.values || [];
    } catch (e) {
        console.warn(`  ⚠️  Sheet "${sheetName}" not found or empty:`, e.message);
        return [];
    }
}

// ── Supabase Setup ──
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

// ── Date Parser: dd/MM/yyyy HH:mm → ISO string ──
function parseViDate(str) {
    if (!str || str === '—') return null;
    const parts = str.trim().split(' ');
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return null;
    const [dd, mm, yyyy] = dateParts;
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];
    const date = new Date(
        parseInt(yyyy), parseInt(mm) - 1, parseInt(dd),
        parseInt(timeParts[0]), parseInt(timeParts[1])
    );
    return isNaN(date.getTime()) ? null : date.toISOString();
}

// ── Create Tables ──
async function createTables() {
    console.log('\n📦 Creating tables in Supabase...');

    const sql = `
        -- Drop existing tables (if re-running migration)
        DROP TABLE IF EXISTS check_history CASCADE;
        DROP TABLE IF EXISTS pending_checks CASCADE;
        DROP TABLE IF EXISTS repair_history CASCADE;
        DROP TABLE IF EXISTS pending_repairs CASCADE;
        DROP TABLE IF EXISTS notifications CASCADE;
        DROP TABLE IF EXISTS service_prices CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TABLE IF EXISTS assets CASCADE;

        -- 1. Assets
        CREATE TABLE assets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            location TEXT DEFAULT '',
            year TEXT DEFAULT '',
            quantity INTEGER DEFAULT 1,
            status TEXT DEFAULT 'Đang sử dụng',
            person TEXT DEFAULT '',
            specific_location TEXT DEFAULT '',
            original_price BIGINT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- 2. Check History
        CREATE TABLE check_history (
            id SERIAL PRIMARY KEY,
            time TIMESTAMPTZ DEFAULT NOW(),
            asset_id TEXT,
            reporter TEXT NOT NULL DEFAULT '',
            status TEXT DEFAULT '',
            note TEXT DEFAULT ''
        );

        -- 3. Pending Checks
        CREATE TABLE pending_checks (
            id SERIAL PRIMARY KEY,
            time TIMESTAMPTZ DEFAULT NOW(),
            asset_id TEXT,
            reporter TEXT NOT NULL DEFAULT '',
            status TEXT DEFAULT '',
            note TEXT DEFAULT '',
            approve_status TEXT DEFAULT 'Chờ duyệt',
            location TEXT DEFAULT ''
        );

        -- 4. Repair History
        CREATE TABLE repair_history (
            id SERIAL PRIMARY KEY,
            time TIMESTAMPTZ DEFAULT NOW(),
            asset_id TEXT,
            person TEXT NOT NULL DEFAULT '',
            issue TEXT DEFAULT '',
            note TEXT DEFAULT '',
            approve_status TEXT DEFAULT '',
            repair_status TEXT DEFAULT '',
            result TEXT DEFAULT '',
            handler_note TEXT DEFAULT '',
            updated_time TIMESTAMPTZ,
            location TEXT DEFAULT ''
        );

        -- 5. Pending Repairs
        CREATE TABLE pending_repairs (
            id SERIAL PRIMARY KEY,
            time TIMESTAMPTZ DEFAULT NOW(),
            asset_id TEXT,
            person TEXT NOT NULL DEFAULT '',
            issue TEXT DEFAULT '',
            note TEXT DEFAULT '',
            approve_status TEXT DEFAULT 'Chờ duyệt',
            repair_status TEXT DEFAULT 'Chưa xử lý',
            result TEXT DEFAULT 'Chưa hoàn thành',
            handler_note TEXT DEFAULT '',
            updated_time TIMESTAMPTZ,
            location TEXT DEFAULT ''
        );

        -- 6. Notifications
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            content TEXT NOT NULL DEFAULT '',
            start_date TIMESTAMPTZ,
            end_date TIMESTAMPTZ,
            is_bold BOOLEAN DEFAULT FALSE,
            highlight_color TEXT DEFAULT '',
            text_color TEXT DEFAULT '',
            is_active BOOLEAN DEFAULT TRUE
        );

        -- 7. Service Prices
        CREATE TABLE service_prices (
            id SERIAL PRIMARY KEY,
            stt TEXT DEFAULT '',
            loai TEXT NOT NULL DEFAULT '',
            noi_dung TEXT NOT NULL DEFAULT '',
            don_vi_tinh TEXT DEFAULT '',
            don_gia BIGINT DEFAULT 0,
            ghi_chu TEXT DEFAULT '',
            ngay_cap_nhat TIMESTAMPTZ DEFAULT NOW()
        );

        -- 8. Users
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            ten_google TEXT DEFAULT '',
            phong_ban TEXT DEFAULT '',
            ten_chon TEXT DEFAULT '',
            role TEXT DEFAULT 'user_basic',
            ngay_tao TIMESTAMPTZ DEFAULT NOW(),
            avatar TEXT DEFAULT '',
            status TEXT DEFAULT 'pending',
            last_active TIMESTAMPTZ
        );

        -- Indexes
        CREATE INDEX idx_assets_location ON assets(location);
        CREATE INDEX idx_assets_status ON assets(status);
        CREATE INDEX idx_check_history_asset ON check_history(asset_id);
        CREATE INDEX idx_repair_history_asset ON repair_history(asset_id);
        CREATE INDEX idx_pending_checks_asset ON pending_checks(asset_id);
        CREATE INDEX idx_pending_repairs_asset ON pending_repairs(asset_id);
        CREATE INDEX idx_users_email ON users(email);
    `;

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => ({ error: 'rpc not available' }));

    // If RPC not available, use the REST API to run SQL
    if (error) {
        console.log('  Using direct SQL execution...');
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql_query: sql }),
        });

        if (!response.ok) {
            console.log('  ⚠️  Could not auto-create tables via API.');
            console.log('  👉 Please run the SQL manually in Supabase Dashboard → SQL Editor');
            console.log('  📋 SQL has been saved to: scripts/schema.sql');
            require('fs').writeFileSync('scripts/schema.sql', sql.trim());
            return false;
        }
    }

    console.log('  ✅ Tables created successfully!');
    return true;
}

// ── Migration Functions ──

async function migrateAssets() {
    console.log('\n📋 Migrating TaiSan → assets...');
    const rows = await getSheetData(SHEET_NAMES.ASSETS);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        records.push({
            id: r[0],
            name: r[1] || '',
            location: r[2] || '',
            year: r[3] || '',
            quantity: r[4] ? parseInt(r[4]) || 1 : 1,
            status: r[5] || 'Đang sử dụng',
            person: r[6] || '',
            specific_location: r[7] || '',
            original_price: r[8] ? parseInt(String(r[8]).replace(/[^0-9]/g, '')) || null : null,
            created_at: r[9] ? (new Date(r[9]).toISOString().startsWith('Invalid') ? new Date().toISOString() : new Date(r[9]).toISOString()) : new Date().toISOString(),
        });
    }

    // Handle created_at more carefully
    for (const rec of records) {
        try {
            new Date(rec.created_at).toISOString();
        } catch {
            rec.created_at = new Date().toISOString();
        }
    }

    if (records.length > 0) {
        // Insert in batches of 50
        for (let i = 0; i < records.length; i += 50) {
            const batch = records.slice(i, i + 50);
            const { error } = await supabase.from('assets').upsert(batch, { onConflict: 'id' });
            if (error) {
                console.error(`  ❌ Error at batch ${i}:`, error.message);
                // Try one by one
                for (const rec of batch) {
                    const { error: singleErr } = await supabase.from('assets').upsert(rec, { onConflict: 'id' });
                    if (singleErr) console.error(`    ❌ Failed: ${rec.id} - ${singleErr.message}`);
                }
            }
        }
    }

    console.log(`  ✅ ${records.length} assets migrated`);
    return records.length;
}

async function migrateCheckHistory() {
    console.log('\n📋 Migrating LichSu → check_history...');
    const rows = await getSheetData(SHEET_NAMES.HISTORY_CHECK);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        records.push({
            time: parseViDate(r[0]) || new Date().toISOString(),
            asset_id: r[1] || '',
            reporter: r[2] || '',
            status: r[3] || '',
            note: r[4] || '',
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('check_history').insert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} check history records migrated`);
    return records.length;
}

async function migratePendingChecks() {
    console.log('\n📋 Migrating ChoXacNhanKiemKe → pending_checks...');
    const rows = await getSheetData(SHEET_NAMES.PENDING_CHECK);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        records.push({
            time: parseViDate(r[0]) || new Date().toISOString(),
            asset_id: r[1] || '',
            reporter: r[2] || '',
            status: r[3] || '',
            note: r[4] || '',
            approve_status: r[5] || 'Chờ duyệt',
            location: r[6] || '',
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('pending_checks').insert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} pending checks migrated`);
    return records.length;
}

async function migrateRepairHistory() {
    console.log('\n📋 Migrating LichSuSuaChua → repair_history...');
    const rows = await getSheetData(SHEET_NAMES.HISTORY_REPAIR);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        records.push({
            time: parseViDate(r[0]) || new Date().toISOString(),
            asset_id: r[1] || '',
            person: r[2] || '',
            issue: r[3] || '',
            note: r[4] || '',
            approve_status: r[5] || '',
            repair_status: r[6] || '',
            result: r[7] || '',
            handler_note: r[8] || '',
            updated_time: parseViDate(r[9]) || null,
            location: r[10] || '',
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('repair_history').insert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} repair history records migrated`);
    return records.length;
}

async function migratePendingRepairs() {
    console.log('\n📋 Migrating ChoXacNhanSuaChua → pending_repairs...');
    const rows = await getSheetData(SHEET_NAMES.PENDING_REPAIR);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        records.push({
            time: parseViDate(r[0]) || new Date().toISOString(),
            asset_id: r[1] || '',
            person: r[2] || '',
            issue: r[3] || '',
            note: r[4] || '',
            approve_status: r[5] || 'Chờ duyệt',
            repair_status: r[6] || 'Chưa xử lý',
            result: r[7] || 'Chưa hoàn thành',
            handler_note: r[8] || '',
            updated_time: parseViDate(r[9]) || null,
            location: r[10] || '',
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('pending_repairs').insert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} pending repairs migrated`);
    return records.length;
}

async function migrateNotifications() {
    console.log('\n📋 Migrating ThongBao → notifications...');
    const rows = await getSheetData(SHEET_NAMES.NOTIFICATIONS);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        records.push({
            id: r[0],
            content: r[1] || '',
            start_date: parseViDate(r[2]) || null,
            end_date: parseViDate(r[3]) || null,
            is_bold: (r[4] || '').toUpperCase() === 'TRUE',
            highlight_color: r[5] || '',
            text_color: r[6] || '',
            is_active: (r[7] || '').toUpperCase() !== 'FALSE',
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('notifications').upsert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} notifications migrated`);
    return records.length;
}

async function migrateServicePrices() {
    console.log('\n📋 Migrating GiaSuaChua → service_prices...');
    const rows = await getSheetData(SHEET_NAMES.GIA_SUA_CHUA);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        records.push({
            stt: r[0] || '',
            loai: r[1] || '',
            noi_dung: r[2] || '',
            don_vi_tinh: r[3] || '',
            don_gia: parseInt(String(r[4] || '0').replace(/[^0-9]/g, '')) || 0,
            ghi_chu: r[5] || '',
            ngay_cap_nhat: parseViDate(r[6]) || new Date().toISOString(),
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('service_prices').insert(batch);
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} service prices migrated`);
    return records.length;
}

async function migrateUsers() {
    console.log('\n📋 Migrating NguoiDung → users...');
    const rows = await getSheetData(SHEET_NAMES.NGUOI_DUNG);
    if (rows.length <= 1) { console.log('  ⏭️  No data'); return 0; }

    const records = [];
    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[0]) continue;
        records.push({
            email: r[0] || '',
            ten_google: r[1] || '',
            phong_ban: r[2] || '',
            ten_chon: r[3] || '',
            role: r[4] || 'user_basic',
            ngay_tao: parseViDate(r[5]) || new Date().toISOString(),
            avatar: r[6] || '',
            status: r[7] || 'pending',
            last_active: parseViDate(r[8]) || null,
        });
    }

    for (let i = 0; i < records.length; i += 50) {
        const batch = records.slice(i, i + 50);
        const { error } = await supabase.from('users').upsert(batch, { onConflict: 'email' });
        if (error) console.error(`  ❌ Error:`, error.message);
    }

    console.log(`  ✅ ${records.length} users migrated`);
    return records.length;
}

// ── Verify ──
async function verify() {
    console.log('\n🔍 Verifying migration...');
    const tables = ['assets', 'check_history', 'pending_checks', 'repair_history', 'pending_repairs', 'notifications', 'service_prices', 'users'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`  ❌ ${table}: ERROR - ${error.message}`);
        } else {
            console.log(`  📊 ${table}: ${count} records`);
        }
    }
}

// ── Main ──
async function main() {
    console.log('🚀 Starting migration: Google Sheets → Supabase');
    console.log('='.repeat(50));

    const counts = {};
    counts.assets = await migrateAssets();
    counts.checkHistory = await migrateCheckHistory();
    counts.pendingChecks = await migratePendingChecks();
    counts.repairHistory = await migrateRepairHistory();
    counts.pendingRepairs = await migratePendingRepairs();
    counts.notifications = await migrateNotifications();
    counts.servicePrices = await migrateServicePrices();
    counts.users = await migrateUsers();

    await verify();

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration complete!');
    console.log('📊 Summary:', JSON.stringify(counts, null, 2));
}

main().catch(console.error);
