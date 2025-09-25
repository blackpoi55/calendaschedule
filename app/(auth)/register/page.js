'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import { registerApi, extractToken } from '../../../action/api'

export default function RegisterPage() {
  const [username, setUsername] = useState('adisorn.th')  // ตัวอย่างตาม cURL
  const [email, setEmail]       = useState('adisorn.th@telecorpthailand.com')
  const [password, setPassword] = useState('11681168')
  const [confirm, setConfirm]   = useState('11681168')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [ok, setOk]             = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null); setOk(false)
    if (password !== confirm) {
      setError('รหัสผ่านไม่ตรงกัน'); return
    }
    setLoading(true)
    try {
      const resp = await registerApi({ username: username.trim(), password, email: email.trim() })
      // บางระบบ register แล้ว login ให้เลย; ถ้ามี token ก็เก็บ
      const token = extractToken(resp)
      if (token) localStorage.setItem('auth_token', token)
      if (resp?.user) localStorage.setItem('auth_user', JSON.stringify(resp.user))
      setOk(true)
      // ไปหน้าแรก หรือจะส่งไปหน้า login ก็ได้
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'สมัครสมาชิกไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-bold">สมัครสมาชิก</h1>
            <p className="text-sm text-gray-500 mt-1">สร้างบัญชีใหม่เพื่อเข้าใช้งานระบบ</p>
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
              <label className="block text-sm font-medium">อีเมล</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="email@example.com"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
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
                  autoComplete="new-password"
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

            <div>
              <label className="block text-sm font-medium">ยืนยันรหัสผ่าน</label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="confirm password"
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-indigo-600 text-white py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
            </button>

            <div className="text-center text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="text-indigo-600 hover:underline">
                เข้าสู่ระบบ
              </Link>
            </div>
          </form>
        </div>
        {ok && (
          <div className="text-center text-xs text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2 mt-3">
            สมัครสมาชิกสำเร็จ กำลังพาไปหน้าแรก…
          </div>
        )}
      </div>
    </div>
  )
}
