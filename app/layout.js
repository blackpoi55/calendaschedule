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
