import { Sarabun } from 'next/font/google'
import './globals.css'
import '@wamra/gantt-task-react/dist/style.css'
import ClientShell from '@/components/ClientShell'
import ScreenshotTool from '@/components/ScreenshotTool/ScreenshotTool'

const sarabun = Sarabun({
  weight: ['400', '700'],
  subsets: ['latin'],
})

// Metadata สำหรับ SEO และ PWA (Next.js 15)
export const metadata = {
  title: 'H-Series Team - Management System',
  description: 'ระบบบริหารจัดการทีมและโปรเจกต์ประสิทธิภาพสูง',
  manifest: '/manifest.json',
  applicationName: 'H-Team',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'H-Team',
  },
  formatDetection: {
    telephone: false,
  },
  // หมายเหตุ: ต้องมีไฟล์เหล่านี้อยู่ใน public/icons/ จริงๆ จึงจะแสดงผลได้
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
}

// Viewport สำหรับหน้าจอมือถือ
export const viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={sarabun.className}>
        <ClientShell>
          <ScreenshotTool />
          {children}
        </ClientShell>
      </body>
    </html>
  )
}
