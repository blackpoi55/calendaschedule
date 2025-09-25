'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',         label: 'แดชบอร์ด' },
  { href: '/projects', label: 'โปรเจกต์' },
  { href: '/reports',  label: 'รายงาน' },
  { href: '/settings', label: 'ตั้งค่า', roles: ['admin'] }, // เฉพาะ admin
]

// ===== utils =====
function classNames(...s) { return s.filter(Boolean).join(' ') }
function parseJwt(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try { return JSON.parse(atob(parts[1])) } catch { return null }
}
function isExpired(token) {
  const payload = parseJwt(token)
  if (!payload?.exp) return false
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= now
}

export default function Nav() {
  const pathname = usePathname()

  // ---- Hooks (ลำดับต้องคงที่ทุกครั้ง) ----
  const [open, setOpen] = useState(false)           // mobile drawer
  const [menuOpen, setMenuOpen] = useState(false)   // user dropdown
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [boot, setBoot]   = useState(false)         // บูตอ่าน localStorage ครั้งแรก

  // โหลด token/user จาก localStorage
  useEffect(() => {
    try {
      const t = localStorage.getItem('auth_token')
      const u = localStorage.getItem('auth_user')
      setToken(t || null)
      setUser(u ? JSON.parse(u) : null)
    } finally {
      setBoot(true)
    }
  }, [])

  // sync ทุกแท็บ
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'auth_token') setToken(localStorage.getItem('auth_token'))
      if (e.key === 'auth_user') {
        const u = localStorage.getItem('auth_user')
        setUser(u ? JSON.parse(u) : null)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => { setOpen(false); setMenuOpen(false) }, [pathname])

  // === Hooks ที่ต้องถูกเรียกทุกครั้ง (ห้ามมี early return ก่อนถึงจุดนี้) ===
  const role = user?.role ? String(user.role) : null

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter(i => !i.roles || (role && i.roles.includes(role)))
  }, [role])

  const initials = useMemo(() => {
    const name = (user?.email || user?.id || 'U').toString().split('@')[0]
    return name.slice(0, 2).toUpperCase()
  }, [user])

  const onLoginPage = pathname === '/login' || pathname.startsWith('/login/')
  const expired = isExpired(token)
  const authed  = !!token && !expired

  // เด้งไป /login ถ้าไม่ใช่หน้า /login และไม่ผ่าน auth (หลัง boot เสร็จ)
  useEffect(() => {
    if (!boot) return
    if (!onLoginPage && !authed) {
      window.location.href = '/login'
    }
  }, [boot, authed, onLoginPage])

  // ---- จากนี้เป็นการ “ตัดสินใจเรนเดอร์” (ไม่เพิ่ม/ลดยอด Hooks แล้ว) ----
  // กันกะพริบตอนยังไม่บูต
  if (!boot) return null

  // ไม่เรนเดอร์ Nav ในหน้า /login หรือเมื่อยังไม่ผ่าน auth
  if (onLoginPage || !authed) return null

  function handleLogout() {
    try {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* แถบบน */}
        <div className="h-14 flex items-center justify-between gap-3">
          {/* ซ้าย: burger + brand */}
          <div className="flex items-center gap-2">
            <button
              className="md:hidden inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm hover:bg-gray-50"
              onClick={() => setOpen(v => !v)}
              aria-label="Toggle Menu"
            >
              ☰
            </button>
            <Link href="/" className="group flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 ring-2 ring-indigo-200" />
              <span className="font-semibold tracking-tight group-hover:text-indigo-600">
                BCH Console
              </span>
            </Link>
          </div>

          {/* กลาง: เมนูเดสก์ท็อป */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleItems.map(item => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={classNames(
                    'px-3 py-1.5 rounded-lg text-sm transition',
                    active
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* ขวา: ค้นหา + ผู้ใช้ */}
          <div className="flex items-center gap-2">
            {/* ค้นหา (ตัวอย่าง) */}
            <div className="relative hidden sm:block">
              <input
                placeholder="ค้นหา…"
                className="w-56 rounded-lg border px-3 py-1.5 text-sm pr-8"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">⌘K</span>
            </div>

            {/* เมนูผู้ใช้ */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 hover:bg-gray-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="h-7 w-7 grid place-items-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-[11px] font-bold text-slate-700">
                  {initials}
                </div>
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs text-gray-500">ลงชื่อเข้าใช้</span>
                  <span className="text-sm font-medium truncate max-w-[160px]">
                    {user?.email || 'User'}
                  </span>
                </div>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-2xl border bg-white p-2 shadow-lg"
                >
                  <div className="px-2 py-2">
                    <div className="text-sm font-semibold">{user?.email || 'User'}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
                        Role: <b className="ml-1">{user?.role || 'user'}</b>
                      </span>
                      {user?.id && (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-600">
                          ID: {user.id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="my-2 h-px bg-gray-100" />
                  <Link
                    href="/profile"
                    role="menuitem"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    โปรไฟล์ผู้ใช้
                  </Link>
                  <Link
                    href="/account"
                    role="menuitem"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    บัญชี & ความปลอดภัย
                  </Link>
                  <div className="my-2 h-px bg-gray-100" />
                  <button
                    onClick={handleLogout}
                    role="menuitem"
                    className="w-full text-left rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    ออกจากระบบ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ล่าง: mobile drawer */}
        {open && (
          <div className="md:hidden pb-3">
            <nav className="mt-2 space-y-1">
              {visibleItems.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classNames(
                      'block rounded-lg px-3 py-2 text-sm',
                      active
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* ค้นหามือถือ */}
            <div className="mt-3">
              <input
                placeholder="ค้นหา…"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
