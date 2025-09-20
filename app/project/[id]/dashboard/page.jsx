'use client'
import React, { useMemo } from 'react'


export default function DashboardPage() {
    // ใช้ชุดข้อมูลเดียวกับ Kanban (คัดมาบางส่วน)
    const tasks = useMemo(() => [
        { id: 1, status: 'TODO' }, { id: 2, status: 'DOING' }, { id: 3, status: 'DOING' }, { id: 4, status: 'REVIEW' }, { id: 5, status: 'DONE' },
    ], [])
    const total = tasks.length
    const done = tasks.filter(t => t.status === 'DONE').length
    const progressAvg = Math.round((done / Math.max(1, total)) * 100)


    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <h1 className="text-2xl font-bold">Dashboard (Mock Data)</h1>
            <div className="grid md:grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white p-4 border"><div className="text-sm text-gray-500">งานทั้งหมด</div><div className="text-3xl font-bold">{total}</div></div>
                <div className="rounded-2xl bg-white p-4 border"><div className="text-sm text-gray-500">เสร็จแล้ว</div><div className="text-3xl font-bold">{done}</div></div>
                <div className="rounded-2xl bg-white p-4 border">
                    <div className="text-sm text-gray-500 mb-2">ความคืบหน้าโดยรวม (ประมาณ)</div>
                    <div className="w-full rounded-full bg-gray-100 h-3"><div className="h-3 rounded-full bg-emerald-500" style={{ width: `${progressAvg}%` }} /></div>
                    <div className="mt-1 text-sm">{progressAvg}%</div>
                </div>
            </div>


            <div className="rounded-2xl bg-white p-4 border">
                <div className="text-sm text-gray-500 mb-2">งานคงค้างตามสถานะ</div>
                <ul className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {['TODO', 'DOING', 'REVIEW', 'DONE'].map(s => {
                        const c = tasks.filter(t => t.status === s).length
                        return <li key={s} className="rounded-xl border p-3"><div className="text-xs text-gray-500">{s}</div><div className="text-xl font-semibold">{c}</div></li>
                    })}
                </ul>
            </div>
        </div>
    )
}