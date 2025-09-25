'use client'
import React from 'react'
import { usePathname } from 'next/navigation'
import Nav from '@/components/Nav'

/**
 * ซ่อน Nav บางเส้นทาง เช่น /login, /register
 */
const HIDE_NAV_PATHS = ['/login','/register'] // เพิ่ม '/register' ได้ตามต้องการ

export default function ClientShell({ children }) {
  const pathname = usePathname()
  const shouldHideNav = HIDE_NAV_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/')
  )

  return (
    <>
      {!shouldHideNav && <Nav />}
      {children}
    </>
  )
}
