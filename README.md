# Asset CRM (Hệ thống Quản lý tài sản) 📦

*Read this in other languages: [English](#english) | [Tiếng Việt](#tiếng-việt)*

---

## Tiếng Việt <a name="tiếng-việt"></a>

Một hệ thống CRM Quản lý Tài sản hiện đại được xây dựng nhằm mục đích theo dõi thiết bị, quá trình sửa chữa, bảo trì và tích hợp bot Telegram để truy xuất dữ liệu nhanh chóng. Toàn bộ dữ liệu được lưu trữ và quản lý tập trung trên hệ quản trị cơ sở dữ liệu Supabase.

### 🛠 Công nghệ sử dụng (Tech Stack)

| Component | Technology |
| --- | --- |
| **Frontend & Backend** | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB) |
| **Styling** | ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) |
| **Database** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white) |
| **Authentication** | ![NextAuth.js](https://img.shields.io/badge/NextAuth.js-black?style=flat&logo=next.js&logoColor=white) |
| **Integrations** | ![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white) |

### ✨ Tính năng nổi bật
- **Quản lý tài sản:** Theo dõi danh sách tài sản, tình trạng và lịch sử bàn giao cho nhân viên.
- **Quản lý sửa chữa:** Ghi chép và theo dõi toàn bộ quá trình hỏng hóc, sửa chữa, bảo trì thiết bị.
- **Tích hợp Bot Telegram:** Tìm kiếm thông tin thiết bị, phê duyệt báo cáo hỏng hóc và báo cáo kiểm kê trực tiếp trên Telegram.
- **Phân quyền người dùng:** Đăng nhập an toàn qua NextAuth và giới hạn quyền truy cập dựa trên vai trò (Admin, User).

### 🚀 Hướng dẫn cài đặt

**1. Clone dự án**
```bash
git clone https://github.com/your-username/asset-crm.git
cd asset-crm
```

**2. Cài đặt thư viện**
```bash
npm install
# hoặc
yarn install
```

**3. Thiết lập Biến môi trường**
Tạo file `.env.local` ở thư mục gốc của dự án và sao chép nội dung sau (thay thế bằng các key của bạn):
```env
# NextAuth (Mã bảo mật cho đăng nhập)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth (Dùng để đăng nhập bằng Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase (Cơ sở dữ liệu)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telegram Bot (Token của Bot tạo từ BotFather)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

**4. Khởi chạy ứng dụng (Development mode)**
```bash
npm run dev
# hoặc
yarn dev
```
Mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

---

## English <a name="english"></a>

A modern Asset Management CRM built to track equipment, repair history, maintenance, and integrates a Telegram bot for quick data retrieval. All data is centrally managed and stored using Supabase.

### 🛠 Tech Stack

| Component | Technology |
| --- | --- |
| **Frontend & Backend** | ![Next.js](https://img.shields.io/badge/Next.js-black?style=flat&logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB) |
| **Styling** | ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white) |
| **Database** | ![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white) |
| **Authentication** | ![NextAuth.js](https://img.shields.io/badge/NextAuth.js-black?style=flat&logo=next.js&logoColor=white) |
| **Integrations** | ![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=flat&logo=telegram&logoColor=white) |

### ✨ Features
- **Asset Management:** Track assets, assignments, and statuses.
- **Repair History:** Record and track equipment breakdowns and repair processes.
- **Telegram Bot Integration:** Query assets and approve actions directly from Telegram.
- **Role-based Authentication:** Secure access for different employee roles using NextAuth.

### 🚀 Installation Guide

**1. Clone the repository**
```bash
git clone https://github.com/your-username/asset-crm.git
cd asset-crm
```

**2. Install dependencies**
```bash
npm install
# or
yarn install
```

**3. Setup Environment Variables**
Create a `.env.local` file in the root directory and configure the following variables:
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

**4. Run the development server**
```bash
npm run dev
# or
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
### 📝 License
MIT
