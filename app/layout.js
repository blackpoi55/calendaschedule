import { Sarabun } from 'next/font/google'
import './globals.css'
import '@wamra/gantt-task-react/dist/style.css'
import ClientShell from '@/components/ClientShell'
import ScreenshotTool from '@/components/ScreenshotTool/ScreenshotTool'

const sarabun = Sarabun({
  weight: ['400', '700'],
  subsets: ['latin'],
})

export const metadata = {
  title: 'H-Series Team',
  description: 'ระบบบริหารจัดการทีม',
  manifest: "/manifest.json", // เชื่อมโยงไฟล์ manifest
}
export const viewport = {
  themeColor: "#8b5cf6", // สีของแถบด้านบนในมือถือ (สีม่วงตามธีมแอป)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

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
