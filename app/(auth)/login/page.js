'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { loginApi, extractToken } from '../../../action/api'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const resp = await loginApi({ username: username.trim(), password })
      console.log("resp", resp)
      if (resp.message == "เข้าสู่ระบบสำเร็จ") {
        const token = extractToken(resp)
        if (token) localStorage.setItem('auth_token', token)
        // เก็บข้อมูลผู้ใช้ถ้ามี
        if (resp?.user) localStorage.setItem('auth_user', JSON.stringify(resp.user))
        // ไปหน้าแรก
         window.location.href = '/'
      }
      else {
        setError('เข้าสู่ระบบไม่สำเร็จ')
      }
    } catch (err) {
      setError(err.message || 'เข้าสู่ระบบไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>
            <p className="text-sm text-gray-500 mt-1">ใส่บัญชีผู้ใช้เพื่อเข้าใช้งานระบบ</p>
          </div>
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium">ชื่อผู้ใช้</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">รหัสผ่าน</label>
              <div className="mt-1 flex rounded-lg border overflow-hidden">
                <input
                  className="w-full px-3 py-2 text-sm outline-none"
                  placeholder="password"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="px-3 text-sm text-gray-600 hover:bg-gray-50"
                  aria-label="toggle password"
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>

            <div className="text-center text-sm text-gray-600">
              ยังไม่มีบัญชี?{' '}
              <Link href="/register" className="text-indigo-600 hover:underline">
                สมัครสมาชิก
              </Link>
            </div>
          </form>
        </div>
        <div className="text-center text-xs text-gray-400 mt-3">
          เคล็ดลับ: เก็บโทเค็นไว้ใน localStorage: <code>auth_token</code>
        </div>
      </div>
    </div>
  )
}
