'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Bars3Icon, 
  XMarkIcon, 
  HomeIcon, 
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'

const NAV_ITEMS = [
  { href: '/', label: 'แดชบอร์ด', icon: HomeIcon },
  { href: '/casereport', label: 'รายงานเคส', icon: ClipboardDocumentListIcon },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('auth_user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    router.push('/login')
  }

  const isActive = (path) => pathname === path

  return (
    <nav className="sticky top-0 z-[90] bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Desktop Menu */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-12 transition-transform">
                <span className="text-white font-black text-xl italic">H</span>
              </div>
              <span className="text-lg font-black text-slate-900 tracking-tighter">H-TEAM</span>
            </Link>

            <div className="hidden md:ml-10 md:flex md:space-x-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isActive(item.href)
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side: User & Mobile Toggle */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-100">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-900 leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{user.role || 'Member'}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="hidden md:block text-sm font-bold text-indigo-600 hover:text-indigo-700">เข้าสู่ระบบ</Link>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-50 transition"
              >
                {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-100 animate-fadeIn">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold transition-all ${
                  isActive(item.href)
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
            
            {user && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 px-4 mb-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{user.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-base font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
