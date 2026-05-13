DROP TABLE IF EXISTS check_history CASCADE;
DROP TABLE IF EXISTS pending_checks CASCADE;
DROP TABLE IF EXISTS repair_history CASCADE;
DROP TABLE IF EXISTS pending_repairs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS service_prices CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS assets CASCADE;

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

CREATE TABLE check_history (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ DEFAULT NOW(),
    asset_id TEXT,
    reporter TEXT NOT NULL DEFAULT '',
    status TEXT DEFAULT '',
    note TEXT DEFAULT ''
);

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

CREATE INDEX idx_assets_location ON assets(location);
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_check_history_asset ON check_history(asset_id);
CREATE INDEX idx_repair_history_asset ON repair_history(asset_id);
CREATE INDEX idx_pending_checks_asset ON pending_checks(asset_id);
CREATE INDEX idx_pending_repairs_asset ON pending_repairs(asset_id);
CREATE INDEX idx_users_email ON users(email);