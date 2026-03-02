import type { Metadata } from 'next';
import './globals.css';
import NotificationMarquee from '@/components/NotificationMarquee';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import AuthProvider from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Quản lý tài sản Trạm Y tế Tân An Hội',
  description: 'Hệ thống quản lý tài sản doanh nghiệp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <NotificationMarquee />
          {children}
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
